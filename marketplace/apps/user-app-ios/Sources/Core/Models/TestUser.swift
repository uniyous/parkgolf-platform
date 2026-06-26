import Foundation

// MARK: - Test User Model

struct TestUser {
    let email: String
    let password: String
    let name: String
    let role: String

    static let allUsers: [TestUser] = [
        TestUser(email: "test@parkgolf.com", password: "test1234", name: "테스트사용자", role: "USER"),
        TestUser(email: "cheolsu@parkgolf.com", password: "test1234", name: "김철수", role: "USER"),
        TestUser(email: "younghee@parkgolf.com", password: "test1234", name: "박영희", role: "USER"),
        TestUser(email: "minsu@parkgolf.com", password: "test1234", name: "이민수", role: "USER"),
        TestUser(email: "minsoo@parkgolf.com", password: "test1234", name: "김민수", role: "USER"),
        TestUser(email: "jieun@parkgolf.com", password: "test1234", name: "이지은", role: "USER"),
        TestUser(email: "junhyuk@parkgolf.com", password: "test1234", name: "박준혁", role: "USER"),
        TestUser(email: "seoyeon@parkgolf.com", password: "test1234", name: "최서연", role: "USER"),
    ]
}
