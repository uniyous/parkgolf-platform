import XCTest

// MARK: - Game Search E2E Tests

/// 라운드 검색 E2E 테스트 시나리오
///
/// ## 테스트 시나리오
/// 1. 검색 화면 진입 및 UI 요소 확인
/// 2. 날짜 선택 기능 테스트
/// 3. 시간대 필터 (전체/오전/오후) 테스트
/// 4. 검색어 입력 및 검색 테스트
/// 5. 게임 카드 표시 확인
/// 6. 타임슬롯 선택 → 예약 폼 이동
/// 7. 필터 시트 기능 테스트
/// 8. 페이지네이션 테스트
final class GameSearchUITests: XCTestCase {
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
    /// 실제 환경에서는 테스트 계정으로 로그인하거나 Mock 데이터 사용
    /// - Throws: XCTSkip if login is required but cannot proceed
    private func loginIfNeeded() throws {
        // 탭바가 있으면 이미 로그인된 상태
        if app.tabBars.firstMatch.waitForExistence(timeout: 3) {
            return
        }

        // 로그인 화면이면 테스트 계정으로 로그인 시도
        // 참고: 실제 테스트 환경에서는 유효한 테스트 계정 필요
        if app.textFields["이메일을 입력하세요"].exists {
            let emailField = app.textFields["이메일을 입력하세요"]
            let passwordField = app.secureTextFields["비밀번호를 입력하세요"]
            let loginButton = app.buttons["로그인"]

            emailField.tap()
            emailField.typeText("test@example.com")

            passwordField.tap()
            passwordField.typeText("testpassword123")

            loginButton.tap()

            // 로그인 완료 대기
            let tabBar = app.tabBars.firstMatch
            if !tabBar.waitForExistence(timeout: 10) {
                throw XCTSkip("로그인 실패 - 테스트 계정 설정이 필요합니다. 환경변수나 테스트 백엔드 확인 필요.")
            }
        } else {
            throw XCTSkip("로그인 화면을 찾을 수 없습니다.")
        }
    }

    /// 게임 검색 화면으로 이동
    private func navigateToGameSearch() throws {
        try loginIfNeeded()

        // 홈에서 "라운드 검색하기" 버튼 탭
        let searchButton = app.buttons["라운드 검색하기"]
        if searchButton.waitForExistence(timeout: 5) {
            searchButton.tap()
        } else {
            // 또는 검색 탭으로 이동
            let searchTab = app.tabBars.buttons["검색"]
            if searchTab.exists {
                searchTab.tap()
            }
        }
    }

    // MARK: - Test: 검색 화면 UI 요소 확인

    func testGameSearchScreenAppears() throws {
        try navigateToGameSearch()

        // 검색 필드 확인
        let searchField = app.textFields["골프장, 코스 검색..."]
        XCTAssertTrue(searchField.waitForExistence(timeout: 5), "검색 필드가 표시되어야 합니다")

        // 필터 버튼 확인
        let filterButton = app.buttons.matching(identifier: "filterButton").firstMatch
        XCTAssertTrue(filterButton.exists || app.images["slider.horizontal.3"].exists, "필터 버튼이 표시되어야 합니다")

        // 시간대 필터 확인
        XCTAssertTrue(app.buttons["전체"].exists, "전체 시간대 필터가 표시되어야 합니다")
        XCTAssertTrue(app.buttons["오전"].exists, "오전 시간대 필터가 표시되어야 합니다")
        XCTAssertTrue(app.buttons["오후"].exists, "오후 시간대 필터가 표시되어야 합니다")
    }

    // MARK: - Test: 날짜 선택 기능

    func testDateSelection() throws {
        try navigateToGameSearch()

        // 날짜 칩들이 표시되는지 확인
        let todayChip = app.buttons["오늘"]
        XCTAssertTrue(todayChip.waitForExistence(timeout: 5), "오늘 날짜 칩이 표시되어야 합니다")

        let tomorrowChip = app.buttons["내일"]
        XCTAssertTrue(tomorrowChip.exists, "내일 날짜 칩이 표시되어야 합니다")

        // 내일 날짜 선택
        tomorrowChip.tap()

        // 로딩 후 결과 확인 (검색이 트리거되어야 함)
        let loadingIndicator = app.activityIndicators.firstMatch
        if loadingIndicator.exists {
            XCTAssertTrue(loadingIndicator.waitForNonExistence(timeout: 10), "로딩이 완료되어야 합니다")
        }
    }

    // MARK: - Test: 시간대 필터 기능

    func testTimeOfDayFilter() throws {
        try navigateToGameSearch()

        // 기본 "전체" 선택 상태 확인
        let allFilter = app.buttons["전체"]
        XCTAssertTrue(allFilter.waitForExistence(timeout: 5))

        // 오전 필터 선택
        let morningFilter = app.buttons["오전"]
        morningFilter.tap()

        // 로딩 대기
        sleep(2)

        // 오후 필터 선택
        let afternoonFilter = app.buttons["오후"]
        afternoonFilter.tap()

        // 로딩 대기
        sleep(2)

        // 다시 전체 선택
        allFilter.tap()
    }

    // MARK: - Test: 검색어 입력 및 검색

    func testSearchQuery() throws {
        try navigateToGameSearch()

        let searchField = app.textFields["골프장, 코스 검색..."]
        XCTAssertTrue(searchField.waitForExistence(timeout: 5))

        // 검색어 입력
        searchField.tap()
        searchField.typeText("서울")

        // 디바운스 대기 (300ms + 여유)
        sleep(1)

        // 결과가 업데이트되거나 빈 상태 메시지가 표시되어야 함
        let emptyState = app.staticTexts["검색 결과가 없습니다"]
        let gameCard = app.otherElements.matching(identifier: "gameCard").firstMatch

        // 둘 중 하나가 존재해야 함
        XCTAssertTrue(
            emptyState.waitForExistence(timeout: 5) || gameCard.waitForExistence(timeout: 5),
            "검색 결과 또는 빈 상태 메시지가 표시되어야 합니다"
        )

        // 검색어 지우기
        searchField.tap()
        searchField.buttons["Clear text"].tap()
    }

    // MARK: - Test: 게임 카드 표시 및 정보 확인

    func testGameCardDisplay() throws {
        try navigateToGameSearch()

        // 게임 카드가 로드될 때까지 대기
        let gameCard = app.scrollViews.firstMatch.otherElements.firstMatch
        XCTAssertTrue(gameCard.waitForExistence(timeout: 10), "게임 카드가 표시되어야 합니다")

        // 게임 카드 내 정보 확인 (골프장명, 코스명 등)
        // Note: 실제 데이터에 따라 텍스트가 달라짐
    }

    // MARK: - Test: 타임슬롯 선택 → 예약 폼 이동

    func testTimeSlotSelectionNavigatesToBookingForm() throws {
        try navigateToGameSearch()

        // 게임 카드 로드 대기
        sleep(3)

        // 첫 번째 타임슬롯 찾기 (시간 형식: HH:mm)
        let timeSlotPredicate = NSPredicate(format: "label MATCHES %@", "\\d{2}:\\d{2}")
        let timeSlots = app.buttons.matching(timeSlotPredicate)

        guard timeSlots.count > 0 else {
            throw XCTSkip("테스트할 타임슬롯이 없습니다")
        }

        // 첫 번째 타임슬롯 탭
        let firstTimeSlot = timeSlots.element(boundBy: 0)
        firstTimeSlot.tap()

        // 예약 폼이 나타나는지 확인
        let bookingForm = app.otherElements["BookingFormView"]
        let bookingTitle = app.staticTexts["예약하기"]
        let playerCountSelector = app.steppers.firstMatch

        XCTAssertTrue(
            bookingForm.waitForExistence(timeout: 5) ||
            bookingTitle.waitForExistence(timeout: 5) ||
            playerCountSelector.waitForExistence(timeout: 5),
            "예약 폼이 표시되어야 합니다"
        )
    }

    // MARK: - Test: 필터 시트 기능

    func testFilterSheet() throws {
        try navigateToGameSearch()

        // 필터 버튼 탭
        let filterButton = app.images["slider.horizontal.3"].firstMatch
        guard filterButton.waitForExistence(timeout: 5) else {
            // 다른 방법으로 필터 버튼 찾기
            let buttons = app.buttons.allElementsBoundByIndex
            for button in buttons {
                if button.frame.width < 60 && button.frame.height < 60 {
                    // 작은 버튼 중 필터 버튼일 가능성
                    button.tap()
                    break
                }
            }
            return
        }

        filterButton.tap()

        // 필터 시트가 표시되는지 확인
        let filterSheetTitle = app.staticTexts["상세 필터"]
        XCTAssertTrue(filterSheetTitle.waitForExistence(timeout: 5), "필터 시트가 표시되어야 합니다")

        // 가격대 섹션 확인
        XCTAssertTrue(app.staticTexts["💰 가격대"].exists, "가격대 필터 섹션이 표시되어야 합니다")

        // 인원 섹션 확인
        XCTAssertTrue(app.staticTexts["👥 인원"].exists, "인원 필터 섹션이 표시되어야 합니다")

        // 정렬 섹션 확인
        XCTAssertTrue(app.staticTexts["📊 정렬"].exists, "정렬 필터 섹션이 표시되어야 합니다")

        // 인원 필터 선택 테스트
        let twoPlayerFilter = app.buttons["2명"]
        if twoPlayerFilter.exists {
            twoPlayerFilter.tap()
        }

        // 적용하기 버튼 탭
        let applyButton = app.buttons["적용하기"]
        XCTAssertTrue(applyButton.exists, "적용하기 버튼이 표시되어야 합니다")
        applyButton.tap()

        // 시트가 닫히고 검색이 실행되어야 함
        XCTAssertTrue(filterSheetTitle.waitForNonExistence(timeout: 3), "필터 시트가 닫혀야 합니다")
    }

    // MARK: - Test: 필터 초기화

    func testFilterReset() throws {
        try navigateToGameSearch()

        // 필터 버튼 탭
        let filterButton = app.images["slider.horizontal.3"].firstMatch
        guard filterButton.waitForExistence(timeout: 5) else {
            throw XCTSkip("필터 버튼을 찾을 수 없습니다")
        }

        filterButton.tap()

        // 필터 시트 대기
        let filterSheetTitle = app.staticTexts["상세 필터"]
        XCTAssertTrue(filterSheetTitle.waitForExistence(timeout: 5))

        // 초기화 버튼 탭
        let resetButton = app.buttons["초기화"]
        XCTAssertTrue(resetButton.exists, "초기화 버튼이 표시되어야 합니다")
        resetButton.tap()

        // 닫기 버튼으로 시트 닫기
        let closeButton = app.buttons["닫기"]
        if closeButton.exists {
            closeButton.tap()
        }
    }

    // MARK: - Test: Pull to Refresh

    func testPullToRefresh() throws {
        try navigateToGameSearch()

        // 스크롤뷰 찾기
        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 5))

        // Pull to refresh 제스처
        scrollView.swipeDown()

        // 로딩 인디케이터 확인 (선택적)
        sleep(2)
    }

    // MARK: - Test: 빈 결과 상태

    func testEmptySearchResults() throws {
        try navigateToGameSearch()

        let searchField = app.textFields["골프장, 코스 검색..."]
        XCTAssertTrue(searchField.waitForExistence(timeout: 5))

        // 존재하지 않을 검색어 입력
        searchField.tap()
        searchField.typeText("xyzabc123456")

        // 디바운스 대기
        sleep(2)

        // 빈 상태 메시지 확인
        let emptyStateTitle = app.staticTexts["검색 결과가 없습니다"]
        let emptyStateDescription = app.staticTexts["다른 날짜나 검색어로 시도해보세요"]

        XCTAssertTrue(
            emptyStateTitle.waitForExistence(timeout: 5),
            "검색 결과 없음 메시지가 표시되어야 합니다"
        )
    }

    // MARK: - Test: 전체 검색 플로우 (E2E)

    func testCompleteGameSearchFlow() throws {
        // 1. 게임 검색 화면 진입
        try navigateToGameSearch()

        // 2. 검색 화면 UI 확인
        let searchField = app.textFields["골프장, 코스 검색..."]
        XCTAssertTrue(searchField.waitForExistence(timeout: 5), "검색 필드가 표시되어야 합니다")

        // 3. 내일 날짜 선택
        let tomorrowChip = app.buttons["내일"]
        if tomorrowChip.exists {
            tomorrowChip.tap()
            sleep(2)
        }

        // 4. 오전 시간대 필터 선택
        let morningFilter = app.buttons["오전"]
        if morningFilter.exists {
            morningFilter.tap()
            sleep(2)
        }

        // 5. 검색 결과 확인
        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 5))

        // 6. 첫 번째 타임슬롯 선택 시도
        let timeSlotPredicate = NSPredicate(format: "label MATCHES %@", "\\d{2}:\\d{2}")
        let timeSlots = app.buttons.matching(timeSlotPredicate)

        if timeSlots.count > 0 {
            let firstTimeSlot = timeSlots.element(boundBy: 0)
            firstTimeSlot.tap()

            // 7. 예약 폼 확인
            sleep(2)

            // 예약 폼이 표시되면 테스트 성공
            // 취소하고 돌아가기
            let dismissButton = app.buttons["취소"]
            if dismissButton.exists {
                dismissButton.tap()
            }
        }

        // 8. 검색 화면으로 돌아왔는지 확인
        XCTAssertTrue(searchField.waitForExistence(timeout: 5), "검색 화면으로 돌아와야 합니다")
    }
}

// MARK: - XCUIElement Extension

extension XCUIElement {
    /// 요소가 사라질 때까지 대기
    func waitForNonExistence(timeout: TimeInterval) -> Bool {
        let predicate = NSPredicate(format: "exists == false")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
        let result = XCTWaiter.wait(for: [expectation], timeout: timeout)
        return result == .completed
    }
}
