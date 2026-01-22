import Foundation

@MainActor
final class ChatListViewModel: ObservableObject {
    @Published var chatRooms: [ChatRoom] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var showNewChatSheet = false

    private let apiClient = APIClient.shared

    func loadChatRooms() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let rooms = try await apiClient.requestArray(
                ChatEndpoints.rooms(page: 1, limit: 50),
                responseType: ChatRoom.self
            )
            chatRooms = rooms.sorted { $0.updatedAt > $1.updatedAt }
        } catch {
            self.error = error
            #if DEBUG
            print("Failed to load chat rooms: \(error)")
            #endif
        }
    }

    func createChatRoom(name: String, type: ChatRoomType, participantIds: [String]) async -> ChatRoom? {
        do {
            let request = CreateChatRoomRequest(
                name: name,
                type: type.rawValue,
                participantIds: participantIds
            )

            let room = try await apiClient.request(
                ChatEndpoints.createRoom(request: request),
                responseType: ChatRoom.self
            )

            // Add to local list
            chatRooms.insert(room, at: 0)

            return room
        } catch {
            self.error = error
            #if DEBUG
            print("Failed to create chat room: \(error)")
            #endif
            return nil
        }
    }
}
