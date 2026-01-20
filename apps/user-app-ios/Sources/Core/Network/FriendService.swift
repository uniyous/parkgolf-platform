import Foundation

// MARK: - Friend Service

actor FriendService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Friends List

    func getFriends() async throws -> [Friend] {
        let endpoint = Endpoint(path: "/api/user/friends", method: .get)
        return try await apiClient.request(endpoint, responseType: [Friend].self)
    }

    // MARK: - Friend Requests

    func getFriendRequests() async throws -> [FriendRequest] {
        let endpoint = Endpoint(path: "/api/user/friends/requests", method: .get)
        return try await apiClient.request(endpoint, responseType: [FriendRequest].self)
    }

    // MARK: - Search Users

    func searchUsers(query: String) async throws -> [UserSearchResult] {
        let endpoint = Endpoint(
            path: "/api/user/friends/search",
            method: .get,
            queryParameters: ["q": query]
        )
        return try await apiClient.request(endpoint, responseType: [UserSearchResult].self)
    }

    // MARK: - Find From Contacts

    func findFromContacts(phoneNumbers: [String]) async throws -> [UserSearchResult] {
        struct RequestBody: Codable {
            let phoneNumbers: [String]
        }

        let endpoint = Endpoint(
            path: "/api/user/friends/contacts",
            method: .post,
            body: RequestBody(phoneNumbers: phoneNumbers)
        )
        return try await apiClient.request(endpoint, responseType: [UserSearchResult].self)
    }

    // MARK: - Send Friend Request

    func sendFriendRequest(toUserId: Int) async throws {
        struct RequestBody: Codable {
            let toUserId: Int
        }

        let endpoint = Endpoint(
            path: "/api/user/friends/request",
            method: .post,
            body: RequestBody(toUserId: toUserId)
        )
        _ = try await apiClient.request(endpoint, responseType: SuccessResponse.self)
    }

    // MARK: - Accept Friend Request

    func acceptFriendRequest(requestId: Int) async throws {
        let endpoint = Endpoint(
            path: "/api/user/friends/requests/\(requestId)/accept",
            method: .post
        )
        _ = try await apiClient.request(endpoint, responseType: SuccessResponse.self)
    }

    // MARK: - Reject Friend Request

    func rejectFriendRequest(requestId: Int) async throws {
        let endpoint = Endpoint(
            path: "/api/user/friends/requests/\(requestId)/reject",
            method: .post
        )
        _ = try await apiClient.request(endpoint, responseType: SuccessResponse.self)
    }

    // MARK: - Remove Friend

    func removeFriend(friendId: Int) async throws {
        let endpoint = Endpoint(
            path: "/api/user/friends/\(friendId)",
            method: .delete
        )
        _ = try await apiClient.request(endpoint, responseType: SuccessResponse.self)
    }
}

// MARK: - Response Types

struct SuccessResponse: Codable, Sendable {
    let success: Bool?
}

// MARK: - Friend Service Error

enum FriendServiceError: Error, LocalizedError {
    case fetchFailed(String)
    case searchFailed(String)
    case requestFailed(String)
    case acceptFailed(String)
    case rejectFailed(String)
    case removeFailed(String)

    var errorDescription: String? {
        switch self {
        case .fetchFailed(let message): return message
        case .searchFailed(let message): return message
        case .requestFailed(let message): return message
        case .acceptFailed(let message): return message
        case .rejectFailed(let message): return message
        case .removeFailed(let message): return message
        }
    }
}
