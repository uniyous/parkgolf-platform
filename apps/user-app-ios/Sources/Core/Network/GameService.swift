import Foundation

// MARK: - Game Service

actor GameService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Search Games

    func searchGames(params: GameSearchParams) async throws -> GameSearchResponse {
        var queryParameters: [String: String] = [
            "page": String(params.page),
            "limit": String(params.limit),
            "sortBy": params.sortBy == .price ? "price" : params.sortBy == .name ? "name" : "createdAt",
            "sortOrder": params.sortOrder == .asc ? "asc" : "desc"
        ]

        if let query = params.query, !query.isEmpty {
            queryParameters["search"] = query
        }

        if let date = params.date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            queryParameters["date"] = formatter.string(from: date)
        }

        if let timeOfDay = params.timeOfDay, timeOfDay != .all,
           let timeRange = timeOfDay.timeRange {
            queryParameters["startTimeFrom"] = timeRange.start
            queryParameters["startTimeTo"] = timeRange.end
        }

        if let minPrice = params.minPrice {
            queryParameters["minPrice"] = String(minPrice)
        }

        if let maxPrice = params.maxPrice {
            queryParameters["maxPrice"] = String(maxPrice)
        }

        if let minPlayers = params.minPlayers {
            queryParameters["minPlayers"] = String(minPlayers)
        }

        let endpoint = Endpoint(
            path: "/api/user/games/search",
            method: .get,
            queryParameters: queryParameters
        )

        return try await apiClient.requestDirect(endpoint, responseType: GameSearchResponse.self)
    }

    // MARK: - Get Game Detail

    func getGame(id: Int) async throws -> Game {
        let endpoint = Endpoint(
            path: "/api/user/games/\(id)",
            method: .get
        )

        return try await apiClient.request(endpoint, responseType: Game.self)
    }

    // MARK: - Get Time Slots

    func getTimeSlots(gameId: Int, date: Date) async throws -> [GameTimeSlot] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let endpoint = Endpoint(
            path: "/api/user/games/\(gameId)/time-slots",
            method: .get,
            queryParameters: ["date": formatter.string(from: date)]
        )

        return try await apiClient.request(endpoint, responseType: [GameTimeSlot].self)
    }

    // MARK: - Get Available Time Slots

    func getAvailableTimeSlots(gameId: Int, date: Date) async throws -> [GameTimeSlot] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let endpoint = Endpoint(
            path: "/api/user/games/\(gameId)/available-time-slots",
            method: .get,
            queryParameters: ["date": formatter.string(from: date)]
        )

        return try await apiClient.request(endpoint, responseType: [GameTimeSlot].self)
    }
}

// MARK: - Game Service Error

enum GameServiceError: Error, LocalizedError {
    case searchFailed(String)
    case gameNotFound
    case timeSlotsUnavailable

    var errorDescription: String? {
        switch self {
        case .searchFailed(let message): return message
        case .gameNotFound: return "게임을 찾을 수 없습니다."
        case .timeSlotsUnavailable: return "예약 가능한 시간대가 없습니다."
        }
    }
}
