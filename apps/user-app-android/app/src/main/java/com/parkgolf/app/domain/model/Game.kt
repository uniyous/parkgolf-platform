package com.parkgolf.app.domain.model

data class Game(
    val id: Int,
    val name: String,
    val code: String? = null,
    val description: String? = null,
    val clubId: Int,
    val clubName: String,
    val club: GameClub? = null,
    val frontNineCourse: GameCourse? = null,
    val backNineCourse: GameCourse? = null,
    val totalHoles: Int? = null,
    val estimatedDuration: Int,
    val maxPlayers: Int,
    val basePrice: Int,
    val pricePerPerson: Int? = null,
    val weekendPrice: Int? = null,
    val isActive: Boolean = true,
    val timeSlots: List<GameTimeSlot>? = null
) {
    val durationText: String
        get() = if (estimatedDuration >= 60) {
            val hours = estimatedDuration / 60
            val mins = estimatedDuration % 60
            if (mins > 0) "${hours}시간 ${mins}분" else "${hours}시간"
        } else "${estimatedDuration}분"

    val courseNames: String
        get() = listOfNotNull(frontNineCourse?.name, backNineCourse?.name)
            .joinToString(", ")

    val priceText: String
        get() = "${String.format("%,d", basePrice)}원"

    val priceRange: PriceRange?
        get() {
            val prices = timeSlots?.map { it.price } ?: return null
            if (prices.isEmpty()) return null
            return PriceRange(prices.min(), prices.max())
        }
}

data class GameClub(
    val id: Int,
    val name: String,
    val address: String? = null,
    val phoneNumber: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class GameCourse(
    val id: Int,
    val name: String,
    val holes: Int = 9,
    val par: Int? = null,
    val description: String? = null
)

data class GameTimeSlot(
    val id: Int,
    val gameId: Int,
    val startTime: String,
    val endTime: String,
    val availablePlayers: Int,
    val maxPlayers: Int,
    val price: Int,
    val isPremium: Boolean = false,
    val isAvailable: Boolean = true
) {
    val priceText: String
        get() = "${String.format("%,d", price)}원"

    val priceShortText: String
        get() = "₩${price / 1000}k"

    val timeText: String
        get() = "$startTime - $endTime"

    val availabilityText: String
        get() = "$availablePlayers/${maxPlayers}명"

    val availabilityStatus: AvailabilityStatus
        get() = when {
            availablePlayers == 0 -> AvailabilityStatus.SOLD_OUT
            availablePlayers <= 2 -> AvailabilityStatus.ALMOST_FULL
            availablePlayers <= maxPlayers / 2 -> AvailabilityStatus.LIMITED
            else -> AvailabilityStatus.AVAILABLE
        }
}

enum class AvailabilityStatus {
    AVAILABLE,
    LIMITED,
    ALMOST_FULL,
    SOLD_OUT
}

data class PriceRange(
    val min: Int,
    val max: Int
)

data class GameSearchParams(
    val search: String? = null,
    val date: String? = null,
    val timeOfDay: TimeOfDay? = null,
    val minPrice: Int? = null,
    val maxPrice: Int? = null,
    val minPlayers: Int? = null,
    val sortBy: SortOption = SortOption.PRICE,
    val sortOrder: SortOrder = SortOrder.ASC,
    val page: Int = 1,
    val limit: Int = 20
)

enum class TimeOfDay(val label: String, val startTime: String?, val endTime: String?) {
    ALL("전체", null, null),
    MORNING("오전", "06:00", "12:00"),
    AFTERNOON("오후", "12:00", "18:00"),
    EVENING("저녁", "18:00", "22:00")
}

enum class SortOption(val label: String, val value: String) {
    PRICE("가격순", "price"),
    TIME("시간순", "time"),
    AVAILABILITY("잔여석순", "availability")
}

enum class SortOrder(val label: String, val value: String) {
    ASC("낮은순", "asc"),
    DESC("높은순", "desc")
}
