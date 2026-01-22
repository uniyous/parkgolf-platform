package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.GameApi
import com.parkgolf.app.data.remote.dto.game.GameDto
import com.parkgolf.app.data.remote.dto.game.GameTimeSlotDto
import com.parkgolf.app.domain.model.Game
import com.parkgolf.app.domain.model.GameClub
import com.parkgolf.app.domain.model.GameCourse
import com.parkgolf.app.domain.model.GameSearchParams
import com.parkgolf.app.domain.model.GameTimeSlot
import com.parkgolf.app.domain.repository.GameRepository
import com.parkgolf.app.util.PaginatedData
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GameRepositoryImpl @Inject constructor(
    private val gameApi: GameApi
) : GameRepository {

    override suspend fun getGames(clubId: Int?, page: Int, limit: Int): Result<PaginatedData<Game>> {
        return try {
            val response = gameApi.getGames(clubId, page, limit)
            if (response.success) {
                Result.success(
                    PaginatedData(
                        data = response.data.map { it.toDomain() },
                        total = response.total,
                        page = response.page,
                        limit = response.limit,
                        totalPages = response.totalPages
                    )
                )
            } else {
                Result.failure(Exception("Failed to get games"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun searchGames(params: GameSearchParams): Result<PaginatedData<Game>> {
        return try {
            val response = gameApi.searchGames(
                search = params.search,
                date = params.date,
                minPrice = params.minPrice,
                maxPrice = params.maxPrice,
                minPlayers = params.minPlayers,
                sortBy = params.sortBy,
                sortOrder = params.sortOrder,
                page = params.page,
                limit = params.limit
            )
            if (response.success) {
                Result.success(
                    PaginatedData(
                        data = response.data.map { it.toDomain() },
                        total = response.total,
                        page = response.page,
                        limit = response.limit,
                        totalPages = response.totalPages
                    )
                )
            } else {
                Result.failure(Exception("Failed to search games"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getGame(gameId: Int): Result<Game> {
        return try {
            val response = gameApi.getGame(gameId)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get game"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getTimeSlots(gameId: Int, date: String?): Result<List<GameTimeSlot>> {
        return try {
            val response = gameApi.getTimeSlots(gameId, date)
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get time slots"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getAvailableTimeSlots(gameId: Int, date: String): Result<List<GameTimeSlot>> {
        return try {
            val response = gameApi.getAvailableTimeSlots(gameId, date)
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get available time slots"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

private fun GameDto.toDomain(): Game {
    return Game(
        id = id,
        name = name,
        code = code,
        description = description,
        clubId = clubId,
        clubName = clubName,
        club = club?.let {
            GameClub(
                id = it.id,
                name = it.name,
                address = it.address,
                phoneNumber = it.phoneNumber,
                description = it.description,
                imageUrl = it.imageUrl,
                latitude = it.latitude,
                longitude = it.longitude
            )
        },
        frontNineCourse = frontNineCourse?.let {
            GameCourse(
                id = it.id,
                name = it.name,
                holes = it.holes,
                par = it.par,
                description = it.description
            )
        },
        backNineCourse = backNineCourse?.let {
            GameCourse(
                id = it.id,
                name = it.name,
                holes = it.holes,
                par = it.par,
                description = it.description
            )
        },
        totalHoles = totalHoles,
        estimatedDuration = estimatedDuration,
        maxPlayers = maxPlayers,
        basePrice = basePrice,
        pricePerPerson = pricePerPerson,
        weekendPrice = weekendPrice,
        isActive = isActive,
        timeSlots = timeSlots?.map { it.toDomain() }
    )
}

private fun GameTimeSlotDto.toDomain(): GameTimeSlot {
    return GameTimeSlot(
        id = id,
        gameId = gameId,
        startTime = startTime,
        endTime = endTime,
        availablePlayers = availablePlayers,
        maxPlayers = maxPlayers,
        price = price,
        isPremium = isPremium,
        isAvailable = isAvailable
    )
}
