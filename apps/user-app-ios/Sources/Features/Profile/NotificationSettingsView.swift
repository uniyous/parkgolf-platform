import SwiftUI

// MARK: - Notification Settings View

struct NotificationSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var bookingNotification = true
    @State private var chatNotification = true
    @State private var friendNotification = true
    @State private var marketingNotification = false

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.md) {
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "서비스 알림", icon: "bell.fill")

                            NotificationToggleRow(
                                icon: "calendar.badge.clock",
                                iconColor: .parkPrimary,
                                title: "예약 알림",
                                description: "예약 확정, 취소, 리마인더",
                                isOn: $bookingNotification
                            )

                            NotificationToggleRow(
                                icon: "bubble.left.and.bubble.right.fill",
                                iconColor: .parkInfo,
                                title: "채팅 알림",
                                description: "새 메시지 알림",
                                isOn: $chatNotification
                            )

                            NotificationToggleRow(
                                icon: "person.2.fill",
                                iconColor: .parkAccent,
                                title: "친구 알림",
                                description: "친구 요청, 수락 알림",
                                isOn: $friendNotification
                            )
                        }
                    }

                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "마케팅", icon: "megaphone.fill")

                            NotificationToggleRow(
                                icon: "tag.fill",
                                iconColor: .parkWarning,
                                title: "마케팅 알림",
                                description: "이벤트, 프로모션 정보",
                                isOn: $marketingNotification
                            )
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.top, ParkSpacing.sm)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("알림 설정")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView()
    }
}
