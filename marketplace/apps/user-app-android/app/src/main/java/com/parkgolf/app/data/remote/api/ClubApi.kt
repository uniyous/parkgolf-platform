package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.location.ClubDetailDto
import retrofit2.http.GET
import retrofit2.http.Path

interface ClubApi {

    @GET("api/user/clubs/{clubId}")
    suspend fun getClubDetail(@Path("clubId") clubId: Int): ApiResponse<ClubDetailDto>
}
