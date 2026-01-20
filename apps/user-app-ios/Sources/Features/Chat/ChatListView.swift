import SwiftUI

// MARK: - Chat List View

struct ChatListView: View {
    @StateObject private var viewModel = ChatListViewModel()

    var body: some View {
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

    var body: some View {
        GlassCard(padding: 0) {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                chatAvatar

                // Content
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    HStack {
                        Text(room.name)
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)
                            .lineLimit(1)

                        Spacer()

                        if let lastMessage = room.lastMessage {
                            Text(formatTime(lastMessage.createdAt))
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
            case .group, .booking:
                Image(systemName: "person.3.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(.white)
            case .direct:
                Text(String(room.name.prefix(1)))
                    .font(.parkHeadlineLarge)
                    .foregroundStyle(.white)
            }
        }
    }

    private func formatTime(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            return DateHelper.toKoreanTime(date)
        } else if Calendar.current.isDateInYesterday(date) {
            return "어제"
        } else {
            return DateHelper.shortDateFormatter.string(from: date)
        }
    }
}

// MARK: - New Chat Sheet

struct NewChatSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = NewChatViewModel()

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
                                        viewModel.selectedFriend = friend
                                        viewModel.createDirectChat()
                                    } label: {
                                        FriendSelectCard(friend: friend)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(ParkSpacing.md)
                        }
                    }
                }
            }
            .navigationTitle("새 채팅")
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
}

// MARK: - Friend Select Card

struct FriendSelectCard: View {
    let friend: Friend

    var body: some View {
        GlassCard(padding: 0) {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.parkPrimary.opacity(0.3))
                        .frame(width: 50, height: 50)

                    Text(String(friend.friendName.prefix(1)))
                        .font(.parkHeadlineLarge)
                        .foregroundStyle(.white)
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

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.3))
            }
            .padding(ParkSpacing.md)
        }
    }
}

// MARK: - New Chat View Model

@MainActor
class NewChatViewModel: ObservableObject {
    @Published var friends: [Friend] = []
    @Published var searchQuery: String = ""
    @Published var isLoading = false
    @Published var isCreating = false
    @Published var selectedFriend: Friend?
    @Published var createdRoom: ChatRoom?
    @Published var errorMessage: String?

    private let friendService = FriendService()
    private let apiClient = APIClient.shared

    var filteredFriends: [Friend] {
        if searchQuery.isEmpty {
            return friends
        }
        return friends.filter {
            $0.friendName.localizedCaseInsensitiveContains(searchQuery) ||
            $0.friendEmail.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    func loadFriends() async {
        isLoading = true
        do {
            friends = try await friendService.getFriends()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createDirectChat() {
        guard let friend = selectedFriend, !isCreating else { return }

        isCreating = true

        Task {
            defer { isCreating = false }

            do {
                let request = CreateChatRoomRequest(
                    name: friend.friendName,
                    type: ChatRoomType.direct.rawValue,
                    participantIds: [String(friend.friendId)]
                )

                let room = try await apiClient.request(
                    ChatEndpoints.createRoom(request: request),
                    responseType: ChatRoom.self
                )

                createdRoom = room
            } catch {
                // If API fails, create a temporary room for navigation
                // The actual room will be created when sending the first message
                let room = ChatRoom(
                    id: "direct-\(friend.friendId)",
                    name: friend.friendName,
                    type: .direct,
                    participants: [],
                    lastMessage: nil,
                    unreadCount: 0,
                    createdAt: Date(),
                    updatedAt: Date()
                )

                createdRoom = room
                print("Failed to create chat room via API, using temporary room: \(error)")
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ChatListView()
}
