import Foundation

// MARK: - Payment DTOs

struct PreparePaymentRequest: Codable, Sendable {
    let amount: Int
    let orderName: String
    let bookingId: Int?
}

struct PreparePaymentResponse: Codable, Sendable {
    let orderId: String
    let amount: Int
    let orderName: String
}

struct ConfirmPaymentRequest: Codable, Sendable {
    let paymentKey: String
    let orderId: String
    let amount: Int
}

struct ConfirmPaymentResponse: Codable, Sendable {
    let paymentId: Int
    let orderId: String
    let paymentKey: String
    let amount: Int
    let status: String
}

struct PaymentStatusResponse: Codable, Sendable {
    let id: Int
    let orderId: String
    let paymentKey: String?
    let amount: Int
    let status: String
    let bookingId: Int?
}

// MARK: - Payment Service

actor PaymentService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Prepare Payment

    func preparePayment(request: PreparePaymentRequest) async throws -> PreparePaymentResponse {
        let endpoint = Endpoint(
            path: "/api/user/payments/prepare",
            method: .post,
            body: request
        )

        return try await apiClient.request(endpoint, responseType: PreparePaymentResponse.self)
    }

    // MARK: - Confirm Payment

    func confirmPayment(request: ConfirmPaymentRequest) async throws -> ConfirmPaymentResponse {
        let endpoint = Endpoint(
            path: "/api/user/payments/confirm",
            method: .post,
            body: request
        )

        return try await apiClient.request(endpoint, responseType: ConfirmPaymentResponse.self)
    }

    // MARK: - Get Payment by Order ID

    func getPaymentByOrderId(orderId: String) async throws -> PaymentStatusResponse {
        let endpoint = Endpoint(
            path: "/api/user/payments/order/\(orderId)",
            method: .get
        )

        return try await apiClient.request(endpoint, responseType: PaymentStatusResponse.self)
    }
}
