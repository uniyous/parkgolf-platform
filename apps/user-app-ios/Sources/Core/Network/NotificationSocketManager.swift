import Foundation
import UIKit
import SocketIO
import Combine

// MARK: - Notification Socket Event

struct NotificationSocketEvent {
    let id: Int
    let userId: String
    let type: NotificationType
    let title: String
    let message: String
    let data: NotificationData?
    let isRead: Bool
    let createdAt: String
}

// MARK: - Notification Socket Manager

@MainActor
class NotificationSocketManager: ObservableObject {
    static let shared = NotificationSocketManager()

    // MARK: - Published Properties

    @Published var isConnected = false

    // MARK: - Event Publishers

    let notificationReceived = PassthroughSubject<NotificationSocketEvent, Never>()

    // MARK: - Private Properties

    private var manager: SocketManager?
    private var socket: SocketIOClient?
    private var currentToken: String?
    private var isRefreshingToken = false

    // MARK: - Configuration

    private var socketURL: URL { Configuration.API.chatSocketURL }
    private let namespace = "/notification"

    private init() {
        setupAppLifecycleObservers()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - App Lifecycle

    private func setupAppLifecycleObservers() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }
                if !self.isConnected, let token = self.currentToken {
                    if let freshToken = await APIClient.shared.getAccessToken() {
                        self.forceReconnect(token: freshToken)
                    } else {
                        self.forceReconnect(token: token)
                    }
                }
            }
        }
    }

    // MARK: - Connection

    func connect(token: String) {
        guard !isConnected else { return }

        currentToken = token

        manager = SocketManager(socketURL: socketURL, config: [
            .log(false),
            .compress,
            .forceWebsockets(false),
            .reconnects(true),
            .reconnectAttempts(-1),
            .reconnectWait(1),
            .reconnectWaitMax(30),
            .connectParams(["token": token])
        ])

        socket = manager?.socket(forNamespace: namespace)

        setupEventHandlers()

        socket?.connect()
    }

    func forceReconnect(token: String) {
        cleanupSocket()
        connect(token: token)
    }

    private func cleanupSocket() {
        socket?.removeAllHandlers()
        socket?.disconnect()
        socket = nil
        manager = nil
    }

    func disconnect() {
        cleanupSocket()
        currentToken = nil
        isConnected = false
    }

    // MARK: - Event Handlers

    private func setupEventHandlers() {
        guard let socket = socket else { return }

        socket.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = true
                #if DEBUG
                print("[NotificationSocket] Connected")
                #endif
            }
        }

        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = false
                #if DEBUG
                print("[NotificationSocket] Disconnected")
                #endif
            }
        }

        socket.on(clientEvent: .error) { [weak self] data, _ in
            Task { @MainActor in
                if let error = data.first as? [String: Any],
                   let message = error["message"] as? String {
                    #if DEBUG
                    print("[NotificationSocket] Error: \(message)")
                    #endif
                    if message.contains("Unauthorized") || message.contains("Authentication") {
                        await self?.handleAuthError()
                    }
                }
            }
        }

        socket.on("token_expiring") { _, _ in
            Task {
                _ = await APIClient.shared.refreshAccessToken()
            }
        }

        socket.on("token_refresh_needed") { _, _ in
            Task {
                _ = await APIClient.shared.refreshAccessToken()
            }
        }

        socket.on("connected") { _, _ in
            #if DEBUG
            Task { @MainActor in
                print("[NotificationSocket] Authenticated")
            }
            #endif
        }

        socket.on("notification") { [weak self] data, _ in
            guard let eventData = data.first as? [String: Any] else { return }
            if let event = self?.parseNotificationEvent(from: eventData) {
                Task { @MainActor in
                    self?.notificationReceived.send(event)
                }
            }
        }
    }

    // MARK: - Auth Error Handling

    private func handleAuthError() async {
        guard !isRefreshingToken else { return }
        isRefreshingToken = true
        defer { isRefreshingToken = false }

        let refreshed = await APIClient.shared.refreshAccessToken()
        if refreshed, let newToken = await APIClient.shared.getAccessToken() {
            forceReconnect(token: newToken)
        }
    }

    // MARK: - Parsing

    private func parseNotificationEvent(from dict: [String: Any]) -> NotificationSocketEvent? {
        guard let id = dict["id"] as? Int,
              let typeString = dict["type"] as? String,
              let type = NotificationType(rawValue: typeString),
              let title = dict["title"] as? String,
              let message = dict["message"] as? String else {
            return nil
        }

        let userId = "\(dict["userId"] ?? "")"
        let isRead = dict["isRead"] as? Bool ?? false
        let createdAt = dict["createdAt"] as? String ?? ""

        var notificationData: NotificationData?
        if let dataDict = dict["data"] as? [String: Any] {
            notificationData = NotificationData(
                bookingId: dataDict["bookingId"] as? String,
                courseId: dataDict["courseId"] as? String,
                courseName: dataDict["courseName"] as? String,
                bookingDate: dataDict["bookingDate"] as? String,
                bookingTime: dataDict["bookingTime"] as? String,
                paymentId: dataDict["paymentId"] as? String,
                amount: dataDict["amount"] as? Int,
                failureReason: dataDict["failureReason"] as? String,
                friendId: dataDict["friendId"] as? String,
                friendName: dataDict["friendName"] as? String,
                chatRoomId: dataDict["chatRoomId"] as? String
            )
        }

        return NotificationSocketEvent(
            id: id,
            userId: userId,
            type: type,
            title: title,
            message: message,
            data: notificationData,
            isRead: isRead,
            createdAt: createdAt
        )
    }
}
