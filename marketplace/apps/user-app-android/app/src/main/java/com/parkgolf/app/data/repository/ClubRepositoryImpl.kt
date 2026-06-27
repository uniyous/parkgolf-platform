package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.ClubApi
import com.parkgolf.app.domain.model.ClubDetail
import com.parkgolf.app.domain.repository.ClubRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClubRepositoryImpl @Inject constructor(
    private val clubApi: ClubApi
) : ClubRepository {

    override suspend fun getClubDetail(clubId: Int): Result<ClubDetail> = safeApiCall {
        clubApi.getClubDetail(clubId).toResult("골프장 정보 조회에 실패했습니다") { it.toDomain() }
    }
}
