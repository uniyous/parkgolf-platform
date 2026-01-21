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
}

// MARK: - Club Endpoints

enum ClubEndpoints {
    static func list(page: Int = 1, limit: Int = 20, search: String? = nil) -> Endpoint {
        var params: [String: String] = [
            "page": String(page),
            "limit": String(limit)
        ]
        if let search = search {
            params["search"] = search
        }

        return Endpoint(
            path: "/api/user/clubs",
            queryParameters: params
        )
    }

    static func detail(id: String) -> Endpoint {
        Endpoint(path: "/api/user/clubs/\(id)")
    }

    static func courses(clubId: String) -> Endpoint {
        Endpoint(path: "/api/user/clubs/\(clubId)/courses")
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
}

// MARK: - Request DTOs

// Legacy booking request - deprecated, use CreateBookingRequest from BookingService
struct LegacyCreateBookingRequest: Codable, Sendable {
    let clubId: String
    let courseId: String
    let bookingDate: String
    let startTime: String
    let playerCount: Int
    let invitedUserIds: [String]?

    enum CodingKeys: String, CodingKey {
        case clubId = "club_id"
        case courseId = "course_id"
        case bookingDate = "booking_date"
        case startTime = "start_time"
        case playerCount = "player_count"
        case invitedUserIds = "invited_user_ids"
    }
}

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
