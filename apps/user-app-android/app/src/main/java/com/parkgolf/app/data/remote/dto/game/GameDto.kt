package com.parkgolf.app.data.remote.dto.game

import kotlinx.serialization.Serializable

@Serializable
data class GameDto(
    val id: Int,
    val name: String,
    val code: String? = null,
    val description: String? = null,
    val clubId: Int,
    val clubName: String,
    val club: GameClubDto? = null,
    val frontNineCourse: GameCourseDto? = null,
    val backNineCourse: GameCourseDto? = null,
    val totalHoles: Int? = null,
    val estimatedDuration: Int,
    val maxPlayers: Int,
    val basePrice: Int,
    val pricePerPerson: Int? = null,
    val weekendPrice: Int? = null,
    val isActive: Boolean = true,
    val timeSlots: List<GameTimeSlotDto>? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class GameClubDto(
    val id: Int,
    val name: String,
    val address: String? = null,
    val phoneNumber: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

@Serializable
data class GameCourseDto(
    val id: Int,
    val name: String,
    val holes: Int = 9,
    val par: Int? = null,
    val description: String? = null
)

@Serializable
data class GameTimeSlotDto(
    val id: Int,
    val gameId: Int,
    val startTime: String,
    val endTime: String,
    val availablePlayers: Int,
    val maxPlayers: Int,
    val price: Int,
    val isPremium: Boolean = false,
    val isAvailable: Boolean = true
)
