import Foundation
import SwiftUI

@MainActor
class FriendsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var friends: [Friend] = []
    @Published var friendRequests: [FriendRequest] = []
    @Published var searchResults: [UserSearchResult] = []
    @Published var searchQuery: String = ""
    @Published var isLoading = false
    @Published var isSearching = false
    @Published var errorMessage: String?
    @Published var showAddFriendSheet = false
    @Published var selectedSegment: FriendSegment = .friends

    enum FriendSegment: String, CaseIterable {
        case friends = "친구"
        case requests = "요청"
    }

    // MARK: - Private Properties

    private let friendService = FriendService()
    private var searchTask: Task<Void, Never>?

    // MARK: - Load Data

    func loadFriends() async {
        isLoading = true
        errorMessage = nil

        do {
            friends = try await friendService.getFriends()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loadFriendRequests() async {
        do {
            friendRequests = try await friendService.getFriendRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadAll() async {
        isLoading = true
        errorMessage = nil

        async let friendsTask: () = loadFriendsOnly()
        async let requestsTask: () = loadFriendRequests()

        _ = await (friendsTask, requestsTask)

        isLoading = false
    }

    private func loadFriendsOnly() async {
        do {
            friends = try await friendService.getFriends()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Search Users

    func searchUsers() {
        searchTask?.cancel()

        guard !searchQuery.isEmpty else {
            searchResults = []
            return
        }

        searchTask = Task {
            isSearching = true

            // Debounce
            try? await Task.sleep(nanoseconds: Configuration.Debounce.search)

            guard !Task.isCancelled else { return }

            do {
                searchResults = try await friendService.searchUsers(query: searchQuery)
            } catch {
                if !Task.isCancelled {
                    errorMessage = error.localizedDescription
                }
            }

            isSearching = false
        }
    }

    // MARK: - Friend Actions

    func sendFriendRequest(toUserId: Int) async {
        do {
            try await friendService.sendFriendRequest(toUserId: toUserId)
            // Update search results to reflect the pending request
            if let index = searchResults.firstIndex(where: { $0.id == toUserId }) {
                let updated = searchResults[index]
                searchResults[index] = UserSearchResult(
                    id: updated.id,
                    email: updated.email,
                    name: updated.name,
                    profileImageUrl: updated.profileImageUrl,
                    isFriend: updated.isFriend,
                    hasPendingRequest: true
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func acceptFriendRequest(_ request: FriendRequest) async {
        do {
            try await friendService.acceptFriendRequest(requestId: request.id)
            friendRequests.removeAll { $0.id == request.id }
            await loadFriendsOnly()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func rejectFriendRequest(_ request: FriendRequest) async {
        do {
            try await friendService.rejectFriendRequest(requestId: request.id)
            friendRequests.removeAll { $0.id == request.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeFriend(_ friend: Friend) async {
        do {
            try await friendService.removeFriend(friendId: friend.friendId)
            friends.removeAll { $0.id == friend.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Computed Properties

    var pendingRequestsCount: Int {
        friendRequests.count
    }
}
