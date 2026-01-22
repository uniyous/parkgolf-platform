import Foundation

// MARK: - User Model

struct User: Identifiable, Codable, Sendable {
    let id: Int
    let email: String
    let name: String
    let phoneNumber: String?
    let profileImageUrl: String?
    let passwordChangedAt: Date?
    let createdAt: Date?

    var stringId: String { String(id) }

    /// 비밀번호 변경이 필요한지 확인 (90일 경과 시)
    var needsPasswordChange: Bool {
        guard let changedAt = passwordChangedAt ?? createdAt else {
            return true // 날짜 정보 없으면 변경 권유
        }
        let daysSinceChange = Calendar.current.dateComponents(
            [.day], from: changedAt, to: Date()
        ).day ?? 0
        return daysSinceChange >= 90
    }

    /// 마지막 비밀번호 변경 후 경과 일수
    var daysSincePasswordChange: Int? {
        guard let changedAt = passwordChangedAt ?? createdAt else {
            return nil
        }
        return Calendar.current.dateComponents(
            [.day], from: changedAt, to: Date()
        ).day
    }
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

struct SentFriendRequest: Identifiable, Codable, Sendable {
    let id: Int
    let toUserId: Int
    let toUserName: String
    let toUserEmail: String
    let toUserProfileImageUrl: String?
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

// MARK: - User Stats

struct UserStats: Codable, Sendable {
    let totalBookings: Int
    let friendCount: Int
    let achievementCount: Int
}

// MARK: - Password Change Models

struct ChangePasswordRequest: Codable, Sendable {
    let currentPassword: String
    let newPassword: String
    let confirmPassword: String
}

struct ChangePasswordResponse: Codable, Sendable {
    let message: String
    let passwordChangedAt: Date
}

struct PasswordExpiryResponse: Codable, Sendable {
    let needsChange: Bool
    let daysSinceChange: Int?
    let passwordChangedAt: Date?
}
