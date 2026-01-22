import Foundation

// MARK: - New Chat View Model

@MainActor
final class NewChatViewModel: ObservableObject {
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
                #if DEBUG
                print("Failed to create chat room via API, using temporary room: \(error)")
                #endif
            }
        }
    }
}
