import SwiftUI

// MARK: - Social View (Friends + Chat Combined)

struct SocialView: View {
    @State private var selectedSegment: SocialSegment = .friends
    @StateObject private var friendsViewModel = FriendsViewModel()
    @StateObject private var chatViewModel = ChatListViewModel()

    // Navigation state for direct chat
    @State private var navigateToChatRoom: ChatRoom?
    @State private var isCreatingChat = false

    enum SocialSegment: String, CaseIterable {
        case friends = "친구"
        case chat = "채팅"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    socialHeader

                    // Segment Control
                    segmentControl

                    // Content
                    switch selectedSegment {
                    case .friends:
                        friendsContent
                    case .chat:
                        chatContent
                    }
                }
            }
            .sheet(isPresented: $friendsViewModel.showAddFriendSheet) {
                AddFriendSheet(viewModel: friendsViewModel)
            }
            .sheet(isPresented: $chatViewModel.showNewChatSheet) {
                NewChatSheet()
            }
            .task {
                await friendsViewModel.loadAll()
                await chatViewModel.loadChatRooms()
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    private var socialHeader: some View {
        HStack(spacing: ParkSpacing.sm) {
            Text("소셜")
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Spacer()

            // Right button changes based on segment
            if selectedSegment == .friends {
                Button {
                    friendsViewModel.showAddFriendSheet = true
                } label: {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
            } else {
                Button {
                    chatViewModel.showNewChatSheet = true
                } label: {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Segment Control

    private var segmentControl: some View {
        HStack(spacing: 0) {
            ForEach(SocialSegment.allCases, id: \.self) { segment in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedSegment = segment
                    }
                } label: {
                    VStack(spacing: ParkSpacing.xs) {
                        HStack(spacing: ParkSpacing.xs) {
                            Text(segment.rawValue)

                            // Badge for pending requests
                            if segment == .friends && friendsViewModel.pendingRequestsCount > 0 {
                                Text("\(friendsViewModel.pendingRequestsCount)")
                                    .font(.parkCaption)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.parkError)
                                    .clipShape(Capsule())
                            }

                            // Badge for unread messages
                            if segment == .chat && chatViewModel.totalUnreadCount > 0 {
                                Text("\(chatViewModel.totalUnreadCount)")
                                    .font(.parkCaption)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.parkPrimary)
                                    .clipShape(Capsule())
                            }
                        }
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(selectedSegment == segment ? .white : .white.opacity(0.5))

                        Rectangle()
                            .fill(selectedSegment == segment ? Color.parkPrimary : Color.clear)
                            .frame(height: 3)
                            .clipShape(Capsule())
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.md)
    }

    // MARK: - Friends Content

    private var friendsContent: some View {
        Group {
            if friendsViewModel.isLoading && friendsViewModel.friends.isEmpty {
                ParkLoadingView(message: "친구 목록 불러오는 중...")
            } else if let error = friendsViewModel.errorMessage, friendsViewModel.friends.isEmpty {
                ParkErrorView(message: error) {
                    Task { await friendsViewModel.loadAll() }
                }
            } else {
                VStack(spacing: 0) {
                    // Stats Card (탭 위에 고정)
                    friendsStatsCard
                        .padding(.horizontal, ParkSpacing.md)
                        .padding(.top, ParkSpacing.md)

                    // Sub Tab (칩 스타일)
                    friendsSubTabSelector
                        .padding(.horizontal, ParkSpacing.md)
                        .padding(.top, ParkSpacing.sm)

                    // Content based on selected sub tab
                    switch friendsViewModel.selectedSegment {
                    case .friends:
                        friendsListContent
                    case .requests:
                        requestsListContent
                    }
                }
            }
        }
    }

    // MARK: - Friends Sub Tab Selector (칩 스타일)

    private var friendsSubTabSelector: some View {
        HStack(spacing: ParkSpacing.sm) {
            ForEach(FriendsViewModel.FriendSegment.allCases, id: \.self) { segment in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        friendsViewModel.selectedSegment = segment
                    }
                } label: {
                    HStack(spacing: ParkSpacing.xs) {
                        Text(segment.rawValue)
                            .font(.parkBodyMedium)
                            .fontWeight(friendsViewModel.selectedSegment == segment ? .semibold : .regular)

                        // Badge for requests
                        if segment == .requests && friendsViewModel.pendingRequestsCount > 0 {
                            Text("\(friendsViewModel.pendingRequestsCount)")
                                .font(.parkCaption)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.parkPrimary)
                                .clipShape(Capsule())
                        }
                    }
                    .foregroundStyle(friendsViewModel.selectedSegment == segment ? Color.parkPrimary : .white.opacity(0.6))
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.vertical, ParkSpacing.sm)
                    .background(
                        friendsViewModel.selectedSegment == segment
                            ? Color.parkPrimary.opacity(0.2)
                            : Color.clear
                    )
                    .clipShape(Capsule())
                }
            }

            Spacer()
        }
    }

    // MARK: - Friends List Content (친구 탭)

    private var friendsListContent: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                // Search Bar
                friendsSearchBar

                // Friends List
                friendsListSection
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            await friendsViewModel.loadAll()
        }
    }

    // MARK: - Requests List Content (요청 탭)

    private var requestsListContent: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.lg) {
                if friendsViewModel.friendRequests.isEmpty && friendsViewModel.sentFriendRequests.isEmpty {
                    ParkEmptyStateView(
                        icon: "person.badge.clock",
                        title: "친구 요청이 없습니다",
                        description: "친구를 추가하거나 요청이 오면 여기에 표시됩니다",
                        actionTitle: "친구 추가"
                    ) {
                        friendsViewModel.showAddFriendSheet = true
                    }
                } else {
                    // Received Requests
                    receivedRequestsSection

                    // Sent Requests
                    sentRequestsSection
                }
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            await friendsViewModel.loadAll()
        }
    }

    // MARK: - Friends Search Bar

    private var friendsSearchBar: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.white.opacity(0.5))

            TextField("친구 검색...", text: $friendsViewModel.searchQuery)
                .foregroundStyle(.white)
                .font(.parkBodyMedium)

            if !friendsViewModel.searchQuery.isEmpty {
                Button {
                    friendsViewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding(ParkSpacing.md)
        .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
    }

    // MARK: - Friends Stats Card

    private var friendsStatsCard: some View {
        GlassCard {
            HStack(spacing: ParkSpacing.lg) {
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(friendsViewModel.friends.count)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(.white)
                    Text("친구")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .frame(height: 40)

                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(friendsViewModel.receivedRequestsCount)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(friendsViewModel.receivedRequestsCount > 0 ? Color.parkPrimary : .white)
                    Text("받은 요청")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .frame(height: 40)

                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(friendsViewModel.sentRequestsCount)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(friendsViewModel.sentRequestsCount > 0 ? Color.statusPending : .white)
                    Text("보낸 요청")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Received Requests Section

    private var receivedRequestsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Label("받은 요청", systemImage: "envelope.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Text("\(friendsViewModel.receivedRequestsCount)")
                    .font(.parkCaption)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.parkPrimary)
                    .clipShape(Capsule())

                Spacer()
            }
            .padding(.horizontal, ParkSpacing.xs)

            ForEach(friendsViewModel.friendRequests) { request in
                FriendRequestCard(
                    request: request,
                    onAccept: {
                        Task {
                            await friendsViewModel.acceptFriendRequest(request)
                        }
                    },
                    onReject: {
                        Task {
                            await friendsViewModel.rejectFriendRequest(request)
                        }
                    }
                )
            }
        }
    }

    // MARK: - Sent Requests Section

    private var sentRequestsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Label("보낸 요청", systemImage: "paperplane.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Text("\(friendsViewModel.sentRequestsCount)")
                    .font(.parkCaption)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.statusPending)
                    .clipShape(Capsule())

                Spacer()
            }
            .padding(.horizontal, ParkSpacing.xs)

            ForEach(friendsViewModel.sentFriendRequests) { request in
                SentRequestCard(request: request)
            }
        }
    }

    // MARK: - Friends List Section

    private var friendsListSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            if friendsViewModel.filteredFriends.isEmpty {
                if friendsViewModel.searchQuery.isEmpty {
                    ParkEmptyStateView(
                        icon: "person.2.slash",
                        title: "아직 친구가 없습니다",
                        description: "친구를 추가하고 함께 파크골프를 즐겨보세요!",
                        actionTitle: "친구 추가"
                    ) {
                        friendsViewModel.showAddFriendSheet = true
                    }
                } else {
                    ParkEmptyStateView(
                        icon: "magnifyingglass",
                        title: "검색 결과가 없습니다",
                        description: "다른 이름으로 검색해보세요"
                    )
                }
            } else {
                ForEach(friendsViewModel.filteredFriends) { friend in
                    FriendCard(
                        friend: friend,
                        onChat: {
                            createDirectChat(with: friend)
                        },
                        onRemove: {
                            Task {
                                await friendsViewModel.removeFriend(friend)
                            }
                        }
                    )
                }
            }

        }
        .navigationDestination(item: $navigateToChatRoom) { room in
            ChatRoomViewWrapper(room: room)
        }
        .overlay {
            if isCreatingChat {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .overlay {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                    }
            }
        }
    }

    // MARK: - Create Direct Chat

    private func createDirectChat(with friend: Friend) {
        guard !isCreatingChat else { return }

        isCreatingChat = true

        Task {
            if let room = await chatViewModel.createChatRoom(
                name: friend.friendName,
                type: .direct,
                participantIds: [String(friend.friendId)]
            ) {
                await MainActor.run {
                    navigateToChatRoom = room
                    isCreatingChat = false
                }
            } else {
                await MainActor.run {
                    isCreatingChat = false
                }
            }
        }
    }

    // MARK: - Chat Content

    private var chatContent: some View {
        Group {
            if chatViewModel.isLoading && chatViewModel.chatRooms.isEmpty {
                ParkLoadingView(message: "채팅 목록 불러오는 중...")
            } else if chatViewModel.chatRooms.isEmpty {
                ParkEmptyStateView(
                    icon: "message.badge.filled.fill",
                    title: "채팅이 없습니다",
                    description: "친구를 초대하고 대화를 시작해보세요",
                    actionTitle: "새 채팅"
                ) {
                    chatViewModel.showNewChatSheet = true
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: ParkSpacing.md) {
                        ForEach(chatViewModel.chatRooms) { room in
                            NavigationLink {
                                ChatRoomViewWrapper(room: room)
                            } label: {
                                ChatRoomCard(room: room)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(ParkSpacing.md)
                }
                .refreshable {
                    await chatViewModel.loadChatRooms()
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    SocialView()
}
