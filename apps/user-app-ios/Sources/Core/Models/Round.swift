import Foundation

// MARK: - Round Model

struct Round: Identifiable, Codable, Sendable {
    let id: Int
    let name: String
    let code: String?
    let description: String?
    let clubId: Int
    let clubName: String
    let club: RoundClub?
    let frontNineCourseId: Int?
    let backNineCourseId: Int?
    let frontNineCourse: RoundCourse?
    let backNineCourse: RoundCourse?
    let totalHoles: Int?
    let estimatedDuration: Int
    let breakDuration: Int?
    let maxPlayers: Int
    let basePrice: Int
    let pricePerPerson: Int?
    let weekendPrice: Int?
    let holidayPrice: Int?
    let status: String?
    let isActive: Bool
    let timeSlots: [TimeSlot]?

    var durationMinutes: Int { estimatedDuration }

    var durationText: String {
        if estimatedDuration >= 60 {
            let hours = estimatedDuration / 60
            let mins = estimatedDuration % 60
            if mins > 0 {
                return "\(hours)시간 \(mins)분"
            }
            return "\(hours)시간"
        }
        return "\(estimatedDuration)분"
    }

    var courseNames: String {
        var names: [String] = []
        if let front = frontNineCourse { names.append(front.name) }
        if let back = backNineCourse { names.append(back.name) }
        return names.joined(separator: ", ")
    }

    var clubAddress: String? {
        club?.address
    }

    var priceRange: (min: Int, max: Int)? {
        guard let slots = timeSlots, !slots.isEmpty else { return nil }
        let prices = slots.map { $0.price }
        return (prices.min() ?? basePrice, prices.max() ?? basePrice)
    }
}

// MARK: - RoundClub

struct RoundClub: Codable, Sendable {
    let id: Int
    let name: String
    let location: String?
    let address: String?
    let phone: String?
}

// MARK: - RoundCourse

struct RoundCourse: Identifiable, Codable, Sendable {
    let id: Int
    let name: String
    let code: String?
    let holeCount: Int?
}

// MARK: - Time Slot

struct TimeSlot: Identifiable, Codable, Sendable {
    let id: Int
    let gameId: Int  // API 호환성을 위해 유지
    let date: String?
    let startTime: String
    let endTime: String
    let maxPlayers: Int
    let bookedPlayers: Int?
    let availablePlayers: Int
    let price: Int
    let isPremium: Bool
    let status: String?

    var stringId: String { String(id) }

    var availableSlots: Int { availablePlayers }

    var availabilityStatus: AvailabilityStatus {
        if availablePlayers == 0 {
            return .soldOut
        } else if availablePlayers <= 2 {
            return .almostFull
        } else if availablePlayers <= 4 {
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

// MARK: - Round Search Parameters

struct RoundSearchParams: Sendable {
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

// MARK: - Round Search Response

struct RoundSearchResponse: Codable, Sendable {
    let success: Bool
    let data: [Round]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
}
