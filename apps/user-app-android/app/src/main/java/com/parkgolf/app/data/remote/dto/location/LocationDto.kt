package com.parkgolf.app.data.remote.dto.location

import kotlinx.serialization.Serializable

@Serializable
data class RegionInfoDto(
    val regionType: String? = null,
    val addressName: String? = null,
    val region1: String? = null,
    val region2: String? = null,
    val region3: String? = null,
    val region4: String? = null,
    val code: String? = null
)

@Serializable
data class CurrentWeatherDto(
    val temperature: Double,
    val humidity: Double,
    val windSpeed: Double,
    val windDirection: Double,
    val precipitation: Double,
    val precipitationType: String,
    val updatedAt: String
)

@Serializable
data class NearbyClubDto(
    val id: Int,
    val name: String,
    val location: String,
    val address: String,
    val phone: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val totalHoles: Int,
    val totalCourses: Int,
    val status: String,
    val clubType: String,
    val facilities: List<String> = emptyList(),
    val distance: Double
)

@Serializable
data class ClubDetailDto(
    val id: Int,
    val name: String,
    val companyId: Int,
    val location: String,
    val address: String,
    val phone: String,
    val email: String? = null,
    val website: String? = null,
    val totalHoles: Int,
    val totalCourses: Int,
    val status: String,
    val clubType: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val operatingHours: OperatingHoursDto? = null,
    val seasonInfo: SeasonInfoDto? = null,
    val facilities: List<String> = emptyList(),
    val isActive: Boolean = true
)

@Serializable
data class OperatingHoursDto(
    val open: String,
    val close: String
)

@Serializable
data class SeasonInfoDto(
    val type: String,
    val startDate: String,
    val endDate: String
)
