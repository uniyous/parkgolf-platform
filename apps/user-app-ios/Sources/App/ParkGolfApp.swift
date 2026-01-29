import SwiftUI
import UIKit
import UserNotifications

// MARK: - App Entry Point

@main
struct ParkGolfApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onReceive(NotificationCenter.default.publisher(for: .navigateToBookingDetail)) { notification in
                    if let bookingId = notification.userInfo?["bookingId"] as? Int {
                        print("[Navigation] Navigate to booking: \(bookingId)")
                        // TODO: Handle navigation to booking detail
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .navigateToFriendRequests)) { notification in
                    if let requestId = notification.userInfo?["requestId"] as? Int {
                        print("[Navigation] Navigate to friend request: \(requestId)")
                        // TODO: Handle navigation to friend requests
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .navigateToFriendsList)) { _ in
                    print("[Navigation] Navigate to friends list")
                    // TODO: Handle navigation to friends list
                }
                .onReceive(NotificationCenter.default.publisher(for: .navigateToChatRoom)) { notification in
                    if let chatRoomId = notification.userInfo?["chatRoomId"] as? String {
                        print("[Navigation] Navigate to chat room: \(chatRoomId)")
                        // TODO: Handle navigation to chat room
                    }
                }
        }
    }
}

// MARK: - App Delegate

final class AppDelegate: NSObject, UIApplicationDelegate, @unchecked Sendable {

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

}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Handle notification when app is in foreground
    nonisolated func userNotificationCenter(
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
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        print("[Push] Notification tapped: \(userInfo)")

        // Copy userInfo to Sendable dictionary
        let notificationType = userInfo["type"] as? String
        let bookingId = userInfo["bookingId"] as? Int
        let requestId = userInfo["requestId"] as? Int
        let chatRoomId = userInfo["chatRoomId"] as? String

        // Handle notification action on main thread
        Task { @MainActor in
            self.handleNotificationAction(
                type: notificationType,
                bookingId: bookingId,
                requestId: requestId,
                chatRoomId: chatRoomId
            )
        }

        completionHandler()
    }

    // MARK: - Notification Action Handling

    @MainActor
    fileprivate func handleNotificationAction(
        type: String?,
        bookingId: Int?,
        requestId: Int?,
        chatRoomId: String?
    ) {
        guard let type = type else {
            print("[Push] Unknown notification type")
            return
        }

        switch type {
        case "BOOKING_CONFIRMED", "BOOKING_CANCELLED":
            if let bookingId = bookingId {
                navigateToBookingDetail(bookingId: bookingId)
            }

        case "FRIEND_REQUEST":
            if let requestId = requestId {
                navigateToFriendRequests(requestId: requestId)
            }

        case "FRIEND_ACCEPTED":
            navigateToFriendsList()

        case "CHAT_MESSAGE":
            if let chatRoomId = chatRoomId {
                navigateToChatRoom(chatRoomId: chatRoomId)
            }

        default:
            print("[Push] Unhandled notification type: \(type)")
        }
    }

    // MARK: - Navigation Helpers

    @MainActor
    private func navigateToBookingDetail(bookingId: Int) {
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

// MARK: - App State

@MainActor
final class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentUser: User?
    @Published var showPasswordChangeReminder: Bool = false
    @Published var passwordExpiryInfo: PasswordExpiryInfo?

    /// 비밀번호 변경 권유를 이미 표시했는지 (세션 내 1회만)
    private var hasShownPasswordReminder = false

    /// 비밀번호 변경 권유를 건너뛴 시간 (다음에 변경하기 선택 시)
    private static let passwordReminderSkipKey = "passwordReminderSkippedAt"

    init() {
        checkAuthenticationStatus()
        observeSessionExpiry()
    }

    private func checkAuthenticationStatus() {
        // Restore tokens from Keychain for automatic re-login
        if let accessToken = KeychainManager.shared.accessToken,
           let refreshToken = KeychainManager.shared.refreshToken {
            Task {
                await APIClient.shared.setTokens(
                    accessToken: accessToken,
                    refreshToken: refreshToken
                )

                // Verify token by fetching profile
                do {
                    let user = try await APIClient.shared.request(
                        AuthEndpoints.me(),
                        responseType: User.self
                    )
                    self.signIn(user: user)
                } catch {
                    // Token invalid or expired refresh → stay on login screen
                    await APIClient.shared.clearTokens()
                }
            }
        }
    }

    private func observeSessionExpiry() {
        NotificationCenter.default.addObserver(
            forName: APIClient.sessionExpiredNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.forceSignOut()
        }
    }

    func forceSignOut() {
        Task {
            await APIClient.shared.clearTokens()
        }
        currentUser = nil
        isAuthenticated = false
        hasShownPasswordReminder = false
        passwordExpiryInfo = nil
    }

    func signIn(user: User) {
        currentUser = user
        isAuthenticated = true

        // 로그인 시 비밀번호 만료 체크
        checkPasswordExpiry()

        // 로그인 시 푸시 알림 디바이스 등록
        Task {
            await PushNotificationManager.shared.onUserLoggedIn()
        }
    }

    func signOut() {
        // 로그아웃 시 푸시 알림 디바이스 해제
        Task {
            await PushNotificationManager.shared.onUserLoggedOut()
        }

        currentUser = nil
        isAuthenticated = false
        hasShownPasswordReminder = false
        passwordExpiryInfo = nil
    }

    /// 비밀번호 만료 여부 확인 및 팝업 표시
    func checkPasswordExpiry() {
        guard let user = currentUser else { return }

        // 이미 이번 세션에서 표시했으면 건너뜀
        guard !hasShownPasswordReminder else { return }

        // 최근에 "다음에 변경하기"를 선택했으면 7일간 건너뜀
        if let skippedAt = UserDefaults.standard.object(forKey: Self.passwordReminderSkipKey) as? Date {
            let daysSinceSkip = Calendar.current.dateComponents([.day], from: skippedAt, to: Date()).day ?? 0
            if daysSinceSkip < 7 {
                return
            }
        }

        // 비밀번호 변경 필요 여부 확인
        if user.needsPasswordChange {
            passwordExpiryInfo = PasswordExpiryInfo(
                daysSinceChange: user.daysSincePasswordChange ?? 90,
                passwordChangedAt: user.passwordChangedAt
            )
            showPasswordChangeReminder = true
            hasShownPasswordReminder = true
        }
    }

    /// 비밀번호 변경 권유 건너뛰기 ("다음에 변경하기" 선택 시)
    func skipPasswordReminder() {
        UserDefaults.standard.set(Date(), forKey: Self.passwordReminderSkipKey)
        showPasswordChangeReminder = false
    }

    /// 비밀번호 변경 완료 후 호출
    func onPasswordChanged() {
        showPasswordChangeReminder = false
        passwordExpiryInfo = nil
        // User 객체 갱신이 필요하면 여기서 처리
    }
}

// MARK: - Password Expiry Info

struct PasswordExpiryInfo {
    let daysSinceChange: Int
    let passwordChangedAt: Date?

    var message: String {
        if daysSinceChange >= 90 {
            return "비밀번호를 변경한 지 \(daysSinceChange)일이 지났습니다."
        }
        return "주기적인 비밀번호 변경을 권장합니다."
    }
}

// MARK: - Navigation Notification Names

extension Notification.Name {
    static let navigateToBookingDetail = Notification.Name("navigateToBookingDetail")
    static let navigateToFriendRequests = Notification.Name("navigateToFriendRequests")
    static let navigateToFriendsList = Notification.Name("navigateToFriendsList")
    static let navigateToChatRoom = Notification.Name("navigateToChatRoom")
}
