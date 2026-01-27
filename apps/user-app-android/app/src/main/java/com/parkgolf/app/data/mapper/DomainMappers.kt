package com.parkgolf.app.data.mapper

import com.parkgolf.app.data.remote.dto.user.UserProfileDto
import com.parkgolf.app.data.remote.dto.auth.UserDto
import com.parkgolf.app.data.remote.dto.auth.UserStatsDto
import com.parkgolf.app.data.remote.dto.booking.BookingDto
import com.parkgolf.app.data.remote.dto.chat.ChatMessageDto
import com.parkgolf.app.data.remote.dto.chat.ChatParticipantDto
import com.parkgolf.app.data.remote.dto.chat.ChatRoomDto
import com.parkgolf.app.data.remote.dto.chat.ChatRoomMemberDto
import com.parkgolf.app.data.remote.dto.friends.FriendDto
import com.parkgolf.app.data.remote.dto.friends.FriendRequestDto
import com.parkgolf.app.data.remote.dto.friends.SentFriendRequestDto
import com.parkgolf.app.data.remote.dto.friends.UserSearchResultDto
import com.parkgolf.app.data.remote.dto.notification.NotificationDataDto
import com.parkgolf.app.data.remote.dto.notification.NotificationDto
import com.parkgolf.app.data.remote.dto.round.RoundDto
import com.parkgolf.app.data.remote.dto.round.TimeSlotDto
import com.parkgolf.app.domain.model.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * DTO → Domain 모델 변환 Extension 함수 모음
 *
 * 모든 매핑 로직을 중앙화하여 일관성 유지 및 유지보수성 향상
 */

// ==================== Auth ====================

fun UserDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        name = name,
        phoneNumber = phoneOrPhoneNumber,
        profileImageUrl = profileImageUrl
    )
}

fun UserStatsDto.toDomain(): UserStats {
    return UserStats(
        totalBookings = totalBookings,
        upcomingBookings = upcomingBookings,
        completedBookings = completedBookings,
        cancelledBookings = cancelledBookings,
        friendsCount = friendsCount
    )
}

fun UserProfileDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        name = name,
        profileImageUrl = profileImageUrl
    )
}

// ==================== Booking ====================

fun BookingDto.toDomain(): Booking {
    return Booking(
        id = id,
        bookingNumber = bookingNumber,
        gameId = gameId,
        gameTimeSlotId = gameTimeSlotId,
        gameName = gameName,
        clubName = clubName,
        courseName = courseName,
        bookingDate = parseDate(bookingDate),
        startTime = startTime,
        endTime = endTime,
        playerCount = playerCount,
        status = BookingStatus.fromValue(status),
        totalPrice = totalPrice,
        paymentMethod = paymentMethod,
        specialRequests = specialRequests,
        userEmail = userEmail,
        userName = userName,
        userPhone = userPhone
    )
}

// ==================== Chat ====================

fun ChatRoomDto.toDomain(): ChatRoom {
    // API returns 'members', convert to 'participants' like iOS
    val participantsList: List<ChatParticipant> = when {
        !members.isNullOrEmpty() -> members.map { it.toDomain() }
        !participants.isNullOrEmpty() -> participants.map { it.toDomain() }
        else -> emptyList()
    }

    return ChatRoom(
        id = id,
        name = name ?: "",
        type = ChatRoomType.fromValue(type),
        participants = participantsList,
        lastMessage = lastMessage?.toDomain(),
        unreadCount = unreadCount,
        createdAt = parseDateTime(createdAt),
        updatedAt = parseDateTime(updatedAt)
    )
}

// Convert API 'members' response to domain ChatParticipant
fun ChatRoomMemberDto.toDomain(): ChatParticipant {
    return ChatParticipant(
        id = id,
        userId = userId.toString(),
        userName = userName,
        profileImageUrl = null,
        joinedAt = parseDateTime(joinedAt)
    )
}

fun ChatParticipantDto.toDomain(): ChatParticipant {
    return ChatParticipant(
        id = id,
        userId = oduserId ?: id,
        userName = userName,
        profileImageUrl = profileImageUrl,
        joinedAt = parseDateTime(joinedAt)
    )
}

fun ChatMessageDto.toDomain(): ChatMessage {
    return ChatMessage(
        id = id,
        roomId = roomId,
        senderId = senderId.toString(), // Convert Int to String
        senderName = senderName,
        content = content,
        messageType = MessageType.fromValue(getMessageTypeValue()),
        createdAt = parseDateTime(createdAt),
        readBy = readBy
    )
}

// ==================== Friends ====================

fun FriendDto.toDomain(): Friend {
    return Friend(
        id = id,
        friendId = friendId,
        friendName = friendName,
        friendEmail = friendEmail,
        friendProfileImageUrl = friendProfileImageUrl,
        createdAt = createdAt
    )
}

fun FriendRequestDto.toFriendRequest(): FriendRequest {
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

fun SentFriendRequestDto.toDomain(): SentFriendRequest {
    return SentFriendRequest(
        id = id,
        toUserId = toUserId,
        toUserName = toUserName,
        toUserEmail = toUserEmail,
        toUserProfileImageUrl = toUserProfileImageUrl,
        status = status,
        message = message,
        createdAt = createdAt
    )
}

fun UserSearchResultDto.toDomain(): UserSearchResult {
    return UserSearchResult(
        id = id,
        email = email,
        name = name,
        profileImageUrl = profileImageUrl,
        isFriend = isFriend,
        hasPendingRequest = hasPendingRequest
    )
}

// ==================== Round ====================

fun RoundDto.toDomain(): Round {
    return Round(
        id = id,
        name = name,
        code = code,
        description = description,
        clubId = clubId,
        clubName = clubName,
        club = club?.let {
            RoundClub(
                id = it.id,
                name = it.name,
                address = it.address,
                phoneNumber = it.phoneNumber,
                description = it.description,
                imageUrl = it.imageUrl,
                latitude = it.latitude,
                longitude = it.longitude
            )
        },
        frontNineCourse = frontNineCourse?.let {
            RoundCourse(
                id = it.id,
                name = it.name,
                holes = it.holes,
                par = it.par,
                description = it.description
            )
        },
        backNineCourse = backNineCourse?.let {
            RoundCourse(
                id = it.id,
                name = it.name,
                holes = it.holes,
                par = it.par,
                description = it.description
            )
        },
        totalHoles = totalHoles,
        estimatedDuration = estimatedDuration,
        maxPlayers = maxPlayers,
        basePrice = basePrice,
        pricePerPerson = pricePerPerson,
        weekendPrice = weekendPrice,
        isActive = isActive,
        timeSlots = timeSlots?.map { it.toDomain() }
    )
}

fun TimeSlotDto.toDomain(): TimeSlot {
    return TimeSlot(
        id = id,
        gameId = gameId,
        startTime = startTime,
        endTime = endTime,
        availablePlayers = availablePlayers,
        maxPlayers = maxPlayers,
        price = price,
        isPremium = isPremium,
        isAvailable = isAvailable
    )
}

// ==================== Utility Functions ====================

/**
 * ISO 날짜/시간 문자열을 LocalDateTime으로 파싱
 * 파싱 실패 시 현재 시간 반환
 */
fun parseDateTime(dateStr: String): LocalDateTime {
    return try {
        LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_DATE_TIME)
    } catch (e: Exception) {
        LocalDateTime.now()
    }
}

/**
 * ISO 날짜 문자열을 LocalDate로 파싱
 * 파싱 실패 시 현재 날짜 반환
 */
fun parseDate(dateStr: String): LocalDate {
    return try {
        LocalDate.parse(dateStr.substring(0, 10), DateTimeFormatter.ISO_DATE)
    } catch (e: Exception) {
        LocalDate.now()
    }
}

// ==================== Notification ====================

fun NotificationDto.toDomain(): AppNotification {
    return AppNotification(
        id = id,
        userId = userId,
        type = NotificationType.valueOf(type),
        title = title,
        message = message,
        data = data?.toDomain(),
        status = NotificationStatus.valueOf(status),
        readAt = readAt?.let { parseDateTime(it) },
        createdAt = parseDateTime(createdAt),
        updatedAt = parseDateTime(updatedAt)
    )
}

fun NotificationDataDto.toDomain(): NotificationData {
    return NotificationData(
        bookingId = bookingId,
        courseId = courseId,
        courseName = courseName,
        bookingDate = bookingDate,
        bookingTime = bookingTime,
        paymentId = paymentId,
        amount = amount,
        failureReason = failureReason,
        friendId = friendId,
        friendName = friendName,
        chatRoomId = chatRoomId
    )
}
