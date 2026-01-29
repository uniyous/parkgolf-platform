import Foundation

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    /// Posted when refresh token fails and user must re-authenticate
    static let sessionExpiredNotification = Notification.Name("APIClient.sessionExpired")

    private let baseURL: URL
    private let session: URLSession
    private var accessToken: String?
    private var refreshToken: String?

    /// In-flight refresh task to prevent concurrent refresh attempts
    private var refreshTask: Task<LoginResponse, Error>?

    // MARK: - Shared Decoders

    private static let jsonDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()

            // Handle null dates
            if container.decodeNil() {
                throw DecodingError.valueNotFound(Date.self, DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Date value is null"
                ))
            }

            let dateString = try container.decode(String.self)

            // Try ISO8601 with fractional seconds first
            if let date = DateHelper.iso8601Formatter.date(from: dateString) {
                return date
            }

            // Fallback to standard ISO8601
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: dateString) {
                return date
            }

            // Fallback to simple date format (yyyy-MM-dd)
            if let date = DateHelper.fromISODateString(dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid date format: \(dateString)"
            )
        }
        return decoder
    }()

    private init() {
        self.baseURL = Configuration.API.baseURL

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = Configuration.Timeout.request
        configuration.timeoutIntervalForResource = Configuration.Timeout.resource
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Token Management

    func setAccessToken(_ token: String?) {
        self.accessToken = token
    }

    func getAccessToken() -> String? {
        return accessToken
    }

    func setTokens(accessToken: String, refreshToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }

    func clearTokens() {
        self.accessToken = nil
        self.refreshToken = nil
        KeychainManager.shared.clearAll()
    }

    // MARK: - Request Methods

    func request<T: Decodable & Sendable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> T {
        let (data, httpResponse) = try await performRequestWithRetry(endpoint)

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        do {
            let apiResponse = try Self.jsonDecoder.decode(APIResponse<T>.self, from: data)
            if apiResponse.success, let responseData = apiResponse.data {
                return responseData
            } else if let error = apiResponse.error {
                throw APIError.serverError(code: error.code, message: error.message)
            } else {
                throw APIError.decodingError
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.decodingError
        }
    }

    /// Direct request without APIResponse wrapper (for paginated responses, auth endpoints)
    func requestDirect<T: Decodable & Sendable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> T {
        let (data, httpResponse) = try await performRequestWithRetry(endpoint)

        // Check for error response first
        if let errorResponse = try? Self.jsonDecoder.decode(ErrorOnlyResponse.self, from: data),
           errorResponse.success == false,
           let error = errorResponse.error {
            throw APIError.serverError(code: error.code, message: error.message)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        do {
            return try Self.jsonDecoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("Decoding error: \(error)")
            #endif
            throw APIError.decodingError
        }
    }

    func requestList<T: Decodable & Sendable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> PaginatedResponse<T> {
        let (data, httpResponse) = try await performRequestWithRetry(endpoint)

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        return try Self.jsonDecoder.decode(PaginatedResponse<T>.self, from: data)
    }

    /// Request array without pagination (e.g., chat rooms)
    func requestArray<T: Decodable & Sendable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> [T] {
        let (data, httpResponse) = try await performRequestWithRetry(endpoint)

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        do {
            let apiResponse = try Self.jsonDecoder.decode(APIResponse<[T]>.self, from: data)
            if apiResponse.success, let responseData = apiResponse.data {
                return responseData
            } else if let error = apiResponse.error {
                throw APIError.serverError(code: error.code, message: error.message)
            } else {
                return []
            }
        } catch let error as APIError {
            throw error
        } catch {
            #if DEBUG
            print("Decoding error for array request: \(error)")
            if let jsonString = String(data: data, encoding: .utf8) {
                print("Response JSON: \(jsonString.prefix(500))")
            }
            #endif
            throw APIError.decodingError
        }
    }

    // MARK: - Private Helpers

    /// Performs request with automatic 401 retry after token refresh
    private func performRequestWithRetry(_ endpoint: Endpoint) async throws -> (Data, HTTPURLResponse) {
        let (data, httpResponse) = try await performRequest(endpoint)

        // Not a 401 → return as-is
        guard httpResponse.statusCode == 401 else {
            return (data, httpResponse)
        }

        // Don't retry refresh endpoint itself to prevent infinite loop
        if endpoint.path.contains("/refresh") {
            return (data, httpResponse)
        }

        // Attempt token refresh
        do {
            let refreshResponse = try await attemptTokenRefresh()
            self.accessToken = refreshResponse.accessToken
            self.refreshToken = refreshResponse.refreshToken
            try? KeychainManager.shared.saveTokens(
                accessToken: refreshResponse.accessToken,
                refreshToken: refreshResponse.refreshToken
            )
        } catch {
            // Refresh failed → notify UI for forced logout
            clearTokens()
            await MainActor.run {
                NotificationCenter.default.post(name: Self.sessionExpiredNotification, object: nil)
            }
            throw APIError.unauthorized
        }

        // Retry original request with new token
        return try await performRequest(endpoint)
    }

    /// Attempts token refresh. Serialized by actor: concurrent 401s share a single refresh.
    private func attemptTokenRefresh() async throws -> LoginResponse {
        // If a refresh is already in progress, await its result
        if let existingTask = refreshTask {
            return try await existingTask.value
        }

        guard let currentRefreshToken = refreshToken else {
            throw APIError.unauthorized
        }

        let task = Task<LoginResponse, Error> {
            let endpoint = AuthEndpoints.refreshToken(refreshToken: currentRefreshToken)
            let (data, httpResponse) = try await performRequest(endpoint)

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.unauthorized
            }

            return try Self.jsonDecoder.decode(LoginResponse.self, from: data)
        }

        refreshTask = task
        defer { refreshTask = nil }

        return try await task.value
    }

    private func performRequest(_ endpoint: Endpoint) async throws -> (Data, HTTPURLResponse) {
        let request = try buildRequest(for: endpoint)
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        return (data, httpResponse)
    }

    // MARK: - Private Methods

    private func buildRequest(for endpoint: Endpoint) throws -> URLRequest {
        guard let url = URL(string: endpoint.path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: true)!

        // Add query parameters
        if let queryParams = endpoint.queryParameters, !queryParams.isEmpty {
            urlComponents.queryItems = queryParams.map {
                URLQueryItem(name: $0.key, value: $0.value)
            }
        }

        guard let finalURL = urlComponents.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: finalURL)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth header
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body
        if let body = endpoint.body {
            request.httpBody = body
        }

        return request
    }
}

// MARK: - Endpoint

struct Endpoint: Sendable {
    let path: String
    let method: HTTPMethod
    let queryParameters: [String: String]?
    let body: Data?

    init(
        path: String,
        method: HTTPMethod = .get,
        queryParameters: [String: String]? = nil,
        body: (any Encodable)? = nil
    ) {
        self.path = path
        self.method = method
        self.queryParameters = queryParameters
        if let body = body {
            self.body = try? JSONEncoder().encode(body)
        } else {
            self.body = nil
        }
    }
}

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

// MARK: - API Response

struct APIResponse<T: Decodable & Sendable>: Decodable, Sendable {
    let success: Bool
    let data: T?
    let error: APIErrorResponse?
}

struct APIErrorResponse: Decodable, Sendable {
    let code: String
    let message: String
}

struct ErrorOnlyResponse: Decodable, Sendable {
    let success: Bool?
    let error: APIErrorResponse?
}

struct PaginatedResponse<T: Decodable & Sendable>: Decodable, Sendable {
    let success: Bool
    let data: [T]
    let pagination: Pagination
}

struct Pagination: Decodable, Sendable {
    let page: Int
    let limit: Int
    let total: Int
    let totalPages: Int
}

// MARK: - API Error

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, data: Data)
    case decodingError
    case serverError(code: String, message: String)
    case unauthorized
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "잘못된 URL입니다."
        case .invalidResponse:
            return "서버 응답을 처리할 수 없습니다."
        case .httpError(let statusCode, _):
            return "서버 오류가 발생했습니다. (코드: \(statusCode))"
        case .decodingError:
            return "데이터를 처리하는 중 오류가 발생했습니다."
        case .serverError(_, let message):
            return message
        case .unauthorized:
            return "인증이 필요합니다. 다시 로그인해 주세요."
        case .networkError:
            return "네트워크 연결을 확인해 주세요."
        }
    }
}
