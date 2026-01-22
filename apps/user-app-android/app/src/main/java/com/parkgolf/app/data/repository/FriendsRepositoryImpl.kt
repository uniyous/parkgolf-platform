package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.FriendsApi
import com.parkgolf.app.data.remote.dto.friends.FriendDto
import com.parkgolf.app.data.remote.dto.friends.FriendRequestDto
import com.parkgolf.app.data.remote.dto.friends.SendFriendRequestBody
import com.parkgolf.app.data.remote.dto.friends.UserSearchResultDto
import com.parkgolf.app.domain.model.Friend
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.domain.model.SentFriendRequest
import com.parkgolf.app.domain.model.UserSearchResult
import com.parkgolf.app.domain.repository.FriendsRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FriendsRepositoryImpl @Inject constructor(
    private val friendsApi: FriendsApi
) : FriendsRepository {

    override suspend fun getFriends(): Result<List<Friend>> {
        return try {
            val response = friendsApi.getFriends()
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get friends"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getFriendRequests(): Result<List<FriendRequest>> {
        return try {
            val response = friendsApi.getFriendRequests()
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toFriendRequest() })
            } else {
                Result.failure(Exception("Failed to get friend requests"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getSentFriendRequests(): Result<List<SentFriendRequest>> {
        return try {
            val response = friendsApi.getSentFriendRequests()
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toSentFriendRequest() })
            } else {
                Result.failure(Exception("Failed to get sent friend requests"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun searchUsers(query: String): Result<List<UserSearchResult>> {
        return try {
            val response = friendsApi.searchUsers(query)
            if (response.success && response.data != null) {
                Result.success(response.data.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to search users"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun sendFriendRequest(toUserId: Int, message: String?): Result<Unit> {
        return try {
            val response = friendsApi.sendFriendRequest(
                SendFriendRequestBody(toUserId, message)
            )
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to send friend request"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun acceptFriendRequest(requestId: Int): Result<Unit> {
        return try {
            val response = friendsApi.acceptFriendRequest(requestId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to accept friend request"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun rejectFriendRequest(requestId: Int): Result<Unit> {
        return try {
            val response = friendsApi.rejectFriendRequest(requestId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to reject friend request"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun removeFriend(friendId: Int): Result<Unit> {
        return try {
            val response = friendsApi.removeFriend(friendId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to remove friend"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun checkFriendship(friendId: Int): Result<Boolean> {
        return try {
            val response = friendsApi.checkFriendship(friendId)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception("Failed to check friendship"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

private fun FriendDto.toDomain(): Friend {
    return Friend(
        id = id,
        friendId = friendId,
        friendName = friendName,
        friendEmail = friendEmail,
        friendProfileImageUrl = friendProfileImageUrl,
        createdAt = createdAt
    )
}

private fun FriendRequestDto.toFriendRequest(): FriendRequest {
    return FriendRequest(
        id = id,
        fromUserId = fromUserId,
        fromUserName = fromUserName,
        fromUserEmail = fromUserEmail,
        fromUserProfileImageUrl = fromUserProfileImageUrl,
        status = status,
        message = message,
        createdAt = createdAt
    )
}

private fun FriendRequestDto.toSentFriendRequest(): SentFriendRequest {
    return SentFriendRequest(
        id = id,
        toUserId = toUserId ?: 0,
        toUserName = toUserName ?: "",
        toUserEmail = toUserEmail ?: "",
        toUserProfileImageUrl = null,
        status = status,
        message = message,
        createdAt = createdAt
    )
}

private fun UserSearchResultDto.toDomain(): UserSearchResult {
    return UserSearchResult(
        id = id,
        email = email,
        name = name,
        profileImageUrl = profileImageUrl,
        isFriend = isFriend,
        hasPendingRequest = hasPendingRequest
    )
}
