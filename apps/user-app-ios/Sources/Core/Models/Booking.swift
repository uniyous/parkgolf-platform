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

// MARK: - Booking Status

enum BookingStatus: String, Codable, Sendable {
    case pending = "PENDING"
    case slotReserved = "SLOT_RESERVED"
    case confirmed = "CONFIRMED"
    case cancelled = "CANCELLED"
    case completed = "COMPLETED"
    case noShow = "NO_SHOW"
    case failed = "FAILED"

    var displayName: String {
        switch self {
        case .pending, .slotReserved: return "대기중"
        case .confirmed: return "예약확정"
        case .cancelled: return "취소됨"
        case .completed: return "완료"
        case .noShow: return "노쇼"
        case .failed: return "실패"
        }
    }

    var canCancel: Bool {
        self == .confirmed || self == .pending || self == .slotReserved
    }
}

// MARK: - Booking List Status

enum BookingListStatus: String, Sendable {
    case upcoming = "UPCOMING"
    case past = "PAST"
}

// MARK: - Create Booking Request

struct CreateBookingRequest: Codable, Sendable {
    let gameId: Int
    let gameTimeSlotId: Int
    let bookingDate: String
    let playerCount: Int
    let paymentMethod: String?
    let specialRequests: String?
    let idempotencyKey: String

    enum CodingKeys: String, CodingKey {
        case gameId = "game_id"
        case gameTimeSlotId = "game_time_slot_id"
        case bookingDate = "booking_date"
        case playerCount = "player_count"
        case paymentMethod = "payment_method"
        case specialRequests = "special_requests"
        case idempotencyKey = "idempotency_key"
    }
}

// MARK: - Booking Response

struct BookingResponse: Codable, Sendable, Identifiable {
    let id: Int
    let bookingNumber: String
    let userId: Int?
    let gameId: Int
    let gameTimeSlotId: Int
    let gameName: String?
    let gameCode: String?
    let frontNineCourseId: Int?
    let frontNineCourseName: String?
    let backNineCourseId: Int?
    let backNineCourseName: String?
    let clubId: Int?
    let clubName: String?
    let bookingDate: String
    let startTime: String
    let endTime: String
    let playerCount: Int
    let pricePerPerson: Int
    let serviceFee: Int
    let totalPrice: Int
    let status: String
    let paymentMethod: String?
    let specialRequests: String?
    let notes: String?
    let userEmail: String?
    let userName: String?
    let userPhone: String?
    let canCancel: Bool?
    let createdAt: String
    let updatedAt: String?

    var statusEnum: BookingStatus {
        BookingStatus(rawValue: status) ?? .pending
    }

    var formattedDate: String {
        guard let date = DateHelper.fromISODateString(bookingDate) else {
            return bookingDate
        }
        return DateHelper.toKoreanFullDate(date)
    }

    var timeRange: String {
        "\(startTime) - \(endTime)"
    }

    var courseNames: String? {
        if let front = frontNineCourseName, let back = backNineCourseName {
            return "\(front) + \(back)"
        }
        return frontNineCourseName ?? backNineCourseName
    }
}

// MARK: - Empty Data Response

struct EmptyDataResponse: Codable, Sendable {
    let success: Bool?
}

// MARK: - Payment Method

enum PaymentMethod: String, CaseIterable, Sendable {
    case creditCard = "CREDIT_CARD"
    case kakaoPay = "KAKAO_PAY"
    case naverPay = "NAVER_PAY"
    case tossPay = "TOSS_PAY"
    case bankTransfer = "BANK_TRANSFER"

    var displayName: String {
        switch self {
        case .creditCard: return "신용카드"
        case .kakaoPay: return "카카오페이"
        case .naverPay: return "네이버페이"
        case .tossPay: return "토스페이"
        case .bankTransfer: return "계좌이체"
        }
    }

    var icon: String {
        switch self {
        case .creditCard: return "💳"
        case .kakaoPay: return "💛"
        case .naverPay: return "💚"
        case .tossPay: return "💙"
        case .bankTransfer: return "🏦"
        }
    }
}

// MARK: - Cancellation Reason

enum CancellationReason: String, CaseIterable, Sendable {
    case scheduleChange = "일정 변경"
    case personalReasons = "개인 사정"
    case healthIssues = "건강 문제"
    case weather = "날씨 이유"
    case otherBooking = "다른 예약 확정"
    case other = "기타"
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

// MARK: - Course Model

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
