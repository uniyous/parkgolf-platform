package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.LocationApi
import com.parkgolf.app.data.remote.api.WeatherApi
import com.parkgolf.app.domain.model.CurrentWeather
import com.parkgolf.app.domain.model.NearbyClub
import com.parkgolf.app.domain.model.RegionInfo
import com.parkgolf.app.domain.repository.LocationWeatherRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationWeatherRepositoryImpl @Inject constructor(
    private val locationApi: LocationApi,
    private val weatherApi: WeatherApi
) : LocationWeatherRepository {

    override suspend fun reverseGeo(lat: Double, lon: Double): Result<RegionInfo> = safeApiCall {
        locationApi.reverseGeo(lat, lon).toResult("행정동 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun nearbyClubs(lat: Double, lon: Double, radius: Double, limit: Int): Result<List<NearbyClub>> = safeApiCall {
        locationApi.nearbyClubs(lat, lon, radius, limit).toResult("주변 골프장 조회에 실패했습니다") { dtos ->
            dtos.map { it.toDomain() }
        }
    }

    override suspend fun getCurrentWeather(lat: Double, lon: Double): Result<CurrentWeather> = safeApiCall {
        weatherApi.getCurrentWeather(lat, lon).toResult("날씨 조회에 실패했습니다") { it.toDomain() }
    }
}
