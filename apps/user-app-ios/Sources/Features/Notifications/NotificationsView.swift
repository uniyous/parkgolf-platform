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
                // Filter Tabs
                filterTabs
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.top, ParkSpacing.sm)

                // Content
                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    loadingView
                } else if viewModel.filteredNotifications.isEmpty {
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

    // MARK: - Filter Tabs

    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ParkSpacing.sm) {
                ForEach(NotificationFilter.allCases) { filter in
                    NotificationFilterChip(
                        filter: filter,
                        isSelected: viewModel.selectedFilter == filter,
                        unreadCount: viewModel.unreadCounts[filter] ?? 0
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.selectedFilter = filter
                        }
                    }
                }
            }
            .padding(.vertical, ParkSpacing.xs)
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
        let message = viewModel.emptyMessage(for: viewModel.selectedFilter)

        return VStack(spacing: ParkSpacing.md) {
            Image(systemName: "bell.slash")
                .font(.system(size: 48))
                .foregroundStyle(.white.opacity(0.5))

            Text(message.title)
                .font(.parkHeadlineMedium)
                .foregroundStyle(.white)

            Text(message.description)
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
                ForEach(viewModel.filteredNotifications) { notification in
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

// MARK: - Notification Filter Chip

struct NotificationFilterChip: View {
    let filter: NotificationFilter
    let isSelected: Bool
    let unreadCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: ParkSpacing.xs) {
                Image(systemName: filter.icon)
                    .font(.system(size: 14))

                Text(filter.rawValue)
                    .font(.parkLabelMedium)

                if unreadCount > 0 {
                    Text(unreadCount > 99 ? "99+" : "\(unreadCount)")
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            isSelected
                                ? Color.white
                                : Color.parkError
                        )
                        .foregroundStyle(
                            isSelected
                                ? Color.parkPrimary
                                : Color.white
                        )
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, ParkSpacing.md)
            .padding(.vertical, ParkSpacing.sm)
            .background(
                isSelected
                    ? Color.parkPrimary
                    : Color.white.opacity(0.1)
            )
            .foregroundStyle(
                isSelected
                    ? Color.white
                    : Color.white.opacity(0.7)
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
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
