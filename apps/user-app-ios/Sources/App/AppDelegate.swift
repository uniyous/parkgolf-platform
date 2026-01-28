import UIKit
import UserNotifications

// MARK: - App Delegate

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    // MARK: - Application Lifecycle

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = self

        // Request push notification permission
        requestPushNotificationPermission(application: application)

        return true
    }

    // MARK: - Push Notification Permission

    private func requestPushNotificationPermission(application: UIApplication) {
        let center = UNUserNotificationCenter.current()

        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[Push] Authorization error: \(error.localizedDescription)")
                return
            }

            if granted {
                print("[Push] Permission granted")
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            } else {
                print("[Push] Permission denied")
            }
        }
    }

    // MARK: - Remote Notification Registration

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[Push] APNs token received: \(tokenString.prefix(20))...")

        // Store token and register with server
        Task {
            await PushNotificationManager.shared.setDeviceToken(deviceToken)
            await PushNotificationManager.shared.registerDeviceIfNeeded()
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[Push] Failed to register: \(error.localizedDescription)")
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        print("[Push] Foreground notification received: \(userInfo)")

        // Show banner and play sound even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }

    // Handle notification tap
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        print("[Push] Notification tapped: \(userInfo)")

        // Handle notification action
        Task {
            await handleNotificationAction(userInfo: userInfo)
        }

        completionHandler()
    }

    // MARK: - Notification Action Handling

    private func handleNotificationAction(userInfo: [AnyHashable: Any]) async {
        // Extract notification type and data
        guard let type = userInfo["type"] as? String else {
            print("[Push] Unknown notification type")
            return
        }

        switch type {
        case "BOOKING_CONFIRMED", "BOOKING_CANCELLED":
            if let bookingId = userInfo["bookingId"] as? Int {
                await navigateToBookingDetail(bookingId: bookingId)
            }

        case "FRIEND_REQUEST":
            if let requestId = userInfo["requestId"] as? Int {
                await navigateToFriendRequests(requestId: requestId)
            }

        case "FRIEND_ACCEPTED":
            await navigateToFriendsList()

        case "CHAT_MESSAGE":
            if let chatRoomId = userInfo["chatRoomId"] as? String {
                await navigateToChatRoom(chatRoomId: chatRoomId)
            }

        default:
            print("[Push] Unhandled notification type: \(type)")
        }
    }

    // MARK: - Navigation Helpers

    @MainActor
    private func navigateToBookingDetail(bookingId: Int) {
        // Post notification to navigate to booking detail
        NotificationCenter.default.post(
            name: .navigateToBookingDetail,
            object: nil,
            userInfo: ["bookingId": bookingId]
        )
    }

    @MainActor
    private func navigateToFriendRequests(requestId: Int) {
        NotificationCenter.default.post(
            name: .navigateToFriendRequests,
            object: nil,
            userInfo: ["requestId": requestId]
        )
    }

    @MainActor
    private func navigateToFriendsList() {
        NotificationCenter.default.post(
            name: .navigateToFriendsList,
            object: nil,
            userInfo: nil
        )
    }

    @MainActor
    private func navigateToChatRoom(chatRoomId: String) {
        NotificationCenter.default.post(
            name: .navigateToChatRoom,
            object: nil,
            userInfo: ["chatRoomId": chatRoomId]
        )
    }
}

