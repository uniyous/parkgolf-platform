package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.RoundApi
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.RoundSearchParams
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.domain.repository.RoundRepository
import com.parkgolf.app.util.PaginatedData
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoundRepositoryImpl @Inject constructor(
    private val roundApi: RoundApi
) : RoundRepository {

    override suspend fun getRounds(clubId: Int?, page: Int, limit: Int): Result<PaginatedData<Round>> = safeApiCall {
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
            Result.failure(Exception("라운드 목록 조회에 실패했습니다"))
        }
    }

    override suspend fun searchRounds(params: RoundSearchParams): Result<PaginatedData<Round>> = safeApiCall {
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
            Result.failure(Exception("라운드 검색에 실패했습니다"))
        }
    }

    override suspend fun getRound(roundId: Int): Result<Round> = safeApiCall {
        roundApi.getRound(roundId).toResult("라운드 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun getTimeSlots(roundId: Int, date: String?): Result<List<TimeSlot>> = safeApiCall {
        roundApi.getTimeSlots(roundId, date).toResult("타임슬롯 조회에 실패했습니다") { data ->
            data.map { it.toDomain() }
        }
    }

    override suspend fun getAvailableTimeSlots(roundId: Int, date: String): Result<List<TimeSlot>> = safeApiCall {
        roundApi.getAvailableTimeSlots(roundId, date).toResult("예약 가능 타임슬롯 조회에 실패했습니다") { data ->
            data.map { it.toDomain() }
        }
    }
}
