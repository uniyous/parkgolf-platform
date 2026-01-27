import SwiftUI

// MARK: - Notifications View

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Content
                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    loadingView
                } else if viewModel.notifications.isEmpty {
                    emptyView
                } else {
                    notificationsList
                }
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }

            ToolbarItem(placement: .principal) {
                Text("알림")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            if viewModel.unreadCount > 0 {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task {
                            await viewModel.markAllAsRead()
                        }
                    } label: {
                        Text("모두 읽음")
                            .font(.parkLabelSmall)
                            .foregroundStyle(Color.parkPrimary)
                    }
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .task {
            await viewModel.loadNotifications()
        }
        .refreshable {
            await viewModel.loadNotifications()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: ParkSpacing.md) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(1.2)

            Text("알림을 불러오는 중...")
                .font(.parkBodyMedium)
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: ParkSpacing.md) {
            Image(systemName: "bell.slash")
                .font(.system(size: 48))
                .foregroundStyle(.white.opacity(0.5))

            Text("알림이 없습니다")
                .font(.parkHeadlineMedium)
                .foregroundStyle(.white)

            Text("새로운 알림이 도착하면 여기에 표시됩니다")
                .font(.parkBodySmall)
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
        }
        .padding(ParkSpacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Notifications List

    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.sm) {
                ForEach(viewModel.notifications) { notification in
                    NotificationRow(
                        notification: notification,
                        onTap: {
                            Task {
                                await viewModel.markAsRead(notification)
                                handleNotificationTap(notification)
                            }
                        },
                        onDelete: {
                            Task {
                                await viewModel.deleteNotification(notification)
                            }
                        }
                    )
                }

                // Load more indicator
                if viewModel.isLoadingMore {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .padding()
                }
            }
            .padding(ParkSpacing.md)
        }
    }

    // MARK: - Handle Notification Tap

    private func handleNotificationTap(_ notification: AppNotification) {
        // Handle navigation based on notification type
        switch notification.type {
        case .bookingConfirmed, .bookingCancelled:
            // Navigate to booking detail
            break
        case .paymentSuccess, .paymentFailed:
            // Navigate to payment detail
            break
        case .friendRequest, .friendAccepted:
            // Navigate to friends
            break
        case .chatMessage:
            // Navigate to chat room
            break
        case .systemAlert:
            // Show alert or navigate to settings
            break
        }
    }
}

// MARK: - Notification Row

struct NotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void
    let onDelete: () -> Void

    var body: some View {
        Button(action: onTap) {
            GlassCard(padding: ParkSpacing.md) {
                HStack(alignment: .top, spacing: ParkSpacing.md) {
                    // Icon
                    notificationIcon

                    // Content
                    VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                        HStack {
                            Text(notification.title)
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)
                                .lineLimit(1)

                            Spacer()

                            // Time
                            Text(DateHelper.toRelativeTime(notification.createdAt))
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Text(notification.message)
                            .font(.parkBodySmall)
                            .foregroundStyle(.white.opacity(0.7))
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)

                        // Type badge
                        HStack {
                            Text(notification.type.displayName)
                                .font(.parkCaption)
                                .foregroundStyle(iconColor.opacity(0.8))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(iconColor.opacity(0.2))
                                .clipShape(Capsule())

                            Spacer()

                            if !notification.isRead {
                                Circle()
                                    .fill(Color.parkPrimary)
                                    .frame(width: 8, height: 8)
                            }
                        }
                    }
                }
            }
            .opacity(notification.isRead ? 0.7 : 1.0)
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive, action: onDelete) {
                Label("삭제", systemImage: "trash")
            }
        }
    }

    // MARK: - Icon

    private var notificationIcon: some View {
        ZStack {
            Circle()
                .fill(iconColor.opacity(0.2))
                .frame(width: 44, height: 44)

            Image(systemName: notification.type.icon)
                .font(.system(size: 18))
                .foregroundStyle(iconColor)
        }
    }

    private var iconColor: Color {
        switch notification.type {
        case .bookingConfirmed, .paymentSuccess, .friendAccepted:
            return .parkPrimary
        case .bookingCancelled, .paymentFailed:
            return .parkError
        case .friendRequest:
            return .parkAccent
        case .chatMessage:
            return .parkInfo
        case .systemAlert:
            return .parkWarning
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        NotificationsView()
    }
}
