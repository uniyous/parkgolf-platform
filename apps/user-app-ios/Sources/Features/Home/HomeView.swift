import SwiftUI

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = HomeViewModel()
    @ObservedObject private var locationManager = LocationManager.shared

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

                            // Weather Card
                            if let weather = viewModel.currentWeather {
                                weatherCard(weather: weather)
                            }

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
                        await viewModel.refresh()
                    }
                }
            }
            .task {
                locationManager.requestPermission()
                await viewModel.loadData()
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    private var homeHeader: some View {
        HStack {
            HStack(spacing: ParkSpacing.xs) {
                Image(uiImage: UIImage(named: "AppIcon") ?? UIImage())
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 32, height: 32)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                HStack(spacing: 0) {
                    Text("Parkgolf")
                        .foregroundStyle(.white)
                    Text("Mate")
                        .foregroundStyle(Color(hex: "f5c842"))
                }
                .font(.system(size: 20, weight: .bold, design: .rounded))
            }

            Spacer()

            NavigationLink {
                NotificationsView()
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.white)

                    // Badge
                    if viewModel.totalNotificationBadgeCount > 0 {
                        Text(viewModel.totalNotificationBadgeCount > 99 ? "99+" : "\(viewModel.totalNotificationBadgeCount)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color.parkError)
                            .clipShape(Capsule())
                            .offset(x: 8, y: -8)
                    }
                }
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

    // MARK: - Weather Card

    private func weatherCard(weather: CurrentWeather) -> some View {
        GlassCard {
            HStack {
                HStack(spacing: ParkSpacing.md) {
                    // Weather icon
                    ZStack {
                        Circle()
                            .fill(Color.parkAccent.opacity(0.2))
                            .frame(width: 48, height: 48)

                        Image(systemName: weather.weatherIcon)
                            .font(.system(size: 22))
                            .foregroundStyle(Color.parkAccent)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        if let region = viewModel.regionName {
                            Text(region)
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        Text("\(Int(weather.temperature))°C")
                            .font(.parkDisplaySmall)
                            .foregroundStyle(.white)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(weather.weatherDescription)
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    HStack(spacing: ParkSpacing.sm) {
                        Label("\(Int(weather.humidity))%", systemImage: "humidity.fill")
                        Label(String(format: "%.1fm/s", weather.windSpeed), systemImage: "wind")
                    }
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
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
            RoundBookingView(showTitle: false)
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

    // MARK: - Nearby Clubs Section

    private var popularClubsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Label("주변 골프장", systemImage: "mappin.circle.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Spacer()
            }

            if !viewModel.nearbyClubs.isEmpty {
                // 주변 골프장 목록
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: ParkSpacing.sm) {
                        ForEach(viewModel.nearbyClubs) { club in
                            NavigationLink {
                                ClubDetailView(clubId: club.id)
                            } label: {
                                HomeNearbyClubCard(club: club)
                            }
                        }
                    }
                }
            } else if !viewModel.hasLocation && viewModel.locationDataLoaded {
                // 위치 권한 없음
                GlassCard {
                    VStack(spacing: ParkSpacing.sm) {
                        Image(systemName: "location.slash.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(.white.opacity(0.5))

                        Text("위치 정보를 사용할 수 없습니다")
                            .font(.parkBodyMedium)
                            .foregroundStyle(.white.opacity(0.7))

                        Text("설정에서 위치 권한을 허용해주세요")
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, ParkSpacing.md)
                }
            } else if viewModel.hasLocation && viewModel.locationDataLoaded {
                // 위치는 있지만 주변 골프장 없음
                GlassCard {
                    VStack(spacing: ParkSpacing.sm) {
                        Image(systemName: "mappin.slash")
                            .font(.system(size: 32))
                            .foregroundStyle(.white.opacity(0.5))

                        Text("주변에 골프장이 없습니다")
                            .font(.parkBodyMedium)
                            .foregroundStyle(.white.opacity(0.7))

                        Text("반경 30km 내 등록된 골프장이 없습니다")
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, ParkSpacing.md)
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

// MARK: - Nearby Club Card

struct HomeNearbyClubCard: View {
    let club: NearbyClub

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

                    Text(club.location)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)

                    HStack(spacing: ParkSpacing.xxs) {
                        Image(systemName: "location.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.parkPrimary)
                        Text(String(format: "%.1fkm", club.distance))
                            .font(.parkCaption)
                            .foregroundStyle(.white)
                    }
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
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }

            ToolbarItem(placement: .principal) {
                Text("친구 요청")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
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
                AvatarCircle(name: request.fromUserName)

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
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }

            ToolbarItem(placement: .principal) {
                Text("새 메시지")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
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
                        Image(systemName: room.type == .channel ? "person.3.fill" : "person.fill")
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
