package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.ClubDetail

interface ClubRepository {
    suspend fun getClubDetail(clubId: Int): Result<ClubDetail>
}
