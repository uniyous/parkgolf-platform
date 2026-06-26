package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.location.NearbyClubDto
import com.parkgolf.app.data.remote.dto.location.RegionInfoDto
import retrofit2.http.GET
import retrofit2.http.Query

interface LocationApi {

    @GET("api/user/location/reverse-geo")
    suspend fun reverseGeo(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double
    ): ApiResponse<RegionInfoDto>

    @GET("api/user/location/nearby-clubs")
    suspend fun nearbyClubs(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double,
        @Query("radius") radius: Double = 30.0,
        @Query("limit") limit: Int = 10
    ): ApiResponse<List<NearbyClubDto>>
}
