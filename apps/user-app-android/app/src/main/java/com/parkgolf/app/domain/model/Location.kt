package com.parkgolf.app.domain.model

data class RegionInfo(
    val regionType: String?,
    val addressName: String?,
    val region1: String?,
    val region2: String?,
    val region3: String?,
    val region4: String?,
    val code: String?
) {
    val displayName: String
        get() = region3 ?: region2 ?: addressName ?: ""
}

data class CurrentWeather(
    val temperature: Double,
    val humidity: Double,
    val windSpeed: Double,
    val windDirection: Double,
    val precipitation: Double,
    val precipitationType: String,
    val updatedAt: String
) {
    val weatherDescription: String
        get() = when (precipitationType) {
            "RAIN" -> "비"
            "SNOW" -> "눈"
            "SLEET" -> "진눈깨비"
            "DRIZZLE" -> "이슬비"
            "SNOW_FLURRY" -> "날림눈"
            else -> "맑음"
        }

    val weatherIcon: String
        get() = when (precipitationType) {
            "RAIN" -> "cloud_rain"
            "SNOW" -> "cloud_snow"
            "SLEET" -> "cloud_sleet"
            "DRIZZLE" -> "cloud_drizzle"
            "SNOW_FLURRY" -> "cloud_snow"
            else -> "sun_max"
        }
}

data class NearbyClub(
    val id: Int,
    val name: String,
    val location: String,
    val address: String,
    val phone: String,
    val latitude: Double?,
    val longitude: Double?,
    val totalHoles: Int,
    val totalCourses: Int,
    val status: String,
    val clubType: String,
    val facilities: List<String>,
    val distance: Double
) {
    val distanceText: String
        get() = if (distance < 1.0) {
            "${(distance * 1000).toInt()}m"
        } else {
            String.format("%.1fkm", distance)
        }
}
