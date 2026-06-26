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

    func getMyBookings(status: BookingListStatus?, page: Int = 1, limit: Int = 20) async throws -> [BookingResponse] {
        let endpoint = Endpoint(
            path: "/api/user/bookings",
            method: .get
        )

        return try await apiClient.requestArray(endpoint, responseType: BookingResponse.self)
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

    // MARK: - Cancel Booking (단일 결제 — booker 전체 취소)

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

    // MARK: - Cancel Participant (더치페이 본인 자리 취소 — AGENT_PAY.md §11.4)

    func cancelParticipant(id: Int, reason: String?) async throws -> CancelParticipantResponse {
        struct CancelRequest: Codable {
            let reason: String?
        }

        let endpoint = Endpoint(
            path: "/api/user/bookings/\(id)/participant",
            method: .delete,
            body: CancelRequest(reason: reason)
        )

        return try await apiClient.request(endpoint, responseType: CancelParticipantResponse.self)
    }
}
