package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.RoundSearchParams
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.util.PaginatedData

interface RoundRepository {
    suspend fun getRounds(
        clubId: Int? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<PaginatedData<Round>>

    suspend fun searchRounds(params: RoundSearchParams): Result<PaginatedData<Round>>

    suspend fun getRound(roundId: Int): Result<Round>

    suspend fun getTimeSlots(roundId: Int, date: String?): Result<List<TimeSlot>>

    suspend fun getAvailableTimeSlots(roundId: Int, date: String): Result<List<TimeSlot>>
}
