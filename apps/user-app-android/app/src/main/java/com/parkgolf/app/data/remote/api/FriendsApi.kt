package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.friends.FriendDto
import com.parkgolf.app.data.remote.dto.friends.FriendRequestDto
import com.parkgolf.app.data.remote.dto.friends.SendFriendRequestBody
import com.parkgolf.app.data.remote.dto.friends.UserSearchResultDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface FriendsApi {

    @GET("api/user/friends")
    suspend fun getFriends(): ApiResponse<List<FriendDto>>

    @GET("api/user/friends/requests")
    suspend fun getFriendRequests(): ApiResponse<List<FriendRequestDto>>

    @GET("api/user/friends/requests/sent")
    suspend fun getSentFriendRequests(): ApiResponse<List<FriendRequestDto>>

    @GET("api/user/friends/search")
    suspend fun searchUsers(@Query("q") query: String): ApiResponse<List<UserSearchResultDto>>

    @POST("api/user/friends/request")
    suspend fun sendFriendRequest(@Body request: SendFriendRequestBody): ApiResponse<Unit>

    @POST("api/user/friends/requests/{id}/accept")
    suspend fun acceptFriendRequest(@Path("id") requestId: Int): ApiResponse<Unit>

    @POST("api/user/friends/requests/{id}/reject")
    suspend fun rejectFriendRequest(@Path("id") requestId: Int): ApiResponse<Unit>

    @DELETE("api/user/friends/{friendId}")
    suspend fun removeFriend(@Path("friendId") friendId: Int): ApiResponse<Unit>

    @GET("api/user/friends/check/{friendId}")
    suspend fun checkFriendship(@Path("friendId") friendId: Int): ApiResponse<Boolean>
}
