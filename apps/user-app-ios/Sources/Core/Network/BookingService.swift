import Foundation

// MARK: - Booking Service

actor BookingService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Create Booking

    func createBooking(request: CreateBookingRequest) async throws -> BookingResponse {
        let endpoint = Endpoint(
            path: "/api/user/bookings",
            method: .post,
            body: request
        )

        return try await apiClient.request(endpoint, responseType: BookingResponse.self)
    }

    // MARK: - Get My Bookings

    func getMyBookings(status: BookingListStatus?, page: Int = 1, limit: Int = 20) async throws -> BookingListResponse {
        var queryParams: [String: String] = [
            "page": String(page),
            "limit": String(limit)
        ]

        if let status = status {
            queryParams["status"] = status.rawValue
        }

        let endpoint = Endpoint(
            path: "/api/user/bookings",
            method: .get,
            queryParameters: queryParams
        )

        return try await apiClient.requestDirect(endpoint, responseType: BookingListResponse.self)
    }

    // MARK: - Get Booking by Number

    func getBooking(bookingNumber: String) async throws -> BookingResponse {
        let endpoint = Endpoint(
            path: "/api/user/bookings/number/\(bookingNumber)",
            method: .get
        )

        return try await apiClient.request(endpoint, responseType: BookingResponse.self)
    }

    // MARK: - Get Booking by ID

    func getBooking(id: Int) async throws -> BookingResponse {
        let endpoint = Endpoint(
            path: "/api/user/bookings/\(id)",
            method: .get
        )

        return try await apiClient.request(endpoint, responseType: BookingResponse.self)
    }

    // MARK: - Cancel Booking

    func cancelBooking(id: Int, reason: String?) async throws {
        struct CancelRequest: Codable {
            let reason: String?
        }

        let endpoint = Endpoint(
            path: "/api/user/bookings/\(id)",
            method: .delete,
            body: CancelRequest(reason: reason)
        )

        _ = try await apiClient.request(endpoint, responseType: EmptyDataResponse.self)
    }
}

// MARK: - Request/Response Types

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

struct BookingResponse: Codable, Sendable, Identifiable {
    let id: Int
    let bookingNumber: String
    let userId: Int
    let gameId: Int
    let gameName: String?
    let clubName: String?
    let courseNames: String?
    let gameTimeSlotId: Int
    let bookingDate: String
    let startTime: String
    let endTime: String
    let playerCount: Int
    let status: String
    let totalPrice: Int
    let serviceFee: Int
    let pricePerPerson: Int
    let paymentMethod: String?
    let specialRequests: String?
    let createdAt: String
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case bookingNumber = "booking_number"
        case userId = "user_id"
        case gameId = "game_id"
        case gameName = "game_name"
        case clubName = "club_name"
        case courseNames = "course_names"
        case gameTimeSlotId = "game_time_slot_id"
        case bookingDate = "booking_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case playerCount = "player_count"
        case status
        case totalPrice = "total_price"
        case serviceFee = "service_fee"
        case pricePerPerson = "price_per_person"
        case paymentMethod = "payment_method"
        case specialRequests = "special_requests"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

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
}

struct BookingListResponse: Codable, Sendable {
    let data: [BookingResponse]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int

    enum CodingKeys: String, CodingKey {
        case data, total, page, limit
        case totalPages = "total_pages"
    }
}

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

enum BookingListStatus: String, Sendable {
    case upcoming = "UPCOMING"
    case past = "PAST"
}

struct EmptyDataResponse: Codable, Sendable {
    let success: Bool?
}

// MARK: - Payment Methods

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

// MARK: - Cancellation Reasons

enum CancellationReason: String, CaseIterable, Sendable {
    case scheduleChange = "일정 변경"
    case personalReasons = "개인 사정"
    case healthIssues = "건강 문제"
    case weather = "날씨 이유"
    case otherBooking = "다른 예약 확정"
    case other = "기타"
}
