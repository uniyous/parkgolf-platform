package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.RoundApi
import com.parkgolf.app.data.remote.dto.round.RoundDto
import com.parkgolf.app.data.remote.dto.round.TimeSlotDto
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.RoundClub
import com.parkgolf.app.domain.model.RoundCourse
import com.parkgolf.app.domain.model.RoundSearchParams
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.domain.repository.RoundRepository
import com.parkgolf.app.util.PaginatedData
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoundRepositoryImpl @Inject constructor(
    private val roundApi: RoundApi
) : RoundRepository {

    override suspend fun getRounds(clubId: Int?, page: Int, limit: Int): Result<PaginatedData<Round>> {
        return try {
            val response = roundApi.getRounds(clubId, page, limit)
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
                Result.failure(Exception("Failed to get rounds"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun searchRounds(params: RoundSearchParams): Result<PaginatedData<Round>> {
        return try {
            val response = roundApi.searchRounds(
                search = params.search,
                date = params.date,
                minPrice = params.minPrice,
                maxPrice = params.maxPrice,
                minPlayers = params.minPlayers,
                sortBy = params.sortBy.value,
                sortOrder = params.sortOrder.value,
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
                Result.failure(Exception("Failed to search rounds"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getRound(roundId: Int): Result<Round> {
        return try {
            val response = roundApi.getRound(roundId)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get round"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getTimeSlots(roundId: Int, date: String?): Result<List<TimeSlot>> {
        return try {
            val response = roundApi.getTimeSlots(roundId, date)
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get time slots"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getAvailableTimeSlots(roundId: Int, date: String): Result<List<TimeSlot>> {
        return try {
            val response = roundApi.getAvailableTimeSlots(roundId, date)
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

private fun RoundDto.toDomain(): Round {
    return Round(
        id = id,
        name = name,
        code = code,
        description = description,
        clubId = clubId,
        clubName = clubName,
        club = club?.let {
            RoundClub(
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
            RoundCourse(
                id = it.id,
                name = it.name,
                holes = it.holes,
                par = it.par,
                description = it.description
            )
        },
        backNineCourse = backNineCourse?.let {
            RoundCourse(
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

private fun TimeSlotDto.toDomain(): TimeSlot {
    return TimeSlot(
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
