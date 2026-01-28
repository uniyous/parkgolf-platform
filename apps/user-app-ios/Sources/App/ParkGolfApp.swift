import SwiftUI
import Foundation

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
    }

    private func checkAuthenticationStatus() {
        // TODO: Check keychain for stored token
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
