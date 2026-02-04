import Foundation

// MARK: - App Configuration

enum Configuration {
    // MARK: - Environment

    enum Environment: String {
        case development
        case staging
        case production

        static var current: Environment {
            #if DEBUG
            return .development
            #else
            return .production
            #endif
        }
    }

    // MARK: - API URLs

    enum API {
        static var baseURL: URL {
            switch Environment.current {
            case .development:
                return URL(string: "https://dev-api.goparkmate.com/api/user")!
            case .staging:
                return URL(string: "https://dev-api.goparkmate.com/api/user")!
            case .production:
                return URL(string: "https://api.goparkmate.com/api/user")!
            }
        }

        static var chatSocketURL: URL {
            switch Environment.current {
            case .development:
                return URL(string: "https://dev-api.goparkmate.com")!
            case .staging:
                return URL(string: "https://dev-api.goparkmate.com")!
            case .production:
                return URL(string: "https://api.goparkmate.com")!
            }
        }

        static var webSocketURL: URL {
            switch Environment.current {
            case .development:
                return URL(string: "wss://dev-api.goparkmate.com/socket.io")!
            case .staging:
                return URL(string: "wss://dev-api.goparkmate.com/socket.io")!
            case .production:
                return URL(string: "wss://api.goparkmate.com/socket.io")!
            }
        }
    }

    // MARK: - Timeouts

    enum Timeout {
        static let request: TimeInterval = 30
        static let resource: TimeInterval = 60
        static let webSocket: TimeInterval = 10
    }

    // MARK: - Pagination

    enum Pagination {
        static let defaultLimit = 20
        static let maxLimit = 100
    }

    // MARK: - Debounce

    enum Debounce {
        static let search: UInt64 = 300_000_000 // 300ms in nanoseconds
        static let typing: UInt64 = 500_000_000 // 500ms
    }

    // MARK: - Feature Flags

    enum Features {
        static let enableSocialLogin = false
        static let enablePayment = false
        static let enablePushNotifications = false
    }
}
