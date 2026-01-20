import XCTest
@testable import ParkGolf

final class ParkGolfTests: XCTestCase {

    override func setUpWithError() throws {
        // Setup code
    }

    override func tearDownWithError() throws {
        // Cleanup code
    }

    // MARK: - User Model Tests

    func testUserDecoding() throws {
        let json = """
        {
            "id": 123,
            "email": "test@example.com",
            "name": "홍길동",
            "phoneNumber": "010-1234-5678",
            "profileImageUrl": null,
            "createdAt": "2024-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let user = try decoder.decode(User.self, from: json)

        XCTAssertEqual(user.id, 123)
        XCTAssertEqual(user.email, "test@example.com")
        XCTAssertEqual(user.name, "홍길동")
        XCTAssertEqual(user.phoneNumber, "010-1234-5678")
        XCTAssertNil(user.profileImageUrl)
    }

    // MARK: - Booking Model Tests

    func testBookingStatusDisplayName() {
        XCTAssertEqual(BookingStatus.pending.displayName, "대기중")
        XCTAssertEqual(BookingStatus.confirmed.displayName, "예약확정")
        XCTAssertEqual(BookingStatus.cancelled.displayName, "취소됨")
        XCTAssertEqual(BookingStatus.completed.displayName, "완료")
    }

    // MARK: - Login Validation Tests

    @MainActor
    func testLoginFormValidation() {
        let viewModel = LoginViewModel()

        // Empty form should be invalid
        XCTAssertFalse(viewModel.isFormValid)

        // Email without @ should be invalid
        viewModel.email = "invalid-email"
        viewModel.password = "password123"
        XCTAssertFalse(viewModel.isFormValid)

        // Valid form
        viewModel.email = "test@example.com"
        viewModel.password = "password123"
        XCTAssertTrue(viewModel.isFormValid)
    }

    // MARK: - SignUp Validation Tests

    @MainActor
    func testSignUpFormValidation() {
        let viewModel = SignUpViewModel()

        // Empty form should be invalid
        XCTAssertFalse(viewModel.isFormValid)

        // Fill in all required fields
        viewModel.name = "홍길동"
        viewModel.email = "test@example.com"
        viewModel.password = "password123"
        viewModel.confirmPassword = "password123"
        viewModel.agreeToTerms = true

        XCTAssertTrue(viewModel.isFormValid)

        // Password mismatch should be invalid
        viewModel.confirmPassword = "different"
        XCTAssertFalse(viewModel.isFormValid)

        // Short password should be invalid
        viewModel.password = "short"
        viewModel.confirmPassword = "short"
        XCTAssertFalse(viewModel.isFormValid)

        // Not agreed to terms should be invalid
        viewModel.password = "password123"
        viewModel.confirmPassword = "password123"
        viewModel.agreeToTerms = false
        XCTAssertFalse(viewModel.isFormValid)
    }
}
