package com.parkgolf.app.domain.model

data class ClubDetail(
    val id: Int,
    val name: String,
    val companyId: Int,
    val location: String,
    val address: String,
    val phone: String,
    val email: String?,
    val website: String?,
    val totalHoles: Int,
    val totalCourses: Int,
    val status: String,
    val clubType: String,
    val latitude: Double?,
    val longitude: Double?,
    val operatingHours: OperatingHours?,
    val seasonInfo: SeasonInfo?,
    val facilities: List<String>,
    val isActive: Boolean
) {
    val clubTypeDisplayName: String
        get() = when (clubType) {
            "PUBLIC" -> "퍼블릭"
            "PRIVATE" -> "프라이빗"
            else -> clubType
        }

    val isOpen: Boolean
        get() = status == "ACTIVE"

    data class OperatingHours(
        val open: String,
        val close: String
    )

    data class SeasonInfo(
        val type: String,
        val startDate: String,
        val endDate: String
    )
}
