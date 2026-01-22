import Foundation

// MARK: - Test User Model

struct TestUser {
    let email: String
    let password: String
    let name: String
    let role: String

    static let allUsers: [TestUser] = [
        TestUser(email: "test@parkgolf.com", password: "test1234", name: "테스트사용자", role: "USER"),
        TestUser(email: "kim@parkgolf.com", password: "test1234", name: "김철수", role: "USER"),
        TestUser(email: "park@parkgolf.com", password: "test1234", name: "박영희", role: "USER"),
        TestUser(email: "lee@parkgolf.com", password: "test1234", name: "이민수", role: "USER"),
    ]
}
