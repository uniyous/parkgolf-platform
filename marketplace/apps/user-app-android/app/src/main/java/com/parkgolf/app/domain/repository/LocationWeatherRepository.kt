package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.CurrentWeather
import com.parkgolf.app.domain.model.NearbyClub
import com.parkgolf.app.domain.model.RegionInfo

interface LocationWeatherRepository {
    suspend fun reverseGeo(lat: Double, lon: Double): Result<RegionInfo>
    suspend fun nearbyClubs(lat: Double, lon: Double, radius: Double = 30.0, limit: Int = 10): Result<List<NearbyClub>>
    suspend fun getCurrentWeather(lat: Double, lon: Double): Result<CurrentWeather>
}
