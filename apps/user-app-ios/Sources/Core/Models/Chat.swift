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
                    userEmail: member.userEmail,
                    profileImageUrl: nil,
                    isAdmin: member.isAdmin,
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

    func displayName(currentUserId: String) -> String {
        let others = participants.filter { $0.userId != currentUserId }

        // DIRECT: 상대방 이름
        if type == .direct {
            return others.first?.userName ?? (name.isEmpty ? "채팅" : name)
        }

        // GROUP/BOOKING: 방 이름이 있으면 우선 사용
        if !name.isEmpty {
            return name
        }

        // 방 이름이 없을 때 참여자 이름 폴백 (생성자 우선)
        if others.isEmpty { return "채팅방" }
        let sorted = others.sorted { a, _ in a.isAdmin }
        if sorted.count <= 2 { return sorted.map(\.userName).joined(separator: ", ") }
        let first = sorted.prefix(2).map(\.userName).joined(separator: ", ")
        return "\(first) 외 \(sorted.count - 2)명"
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
    let userEmail: String?
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
    let metadata: String?
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
        case metadata
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
        metadata = try container.decodeIfPresent(String.self, forKey: .metadata)
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
        try container.encodeIfPresent(metadata, forKey: .metadata)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(readBy, forKey: .readBy)
    }

    init(id: String, roomId: String, senderId: String, senderName: String, content: String, messageType: MessageType, metadata: String? = nil, createdAt: Date, readBy: [String]?) {
        self.id = id
        self.roomId = roomId
        self.senderId = senderId
        self.senderName = senderName
        self.content = content
        self.messageType = messageType
        self.metadata = metadata
        self.createdAt = createdAt
        self.readBy = readBy
    }
}

enum MessageType: String, Codable, Sendable {
    case text = "TEXT"
    case image = "IMAGE"
    case system = "SYSTEM"
    case bookingInvite = "BOOKING_INVITE"
    case aiUser = "AI_USER"
    case aiAssistant = "AI_ASSISTANT"
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
    let userEmail: String?
    let profileImageUrl: String?
    let isAdmin: Bool
    let joinedAt: Date

    // API returns camelCase
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case userName
        case userEmail
        case profileImageUrl
        case isAdmin
        case joinedAt
    }

    init(id: String, userId: String, userName: String, userEmail: String? = nil, profileImageUrl: String?, isAdmin: Bool = false, joinedAt: Date) {
        self.id = id
        self.userId = userId
        self.userName = userName
        self.userEmail = userEmail
        self.profileImageUrl = profileImageUrl
        self.isAdmin = isAdmin
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
        userEmail = try container.decodeIfPresent(String.self, forKey: .userEmail)
        profileImageUrl = try container.decodeIfPresent(String.self, forKey: .profileImageUrl)
        isAdmin = try container.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
        joinedAt = try container.decode(Date.self, forKey: .joinedAt)
    }
}

// MARK: - Invite Members Request

struct InviteMembersRequest: Codable, Sendable {
    let userIds: [String]

    enum CodingKeys: String, CodingKey {
        case userIds = "user_ids"
    }
}

// MARK: - AI Chat Models

enum ConversationState: String, Codable, Sendable {
    case idle = "IDLE"
    case collecting = "COLLECTING"
    case confirming = "CONFIRMING"
    case booking = "BOOKING"
    case selectingMembers = "SELECTING_MEMBERS"
    case settling = "SETTLING"
    case teamComplete = "TEAM_COMPLETE"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
}

enum ActionType: String, Codable, Sendable {
    case showClubs = "SHOW_CLUBS"
    case showSlots = "SHOW_SLOTS"
    case showWeather = "SHOW_WEATHER"
    case confirmBooking = "CONFIRM_BOOKING"
    case bookingComplete = "BOOKING_COMPLETE"
    case showPayment = "SHOW_PAYMENT"
    case confirmGroup = "CONFIRM_GROUP"
    case selectMembers = "SELECT_MEMBERS"
    case splitPayment = "SPLIT_PAYMENT"
    case settlementStatus = "SETTLEMENT_STATUS"
    case teamComplete = "TEAM_COMPLETE"
}

struct ChatAction: Codable, Sendable {
    let type: ActionType
    let data: AnyCodable

    struct AnyCodable: Codable, @unchecked Sendable {
        let value: Any

        init(_ value: Any) {
            self.value = value
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let dict = try? container.decode([String: AnyCodable].self) {
                value = dict.mapValues { $0.value }
            } else if let array = try? container.decode([AnyCodable].self) {
                value = array.map { $0.value }
            } else if let string = try? container.decode(String.self) {
                value = string
            } else if let int = try? container.decode(Int.self) {
                value = int
            } else if let double = try? container.decode(Double.self) {
                value = double
            } else if let bool = try? container.decode(Bool.self) {
                value = bool
            } else {
                value = ""
            }
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            if let string = value as? String {
                try container.encode(string)
            } else if let int = value as? Int {
                try container.encode(int)
            } else if let double = value as? Double {
                try container.encode(double)
            } else if let bool = value as? Bool {
                try container.encode(bool)
            } else {
                try container.encodeNil()
            }
        }
    }
}

struct AiChatResponse: Codable, Sendable {
    let conversationId: String
    let message: String
    let state: ConversationState
    let actions: [ChatAction]?
}

struct AiChatRequest: Codable, Sendable {
    var message: String
    var conversationId: String?
    var latitude: Double?
    var longitude: Double?
    // 카드 상호작용
    var selectedClubId: String?
    var selectedClubName: String?
    var selectedSlotId: String?
    var selectedSlotTime: String?
    var selectedSlotPrice: Int?
    var confirmBooking: Bool?
    var cancelBooking: Bool?
    var paymentMethod: String?
    var paymentComplete: Bool?
    var paymentSuccess: Bool?
    // 그룹 예약
    var selectedSlots: [SelectedSlotDto]?
    var teams: [TeamDto]?
    var confirmGroupBooking: Bool?
    // 분할결제
    var splitPaymentComplete: Bool?
    var splitOrderId: String?
    // 그룹 후속 액션
    var chatRoomId: String?
    var teamMembers: [TeamMemberDto]?
    var nextTeam: Bool?
    var finishGroup: Bool?
    var sendReminder: Bool?
}

struct SelectedSlotDto: Codable, Sendable {
    let slotId: String
    let slotTime: String
    let courseName: String
    let price: Int
}

struct TeamDto: Codable, Sendable {
    let teamNumber: Int
    let slotId: String
    let members: [TeamMemberDto]
}

struct TeamMemberDto: Codable, Sendable {
    let userId: Int
    let userName: String
    let userEmail: String
}

struct TeamConfirmData: Sendable {
    let teamNumber: Int
    let slotId: String
    let members: [TeamMemberDto]
}

struct ClubCardData: Sendable {
    let found: Int
    let clubs: [ClubItem]

    struct ClubItem: Identifiable, Sendable {
        let id: String
        let name: String
        let address: String
        let region: String
    }
}

struct SlotCardData: Sendable {
    let date: String
    let availableCount: Int
    let slots: [SlotItem]

    struct SlotItem: Identifiable, Sendable {
        let id: String
        let time: String
        let endTime: String
        let availableSpots: Int
        let price: Int
        let courseName: String
    }
}

struct WeatherCardData: Sendable {
    let date: String
    let clubName: String
    let temperature: Double
    let humidity: Double
    let sky: String
    let precipitation: Double
    let recommendation: String
}

struct BookingCompleteData: Sendable {
    let success: Bool
    let bookingId: String
    let confirmationNumber: String
    let details: BookingDetails

    struct BookingDetails: Sendable {
        let date: String
        let time: String
        let playerCount: Int
        let totalPrice: Int
    }
}
