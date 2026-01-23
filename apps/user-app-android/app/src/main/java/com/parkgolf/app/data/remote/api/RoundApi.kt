package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.common.PaginatedResponse
import com.parkgolf.app.data.remote.dto.round.RoundDto
import com.parkgolf.app.data.remote.dto.round.TimeSlotDto
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface RoundApi {

    @GET("api/user/games")
    suspend fun getRounds(
        @Query("clubId") clubId: Int? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedResponse<RoundDto>

    @GET("api/user/games/search")
    suspend fun searchRounds(
        @Query("search") search: String? = null,
        @Query("date") date: String? = null,
        @Query("minPrice") minPrice: Int? = null,
        @Query("maxPrice") maxPrice: Int? = null,
        @Query("minPlayers") minPlayers: Int? = null,
        @Query("sortBy") sortBy: String? = null,
        @Query("sortOrder") sortOrder: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedResponse<RoundDto>

    @GET("api/user/games/{roundId}")
    suspend fun getRound(@Path("roundId") roundId: Int): ApiResponse<RoundDto>

    @GET("api/user/games/{roundId}/time-slots")
    suspend fun getTimeSlots(
        @Path("roundId") roundId: Int,
        @Query("date") date: String? = null
    ): ApiResponse<List<TimeSlotDto>>

    @GET("api/user/games/{roundId}/time-slots/available")
    suspend fun getAvailableTimeSlots(
        @Path("roundId") roundId: Int,
        @Query("date") date: String
    ): ApiResponse<List<TimeSlotDto>>
}
