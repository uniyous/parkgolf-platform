import Foundation

// MARK: - Game Model

struct Game: Identifiable, Codable, Sendable {
    let id: Int
    let name: String
    let description: String?
    let clubId: Int
    let clubName: String
    let clubAddress: String?
    let courses: [GameCourse]
    let durationMinutes: Int
    let maxPlayers: Int
    let basePrice: Int
    let isActive: Bool
    let createdAt: Date?
    let timeSlots: [GameTimeSlot]?

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case clubId = "club_id"
        case clubName = "club_name"
        case clubAddress = "club_address"
        case courses
        case durationMinutes = "duration_minutes"
        case maxPlayers = "max_players"
        case basePrice = "base_price"
        case isActive = "is_active"
        case createdAt = "created_at"
        case timeSlots = "time_slots"
    }

    var durationText: String {
        if durationMinutes >= 60 {
            let hours = durationMinutes / 60
            let mins = durationMinutes % 60
            if mins > 0 {
                return "\(hours)시간 \(mins)분"
            }
            return "\(hours)시간"
        }
        return "\(durationMinutes)분"
    }

    var courseNames: String {
        courses.map { $0.name }.joined(separator: ", ")
    }

    var priceRange: (min: Int, max: Int)? {
        guard let slots = timeSlots, !slots.isEmpty else { return nil }
        let prices = slots.map { $0.price }
        return (prices.min() ?? basePrice, prices.max() ?? basePrice)
    }
}

// MARK: - Game Course

struct GameCourse: Identifiable, Codable, Sendable {
    let id: Int
    let name: String
    let holeCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, name
        case holeCount = "hole_count"
    }
}

// MARK: - Game Time Slot

struct GameTimeSlot: Identifiable, Codable, Sendable {
    let id: Int
    let gameId: Int
    let startTime: String
    let endTime: String
    let price: Int
    let maxCapacity: Int
    let availableSlots: Int
    let isPremium: Bool
    let dayOfWeek: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case gameId = "game_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case price
        case maxCapacity = "max_capacity"
        case availableSlots = "available_slots"
        case isPremium = "is_premium"
        case dayOfWeek = "day_of_week"
    }

    var stringId: String { String(id) }

    var availabilityStatus: AvailabilityStatus {
        if availableSlots == 0 {
            return .soldOut
        } else if availableSlots <= 2 {
            return .almostFull
        } else if availableSlots <= 4 {
            return .limited
        } else {
            return .available
        }
    }
}

enum AvailabilityStatus {
    case available
    case limited
    case almostFull
    case soldOut

    var color: String {
        switch self {
        case .available: return "green"
        case .limited: return "yellow"
        case .almostFull: return "red"
        case .soldOut: return "gray"
        }
    }
}

// MARK: - Game Search Parameters

struct GameSearchParams: Sendable {
    var query: String?
    var date: Date?
    var timeOfDay: TimeOfDay?
    var minPrice: Int?
    var maxPrice: Int?
    var minPlayers: Int?
    var sortBy: SortOption
    var sortOrder: SortOrder
    var page: Int
    var limit: Int

    init(
        query: String? = nil,
        date: Date? = nil,
        timeOfDay: TimeOfDay? = nil,
        minPrice: Int? = nil,
        maxPrice: Int? = nil,
        minPlayers: Int? = nil,
        sortBy: SortOption = .price,
        sortOrder: SortOrder = .asc,
        page: Int = 1,
        limit: Int = 20
    ) {
        self.query = query
        self.date = date
        self.timeOfDay = timeOfDay
        self.minPrice = minPrice
        self.maxPrice = maxPrice
        self.minPlayers = minPlayers
        self.sortBy = sortBy
        self.sortOrder = sortOrder
        self.page = page
        self.limit = limit
    }

    enum TimeOfDay: String, CaseIterable, Sendable {
        case all = "전체"
        case morning = "오전"
        case afternoon = "오후"

        var timeRange: (start: String, end: String)? {
            switch self {
            case .all: return nil
            case .morning: return ("06:00", "11:59")
            case .afternoon: return ("12:00", "18:00")
            }
        }
    }

    enum SortOption: String, CaseIterable, Sendable {
        case price = "가격순"
        case name = "이름순"
        case createdAt = "최신순"
    }

    enum SortOrder: String, CaseIterable, Sendable {
        case asc = "오름차순"
        case desc = "내림차순"
    }
}

// MARK: - Game Search Response

struct GameSearchResponse: Codable, Sendable {
    let data: [Game]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int

    enum CodingKeys: String, CodingKey {
        case data, total, page, limit
        case totalPages = "total_pages"
    }
}
