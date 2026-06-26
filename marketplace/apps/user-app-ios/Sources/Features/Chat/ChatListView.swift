import SwiftUI

// MARK: - Chat List View

struct ChatListView: View {
    @StateObject private var viewModel = ChatListViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    chatHeader

                    // Content
                    if viewModel.isLoading && viewModel.chatRooms.isEmpty {
                        ParkLoadingView(message: "채팅 목록 불러오는 중...")
                    } else if viewModel.chatRooms.isEmpty {
                        ParkEmptyStateView(
                            icon: "message.badge.filled.fill",
                            title: "채팅이 없습니다",
                            description: "친구를 초대하고 대화를 시작해보세요",
                            actionTitle: "새 채팅"
                        ) {
                            viewModel.showNewChatSheet = true
                        }
                    } else {
                        chatList
                    }
                }
            }
            .sheet(isPresented: $viewModel.showNewChatSheet) {
                NewChatSheet()
            }
            .task {
                await viewModel.loadChatRooms()
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    private var chatHeader: some View {
        HStack {
            Text("채팅")
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Spacer()

            Button {
                viewModel.showNewChatSheet = true
            } label: {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
        .padding(.bottom, ParkSpacing.md)
    }

    // MARK: - Chat List

    private var chatList: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                ForEach(viewModel.chatRooms) { room in
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
            await viewModel.loadChatRooms()
        }
    }
}

// MARK: - Chat Room Card

struct ChatRoomCard: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState

    private var displayName: String {
        room.displayName(currentUserId: appState.currentUser?.stringId ?? "")
    }

    var body: some View {
        GlassCard(padding: 0) {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                chatAvatar

                // Content
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    HStack {
                        Text(displayName)
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)
                            .lineLimit(1)

                        Spacer()

                        if let lastMessage = room.lastMessage {
                            Text(DateHelper.toChatTime(lastMessage.createdAt))
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }

                    HStack {
                        if let lastMessage = room.lastMessage {
                            Text(lastMessage.content)
                                .font(.parkBodySmall)
                                .foregroundStyle(.white.opacity(0.6))
                                .lineLimit(1)
                        } else {
                            Text("대화를 시작해보세요")
                                .font(.parkBodySmall)
                                .foregroundStyle(.white.opacity(0.4))
                        }

                        Spacer()

                        if room.unreadCount > 0 {
                            Text("\(room.unreadCount)")
                                .font(.parkCaption)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.parkPrimary)
                                .clipShape(Capsule())
                        }
                    }
                }

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.3))
            }
            .padding(ParkSpacing.md)
        }
    }

    private var chatAvatar: some View {
        ZStack {
            Circle()
                .fill(Color.parkPrimary.opacity(0.3))
                .frame(width: 50, height: 50)

            switch room.type {
            case .channel, .booking:
                Image(systemName: "person.3.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(.white)
            case .direct:
                Text(String(displayName.prefix(1)))
                    .font(.parkHeadlineLarge)
                    .foregroundStyle(.white)
            }
        }
    }
}

// MARK: - New Chat Sheet

struct NewChatSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = NewChatViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    switch viewModel.step {
                    case .select:
                        selectStepContent
                    case .name:
                        nameStepContent
                    }
                }
            }
            .navigationTitle(viewModel.step == .select ? "새 채팅" : "그룹 만들기")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if viewModel.step == .name {
                        Button {
                            viewModel.goBack()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("뒤로")
                            }
                            .foregroundStyle(.white)
                        }
                    } else {
                        Button("취소") {
                            dismiss()
                        }
                        .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .navigationDestination(item: $viewModel.createdRoom) { room in
                ChatRoomViewWrapper(room: room)
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task {
            await viewModel.loadFriends()
        }
    }

    // MARK: - Select Step

    private var selectStepContent: some View {
        VStack(spacing: 0) {
            // Search Bar
            HStack(spacing: ParkSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.white.opacity(0.5))

                TextField("친구 검색", text: $viewModel.searchQuery)
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
            .padding(ParkSpacing.md)

            // Selected Friends Chips
            if !viewModel.selectedFriends.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: ParkSpacing.xs) {
                        ForEach(viewModel.selectedFriends) { friend in
                            HStack(spacing: 4) {
                                Text(friend.friendName)
                                    .font(.parkCaption)
                                    .foregroundStyle(.white)

                                Button {
                                    viewModel.toggleFriend(friend)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(.white.opacity(0.6))
                                }
                            }
                            .padding(.horizontal, ParkSpacing.sm)
                            .padding(.vertical, ParkSpacing.xxs)
                            .background(Color.parkPrimary.opacity(0.4))
                            .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, ParkSpacing.md)
                }
                .padding(.bottom, ParkSpacing.sm)
            }

            // Friends List
            if viewModel.isLoading {
                ParkLoadingView(message: "친구 목록 불러오는 중...")
            } else if viewModel.filteredFriends.isEmpty {
                ParkEmptyStateView(
                    icon: viewModel.searchQuery.isEmpty ? "person.2" : "magnifyingglass",
                    title: viewModel.searchQuery.isEmpty ? "친구가 없습니다" : "검색 결과 없음",
                    description: viewModel.searchQuery.isEmpty ?
                        "친구를 추가하고 대화를 시작해보세요" :
                        "다른 검색어로 시도해보세요"
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: ParkSpacing.md) {
                        ForEach(viewModel.filteredFriends) { friend in
                            Button {
                                viewModel.toggleFriend(friend)
                            } label: {
                                FriendSelectCard(
                                    friend: friend,
                                    isSelected: viewModel.isFriendSelected(friend)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(ParkSpacing.md)
                }
            }

            // Bottom Action Button
            if !viewModel.selectedFriends.isEmpty {
                Button {
                    viewModel.handleNext()
                } label: {
                    Text(viewModel.selectedFriends.count == 1
                         ? "채팅 시작"
                         : "다음 (\(viewModel.selectedFriends.count)명)")
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, ParkSpacing.sm)
                        .background(Color.parkPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
                }
                .disabled(viewModel.isCreating)
                .padding(ParkSpacing.md)
            }
        }
    }

    // MARK: - Name Step

    private var nameStepContent: some View {
        VStack(spacing: ParkSpacing.md) {
            // Selected Members Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: ParkSpacing.xs) {
                    ForEach(viewModel.selectedFriends) { friend in
                        Text(friend.friendName)
                            .font(.parkCaption)
                            .foregroundStyle(.white)
                            .padding(.horizontal, ParkSpacing.sm)
                            .padding(.vertical, ParkSpacing.xxs)
                            .background(Color.parkPrimary.opacity(0.4))
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, ParkSpacing.md)

            // Group Name Input
            HStack(spacing: ParkSpacing.sm) {
                Image(systemName: "pencil")
                    .foregroundStyle(.white.opacity(0.5))

                TextField("그룹 이름 (선택)", text: $viewModel.groupName)
                    .foregroundStyle(.white)
                    .font(.parkBodyMedium)
            }
            .padding(ParkSpacing.md)
            .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
            .padding(.horizontal, ParkSpacing.md)

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.parkCaption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, ParkSpacing.md)
            }

            Spacer()

            // Create Button
            Button {
                viewModel.createGroupChat(currentUserName: appState.currentUser?.name)
            } label: {
                HStack {
                    if viewModel.isCreating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("만들기")
                    }
                }
                .font(.parkHeadlineSmall)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, ParkSpacing.sm)
                .background(
                    Color.parkPrimary
                )
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
            }
            .disabled(viewModel.isCreating)
            .padding(ParkSpacing.md)
        }
        .padding(.top, ParkSpacing.md)
    }
}

// MARK: - Friend Select Card

struct FriendSelectCard: View {
    let friend: Friend
    var isSelected: Bool = false

    var body: some View {
        GlassCard(padding: 0) {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                ZStack {
                    AvatarCircle(name: friend.friendName)
                }

                // Info
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(friend.friendName)
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    Text(friend.friendEmail)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                // Checkmark
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? Color.parkPrimary : .white.opacity(0.3))
            }
            .padding(ParkSpacing.md)
        }
    }
}

// MARK: - Preview

#Preview {
    ChatListView()
}
