import SwiftUI

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    homeHeader

                    ScrollView {
                        VStack(spacing: ParkSpacing.lg) {
                            // Welcome Header
                            welcomeHeader

                            // Notifications Section
                            if viewModel.hasNotifications {
                                notificationsSection
                            }

                            // Search CTA
                            searchCTA

                            // Upcoming Bookings
                            upcomingBookingsSection

                            // Popular Clubs
                            popularClubsSection
                        }
                        .padding(.horizontal, ParkSpacing.md)
                        .padding(.bottom, ParkSpacing.xxl)
                    }
                    .refreshable {
                        await viewModel.loadData()
                    }
                }
            }
            .task {
                await viewModel.loadData()
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    private var homeHeader: some View {
        HStack {
            HStack(spacing: ParkSpacing.xs) {
                Image(systemName: "leaf.fill")
                    .foregroundStyle(Color.parkPrimary)
                Text("ParkMate")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            Spacer()

            Button {
                // Notifications
            } label: {
                Image(systemName: "bell.fill")
                    .foregroundStyle(.white)
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Welcome Header

    private var welcomeHeader: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.xs) {
            Text(greetingMessage)
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Text(weatherMessage)
                .font(.parkBodyMedium)
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, ParkSpacing.md)
    }

    private var greetingMessage: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let name = appState.currentUser?.name ?? "회원"

        if hour < 12 {
            return "좋은 아침이에요, \(name)님! ☀️"
        } else if hour < 18 {
            return "안녕하세요, \(name)님! 👋"
        } else {
            return "좋은 저녁이에요, \(name)님! 🌙"
        }
    }

    private var weatherMessage: String {
        "오늘도 파크골프하기 좋은 날이에요"
    }

    // MARK: - Notifications Section

    private var notificationsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack(spacing: ParkSpacing.sm) {
                // Friend Requests Card - NavigationLink 방식
                if viewModel.pendingFriendRequestsCount > 0 {
                    NavigationLink {
                        HomeFriendRequestsView(requests: viewModel.friendRequests)
                            .navigationTitle("친구 요청")
                            .navigationBarTitleDisplayMode(.inline)
                    } label: {
                        HomeNotificationCardLabel(
                            icon: "person.badge.plus.fill",
                            iconColor: .parkAccent,
                            title: "친구 요청",
                            count: viewModel.pendingFriendRequestsCount,
                            subtitle: latestFriendRequestName
                        )
                    }
                }

                // Unread Messages Card - NavigationLink 방식
                if viewModel.totalUnreadMessagesCount > 0 {
                    NavigationLink {
                        HomeUnreadChatsView(chatRooms: viewModel.unreadChatRooms)
                            .navigationTitle("새 메시지")
                            .navigationBarTitleDisplayMode(.inline)
                    } label: {
                        HomeNotificationCardLabel(
                            icon: "bubble.left.fill",
                            iconColor: .parkInfo,
                            title: "새 메시지",
                            count: viewModel.totalUnreadMessagesCount,
                            subtitle: latestChatRoomName
                        )
                    }
                }
            }
        }
    }

    private var latestFriendRequestName: String? {
        guard let request = viewModel.friendRequests.first else { return nil }
        return "\(request.fromUserName)님이 요청"
    }

    private var latestChatRoomName: String? {
        guard let room = viewModel.unreadChatRooms.first else { return nil }
        if let lastMessage = room.lastMessage {
            return lastMessage.content
        }
        return room.name.isEmpty ? nil : room.name
    }

    // MARK: - Search CTA

    private var searchCTA: some View {
        NavigationLink {
            GameSearchView(showTitle: false)
                .navigationTitle("라운드 예약")
                .navigationBarTitleDisplayMode(.inline)
        } label: {
            HStack {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .medium))

                Text("라운드 검색하기")
                    .font(.parkHeadlineSmall)

                Spacer()

                Image(systemName: "arrow.right")
            }
            .foregroundStyle(.white)
            .padding(ParkSpacing.md)
            .background(
                LinearGradient.parkButton
            )
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
        }
    }

    // MARK: - Upcoming Bookings Section

    private var upcomingBookingsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Text("📅 다가오는 라운드")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Spacer()

                NavigationLink {
                    MyBookingsView()
                } label: {
                    Text("전체보기")
                        .font(.parkLabelSmall)
                        .foregroundStyle(Color.parkPrimary)
                }
            }

            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if viewModel.upcomingBookings.isEmpty {
                HomeEmptyBookingCard()
            } else {
                ForEach(viewModel.upcomingBookings.prefix(3)) { booking in
                    HomeUpcomingBookingCard(booking: booking)
                }
            }
        }
    }

    // MARK: - Popular Clubs Section

    private var popularClubsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Text("🏆 이번 주 인기 골프장")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: ParkSpacing.sm) {
                    ForEach(viewModel.popularClubs) { club in
                        HomePopularClubCard(club: club)
                    }
                }
            }
        }
    }
}

// MARK: - Empty Booking Card

struct HomeEmptyBookingCard: View {
    var body: some View {
        GlassCard {
            VStack(spacing: ParkSpacing.sm) {
                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 32))
                    .foregroundStyle(.white.opacity(0.5))

                Text("예정된 라운드가 없습니다")
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.7))

                Text("새로운 라운드를 예약해보세요")
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, ParkSpacing.lg)
        }
    }
}

// MARK: - Upcoming Booking Card

struct HomeUpcomingBookingCard: View {
    let booking: BookingResponse

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                HStack {
                    StatusBadge(status: .init(from: booking.status), size: .small)
                    Spacer()
                    Text(daysUntilBooking)
                        .font(.parkLabelSmall)
                        .foregroundStyle(Color.parkAccent)
                }

                if let gameName = booking.gameName {
                    Text(gameName)
                        .font(.parkHeadlineMedium)
                        .foregroundStyle(.white)
                }

                HStack(spacing: ParkSpacing.md) {
                    Label(booking.formattedDate, systemImage: "calendar")
                    Label(booking.startTime, systemImage: "clock")
                    Label("\(booking.playerCount)명", systemImage: "person.2")
                }
                .font(.parkBodySmall)
                .foregroundStyle(.white.opacity(0.7))
            }
        }
    }

    private var daysUntilBooking: String {
        guard let bookingDate = DateHelper.fromISODateString(booking.bookingDate) else {
            return ""
        }

        let days = Calendar.current.dateComponents([.day], from: Date(), to: bookingDate).day ?? 0

        if days == 0 {
            return "오늘"
        } else if days == 1 {
            return "내일"
        } else if days < 0 {
            return ""
        } else {
            return "D-\(days)"
        }
    }
}

// MARK: - Popular Club Card

struct HomePopularClubCard: View {
    let club: Club

    var body: some View {
        GlassCard(padding: 0, cornerRadius: ParkRadius.lg) {
            VStack(alignment: .leading, spacing: 0) {
                // Image placeholder
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [Color.parkPrimary.opacity(0.3), Color.parkSecondary.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 100)
                    .overlay(
                        Image(systemName: "figure.golf")
                            .font(.system(size: 32))
                            .foregroundStyle(.white.opacity(0.5))
                    )

                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(club.name)
                        .font(.parkLabelLarge)
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    Text(club.address)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                }
                .padding(ParkSpacing.sm)
            }
            .frame(width: 160)
        }
    }
}

// MARK: - Notification Card Label (for NavigationLink)

struct HomeNotificationCardLabel: View {
    let icon: String
    let iconColor: Color
    let title: String
    let count: Int
    let subtitle: String?

    var body: some View {
        GlassCard(padding: ParkSpacing.sm) {
            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundStyle(iconColor)

                    Spacer()

                    // Badge
                    Text("\(count)")
                        .font(.parkLabelSmall)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(iconColor)
                        .clipShape(Capsule())
                }

                Text(title)
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                }
            }
        }
    }
}

// MARK: - Friend Requests View (Navigation Push)

struct HomeFriendRequestsView: View {
    let requests: [FriendRequest]

    @Environment(\.dismiss) private var dismiss
    @State private var localRequests: [FriendRequest] = []
    @State private var processingRequestId: Int?

    private let friendService = FriendService()

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            if localRequests.isEmpty {
                ContentUnavailableView(
                    "친구 요청 없음",
                    systemImage: "person.badge.plus",
                    description: Text("새로운 친구 요청이 없습니다")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: ParkSpacing.sm) {
                        ForEach(localRequests) { request in
                            HomeFriendRequestRow(
                                request: request,
                                isProcessing: processingRequestId == request.id,
                                onAccept: { acceptRequest(request) },
                                onReject: { rejectRequest(request) }
                            )
                        }
                    }
                    .padding(ParkSpacing.md)
                }
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("뒤로가기")
                    }
                    .foregroundStyle(.white)
                }
            }
        }
        .onAppear {
            localRequests = requests
        }
    }

    private func acceptRequest(_ request: FriendRequest) {
        processingRequestId = request.id
        Task {
            do {
                try await friendService.acceptFriendRequest(requestId: request.id)
                localRequests.removeAll { $0.id == request.id }
                processingRequestId = nil
            } catch {
                processingRequestId = nil
            }
        }
    }

    private func rejectRequest(_ request: FriendRequest) {
        processingRequestId = request.id
        Task {
            do {
                try await friendService.rejectFriendRequest(requestId: request.id)
                localRequests.removeAll { $0.id == request.id }
                processingRequestId = nil
            } catch {
                processingRequestId = nil
            }
        }
    }
}

struct HomeFriendRequestRow: View {
    let request: FriendRequest
    let isProcessing: Bool
    let onAccept: () -> Void
    let onReject: () -> Void

    var body: some View {
        GlassCard {
            HStack(spacing: ParkSpacing.md) {
                // Profile Image
                Circle()
                    .fill(Color.parkPrimary.opacity(0.3))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Text(String(request.fromUserName.prefix(1)))
                            .font(.parkHeadlineMedium)
                            .foregroundStyle(.white)
                    )

                // Info
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(request.fromUserName)
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    Text(request.fromUserEmail)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))

                    if let createdAt = request.createdAt {
                        Text(DateHelper.toRelativeTime(createdAt))
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }

                Spacer()

                // Actions
                if isProcessing {
                    ProgressView()
                        .tint(.white)
                } else {
                    HStack(spacing: ParkSpacing.xs) {
                        Button {
                            onReject()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.6))
                                .frame(width: 36, height: 36)
                                .background(Color.white.opacity(0.1))
                                .clipShape(Circle())
                        }

                        Button {
                            onAccept()
                        } label: {
                            Image(systemName: "checkmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.parkPrimary)
                                .clipShape(Circle())
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Unread Chats View (Navigation Push)

struct HomeUnreadChatsView: View {
    let chatRooms: [ChatRoom]

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            if chatRooms.isEmpty {
                ContentUnavailableView(
                    "새 메시지 없음",
                    systemImage: "bubble.left",
                    description: Text("읽지 않은 메시지가 없습니다")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: ParkSpacing.sm) {
                        ForEach(chatRooms) { room in
                            NavigationLink {
                                ChatRoomViewWrapper(room: room)
                            } label: {
                                HomeUnreadChatRowLabel(room: room)
                            }
                        }
                    }
                    .padding(ParkSpacing.md)
                }
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("뒤로가기")
                    }
                    .foregroundStyle(.white)
                }
            }
        }
    }
}

struct HomeUnreadChatRowLabel: View {
    let room: ChatRoom

    var body: some View {
        GlassCard {
            HStack(spacing: ParkSpacing.md) {
                // Room Icon
                Circle()
                    .fill(Color.parkInfo.opacity(0.3))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Image(systemName: room.type == .group ? "person.3.fill" : "person.fill")
                            .foregroundStyle(.white)
                    )

                // Info
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    HStack {
                        Text(room.name.isEmpty ? "채팅" : room.name)
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)

                        Spacer()

                        // Unread Badge
                        Text("\(room.unreadCount)")
                            .font(.parkLabelSmall)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.parkInfo)
                            .clipShape(Capsule())
                    }

                    if let lastMessage = room.lastMessage {
                        Text(lastMessage.content)
                            .font(.parkBodySmall)
                            .foregroundStyle(.white.opacity(0.6))
                            .lineLimit(1)
                    }

                    Text(DateHelper.toRelativeTime(room.updatedAt))
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.4))
                }

                Image(systemName: "chevron.right")
                    .foregroundStyle(.white.opacity(0.4))
            }
        }
    }
}

// HomeViewModel is defined in HomeViewModel.swift

#Preview {
    HomeView()
        .environmentObject(AppState())
}
