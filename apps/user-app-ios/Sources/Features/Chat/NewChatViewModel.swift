import Foundation

// MARK: - New Chat Step

enum NewChatStep {
    case select
    case name
}

// MARK: - New Chat View Model

@MainActor
final class NewChatViewModel: ObservableObject {
    @Published var friends: [Friend] = []
    @Published var searchQuery: String = ""
    @Published var isLoading = false
    @Published var isCreating = false
    @Published var selectedFriends: [Friend] = []
    @Published var createdRoom: ChatRoom?
    @Published var errorMessage: String?
    @Published var step: NewChatStep = .select
    @Published var groupName: String = ""

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

    func toggleFriend(_ friend: Friend) {
        if let index = selectedFriends.firstIndex(where: { $0.id == friend.id }) {
            selectedFriends.remove(at: index)
        } else {
            selectedFriends.append(friend)
        }
    }

    func isFriendSelected(_ friend: Friend) -> Bool {
        selectedFriends.contains(where: { $0.id == friend.id })
    }

    func handleNext() {
        guard !selectedFriends.isEmpty, !isCreating else { return }

        if selectedFriends.count == 1 {
            // 1명 선택 → DIRECT 채팅 바로 생성
            createDirectChat(friend: selectedFriends[0])
        } else {
            // 2명 이상 → 그룹 이름 입력 단계로
            step = .name
        }
    }

    func goBack() {
        step = .select
        groupName = ""
    }

    private func createDirectChat(friend: Friend) {
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

    func createGroupChat() {
        guard selectedFriends.count >= 2, !isCreating else { return }

        let name = groupName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else {
            errorMessage = "그룹 이름을 입력해주세요"
            return
        }

        isCreating = true

        Task {
            defer { isCreating = false }

            do {
                let request = CreateChatRoomRequest(
                    name: name,
                    type: ChatRoomType.group.rawValue,
                    participantIds: selectedFriends.map { String($0.friendId) }
                )

                let room = try await apiClient.request(
                    ChatEndpoints.createRoom(request: request),
                    responseType: ChatRoom.self
                )

                createdRoom = room
            } catch {
                errorMessage = "그룹 채팅방 생성에 실패했습니다"
                #if DEBUG
                print("Failed to create group chat: \(error)")
                #endif
            }
        }
    }
}
