import SwiftUI

// MARK: - Notification Settings View

struct NotificationSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = NotificationSettingsViewModel()

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            if viewModel.isLoading {
                ParkLoadingView(message: "설정 불러오는 중...")
            } else {
                ScrollView {
                    VStack(spacing: ParkSpacing.md) {
                        // 시스템 알림 권한 배너
                        if !viewModel.systemNotificationEnabled {
                            systemPermissionBanner
                        }

                        // 서비스 알림 섹션
                        serviceNotificationSection

                        // 마케팅 알림 섹션
                        marketingNotificationSection
                    }
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.top, ParkSpacing.sm)
                }
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
        .task {
            await viewModel.loadSettings()
        }
        .alert("오류", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("확인") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    // MARK: - System Permission Banner

    private var systemPermissionBanner: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                HStack(spacing: ParkSpacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(Color.parkWarning)

                    Text("알림 권한이 꺼져있습니다")
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    Spacer()
                }

                Text("알림을 받으려면 시스템 설정에서 알림을 허용해주세요.")
                    .font(.parkBodySmall)
                    .foregroundStyle(.white.opacity(0.7))

                Button {
                    viewModel.openSystemSettings()
                } label: {
                    HStack {
                        Image(systemName: "gear")
                        Text("설정으로 이동")
                    }
                    .font(.parkLabelMedium)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, ParkSpacing.sm)
                    .background(Color.parkPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                }
            }
        }
    }

    // MARK: - Service Notification Section

    private var serviceNotificationSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                SectionHeader(title: "서비스 알림", icon: "bell.fill")

                NotificationToggleRow(
                    icon: "calendar.badge.clock",
                    iconColor: .parkPrimary,
                    title: "예약 알림",
                    description: "예약 확정, 취소, 리마인더",
                    isOn: Binding(
                        get: { viewModel.settings.booking },
                        set: { newValue in
                            Task { await viewModel.updateBooking(newValue) }
                        }
                    ),
                    isDisabled: !viewModel.systemNotificationEnabled
                )

                NotificationToggleRow(
                    icon: "bubble.left.and.bubble.right.fill",
                    iconColor: .parkInfo,
                    title: "채팅 알림",
                    description: "새 메시지 알림",
                    isOn: Binding(
                        get: { viewModel.settings.chat },
                        set: { newValue in
                            Task { await viewModel.updateChat(newValue) }
                        }
                    ),
                    isDisabled: !viewModel.systemNotificationEnabled
                )

                NotificationToggleRow(
                    icon: "person.2.fill",
                    iconColor: .parkAccent,
                    title: "친구 알림",
                    description: "친구 요청, 수락 알림",
                    isOn: Binding(
                        get: { viewModel.settings.friend },
                        set: { newValue in
                            Task { await viewModel.updateFriend(newValue) }
                        }
                    ),
                    isDisabled: !viewModel.systemNotificationEnabled
                )
            }
        }
    }

    // MARK: - Marketing Notification Section

    private var marketingNotificationSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                SectionHeader(title: "마케팅", icon: "megaphone.fill")

                NotificationToggleRow(
                    icon: "tag.fill",
                    iconColor: .parkWarning,
                    title: "마케팅 알림",
                    description: "이벤트, 프로모션 정보",
                    isOn: Binding(
                        get: { viewModel.settings.marketing },
                        set: { newValue in
                            Task { await viewModel.updateMarketing(newValue) }
                        }
                    ),
                    isDisabled: !viewModel.systemNotificationEnabled
                )
            }
        }
    }
}

// MARK: - Notification Toggle Row

struct NotificationToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String
    @Binding var isOn: Bool
    var isDisabled: Bool = false

    var body: some View {
        HStack(spacing: ParkSpacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(iconColor.opacity(0.2))
                    .frame(width: 40, height: 40)

                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(iconColor)
            }

            // Text
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white)

                Text(description)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.6))
            }

            Spacer()

            // Toggle
            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(Color.parkPrimary)
                .disabled(isDisabled)
                .opacity(isDisabled ? 0.5 : 1.0)
        }
        .padding(.vertical, ParkSpacing.xs)
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView()
    }
}
