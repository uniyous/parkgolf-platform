import Foundation

// MARK: - Chat Room Model

struct ChatRoom: Identifiable, Codable, Sendable, Hashable {
    let id: String
    let name: String
    let type: ChatRoomType
    let participants: [ChatParticipant]
    let lastMessage: ChatMessage?
    let unreadCount: Int
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case type
        case participants
        case lastMessage = "last_message"
        case unreadCount = "unread_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: ChatRoom, rhs: ChatRoom) -> Bool {
        lhs.id == rhs.id
    }
}

enum ChatRoomType: String, Codable, Sendable {
    case direct = "DIRECT"
    case group = "GROUP"
    case booking = "BOOKING"
}

// MARK: - Chat Message Model

struct ChatMessage: Identifiable, Codable, Sendable {
    let id: String
    let roomId: String
    let senderId: String
    let senderName: String
    let content: String
    let messageType: MessageType
    let createdAt: Date
    let readBy: [String]?

    enum CodingKeys: String, CodingKey {
        case id
        case roomId = "room_id"
        case senderId = "sender_id"
        case senderName = "sender_name"
        case content
        case messageType = "message_type"
        case createdAt = "created_at"
        case readBy = "read_by"
    }
}

enum MessageType: String, Codable, Sendable {
    case text = "TEXT"
    case image = "IMAGE"
    case system = "SYSTEM"
    case bookingInvite = "BOOKING_INVITE"
}

// MARK: - Chat Participant

struct ChatParticipant: Identifiable, Codable, Sendable {
    let id: String
    let userId: String
    let userName: String
    let profileImageUrl: String?
    let joinedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case userName = "user_name"
        case profileImageUrl = "profile_image_url"
        case joinedAt = "joined_at"
    }
}
