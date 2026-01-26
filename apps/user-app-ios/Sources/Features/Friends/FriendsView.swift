import SwiftUI

// MARK: - Friends View

struct FriendsView: View {
    @StateObject private var viewModel = FriendsViewModel()
    @StateObject private var chatViewModel = ChatListViewModel()

    // Navigation state for direct chat
    @State private var navigateToChatRoom: ChatRoom?
    @State private var isCreatingChat = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    friendsHeader

                    // Tab Selector
                    friendsTabSelector

                    // Content
                    if viewModel.isLoading && viewModel.friends.isEmpty {
                        ParkLoadingView(message: "친구 목록 불러오는 중...")
                    } else if let error = viewModel.errorMessage, viewModel.friends.isEmpty {
                        ParkErrorView(message: error) {
                            Task { await viewModel.loadAll() }
                        }
                    } else {
                        switch viewModel.selectedSegment {
                        case .friends:
                            friendsContent
                        case .requests:
                            requestsContent
                        }
                    }
                }
            }
            .sheet(isPresented: $viewModel.showAddFriendSheet) {
                AddFriendSheet(viewModel: viewModel)
            }
            .task {
                await viewModel.loadAll()
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    private var friendsHeader: some View {
        HStack(spacing: ParkSpacing.sm) {
            Text("친구")
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Spacer()

            Button {
                viewModel.showAddFriendSheet = true
            } label: {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Tab Selector

    private var friendsTabSelector: some View {
        HStack(spacing: 0) {
            ForEach(FriendsViewModel.FriendSegment.allCases, id: \.self) { segment in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.selectedSegment = segment
                    }
                } label: {
                    VStack(spacing: ParkSpacing.xs) {
                        HStack(spacing: ParkSpacing.xs) {
                            Text(segment.rawValue)

                            if segment == .requests && viewModel.pendingRequestsCount > 0 {
                                Text("\(viewModel.pendingRequestsCount)")
                                    .font(.parkCaption)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.parkError)
                                    .clipShape(Capsule())
                            }
                        }
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(viewModel.selectedSegment == segment ? .white : .white.opacity(0.5))

                        Rectangle()
                            .fill(viewModel.selectedSegment == segment ? Color.parkPrimary : Color.clear)
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
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                // Stats Card
                friendsStatsCard

                // Search Bar
                friendsSearchBar

                // Friends List
                if viewModel.filteredFriends.isEmpty {
                    if viewModel.searchQuery.isEmpty {
                        ParkEmptyStateView(
                            icon: "person.2.slash",
                            title: "아직 친구가 없습니다",
                            description: "친구를 추가하고 함께 파크골프를 즐겨보세요!",
                            actionTitle: "친구 추가"
                        ) {
                            viewModel.showAddFriendSheet = true
                        }
                    } else {
                        ParkEmptyStateView(
                            icon: "magnifyingglass",
                            title: "검색 결과가 없습니다",
                            description: "다른 이름으로 검색해보세요"
                        )
                    }
                } else {
                    ForEach(viewModel.filteredFriends) { friend in
                        FriendCard(
                            friend: friend,
                            onChat: {
                                createDirectChat(with: friend)
                            },
                            onRemove: {
                                Task {
                                    await viewModel.removeFriend(friend)
                                }
                            }
                        )
                    }
                }

                // Hidden NavigationLink for programmatic navigation
                NavigationLink(
                    destination: Group {
                        if let room = navigateToChatRoom {
                            ChatRoomViewWrapper(room: room)
                        }
                    },
                    isActive: Binding(
                        get: { navigateToChatRoom != nil },
                        set: { if !$0 { navigateToChatRoom = nil } }
                    )
                ) {
                    EmptyView()
                }
                .hidden()
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            await viewModel.loadFriends()
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

    // MARK: - Search Bar

    private var friendsSearchBar: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.white.opacity(0.5))

            TextField("친구 검색...", text: $viewModel.searchQuery)
                .foregroundStyle(.white)
                .font(.parkBodyMedium)

            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding(ParkSpacing.md)
        .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
    }

    // MARK: - Stats Card

    private var friendsStatsCard: some View {
        GlassCard {
            HStack(spacing: ParkSpacing.lg) {
                // 친구 수
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(viewModel.friends.count)")
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

                // 받은 요청
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(viewModel.receivedRequestsCount)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(viewModel.receivedRequestsCount > 0 ? Color.parkPrimary : .white)
                    Text("받은 요청")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .frame(height: 40)

                // 보낸 요청
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(viewModel.sentRequestsCount)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(viewModel.sentRequestsCount > 0 ? Color.statusPending : .white)
                    Text("보낸 요청")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Requests Content

    private var requestsContent: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.lg) {
                // 받은 요청이 없고 보낸 요청도 없으면 빈 상태 표시
                if viewModel.friendRequests.isEmpty && viewModel.sentFriendRequests.isEmpty {
                    ParkEmptyStateView(
                        icon: "person.badge.clock",
                        title: "친구 요청이 없습니다",
                        description: "친구를 추가하거나 요청이 오면 여기에 표시됩니다",
                        actionTitle: "친구 추가"
                    ) {
                        viewModel.showAddFriendSheet = true
                    }
                } else {
                    // 받은 요청 섹션
                    receivedRequestsSection

                    // 보낸 요청 섹션
                    sentRequestsSection
                }
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            await viewModel.loadFriendRequests()
            await viewModel.loadSentFriendRequests()
        }
    }

    // MARK: - Received Requests Section

    private var receivedRequestsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            // Section Header
            HStack {
                Label("받은 요청", systemImage: "envelope.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                if viewModel.receivedRequestsCount > 0 {
                    Text("\(viewModel.receivedRequestsCount)")
                        .font(.parkCaption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.parkPrimary)
                        .clipShape(Capsule())
                }

                Spacer()
            }
            .padding(.horizontal, ParkSpacing.xs)

            // Content
            if viewModel.friendRequests.isEmpty {
                // Empty state card
                GlassCard {
                    HStack(spacing: ParkSpacing.md) {
                        Image(systemName: "envelope.open")
                            .font(.system(size: 24))
                            .foregroundStyle(.white.opacity(0.4))

                        VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                            Text("받은 요청이 없습니다")
                                .font(.parkBodyMedium)
                                .foregroundStyle(.white.opacity(0.7))
                            Text("친구 요청이 오면 여기에 표시됩니다")
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Spacer()
                    }
                }
            } else {
                ForEach(viewModel.friendRequests) { request in
                    FriendRequestCard(
                        request: request,
                        onAccept: {
                            Task {
                                await viewModel.acceptFriendRequest(request)
                            }
                        },
                        onReject: {
                            Task {
                                await viewModel.rejectFriendRequest(request)
                            }
                        }
                    )
                }
            }
        }
    }

    // MARK: - Sent Requests Section

    private var sentRequestsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            // Section Header
            HStack {
                Label("보낸 요청", systemImage: "paperplane.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                if viewModel.sentRequestsCount > 0 {
                    Text("\(viewModel.sentRequestsCount)")
                        .font(.parkCaption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.statusPending)
                        .clipShape(Capsule())
                }

                Spacer()
            }
            .padding(.horizontal, ParkSpacing.xs)

            // Content
            if viewModel.sentFriendRequests.isEmpty {
                // Empty state card
                GlassCard {
                    HStack(spacing: ParkSpacing.md) {
                        Image(systemName: "paperplane")
                            .font(.system(size: 24))
                            .foregroundStyle(.white.opacity(0.4))

                        VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                            Text("보낸 요청이 없습니다")
                                .font(.parkBodyMedium)
                                .foregroundStyle(.white.opacity(0.7))
                            Text("친구 요청을 보내면 여기에 표시됩니다")
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Spacer()
                    }
                }
            } else {
                ForEach(viewModel.sentFriendRequests) { request in
                    SentRequestCard(request: request)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    FriendsView()
}
