package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.Friend
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.domain.model.SentFriendRequest
import com.parkgolf.app.domain.model.UserSearchResult

interface FriendsRepository {
    suspend fun getFriends(): Result<List<Friend>>

    suspend fun getFriendRequests(): Result<List<FriendRequest>>

    suspend fun getSentFriendRequests(): Result<List<SentFriendRequest>>

    suspend fun searchUsers(query: String): Result<List<UserSearchResult>>

    suspend fun sendFriendRequest(toUserId: Int, message: String?): Result<Unit>

    suspend fun acceptFriendRequest(requestId: Int): Result<Unit>

    suspend fun rejectFriendRequest(requestId: Int): Result<Unit>

    suspend fun removeFriend(friendId: Int): Result<Unit>

    suspend fun checkFriendship(friendId: Int): Result<Boolean>
}
