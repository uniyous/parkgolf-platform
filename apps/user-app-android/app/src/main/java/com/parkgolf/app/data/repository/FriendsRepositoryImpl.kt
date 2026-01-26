package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.mapper.toFriendRequest
import com.parkgolf.app.data.remote.api.FriendsApi
import com.parkgolf.app.data.remote.dto.friends.SendFriendRequestBody
import com.parkgolf.app.domain.model.Friend
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.domain.model.SentFriendRequest
import com.parkgolf.app.domain.model.UserSearchResult
import com.parkgolf.app.domain.repository.FriendsRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import com.parkgolf.app.util.toUnitResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FriendsRepositoryImpl @Inject constructor(
    private val friendsApi: FriendsApi
) : FriendsRepository {

    override suspend fun getFriends(): Result<List<Friend>> = safeApiCall {
        friendsApi.getFriends().toResult("친구 목록 조회에 실패했습니다") { data ->
            data.map { it.toDomain() }
        }
    }

    override suspend fun getFriendRequests(): Result<List<FriendRequest>> = safeApiCall {
        friendsApi.getFriendRequests().toResult("친구 요청 목록 조회에 실패했습니다") { data ->
            data.map { it.toFriendRequest() }
        }
    }

    override suspend fun getSentFriendRequests(): Result<List<SentFriendRequest>> = safeApiCall {
        friendsApi.getSentFriendRequests().toResult("보낸 친구 요청 목록 조회에 실패했습니다") { data ->
            data.map { it.toDomain() }
        }
    }

    override suspend fun searchUsers(query: String): Result<List<UserSearchResult>> = safeApiCall {
        friendsApi.searchUsers(query).toResult("사용자 검색에 실패했습니다") { data ->
            data.map { it.toDomain() }
        }
    }

    override suspend fun sendFriendRequest(toUserId: Int, message: String?): Result<Unit> = safeApiCall {
        friendsApi.sendFriendRequest(
            SendFriendRequestBody(toUserId, message)
        ).toUnitResult("친구 요청 전송에 실패했습니다")
    }

    override suspend fun acceptFriendRequest(requestId: Int): Result<Unit> = safeApiCall {
        friendsApi.acceptFriendRequest(requestId).toUnitResult("친구 요청 수락에 실패했습니다")
    }

    override suspend fun rejectFriendRequest(requestId: Int): Result<Unit> = safeApiCall {
        friendsApi.rejectFriendRequest(requestId).toUnitResult("친구 요청 거절에 실패했습니다")
    }

    override suspend fun removeFriend(friendId: Int): Result<Unit> = safeApiCall {
        friendsApi.removeFriend(friendId).toUnitResult("친구 삭제에 실패했습니다")
    }

    override suspend fun checkFriendship(friendId: Int): Result<Boolean> = safeApiCall {
        friendsApi.checkFriendship(friendId).toResult("친구 관계 확인에 실패했습니다")
    }
}
