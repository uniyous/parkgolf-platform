import Foundation
import UIKit

// MARK: - Device Platform

enum DevicePlatform: String, Codable, Sendable {
    case ios = "IOS"
    case android = "ANDROID"
    case web = "WEB"
}

// MARK: - Register Device Request

struct RegisterDeviceRequest: Codable, Sendable {
    let platform: DevicePlatform
    let deviceToken: String
    let deviceId: String?
    let deviceName: String?
}

// MARK: - Device Response

struct DeviceResponse: Codable, Sendable {
    let id: Int
    let platform: DevicePlatform
    let deviceId: String?
    let deviceName: String?
    let isActive: Bool
    let lastActiveAt: Date?
    let createdAt: Date
}

// MARK: - Device Service

actor DeviceService {
    static let shared = DeviceService()

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Register Device

    func registerDevice(deviceToken: String) async throws -> DeviceResponse {
        let request = RegisterDeviceRequest(
            platform: .ios,
            deviceToken: deviceToken,
            deviceId: await getDeviceId(),
            deviceName: await getDeviceName()
        )

        let endpoint = Endpoint(
            path: "/api/user/devices",
            method: .post,
            body: request
        )

        return try await apiClient.request(endpoint, responseType: DeviceResponse.self)
    }

    // MARK: - Remove Device (Logout)

    func removeDevice(deviceToken: String) async throws {
        let endpoint = Endpoint(
            path: "/api/user/devices/\(deviceToken)",
            method: .delete
        )

        struct RemoveResponse: Codable {
            let removed: Bool
        }

        _ = try await apiClient.request(endpoint, responseType: RemoveResponse.self)
    }

    // MARK: - Get My Devices

    func getMyDevices() async throws -> [DeviceResponse] {
        let endpoint = Endpoint(
            path: "/api/user/devices",
            method: .get
        )

        return try await apiClient.request(endpoint, responseType: [DeviceResponse].self)
    }

    // MARK: - Device Info Helpers

    @MainActor
    private func getDeviceId() -> String? {
        UIDevice.current.identifierForVendor?.uuidString
    }

    @MainActor
    private func getDeviceName() -> String {
        UIDevice.current.name
    }
}

// MARK: - Push Notification Manager

actor PushNotificationManager {
    static let shared = PushNotificationManager()

    private var deviceToken: String?
    private var isRegistered = false
    private let deviceService = DeviceService.shared

    // MARK: - Token Management

    /// APNs 토큰 설정 (AppDelegate에서 호출)
    func setDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString
        print("[PushNotificationManager] Token set: \(tokenString.prefix(20))...")
    }

    /// 디바이스 토큰 서버 등록 (로그인 후 호출)
    func registerDeviceIfNeeded() async {
        guard let token = deviceToken else {
            print("[PushNotificationManager] No token available for registration")
            return
        }

        // 이미 등록된 경우 스킵
        guard !isRegistered else {
            print("[PushNotificationManager] Device already registered")
            return
        }

        do {
            let response = try await deviceService.registerDevice(deviceToken: token)
            isRegistered = true
            print("[PushNotificationManager] Device registered: ID=\(response.id)")
        } catch {
            print("[PushNotificationManager] Registration failed: \(error)")
        }
    }

    /// 로그인 시 호출 - 토큰이 있으면 즉시 등록
    func onUserLoggedIn() async {
        isRegistered = false // 새 세션이므로 재등록 필요
        await registerDeviceIfNeeded()
    }

    /// 로그아웃 시 디바이스 등록 해제
    func onUserLoggedOut() async {
        guard let token = deviceToken else { return }

        do {
            try await deviceService.removeDevice(deviceToken: token)
            isRegistered = false
            print("[PushNotificationManager] Device unregistered successfully")
        } catch {
            print("[PushNotificationManager] Unregister failed: \(error)")
        }
    }

    /// 현재 토큰 반환
    func getCurrentToken() -> String? {
        deviceToken
    }

    /// 등록 상태 반환
    func isDeviceRegistered() -> Bool {
        isRegistered
    }

    // MARK: - Legacy Methods (for backward compatibility)

    func unregisterDevice() async {
        await onUserLoggedOut()
    }
}
