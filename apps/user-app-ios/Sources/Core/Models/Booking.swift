import Foundation

// MARK: - Booking Model

struct Booking: Identifiable, Codable, Sendable {
    let id: String
    let userId: String
    let clubId: String
    let clubName: String
    let courseId: String
    let courseName: String
    let bookingDate: Date
    let startTime: String
    let endTime: String
    let playerCount: Int
    let status: BookingStatus
    let totalPrice: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case clubId = "club_id"
        case clubName = "club_name"
        case courseId = "course_id"
        case courseName = "course_name"
        case bookingDate = "booking_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case playerCount = "player_count"
        case status
        case totalPrice = "total_price"
        case createdAt = "created_at"
    }
}

enum BookingStatus: String, Codable, Sendable {
    case pending = "PENDING"
    case confirmed = "CONFIRMED"
    case cancelled = "CANCELLED"
    case completed = "COMPLETED"

    var displayName: String {
        switch self {
        case .pending: "대기중"
        case .confirmed: "확정"
        case .cancelled: "취소됨"
        case .completed: "완료"
        }
    }

    var color: String {
        switch self {
        case .pending: "orange"
        case .confirmed: "green"
        case .cancelled: "red"
        case .completed: "gray"
        }
    }
}

// MARK: - Club Model

struct Club: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let address: String
    let phoneNumber: String?
    let imageUrl: String?
    let latitude: Double?
    let longitude: Double?
    let courses: [Course]?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case address
        case phoneNumber = "phone_number"
        case imageUrl = "image_url"
        case latitude
        case longitude
        case courses
    }
}

struct Course: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let holeCount: Int
    let par: Int

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case holeCount = "hole_count"
        case par
    }
}
