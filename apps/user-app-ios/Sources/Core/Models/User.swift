import Foundation

// MARK: - User Model

struct User: Identifiable, Codable, Sendable {
    let id: Int
    let email: String
    let name: String
    let phoneNumber: String?
    let profileImageUrl: String?
    let createdAt: Date?

    var stringId: String { String(id) }
}

// MARK: - Auth Models

struct LoginRequest: Codable, Sendable {
    let email: String
    let password: String
}

struct LoginResponse: Codable, Sendable {
    let accessToken: String
    let refreshToken: String
    let user: User
    let expiresIn: Int?
}

struct SignUpRequest: Codable, Sendable {
    let email: String
    let password: String
    let name: String
    let phoneNumber: String?
}

// MARK: - Friend Models

struct Friend: Identifiable, Codable, Sendable {
    let id: Int
    let friendId: Int
    let friendName: String
    let friendEmail: String
    let friendProfileImageUrl: String?
    let createdAt: Date?
}

struct FriendRequest: Identifiable, Codable, Sendable {
    let id: Int
    let fromUserId: Int
    let fromUserName: String
    let fromUserEmail: String
    let fromUserProfileImageUrl: String?
    let status: String
    let message: String?
    let createdAt: Date?
}

struct UserSearchResult: Identifiable, Codable, Sendable {
    let id: Int
    let email: String
    let name: String
    let profileImageUrl: String?
    let isFriend: Bool
    let hasPendingRequest: Bool
}
