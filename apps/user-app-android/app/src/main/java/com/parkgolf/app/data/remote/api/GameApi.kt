package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.common.PaginatedResponse
import com.parkgolf.app.data.remote.dto.game.GameDto
import com.parkgolf.app.data.remote.dto.game.GameTimeSlotDto
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface GameApi {

    @GET("api/user/games")
    suspend fun getGames(
        @Query("clubId") clubId: Int? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedResponse<GameDto>

    @GET("api/user/games/search")
    suspend fun searchGames(
        @Query("search") search: String? = null,
        @Query("date") date: String? = null,
        @Query("minPrice") minPrice: Int? = null,
        @Query("maxPrice") maxPrice: Int? = null,
        @Query("minPlayers") minPlayers: Int? = null,
        @Query("sortBy") sortBy: String? = null,
        @Query("sortOrder") sortOrder: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedResponse<GameDto>

    @GET("api/user/games/{gameId}")
    suspend fun getGame(@Path("gameId") gameId: Int): ApiResponse<GameDto>

    @GET("api/user/games/{gameId}/time-slots")
    suspend fun getTimeSlots(
        @Path("gameId") gameId: Int,
        @Query("date") date: String? = null
    ): ApiResponse<List<GameTimeSlotDto>>

    @GET("api/user/games/{gameId}/time-slots/available")
    suspend fun getAvailableTimeSlots(
        @Path("gameId") gameId: Int,
        @Query("date") date: String
    ): ApiResponse<List<GameTimeSlotDto>>
}
