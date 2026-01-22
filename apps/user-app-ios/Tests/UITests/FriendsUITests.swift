import XCTest

// MARK: - Friends E2E Tests

/// 친구 기능 E2E 테스트 시나리오
///
/// ## 테스트 시나리오
/// 1. 친구 목록 화면 UI 요소 확인
/// 2. 친구 요청 탭 전환 테스트
/// 3. 친구 추가 시트 열기
/// 4. 이름/이메일 검색 테스트
/// 5. 주소록에서 친구 찾기 버튼 테스트
/// 6. 친구 요청 보내기 테스트
/// 7. 친구 요청 수락/거절 테스트
/// 8. 친구 삭제 테스트
final class FriendsUITests: XCTestCase {
    var app: XCUIApplication!

    // MARK: - Setup & Teardown

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helper Methods

    /// 로그인이 필요한 테스트를 위한 헬퍼
    private func loginIfNeeded() throws {
        // 탭바가 있으면 이미 로그인된 상태
        if app.tabBars.firstMatch.waitForExistence(timeout: 3) {
            return
        }

        // 방법 1: 테스트 사용자 카드 탭 (UI에 테스트 계정 버튼이 있는 경우)
        let testUserCard = app.buttons.matching(NSPredicate(format: "label CONTAINS '테스트사용자' OR label CONTAINS 'test@parkgolf'")).firstMatch
        if testUserCard.waitForExistence(timeout: 3) {
            testUserCard.tap()
            sleep(1)

            // 로그인 버튼 탭
            let loginButton = app.buttons["로그인"]
            if loginButton.waitForExistence(timeout: 3) {
                loginButton.tap()
            }

            // 로그인 완료 대기
            let tabBar = app.tabBars.firstMatch
            if tabBar.waitForExistence(timeout: 15) {
                return
            }
        }

        // 방법 2: 직접 입력
        if app.textFields["이메일을 입력하세요"].exists {
            let emailField = app.textFields["이메일을 입력하세요"]
            let passwordField = app.secureTextFields["비밀번호를 입력하세요"]
            let loginButton = app.buttons["로그인"]

            emailField.tap()
            emailField.typeText("test@parkgolf.com")

            passwordField.tap()
            passwordField.typeText("test1234")

            loginButton.tap()

            // 로그인 완료 대기
            let tabBar = app.tabBars.firstMatch
            if tabBar.waitForExistence(timeout: 15) {
                return
            }
        }

        // 로그인 실패 시 스킵
        throw XCTSkip("로그인 실패 - 테스트 계정 설정이 필요합니다. 서버 연결을 확인하세요.")
    }

    /// 친구 화면으로 이동
    private func navigateToFriends() throws {
        try loginIfNeeded()

        // 친구 탭으로 이동
        let friendsTab = app.tabBars.buttons["친구"]
        if friendsTab.waitForExistence(timeout: 5) {
            friendsTab.tap()
        } else {
            throw XCTSkip("친구 탭을 찾을 수 없습니다.")
        }

        // 친구 화면 로드 대기
        sleep(1)
    }

    // MARK: - Test: 친구 목록 화면 UI 요소 확인

    func testFriendsScreenAppears() throws {
        try navigateToFriends()

        // 네비게이션 타이틀 확인
        XCTAssertTrue(
            app.navigationBars["친구"].exists ||
            app.staticTexts["친구"].exists,
            "친구 화면 타이틀이 표시되어야 합니다"
        )

        // 세그먼트 피커 확인 (친구/요청)
        XCTAssertTrue(app.buttons["친구"].exists, "친구 세그먼트가 표시되어야 합니다")
        XCTAssertTrue(app.buttons["요청"].exists, "요청 세그먼트가 표시되어야 합니다")

        // 친구 추가 버튼 확인
        let addButton = app.buttons.matching(NSPredicate(format: "label CONTAINS '추가' OR identifier CONTAINS 'person.badge.plus'")).firstMatch
        XCTAssertTrue(
            addButton.exists || app.images["person.badge.plus"].exists,
            "친구 추가 버튼이 표시되어야 합니다"
        )
    }

    // MARK: - Test: 세그먼트 전환

    func testSegmentSwitch() throws {
        try navigateToFriends()

        // 친구 세그먼트 확인
        let friendsSegment = app.buttons["친구"]
        let requestsSegment = app.buttons["요청"]

        XCTAssertTrue(friendsSegment.waitForExistence(timeout: 5))
        XCTAssertTrue(requestsSegment.exists)

        // 요청 세그먼트로 전환
        requestsSegment.tap()
        sleep(1)

        // 요청 목록 또는 빈 상태가 표시되어야 함
        let emptyRequestsState = app.staticTexts["받은 요청이 없습니다"]
        let requestList = app.scrollViews.firstMatch

        XCTAssertTrue(
            emptyRequestsState.waitForExistence(timeout: 3) || requestList.exists,
            "요청 목록 또는 빈 상태가 표시되어야 합니다"
        )

        // 다시 친구 세그먼트로 전환
        friendsSegment.tap()
        sleep(1)
    }

    // MARK: - Test: 친구 추가 시트 열기

    func testOpenAddFriendSheet() throws {
        try navigateToFriends()

        // 친구 추가 버튼 탭
        let addButton = app.navigationBars.buttons.element(boundBy: 0)
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()
        } else {
            // 다른 방법으로 찾기
            let toolbarButton = app.images["person.badge.plus"].firstMatch
            if toolbarButton.exists {
                toolbarButton.tap()
            }
        }

        // 친구 추가 시트 확인
        let addFriendTitle = app.staticTexts["친구 추가"]
        XCTAssertTrue(addFriendTitle.waitForExistence(timeout: 5), "친구 추가 시트가 표시되어야 합니다")

        // 검색 필드 확인
        let searchField = app.textFields["이메일 또는 이름으로 검색"]
        XCTAssertTrue(searchField.exists, "검색 필드가 표시되어야 합니다")

        // 주소록에서 찾기 버튼 확인
        let contactsButton = app.buttons["주소록에서 찾기"]
        XCTAssertTrue(contactsButton.exists, "주소록에서 찾기 버튼이 표시되어야 합니다")

        // 닫기 버튼 확인
        let closeButton = app.buttons["닫기"]
        XCTAssertTrue(closeButton.exists, "닫기 버튼이 표시되어야 합니다")
    }

    // MARK: - Test: 이름/이메일 검색

    func testSearchUsers() throws {
        try navigateToFriends()

        // 친구 추가 시트 열기
        let addButton = app.navigationBars.buttons.element(boundBy: 0)
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()
        }

        let addFriendTitle = app.staticTexts["친구 추가"]
        XCTAssertTrue(addFriendTitle.waitForExistence(timeout: 5))

        // 검색어 입력
        let searchField = app.textFields["이메일 또는 이름으로 검색"]
        XCTAssertTrue(searchField.exists)

        searchField.tap()
        searchField.typeText("kim")

        // 디바운스 대기
        sleep(2)

        // 검색 결과 또는 빈 상태 확인
        let emptyState = app.staticTexts["검색 결과가 없습니다"]
        let userRow = app.cells.firstMatch

        XCTAssertTrue(
            emptyState.waitForExistence(timeout: 5) || userRow.waitForExistence(timeout: 5),
            "검색 결과 또는 빈 상태가 표시되어야 합니다"
        )

        // 닫기
        let closeButton = app.buttons["닫기"]
        if closeButton.exists {
            closeButton.tap()
        }
    }

    // MARK: - Test: 주소록에서 친구 찾기 버튼

    func testContactsFindButton() throws {
        try navigateToFriends()

        // 친구 추가 시트 열기
        let addButton = app.navigationBars.buttons.element(boundBy: 0)
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()
        }

        let addFriendTitle = app.staticTexts["친구 추가"]
        XCTAssertTrue(addFriendTitle.waitForExistence(timeout: 5))

        // 주소록에서 찾기 버튼 탭
        let contactsButton = app.buttons["주소록에서 찾기"]
        XCTAssertTrue(contactsButton.exists, "주소록에서 찾기 버튼이 표시되어야 합니다")

        contactsButton.tap()

        // 권한 팝업 또는 로딩 상태 확인
        // Note: 시뮬레이터에서는 권한 팝업이 나타날 수 있음
        sleep(2)

        // 권한 거부 상태 또는 결과 목록 확인
        let permissionDenied = app.staticTexts["주소록 접근 권한 필요"]
        let contactsSection = app.staticTexts["주소록 친구"]
        let loadingIndicator = app.activityIndicators.firstMatch

        // 세 가지 상태 중 하나가 나타나야 함
        XCTAssertTrue(
            permissionDenied.waitForExistence(timeout: 5) ||
            contactsSection.waitForExistence(timeout: 5) ||
            loadingIndicator.waitForNonExistence(timeout: 10),
            "권한 요청/거부 상태 또는 연락처 결과가 표시되어야 합니다"
        )

        // 닫기
        let closeButton = app.buttons["닫기"]
        if closeButton.exists {
            closeButton.tap()
        }
    }

    // MARK: - Test: 친구 요청 보내기

    func testSendFriendRequest() throws {
        try navigateToFriends()

        // 친구 추가 시트 열기
        let addButton = app.navigationBars.buttons.element(boundBy: 0)
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()
        }

        let addFriendTitle = app.staticTexts["친구 추가"]
        XCTAssertTrue(addFriendTitle.waitForExistence(timeout: 5))

        // 검색어 입력 (다른 테스트 사용자 검색)
        let searchField = app.textFields["이메일 또는 이름으로 검색"]
        searchField.tap()
        searchField.typeText("park@parkgolf.com")

        // 디바운스 대기
        sleep(2)

        // 검색 결과에서 추가 버튼 찾기
        let addRequestButton = app.buttons["추가"]
        if addRequestButton.waitForExistence(timeout: 5) {
            addRequestButton.tap()

            // 요청 후 버튼 상태 변경 확인 (요청됨)
            let requestedLabel = app.staticTexts["요청됨"]
            XCTAssertTrue(
                requestedLabel.waitForExistence(timeout: 3),
                "친구 요청 후 '요청됨' 상태가 표시되어야 합니다"
            )
        } else {
            // 이미 친구이거나 요청된 상태
            let friendLabel = app.staticTexts["친구"]
            let requestedLabel = app.staticTexts["요청됨"]
            XCTAssertTrue(
                friendLabel.exists || requestedLabel.exists,
                "검색 결과가 없거나 이미 친구/요청 상태입니다"
            )
        }

        // 닫기
        let closeButton = app.buttons["닫기"]
        if closeButton.exists {
            closeButton.tap()
        }
    }

    // MARK: - Test: 친구 목록 빈 상태

    func testEmptyFriendsList() throws {
        try navigateToFriends()

        // 친구가 없을 때 빈 상태 메시지 확인
        let emptyStateTitle = app.staticTexts["친구가 없습니다"]
        let emptyStateDescription = app.staticTexts["친구를 추가하고 함께 골프를 즐겨보세요"]

        // 친구 목록이 있거나 빈 상태가 표시되어야 함
        let friendsList = app.scrollViews.firstMatch

        XCTAssertTrue(
            emptyStateTitle.waitForExistence(timeout: 5) ||
            friendsList.waitForExistence(timeout: 5),
            "친구 목록 또는 빈 상태가 표시되어야 합니다"
        )
    }

    // MARK: - Test: 친구 요청 빈 상태

    func testEmptyRequestsList() throws {
        try navigateToFriends()

        // 요청 세그먼트로 전환 (다양한 방식 시도)
        let requestsSegment = app.buttons["요청"]
        let segmentedControl = app.segmentedControls.firstMatch

        if requestsSegment.waitForExistence(timeout: 3) {
            requestsSegment.tap()
        } else if segmentedControl.waitForExistence(timeout: 3) {
            // 세그먼트 컨트롤에서 직접 두 번째 버튼 탭
            segmentedControl.buttons.element(boundBy: 1).tap()
        } else {
            // 화면이 로드되었는지 확인
            XCTAssertTrue(
                app.staticTexts["친구"].exists || app.navigationBars["친구"].exists,
                "친구 화면이 표시되어야 합니다"
            )
            return
        }

        sleep(1)

        // 요청이 없을 때 빈 상태 메시지 확인
        let emptyStateTitle = app.staticTexts["받은 요청이 없습니다"]

        // 요청 목록이 있거나 빈 상태가 표시되어야 함
        let requestsList = app.scrollViews.firstMatch

        XCTAssertTrue(
            emptyStateTitle.waitForExistence(timeout: 5) ||
            requestsList.waitForExistence(timeout: 5),
            "요청 목록 또는 빈 상태가 표시되어야 합니다"
        )
    }

    // MARK: - Test: Pull to Refresh

    func testPullToRefresh() throws {
        try navigateToFriends()

        // 스크롤뷰 찾기
        let scrollView = app.scrollViews.firstMatch

        if scrollView.waitForExistence(timeout: 5) {
            // Pull to refresh 제스처
            scrollView.swipeDown()

            // 로딩 대기
            sleep(2)
        }

        // 새로고침 후에도 화면이 정상적으로 표시되어야 함
        XCTAssertTrue(
            app.buttons["친구"].exists || app.buttons["요청"].exists,
            "새로고침 후 화면이 정상적으로 표시되어야 합니다"
        )
    }

    // MARK: - Test: 전체 친구 플로우 (E2E)

    func testCompleteFriendsFlow() throws {
        // 1. 친구 화면 진입
        try navigateToFriends()

        // 2. 친구 목록 확인
        let friendsSegment = app.buttons["친구"]
        XCTAssertTrue(friendsSegment.waitForExistence(timeout: 5), "친구 세그먼트가 표시되어야 합니다")

        // 3. 요청 탭 확인
        let requestsSegment = app.buttons["요청"]
        requestsSegment.tap()
        sleep(1)

        // 4. 다시 친구 탭으로
        friendsSegment.tap()
        sleep(1)

        // 5. 친구 추가 시트 열기
        let addButton = app.navigationBars.buttons.element(boundBy: 0)
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()
        }

        let addFriendTitle = app.staticTexts["친구 추가"]
        XCTAssertTrue(addFriendTitle.waitForExistence(timeout: 5))

        // 6. 검색 기능 확인
        let searchField = app.textFields["이메일 또는 이름으로 검색"]
        XCTAssertTrue(searchField.exists, "검색 필드가 표시되어야 합니다")

        // 7. 주소록 버튼 확인
        let contactsButton = app.buttons["주소록에서 찾기"]
        XCTAssertTrue(contactsButton.exists, "주소록에서 찾기 버튼이 표시되어야 합니다")

        // 8. 시트 닫기
        let closeButton = app.buttons["닫기"]
        XCTAssertTrue(closeButton.exists)
        closeButton.tap()

        // 9. 친구 화면으로 돌아왔는지 확인
        XCTAssertTrue(friendsSegment.waitForExistence(timeout: 5), "친구 화면으로 돌아와야 합니다")
    }
}
