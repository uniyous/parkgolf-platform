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
    private let deviceService = DeviceService.shared

    func setDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString
    }

    func registerDeviceIfNeeded() async {
        guard let token = deviceToken else { return }

        do {
            let response = try await deviceService.registerDevice(deviceToken: token)
            print("Device registered successfully: \(response.id)")
        } catch {
            print("Failed to register device: \(error)")
        }
    }

    func unregisterDevice() async {
        guard let token = deviceToken else { return }

        do {
            try await deviceService.removeDevice(deviceToken: token)
            print("Device unregistered successfully")
        } catch {
            print("Failed to unregister device: \(error)")
        }
    }

    func getCurrentToken() -> String? {
        deviceToken
    }
}
