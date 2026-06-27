import XCTest

final class ParkGolfUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Login Tests

    func testLoginScreenAppears() throws {
        // Verify login screen elements exist
        XCTAssertTrue(app.staticTexts["파크골프"].exists)
        XCTAssertTrue(app.textFields["이메일을 입력하세요"].exists)
        XCTAssertTrue(app.secureTextFields["비밀번호를 입력하세요"].exists)
        XCTAssertTrue(app.buttons["로그인"].exists)
    }

    func testLoginWithEmptyFields() throws {
        // Login button should be disabled with empty fields
        let loginButton = app.buttons["로그인"]
        XCTAssertFalse(loginButton.isEnabled)
    }

    func testNavigateToSignUp() throws {
        // Tap sign up link
        app.buttons["회원가입"].tap()

        // Verify sign up screen appears
        XCTAssertTrue(app.navigationBars["회원가입"].exists)
    }

    func testNavigateToForgotPassword() throws {
        // Tap forgot password link
        app.buttons["비밀번호 찾기"].tap()

        // Verify forgot password screen appears
        XCTAssertTrue(app.navigationBars["비밀번호 찾기"].exists)
    }

    // MARK: - Main Tab Navigation Tests

    func testMainTabNavigation() throws {
        // Note: This test assumes user is already logged in
        // You may need to set up test user credentials

        // Skip if not logged in
        guard app.tabBars.firstMatch.exists else {
            throw XCTSkip("User not logged in")
        }

        // Test tab navigation
        app.tabBars.buttons["예약"].tap()
        XCTAssertTrue(app.navigationBars["내 예약"].exists)

        app.tabBars.buttons["채팅"].tap()
        XCTAssertTrue(app.navigationBars["채팅"].exists)

        app.tabBars.buttons["마이"].tap()
        XCTAssertTrue(app.navigationBars["마이페이지"].exists)

        app.tabBars.buttons["홈"].tap()
        XCTAssertTrue(app.navigationBars["파크골프"].exists)
    }
}
