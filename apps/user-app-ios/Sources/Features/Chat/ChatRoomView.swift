import SwiftUI

struct ChatRoomView: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: ChatRoomViewModel
    @StateObject private var aiViewModel = AiChatViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isInputFocused: Bool
    @State private var showInviteSheet = false
    @State private var showParticipantsSheet = false

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

                // Typing indicator
                if let typingName = viewModel.typingUserName {
                    typingIndicator(name: typingName)
                }

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
                        showParticipantsSheet = true
                    } label: {
                        Label("참여자 목록", systemImage: "person.2")
                    }

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
                    Image(systemName: "ellipsis.vertical")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .sheet(isPresented: $showParticipantsSheet) {
            ParticipantsSheet(
                participants: room.participants,
                currentUserId: viewModel.currentUserId
            )
        }
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
        .overlay(alignment: .top) {
            if let error = aiViewModel.lastError {
                Text(error)
                    .font(.parkCaption)
                    .foregroundStyle(.white)
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.vertical, ParkSpacing.xs)
                    .background(Color.red.opacity(0.9))
                    .clipShape(Capsule())
                    .padding(.top, ParkSpacing.sm)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        // 3초 후 자동 dismiss
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            withAnimation { aiViewModel.lastError = nil }
                        }
                    }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: aiViewModel.lastError)
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

                    ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                        if message.messageType == .aiAssistant {
                            AiMessageBubble(
                                content: message.content,
                                actions: aiViewModel.getActions(for: message.id),
                                createdAt: message.createdAt,
                                onClubSelect: { _, clubName in
                                    sendAiFollowUp("\(clubName)(으)로 선택할게요")
                                },
                                onSlotSelect: { _, time in
                                    sendAiFollowUp("\(time) 시간으로 예약해주세요")
                                }
                            )
                            .id(message.id)
                        } else {
                            let isCurrentUser = message.senderId == viewModel.currentUserId
                            let showSender = !isCurrentUser &&
                                (index == 0 || viewModel.messages[index - 1].senderId != message.senderId)

                            MessageBubble(
                                message: message,
                                isCurrentUser: isCurrentUser,
                                showSender: showSender
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

                    // AI 로딩 인디케이터
                    if aiViewModel.isAiLoading {
                        aiTypingIndicator
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.vertical, ParkSpacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
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

    // MARK: - Typing Indicator

    private func typingIndicator(name: String) -> some View {
        HStack(spacing: ParkSpacing.xs) {
            Text("\(name)님이 입력 중...")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.xxs)
        .frame(maxWidth: .infinity, alignment: .leading)
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.2), value: name)
    }

    // MARK: - AI Typing Indicator

    private var aiTypingIndicator: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: "sparkles")
                .font(.system(size: 14))
                .foregroundStyle(Color.parkPrimary)

            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(Color.parkPrimary.opacity(0.6))
                        .frame(width: 6, height: 6)
                        .offset(y: aiViewModel.isAiLoading ? -4 : 0)
                        .animation(
                            .easeInOut(duration: 0.5)
                                .repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.15),
                            value: aiViewModel.isAiLoading
                        )
                }
            }

            Text("AI 예약 도우미")
                .font(.parkCaption)
                .foregroundStyle(Color.parkPrimary)
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.xs)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - AI Follow-up

    private func sendAiFollowUp(_ message: String) {
        Task {
            // 사용자 후속 메시지를 로컬에 추가
            let userMsg = ChatMessage(
                id: UUID().uuidString,
                roomId: room.id,
                senderId: viewModel.currentUserId,
                senderName: "나",
                content: message,
                messageType: .text,
                createdAt: Date(),
                readBy: nil
            )
            viewModel.messages.append(userMsg)

            // AI에 메시지 전송
            await aiViewModel.sendAiMessage(roomId: room.id, message: message)

            // 에러 발생 시 입력 복원
            if aiViewModel.lastError != nil {
                viewModel.inputText = message
                return
            }

            // AI 응답을 메시지로 추가
            if let response = aiViewModel.lastResponse {
                let aiMsgId = UUID().uuidString
                let aiMsg = ChatMessage(
                    id: aiMsgId,
                    roomId: room.id,
                    senderId: "ai-assistant",
                    senderName: "AI 예약 도우미",
                    content: response.message,
                    messageType: .aiAssistant,
                    createdAt: Date(),
                    readBy: nil
                )

                // actions 저장 (Web의 aiMessageActions 패턴)
                if let actions = response.actions, !actions.isEmpty {
                    aiViewModel.storeActions(messageId: aiMsgId, actions: actions)
                }

                viewModel.messages.append(aiMsg)
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

            TextField(
                aiViewModel.isAiMode ? "AI에게 예약 요청하기..." : "메시지 입력",
                text: $viewModel.inputText,
                axis: .vertical
            )
                .textFieldStyle(.plain)
                .padding(.horizontal, ParkSpacing.sm)
                .padding(.vertical, ParkSpacing.xs)
                .background(
                    aiViewModel.isAiMode
                        ? Color.parkPrimary.opacity(0.15)
                        : Color.white.opacity(0.15)
                )
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.full))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.full)
                        .stroke(
                            aiViewModel.isAiMode ? Color.parkPrimary.opacity(0.4) : Color.clear,
                            lineWidth: 1
                        )
                )
                .foregroundStyle(.white)
                .focused($isInputFocused)
                .lineLimit(1...5)
                .onSubmit {
                    // 키보드 엔터키로 전송하지 않음 (멀티라인)
                }
                .task(id: viewModel.inputText) {
                    // Debounce typing indicator (300ms)
                    try? await Task.sleep(nanoseconds: 300_000_000)
                    if !aiViewModel.isAiMode {
                        viewModel.sendTypingIndicator(!viewModel.inputText.isEmpty)
                    }
                }

            AiButton(isActive: aiViewModel.isAiMode) {
                aiViewModel.toggleAiMode()
            }

            Button {
                if aiViewModel.isAiMode {
                    let text = viewModel.inputText
                    viewModel.inputText = ""
                    sendAiFollowUp(text)
                } else {
                    Task {
                        await viewModel.sendMessage()
                    }
                }
            } label: {
                Group {
                    if aiViewModel.isAiLoading {
                        ProgressView()
                            .tint(Color.parkPrimary)
                            .frame(width: 28, height: 28)
                    } else {
                        Image(systemName: viewModel.isSending ? "arrow.up.circle" : "arrow.up.circle.fill")
                            .font(.title)
                            .foregroundStyle(viewModel.inputText.isEmpty ? .white.opacity(0.4) : Color.parkPrimary)
                    }
                }
            }
            .disabled(viewModel.inputText.isEmpty || viewModel.isSending || aiViewModel.isAiLoading)
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.sm)
        .background(Color.black.opacity(0.6))
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let isCurrentUser: Bool
    var showSender: Bool = true

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
            if showSender {
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
        VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 2) {
            if isCurrentUser, let readBy = message.readBy, readBy.count > 1 {
                Text("읽음")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.parkPrimary.opacity(0.8))
            }
            Text(formatTime(message.createdAt))
                .font(.system(size: 10))
                .foregroundStyle(.white.opacity(0.5))
        }
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

// MARK: - Participants Sheet

struct ParticipantsSheet: View {
    let participants: [ChatParticipant]
    let currentUserId: String

    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery = ""

    private var showSearch: Bool {
        participants.count >= 5
    }

    private var filteredParticipants: [ChatParticipant] {
        let list = searchQuery.isEmpty ? participants : participants.filter {
            $0.userName.localizedCaseInsensitiveContains(searchQuery) ||
            ($0.userEmail ?? "").localizedCaseInsensitiveContains(searchQuery)
        }
        // 본인을 맨 위로 정렬
        return list.sorted { a, b in
            if a.userId == currentUserId { return true }
            if b.userId == currentUserId { return false }
            return a.userName < b.userName
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    if showSearch {
                        HStack(spacing: ParkSpacing.sm) {
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(.white.opacity(0.5))

                            TextField("참여자 검색", text: $searchQuery)
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
                    }

                    if filteredParticipants.isEmpty {
                        ParkEmptyStateView(
                            icon: "person.2",
                            title: "검색 결과가 없습니다",
                            description: ""
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: ParkSpacing.sm) {
                                ForEach(filteredParticipants) { participant in
                                    participantRow(participant)
                                }
                            }
                            .padding(ParkSpacing.md)
                        }
                    }
                }
            }
            .navigationTitle("참여자 (\(participants.count)명)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func participantRow(_ participant: ChatParticipant) -> some View {
        let isMe = participant.userId == currentUserId

        return HStack(spacing: ParkSpacing.md) {
            // Avatar
            AvatarCircle(name: participant.userName, size: 40, opacity: 0.2)

            // Name + Email
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: ParkSpacing.xs) {
                    Text(participant.userName)
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white)

                    if isMe {
                        Text("(나)")
                            .font(.parkCaption)
                            .foregroundStyle(Color.parkPrimary)
                    }
                }

                if let email = participant.userEmail, !email.isEmpty {
                    Text(email)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.5))
                        .lineLimit(1)
                }
            }

            Spacer()
        }
        .padding(ParkSpacing.sm)
        .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
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
