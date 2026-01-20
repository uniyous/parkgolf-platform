import SwiftUI

struct ChatListView: View {
    @StateObject private var viewModel = ChatListViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.chatRooms.isEmpty {
                    ContentUnavailableView(
                        "채팅이 없습니다",
                        systemImage: "message",
                        description: Text("친구를 초대하고 대화를 시작해보세요")
                    )
                } else {
                    List {
                        ForEach(viewModel.chatRooms) { room in
                            NavigationLink {
                                ChatRoomView(room: room)
                            } label: {
                                ChatRoomListItem(room: room)
                            }
                        }
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.loadChatRooms()
                    }
                }
            }
            .navigationTitle("채팅")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.showNewChatSheet = true
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showNewChatSheet) {
                NewChatView()
            }
        }
        .task {
            await viewModel.loadChatRooms()
        }
    }
}

// MARK: - Chat Room List Item

struct ChatRoomListItem: View {
    let room: ChatRoom

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            chatAvatar

            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(room.name)
                        .font(.headline)
                        .lineLimit(1)

                    Spacer()

                    if let lastMessage = room.lastMessage {
                        Text(formatTime(lastMessage.createdAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack {
                    if let lastMessage = room.lastMessage {
                        Text(lastMessage.content)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    } else {
                        Text("대화를 시작해보세요")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }

                    Spacer()

                    if room.unreadCount > 0 {
                        Text("\(room.unreadCount)")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var chatAvatar: some View {
        Group {
            switch room.type {
            case .group, .booking:
                Circle()
                    .fill(Color.green.opacity(0.2))
                    .frame(width: 50, height: 50)
                    .overlay {
                        Image(systemName: "person.3.fill")
                            .foregroundStyle(.green)
                    }
            case .direct:
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 50, height: 50)
                    .overlay {
                        Image(systemName: "person.fill")
                            .foregroundStyle(.blue)
                    }
            }
        }
    }

    private func formatTime(_ date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "a h:mm"
            formatter.locale = Locale(identifier: "ko_KR")
            return formatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "어제"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "M/d"
            return formatter.string(from: date)
        }
    }
}

// MARK: - New Chat View

struct NewChatView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = NewChatViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)

                    TextField("친구 검색", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)

                    if !viewModel.searchQuery.isEmpty {
                        Button {
                            viewModel.searchQuery = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding()

                // Friends List
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.filteredFriends.isEmpty {
                    ContentUnavailableView(
                        viewModel.searchQuery.isEmpty ? "친구가 없습니다" : "검색 결과 없음",
                        systemImage: "person.2",
                        description: Text(viewModel.searchQuery.isEmpty ? "친구를 추가하고 대화를 시작해보세요" : "다른 검색어로 시도해보세요")
                    )
                } else {
                    List {
                        ForEach(viewModel.filteredFriends) { friend in
                            Button {
                                viewModel.selectedFriend = friend
                                viewModel.createDirectChat()
                            } label: {
                                HStack(spacing: 12) {
                                    Circle()
                                        .fill(Color.green.opacity(0.2))
                                        .frame(width: 50, height: 50)
                                        .overlay {
                                            Text(String(friend.friendName.prefix(1)))
                                                .font(.title2)
                                                .fontWeight(.medium)
                                                .foregroundStyle(.green)
                                        }

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(friend.friendName)
                                            .font(.headline)
                                            .foregroundStyle(.primary)

                                        Text(friend.friendEmail)
                                            .font(.subheadline)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("새 채팅")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") {
                        dismiss()
                    }
                }
            }
            .navigationDestination(item: $viewModel.createdRoom) { room in
                ChatRoomView(room: room)
            }
        }
        .task {
            await viewModel.loadFriends()
        }
    }
}

// MARK: - New Chat View Model

@MainActor
class NewChatViewModel: ObservableObject {
    @Published var friends: [Friend] = []
    @Published var searchQuery: String = ""
    @Published var isLoading = false
    @Published var selectedFriend: Friend?
    @Published var createdRoom: ChatRoom?
    @Published var errorMessage: String?

    private let friendService = FriendService()

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
        guard let friend = selectedFriend else { return }

        // Create a temporary room for navigation
        // In real implementation, this would call the API to create/find existing direct chat
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
    }
}

#Preview {
    ChatListView()
}
