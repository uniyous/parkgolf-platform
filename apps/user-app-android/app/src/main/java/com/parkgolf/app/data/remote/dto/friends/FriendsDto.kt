package com.parkgolf.app.data.remote.dto.friends

import kotlinx.serialization.Serializable

@Serializable
data class FriendDto(
    val id: Int,
    val friendId: Int,
    val friendName: String,
    val friendEmail: String,
    val friendProfileImageUrl: String? = null,
    val createdAt: String? = null
)

@Serializable
data class FriendRequestDto(
    val id: Int,
    val fromUserId: Int,
    val fromUserName: String,
    val fromUserEmail: String,
    val fromUserProfileImageUrl: String? = null,
    val status: String,
    val message: String? = null,
    val createdAt: String? = null
)

@Serializable
data class SentFriendRequestDto(
    val id: Int,
    val toUserId: Int,
    val toUserName: String,
    val toUserEmail: String,
    val toUserProfileImageUrl: String? = null,
    val status: String,
    val message: String? = null,
    val createdAt: String? = null
)

@Serializable
data class UserSearchResultDto(
    val id: Int,
    val email: String,
    val name: String,
    val profileImageUrl: String? = null,
    val isFriend: Boolean = false,
    val hasPendingRequest: Boolean = false
)

@Serializable
data class SendFriendRequestBody(
    val toUserId: Int,
    val message: String? = null
)

@Serializable
data class FindFromContactsRequest(
    val phoneNumbers: List<String>
)
