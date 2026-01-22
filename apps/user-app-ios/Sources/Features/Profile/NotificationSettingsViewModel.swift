import Foundation
import UserNotifications

@MainActor
class NotificationSettingsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var settings: NotificationSettings = .default
    @Published var isLoading = false
    @Published var errorMessage: String?

    // iOS 시스템 알림 권한 상태
    @Published var systemNotificationEnabled = false
    @Published var isCheckingPermission = false

    // MARK: - Private Properties

    private let settingsService = SettingsService()

    // MARK: - Load Settings

    func loadSettings() async {
        isLoading = true
        errorMessage = nil

        // 시스템 알림 권한 확인
        await checkSystemNotificationPermission()

        // 서버에서 설정 로드
        do {
            settings = try await settingsService.getNotificationSettings()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Update Settings

    func updateBooking(_ enabled: Bool) async {
        let previousValue = settings.booking
        settings.booking = enabled

        do {
            settings = try await settingsService.updateBookingNotification(enabled)
        } catch {
            settings.booking = previousValue
            errorMessage = error.localizedDescription
        }
    }

    func updateChat(_ enabled: Bool) async {
        let previousValue = settings.chat
        settings.chat = enabled

        do {
            settings = try await settingsService.updateChatNotification(enabled)
        } catch {
            settings.chat = previousValue
            errorMessage = error.localizedDescription
        }
    }

    func updateFriend(_ enabled: Bool) async {
        let previousValue = settings.friend
        settings.friend = enabled

        do {
            settings = try await settingsService.updateFriendNotification(enabled)
        } catch {
            settings.friend = previousValue
            errorMessage = error.localizedDescription
        }
    }

    func updateMarketing(_ enabled: Bool) async {
        let previousValue = settings.marketing
        settings.marketing = enabled

        do {
            settings = try await settingsService.updateMarketingNotification(enabled)
        } catch {
            settings.marketing = previousValue
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - System Notification Permission

    func checkSystemNotificationPermission() async {
        isCheckingPermission = true

        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        systemNotificationEnabled = settings.authorizationStatus == .authorized

        isCheckingPermission = false
    }

    func requestNotificationPermission() async {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            systemNotificationEnabled = granted
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}
