import XCTest
@testable import ParkGolf

// MARK: - Mock URL Protocol

/// URLProtocol subclass that intercepts all HTTP requests for testing
final class MockURLProtocol: URLProtocol {
    /// Request handler: receives URLRequest, returns (HTTPURLResponse, Data)
    nonisolated(unsafe) static var requestHandler: ((URLRequest) -> (HTTPURLResponse, Data))?

    /// Log of request paths for verification
    nonisolated(unsafe) static var requestLog: [String] = []

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let path = request.url?.path ?? ""
        Self.requestLog.append(path)

        guard let handler = Self.requestHandler else {
            client?.urlProtocolDidFinishLoading(self)
            return
        }

        let (response, data) = handler(request)
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    static func reset() {
        requestHandler = nil
        requestLog = []
    }
}

// MARK: - Test Helpers

private struct TestData: Codable, Sendable {
    let message: String
}

private let testBaseURL = URL(string: "http://test.local")!

private func makeResponse(statusCode: Int) -> HTTPURLResponse {
    HTTPURLResponse(url: testBaseURL, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
}

private func jsonData(_ dict: [String: Any]) -> Data {
    try! JSONSerialization.data(withJSONObject: dict)
}

/// Refresh 성공 응답 (LoginResponse 구조)
private let refreshSuccessBody = jsonData([
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token",
    "user": [
        "id": 1,
        "email": "test@parkgolf.com",
        "name": "테스트사용자"
    ] as [String: Any],
    "expiresIn": 3600
] as [String: Any])

/// API 성공 응답 (APIResponse<TestData> 구조)
private let apiSuccessBody = jsonData([
    "success": true,
    "data": ["message": "ok"]
] as [String: Any])

/// 401 에러 응답
private let api401Body = jsonData([
    "success": false,
    "error": ["code": "UNAUTHORIZED", "message": "Token expired"]
] as [String: Any])

// MARK: - Token Refresh Tests

/**
 * 401 토큰 자동 갱신 Unit 테스트 (iOS)
 *
 * MockURLProtocol로 네트워크를 인터셉트하여 401 시나리오 테스트.
 * Web E2E 테스트(Playwright page.route)와 동일한 4가지 시나리오 검증.
 *
 * 테스트 방법: URLProtocol subclass → URLSessionConfiguration.protocolClasses 주입
 */
final class TokenRefreshTests: XCTestCase {

    private var apiClient: APIClient!

    override func setUp() {
        super.setUp()
        MockURLProtocol.reset()

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]

        apiClient = APIClient(baseURL: testBaseURL, sessionConfiguration: config)
    }

    override func tearDown() {
        MockURLProtocol.reset()
        KeychainManager.shared.clearAll()
        super.tearDown()
    }

    // MARK: - Scenario 1: access token 만료 → refresh 성공 → 새 토큰 저장

    /// API 호출 시 401 → refresh 성공 → 새 토큰으로 재시도 → 성공
    func testRefreshSuccessSavesNewTokens() async throws {
        // Given: 만료된 토큰 설정
        await apiClient.setTokens(accessToken: "old_access_token", refreshToken: "old_refresh_token")

        MockURLProtocol.requestHandler = { request in
            let path = request.url?.path ?? ""
            let authHeader = request.value(forHTTPHeaderField: "Authorization") ?? ""

            // Refresh 엔드포인트 → 새 토큰 반환
            if path.contains("/iam/refresh") {
                return (makeResponse(statusCode: 200), refreshSuccessBody)
            }

            // 만료된 토큰 → 401, 새 토큰 → 200
            if authHeader.contains("old_access_token") {
                return (makeResponse(statusCode: 401), api401Body)
            } else {
                return (makeResponse(statusCode: 200), apiSuccessBody)
            }
        }

        // When: API 요청
        let endpoint = Endpoint(path: "/api/user/test")
        let result = try await apiClient.request(endpoint, responseType: TestData.self)

        // Then: 재시도 성공
        XCTAssertEqual(result.message, "ok")

        // Then: 새 토큰 저장됨
        let savedToken = await apiClient.getAccessToken()
        XCTAssertEqual(savedToken, "new_access_token")

        // Then: refresh 엔드포인트 호출됨
        XCTAssertTrue(
            MockURLProtocol.requestLog.contains { $0.contains("/iam/refresh") },
            "refresh 엔드포인트가 호출되어야 합니다"
        )
    }

    // MARK: - Scenario 2: refresh token 만료 → 세션 만료 알림

    /// Refresh 엔드포인트도 401 → 인증 삭제 → sessionExpired 알림
    func testRefreshFailurePostsSessionExpired() async {
        // Given
        await apiClient.setTokens(accessToken: "old_access_token", refreshToken: "old_refresh_token")

        let sessionExpiredExpectation = expectation(
            forNotification: APIClient.sessionExpiredNotification,
            object: nil
        )

        MockURLProtocol.requestHandler = { request in
            let path = request.url?.path ?? ""

            // Refresh 엔드포인트 → 401 (refresh token도 만료)
            if path.contains("/iam/refresh") {
                return (makeResponse(statusCode: 401), api401Body)
            }

            // 모든 API 호출 → 401
            return (makeResponse(statusCode: 401), api401Body)
        }

        // When
        let endpoint = Endpoint(path: "/api/user/test")
        do {
            _ = try await apiClient.request(endpoint, responseType: TestData.self)
            XCTFail("unauthorized 에러가 발생해야 합니다")
        } catch {
            // Then: unauthorized 에러
            XCTAssertTrue(error is APIError)
        }

        // Then: 세션 만료 알림 발생
        await fulfillment(of: [sessionExpiredExpectation], timeout: 5)

        // Then: 토큰 삭제됨
        let savedToken = await apiClient.getAccessToken()
        XCTAssertNil(savedToken, "토큰이 삭제되어야 합니다")
    }

    // MARK: - Scenario 3: refresh token 없음 → refresh 미호출

    /// Refresh token 없이 401 → refresh 시도 안 함 → 바로 세션 만료
    func testNoRefreshTokenSkipsRefresh() async {
        // Given: access token만 있고 refresh token 없음
        await apiClient.setAccessToken("old_access_token")

        let sessionExpiredExpectation = expectation(
            forNotification: APIClient.sessionExpiredNotification,
            object: nil
        )

        MockURLProtocol.requestHandler = { _ in
            return (makeResponse(statusCode: 401), api401Body)
        }

        // When
        let endpoint = Endpoint(path: "/api/user/test")
        do {
            _ = try await apiClient.request(endpoint, responseType: TestData.self)
            XCTFail("unauthorized 에러가 발생해야 합니다")
        } catch {
            XCTAssertTrue(error is APIError)
        }

        // Then: 세션 만료 알림 발생
        await fulfillment(of: [sessionExpiredExpectation], timeout: 5)

        // Then: refresh 엔드포인트 호출 안 됨
        let refreshCalls = MockURLProtocol.requestLog.filter { $0.contains("/iam/refresh") }
        XCTAssertEqual(refreshCalls.count, 0, "refresh token이 없으면 refresh를 호출하지 않아야 합니다")
    }

    // MARK: - Scenario 4: refresh 실패 → 무한루프 방지

    /// Refresh 401 → refresh 재시도 안 함 (1회만) → 세션 만료
    func testRefreshEndpoint401NoInfiniteLoop() async {
        // Given
        await apiClient.setTokens(accessToken: "old_access_token", refreshToken: "some_refresh_token")

        let sessionExpiredExpectation = expectation(
            forNotification: APIClient.sessionExpiredNotification,
            object: nil
        )

        MockURLProtocol.requestHandler = { _ in
            // 모든 요청에 401 반환 (refresh 포함)
            return (makeResponse(statusCode: 401), api401Body)
        }

        // When
        let endpoint = Endpoint(path: "/api/user/test")
        do {
            _ = try await apiClient.request(endpoint, responseType: TestData.self)
            XCTFail("unauthorized 에러가 발생해야 합니다")
        } catch {
            XCTAssertTrue(error is APIError)
        }

        // Then: 세션 만료 알림 발생
        await fulfillment(of: [sessionExpiredExpectation], timeout: 5)

        // Then: refresh는 1회만 호출됨 (무한루프 방지)
        let refreshCalls = MockURLProtocol.requestLog.filter { $0.contains("/iam/refresh") }
        XCTAssertEqual(refreshCalls.count, 1, "refresh는 1회만 호출되어야 합니다 (무한루프 방지)")
    }
}
