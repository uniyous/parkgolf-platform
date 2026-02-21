import Foundation

// MARK: - Auth Endpoints

enum AuthEndpoints {
    static func login(email: String, password: String) -> Endpoint {
        Endpoint(
            path: "/api/user/iam/login",
            method: .post,
            body: LoginRequest(email: email, password: password)
        )
    }

    static func signUp(request: SignUpRequest) -> Endpoint {
        Endpoint(
            path: "/api/user/iam/register",
            method: .post,
            body: request
        )
    }

    static func logout() -> Endpoint {
        Endpoint(
            path: "/api/user/iam/logout",
            method: .post
        )
    }

    static func refreshToken(refreshToken: String) -> Endpoint {
        Endpoint(
            path: "/api/user/iam/refresh",
            method: .post,
            body: ["refreshToken": refreshToken]
        )
    }

    static func me() -> Endpoint {
        Endpoint(path: "/api/user/iam/profile")
    }

    static func stats() -> Endpoint {
        Endpoint(path: "/api/user/iam/stats")
    }

    static func updateProfile(name: String?, phone: String?) -> Endpoint {
        var body: [String: String] = [:]
        if let name = name { body["name"] = name }
        if let phone = phone { body["phone"] = phone }
        return Endpoint(
            path: "/api/user/iam/profile",
            method: .patch,
            body: body
        )
    }
}

// MARK: - Account Endpoints

enum AccountEndpoints {
    static func changePassword(request: ChangePasswordRequest) -> Endpoint {
        Endpoint(
            path: "/api/user/account/change-password",
            method: .post,
            body: request
        )
    }

    static func passwordExpiry() -> Endpoint {
        Endpoint(path: "/api/user/account/password-expiry")
    }

    static func deletionStatus() -> Endpoint {
        Endpoint(path: "/api/user/account/delete-status")
    }

    static func requestDeletion(password: String, reason: String?) -> Endpoint {
        var body: [String: String] = ["password": password]
        if let reason = reason { body["reason"] = reason }
        return Endpoint(
            path: "/api/user/account/delete-request",
            method: .post,
            body: body
        )
    }

    static func cancelDeletion() -> Endpoint {
        Endpoint(
            path: "/api/user/account/delete-cancel",
            method: .post
        )
    }
}

// MARK: - Booking Endpoints

enum BookingEndpoints {
    static func list(page: Int = 1, limit: Int = 20, status: BookingStatus? = nil) -> Endpoint {
        var params: [String: String] = [
            "page": String(page),
            "limit": String(limit)
        ]
        if let status = status {
            params["status"] = status.rawValue
        }

        return Endpoint(
            path: "/api/user/bookings",
            queryParameters: params
        )
    }

    static func detail(id: String) -> Endpoint {
        Endpoint(path: "/api/user/bookings/\(id)")
    }

    static func create(request: CreateBookingRequest) -> Endpoint {
        Endpoint(
            path: "/api/user/bookings",
            method: .post,
            body: request
        )
    }

    static func cancel(id: String) -> Endpoint {
        Endpoint(
            path: "/api/user/bookings/\(id)/cancel",
            method: .post
        )
    }
}

// MARK: - Chat Endpoints

enum ChatEndpoints {
    static func rooms(page: Int = 1, limit: Int = 20) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms",
            queryParameters: [
                "page": String(page),
                "limit": String(limit)
            ]
        )
    }

    static func messages(roomId: String, cursor: String? = nil, limit: Int = 50) -> Endpoint {
        var params: [String: String] = ["limit": String(limit)]
        if let cursor = cursor {
            params["cursor"] = cursor
        }
        return Endpoint(
            path: "/api/user/chat/rooms/\(roomId)/messages",
            queryParameters: params
        )
    }

    static func createRoom(request: CreateChatRoomRequest) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms",
            method: .post,
            body: request
        )
    }

    static func sendMessage(roomId: String, content: String, type: MessageType = .text) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms/\(roomId)/messages",
            method: .post,
            body: SendMessageRequest(content: content, messageType: type.rawValue)
        )
    }

    static func inviteMembers(roomId: String, userIds: [String]) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms/\(roomId)/members",
            method: .post,
            body: InviteMembersRequest(userIds: userIds)
        )
    }

    static func leaveRoom(roomId: String) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms/\(roomId)/leave",
            method: .delete
        )
    }

    static func markAsRead(roomId: String) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms/\(roomId)/read",
            method: .post
        )
    }

    static func sendAiMessage(roomId: String, message: String, conversationId: String? = nil) -> Endpoint {
        Endpoint(
            path: "/api/user/chat/rooms/\(roomId)/agent",
            method: .post,
            body: AiChatRequest(message: message, conversationId: conversationId)
        )
    }
}

// MARK: - Request DTOs

struct CreateChatRoomRequest: Codable, Sendable {
    let name: String
    let type: String
    let participantIds: [String]

    enum CodingKeys: String, CodingKey {
        case name
        case type
        case participantIds = "participant_ids"
    }
}

struct SendMessageRequest: Codable, Sendable {
    let content: String
    let messageType: String

    enum CodingKeys: String, CodingKey {
        case content
        case messageType = "message_type"
    }
}

// MARK: - Notification Endpoints

enum NotificationEndpoints {
    static func list(
        page: Int = 1,
        limit: Int = 20,
        type: NotificationType? = nil,
        unreadOnly: Bool = false
    ) -> Endpoint {
        var params: [String: String] = [
            "page": String(page),
            "limit": String(limit)
        ]
        if let type = type {
            params["type"] = type.rawValue
        }
        if unreadOnly {
            params["unreadOnly"] = "true"
        }

        return Endpoint(
            path: "/api/user/notifications",
            queryParameters: params
        )
    }

    static func unreadCount() -> Endpoint {
        Endpoint(path: "/api/user/notifications/unread-count")
    }

    static func markAsRead(id: Int) -> Endpoint {
        Endpoint(
            path: "/api/user/notifications/\(id)/read",
            method: .post
        )
    }

    static func markAllAsRead() -> Endpoint {
        Endpoint(
            path: "/api/user/notifications/read-all",
            method: .post
        )
    }

    static func delete(id: Int) -> Endpoint {
        Endpoint(
            path: "/api/user/notifications/\(id)",
            method: .delete
        )
    }
}
