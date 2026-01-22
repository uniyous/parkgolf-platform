package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.Game
import com.parkgolf.app.domain.model.GameSearchParams
import com.parkgolf.app.domain.model.GameTimeSlot
import com.parkgolf.app.util.PaginatedData

interface GameRepository {
    suspend fun getGames(
        clubId: Int? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<PaginatedData<Game>>

    suspend fun searchGames(params: GameSearchParams): Result<PaginatedData<Game>>

    suspend fun getGame(gameId: Int): Result<Game>

    suspend fun getTimeSlots(gameId: Int, date: String?): Result<List<GameTimeSlot>>

    suspend fun getAvailableTimeSlots(gameId: Int, date: String): Result<List<GameTimeSlot>>
}
