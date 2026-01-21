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
        case members  // API returns 'members' but we use 'participants'
        case lastMessage
        case unreadCount
        case createdAt
        case updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        type = try container.decode(ChatRoomType.self, forKey: .type)

        // API returns 'members', convert to 'participants'
        if let members = try? container.decode([ChatRoomMember].self, forKey: .members) {
            participants = members.map { member in
                ChatParticipant(
                    id: member.id,
                    userId: String(member.userId),
                    userName: member.userName,
                    profileImageUrl: nil,
                    joinedAt: member.joinedAt
                )
            }
        } else if let existingParticipants = try? container.decode([ChatParticipant].self, forKey: .participants) {
            participants = existingParticipants
        } else {
            participants = []
        }

        lastMessage = try container.decodeIfPresent(ChatMessage.self, forKey: .lastMessage)
        unreadCount = try container.decodeIfPresent(Int.self, forKey: .unreadCount) ?? 0
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(type, forKey: .type)
        try container.encode(participants, forKey: .participants)
        try container.encodeIfPresent(lastMessage, forKey: .lastMessage)
        try container.encode(unreadCount, forKey: .unreadCount)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }

    init(id: String, name: String, type: ChatRoomType, participants: [ChatParticipant], lastMessage: ChatMessage?, unreadCount: Int, createdAt: Date, updatedAt: Date) {
        self.id = id
        self.name = name
        self.type = type
        self.participants = participants
        self.lastMessage = lastMessage
        self.unreadCount = unreadCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: ChatRoom, rhs: ChatRoom) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Chat Room Member (API Response)

struct ChatRoomMember: Codable, Sendable {
    let id: String
    let roomId: String
    let userId: Int
    let userName: String
    let joinedAt: Date
    let leftAt: Date?
    let isAdmin: Bool
    let lastReadMessageId: String?
    let lastReadAt: Date?
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

    // API returns "type" but we use "messageType"
    enum CodingKeys: String, CodingKey {
        case id
        case roomId
        case senderId
        case senderName
        case content
        case messageType
        case type  // API returns "type" for message type
        case createdAt
        case readBy
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        roomId = try container.decode(String.self, forKey: .roomId)
        // senderId can be Int or String from API
        if let senderIdInt = try? container.decode(Int.self, forKey: .senderId) {
            senderId = String(senderIdInt)
        } else {
            senderId = try container.decode(String.self, forKey: .senderId)
        }
        senderName = try container.decode(String.self, forKey: .senderName)
        content = try container.decode(String.self, forKey: .content)
        // API returns "type", fallback to "messageType" for compatibility
        if let msgType = try? container.decode(MessageType.self, forKey: .type) {
            messageType = msgType
        } else {
            messageType = try container.decode(MessageType.self, forKey: .messageType)
        }
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        readBy = try container.decodeIfPresent([String].self, forKey: .readBy)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(roomId, forKey: .roomId)
        try container.encode(senderId, forKey: .senderId)
        try container.encode(senderName, forKey: .senderName)
        try container.encode(content, forKey: .content)
        try container.encode(messageType, forKey: .type)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(readBy, forKey: .readBy)
    }

    init(id: String, roomId: String, senderId: String, senderName: String, content: String, messageType: MessageType, createdAt: Date, readBy: [String]?) {
        self.id = id
        self.roomId = roomId
        self.senderId = senderId
        self.senderName = senderName
        self.content = content
        self.messageType = messageType
        self.createdAt = createdAt
        self.readBy = readBy
    }
}

enum MessageType: String, Codable, Sendable {
    case text = "TEXT"
    case image = "IMAGE"
    case system = "SYSTEM"
    case bookingInvite = "BOOKING_INVITE"
}

// MARK: - Chat Messages Response (API response for messages endpoint)

struct ChatMessagesResponse: Codable, Sendable {
    let messages: [ChatMessage]
    let hasMore: Bool
    let nextCursor: String?
}

// MARK: - Chat Participant

struct ChatParticipant: Identifiable, Codable, Sendable {
    let id: String
    let userId: String
    let userName: String
    let profileImageUrl: String?
    let joinedAt: Date

    // API returns camelCase
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case userName
        case profileImageUrl
        case joinedAt
    }

    init(id: String, userId: String, userName: String, profileImageUrl: String?, joinedAt: Date) {
        self.id = id
        self.userId = userId
        self.userName = userName
        self.profileImageUrl = profileImageUrl
        self.joinedAt = joinedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        // userId can be Int or String from API
        if let userIdInt = try? container.decode(Int.self, forKey: .userId) {
            userId = String(userIdInt)
        } else {
            userId = try container.decode(String.self, forKey: .userId)
        }
        userName = try container.decode(String.self, forKey: .userName)
        profileImageUrl = try container.decodeIfPresent(String.self, forKey: .profileImageUrl)
        joinedAt = try container.decode(Date.self, forKey: .joinedAt)
    }
}
