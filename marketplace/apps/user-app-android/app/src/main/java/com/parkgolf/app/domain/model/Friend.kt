package com.parkgolf.app.domain.model

data class Friend(
    val id: Int,
    val friendId: Int,
    val friendName: String,
    val friendEmail: String,
    val friendProfileImageUrl: String? = null,
    val createdAt: String? = null
) {
    val initials: String
        get() = friendName.take(1)
}

data class FriendRequest(
    val id: Int,
    val fromUserId: Int,
    val fromUserName: String,
    val fromUserEmail: String,
    val fromUserProfileImageUrl: String? = null,
    val status: String,
    val message: String? = null,
    val createdAt: String? = null
) {
    val initials: String
        get() = fromUserName.take(1)
}

data class SentFriendRequest(
    val id: Int,
    val toUserId: Int,
    val toUserName: String,
    val toUserEmail: String,
    val toUserProfileImageUrl: String? = null,
    val status: String,
    val message: String? = null,
    val createdAt: String? = null
) {
    val initials: String
        get() = toUserName.take(1)
}

data class UserSearchResult(
    val id: Int,
    val email: String,
    val name: String,
    val profileImageUrl: String? = null,
    val isFriend: Boolean = false,
    val hasPendingRequest: Boolean = false
) {
    val initials: String
        get() = name.take(1)
}
