package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.chat.ChatMessageDto
import com.parkgolf.app.data.remote.dto.chat.ChatRoomDto
import com.parkgolf.app.data.remote.dto.chat.CreateChatRoomRequest
import com.parkgolf.app.data.remote.dto.chat.MessagesResponse
import com.parkgolf.app.data.remote.dto.chat.SendMessageRequest
import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.common.PaginatedResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ChatApi {

    // API returns simple array response, not paginated
    @GET("api/user/chat/rooms")
    suspend fun getChatRooms(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): ApiResponse<List<ChatRoomDto>>

    @GET("api/user/chat/rooms/{roomId}")
    suspend fun getChatRoom(@Path("roomId") roomId: String): ApiResponse<ChatRoomDto>

    @POST("api/user/chat/rooms")
    suspend fun createChatRoom(@Body request: CreateChatRoomRequest): ApiResponse<ChatRoomDto>

    @GET("api/user/chat/rooms/{roomId}/messages")
    suspend fun getMessages(
        @Path("roomId") roomId: String,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int = 50
    ): MessagesResponse

    @POST("api/user/chat/rooms/{roomId}/messages")
    suspend fun sendMessage(
        @Path("roomId") roomId: String,
        @Body request: SendMessageRequest
    ): ApiResponse<ChatMessageDto>

    @DELETE("api/user/chat/rooms/{roomId}/leave")
    suspend fun leaveChatRoom(@Path("roomId") roomId: String): ApiResponse<Unit>

    @POST("api/user/chat/rooms/{roomId}/read")
    suspend fun markAsRead(@Path("roomId") roomId: String): ApiResponse<Unit>

    @GET("api/user/chat/rooms/{roomId}/unread")
    suspend fun getUnreadCount(@Path("roomId") roomId: String): ApiResponse<Int>
}
