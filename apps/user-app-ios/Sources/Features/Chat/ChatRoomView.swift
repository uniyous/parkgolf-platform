import SwiftUI

struct ChatRoomView: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: ChatRoomViewModel
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isInputFocused: Bool
    @State private var showInviteSheet = false

    init(room: ChatRoom, currentUserId: String) {
        self.room = room
        self._viewModel = StateObject(wrappedValue: ChatRoomViewModel(
            roomId: room.id,
            currentUserId: currentUserId
        ))
    }

    var body: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Connection status indicator
                if !viewModel.isConnected {
                    connectionStatusBanner
                }

                // Messages
                messageList

                // Input
                messageInput
            }
        }
        .navigationTitle(room.displayName(currentUserId: viewModel.currentUserId))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showInviteSheet = true
                    } label: {
                        Label("친구 초대", systemImage: "person.badge.plus")
                    }

                    if room.type == .booking {
                        Button {
                            // View booking
                        } label: {
                            Label("예약 정보", systemImage: "calendar")
                        }
                    }

                    Divider()

                    Button(role: .destructive) {
                        Task {
                            await viewModel.leaveChatRoom()
                            dismiss()
                        }
                    } label: {
                        Label("채팅방 나가기", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .sheet(isPresented: $showInviteSheet) {
            InviteFriendsSheet(
                existingParticipantIds: room.participants.map(\.userId),
                onInvite: { userIds in
                    Task {
                        await viewModel.inviteMembers(userIds: userIds)
                        showInviteSheet = false
                    }
                }
            )
        }
        .task {
            await viewModel.loadMessages()
            await viewModel.connectSocket()
        }
        .onDisappear {
            viewModel.disconnectSocket()
        }
    }

    // MARK: - Connection Status Banner

    private var connectionStatusBanner: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: "wifi.slash")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.8))

            Text("연결 끊김")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.8))

            Button {
                Task {
                    await viewModel.forceReconnect()
                }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.caption)
                    .foregroundStyle(.white)
            }
        }
        .padding(.vertical, ParkSpacing.xxs)
        .padding(.horizontal, ParkSpacing.sm)
        .background(Color.parkWarning.opacity(0.8))
        .clipShape(Capsule())
        .padding(.top, ParkSpacing.xs)
    }

    // MARK: - Message List

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: ParkSpacing.sm) {
                    // 이전 메시지 로드 버튼/인디케이터
                    if viewModel.hasMoreMessages {
                        loadMoreButton
                    }

                    ForEach(viewModel.messages) { message in
                        MessageBubble(
                            message: message,
                            isCurrentUser: message.senderId == viewModel.currentUserId
                        )
                        .id(message.id)
                        .onAppear {
                            // 첫 번째 메시지가 보이면 이전 메시지 로드
                            if message.id == viewModel.messages.first?.id {
                                Task {
                                    await viewModel.loadMoreMessages()
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.vertical, ParkSpacing.md)
            }
            .refreshable {
                // 당겨서 새로고침 - 이전 메시지 로드
                await viewModel.loadMoreMessages()
            }
            .onChange(of: viewModel.messages.count) { oldCount, newCount in
                // 새 메시지가 추가된 경우에만 스크롤 (이전 메시지 로드 시에는 스크롤 안함)
                if newCount > oldCount, let lastMessage = viewModel.messages.last {
                    // 새 메시지인지 확인 (마지막에 추가된 경우)
                    withAnimation(.spring(response: 0.3)) {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Load More Button

    private var loadMoreButton: some View {
        Group {
            if viewModel.isLoadingMore {
                ProgressView()
                    .tint(.white)
                    .padding(.vertical, ParkSpacing.sm)
            } else {
                Button {
                    Task {
                        await viewModel.loadMoreMessages()
                    }
                } label: {
                    HStack(spacing: ParkSpacing.xs) {
                        Image(systemName: "arrow.up.circle")
                        Text("이전 메시지 보기")
                    }
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.vertical, ParkSpacing.sm)
                }
            }
        }
    }

    // MARK: - Message Input

    private var messageInput: some View {
        HStack(spacing: ParkSpacing.sm) {
            Button {
                // Add attachment
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.6))
            }

            TextField("메시지 입력", text: $viewModel.inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .padding(.horizontal, ParkSpacing.sm)
                .padding(.vertical, ParkSpacing.xs)
                .background(Color.white.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.full))
                .foregroundStyle(.white)
                .focused($isInputFocused)
                .lineLimit(1...5)
                .onChange(of: viewModel.inputText) { _, newValue in
                    viewModel.sendTypingIndicator(!newValue.isEmpty)
                }

            Button {
                Task {
                    await viewModel.sendMessage()
                }
            } label: {
                Image(systemName: viewModel.isSending ? "arrow.up.circle" : "arrow.up.circle.fill")
                    .font(.title)
                    .foregroundStyle(viewModel.inputText.isEmpty ? .white.opacity(0.4) : Color.parkPrimary)
            }
            .disabled(viewModel.inputText.isEmpty || viewModel.isSending)
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.sm)
        .background(
            Color.black.opacity(0.3)
                .background(.ultraThinMaterial)
        )
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let isCurrentUser: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: ParkSpacing.xs) {
            if isCurrentUser {
                Spacer(minLength: 60)
                messageTime
                messageContent
            } else {
                messageContent
                messageTime
                Spacer(minLength: 60)
            }
        }
    }

    private var messageContent: some View {
        VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
            if !isCurrentUser {
                Text(message.senderName)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.6))
            }

            Text(message.content)
                .padding(.horizontal, ParkSpacing.sm)
                .padding(.vertical, ParkSpacing.xs)
                .background(
                    isCurrentUser
                        ? LinearGradient.parkButton
                        : LinearGradient(colors: [Color.white.opacity(0.15)], startPoint: .top, endPoint: .bottom)
                )
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
        }
    }

    private var messageTime: some View {
        Text(formatTime(message.createdAt))
            .font(.system(size: 10))
            .foregroundStyle(.white.opacity(0.5))
    }

    private func formatTime(_ date: Date) -> String {
        DateHelper.toKoreanTime(date)
    }
}

// MARK: - Invite Friends Sheet

struct InviteFriendsSheet: View {
    let existingParticipantIds: [String]
    let onInvite: ([String]) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var friends: [Friend] = []
    @State private var selectedFriendIds: Set<Int> = []
    @State private var searchQuery = ""
    @State private var isLoading = true

    private var availableFriends: [Friend] {
        friends.filter { !existingParticipantIds.contains(String($0.friendId)) }
    }

    private var filteredFriends: [Friend] {
        if searchQuery.isEmpty {
            return availableFriends
        }
        return availableFriends.filter {
            $0.friendName.localizedCaseInsensitiveContains(searchQuery) ||
            $0.friendEmail.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search Bar
                    HStack(spacing: ParkSpacing.sm) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.white.opacity(0.5))

                        TextField("친구 검색", text: $searchQuery)
                            .foregroundStyle(.white)
                            .font(.parkBodyMedium)

                        if !searchQuery.isEmpty {
                            Button {
                                searchQuery = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.white.opacity(0.5))
                            }
                        }
                    }
                    .padding(ParkSpacing.md)
                    .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
                    .padding(ParkSpacing.md)

                    if isLoading {
                        ParkLoadingView(message: "친구 목록 불러오는 중...")
                    } else if filteredFriends.isEmpty {
                        ParkEmptyStateView(
                            icon: "person.2",
                            title: "초대할 친구가 없습니다",
                            description: "모든 친구가 이미 참여 중이거나 친구가 없습니다"
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: ParkSpacing.md) {
                                ForEach(filteredFriends) { friend in
                                    Button {
                                        if selectedFriendIds.contains(friend.friendId) {
                                            selectedFriendIds.remove(friend.friendId)
                                        } else {
                                            selectedFriendIds.insert(friend.friendId)
                                        }
                                    } label: {
                                        FriendSelectCard(
                                            friend: friend,
                                            isSelected: selectedFriendIds.contains(friend.friendId)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(ParkSpacing.md)
                        }
                    }

                    // Invite Button
                    if !selectedFriendIds.isEmpty {
                        Button {
                            onInvite(selectedFriendIds.map { String($0) })
                        } label: {
                            Text("초대 (\(selectedFriendIds.count)명)")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, ParkSpacing.sm)
                                .background(Color.parkPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
                        }
                        .padding(ParkSpacing.md)
                    }
                }
            }
            .navigationTitle("친구 초대")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task {
            let friendService = FriendService()
            do {
                friends = try await friendService.getFriends()
            } catch {
                #if DEBUG
                print("Failed to load friends: \(error)")
                #endif
            }
            isLoading = false
        }
    }
}

// MARK: - Chat Room View Wrapper

/// Wrapper view that gets currentUserId from AppState
struct ChatRoomViewWrapper: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ChatRoomView(
            room: room,
            currentUserId: appState.currentUser?.stringId ?? ""
        )
        .environmentObject(appState)
    }
}

#Preview {
    NavigationStack {
        ChatRoomView(
            room: ChatRoom(
                id: "1",
                name: "주말 라운딩",
                type: .group,
                participants: [],
                lastMessage: nil,
                unreadCount: 0,
                createdAt: Date(),
                updatedAt: Date()
            ),
            currentUserId: "1"
        )
        .environmentObject(AppState())
    }
}
