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

    val timeText: String
        get() = "$startTime - $endTime"

    val availabilityText: String
        get() = "$availablePlayers/${maxPlayers}명"
}

data class GameSearchParams(
    val search: String? = null,
    val date: String? = null,
    val minPrice: Int? = null,
    val maxPrice: Int? = null,
    val minPlayers: Int? = null,
    val sortBy: String? = null,
    val sortOrder: String? = null,
    val page: Int = 1,
    val limit: Int = 20
)
