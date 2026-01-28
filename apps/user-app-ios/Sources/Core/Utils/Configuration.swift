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
                return URL(string: "http://34.160.211.91/api/user")!
            case .staging:
                return URL(string: "https://user-api-stg-335495814488.asia-northeast3.run.app")!
            case .production:
                return URL(string: "https://user-api-335495814488.asia-northeast3.run.app")!
            }
        }

        static var chatSocketURL: URL {
            switch Environment.current {
            case .development:
                return URL(string: "http://34.160.211.91")!
            case .staging:
                return URL(string: "https://chat-gateway-stg-iihuzmuufa-du.a.run.app")!
            case .production:
                return URL(string: "https://chat-gateway-iihuzmuufa-du.a.run.app")!
            }
        }

        static var webSocketURL: URL {
            switch Environment.current {
            case .development:
                return URL(string: "ws://34.160.211.91/socket.io")!
            case .staging:
                return URL(string: "wss://user-api-stg-335495814488.asia-northeast3.run.app/ws/chat")!
            case .production:
                return URL(string: "wss://user-api-335495814488.asia-northeast3.run.app/ws/chat")!
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
