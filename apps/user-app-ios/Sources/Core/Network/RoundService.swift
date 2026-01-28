import Foundation

// MARK: - Round Service

actor RoundService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Search Rounds

    func searchRounds(params: RoundSearchParams) async throws -> RoundSearchResponse {
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
            queryParameters["date"] = DateHelper.toISODateString(date)
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

        return try await apiClient.requestDirect(endpoint, responseType: RoundSearchResponse.self)
    }

    // MARK: - Get Round Detail

    func getRound(id: Int) async throws -> Round {
        let endpoint = Endpoint(
            path: "/api/user/games/\(id)",
            method: .get
        )

        return try await apiClient.request(endpoint, responseType: Round.self)
    }

    // MARK: - Get Time Slots

    func getTimeSlots(roundId: Int, date: Date) async throws -> [TimeSlot] {
        let endpoint = Endpoint(
            path: "/api/user/games/\(roundId)/time-slots",
            method: .get,
            queryParameters: ["date": DateHelper.toISODateString(date)]
        )

        return try await apiClient.request(endpoint, responseType: [TimeSlot].self)
    }

    // MARK: - Get Available Time Slots

    func getAvailableTimeSlots(roundId: Int, date: Date) async throws -> [TimeSlot] {
        let endpoint = Endpoint(
            path: "/api/user/games/\(roundId)/available-time-slots",
            method: .get,
            queryParameters: ["date": DateHelper.toISODateString(date)]
        )

        return try await apiClient.request(endpoint, responseType: [TimeSlot].self)
    }
}

// MARK: - Round Service Error

enum RoundServiceError: Error, LocalizedError {
    case searchFailed(String)
    case roundNotFound
    case timeSlotsUnavailable

    var errorDescription: String? {
        switch self {
        case .searchFailed(let message): return message
        case .roundNotFound: return "라운드를 찾을 수 없습니다."
        case .timeSlotsUnavailable: return "예약 가능한 시간대가 없습니다."
        }
    }
}
