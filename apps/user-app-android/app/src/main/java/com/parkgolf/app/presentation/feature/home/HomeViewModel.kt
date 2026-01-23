package com.parkgolf.app.presentation.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.FriendsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 인기 클럽 (Mock 데이터)
 */
data class PopularClub(
    val id: Int,
    val name: String,
    val location: String,
    val imageUrl: String? = null,
    val rating: Float = 4.5f
)

data class HomeUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val upcomingBookings: List<Booking> = emptyList(),
    val friendRequests: List<FriendRequest> = emptyList(),
    val unreadChatRooms: List<ChatRoom> = emptyList(),
    val popularClubs: List<PopularClub> = emptyList(),
    val error: String? = null
) {
    // 알림 관련 계산 속성
    val pendingFriendRequestsCount: Int
        get() = friendRequests.size

    val totalUnreadMessagesCount: Int
        get() = unreadChatRooms.sumOf { it.unreadCount }

    val hasNotifications: Boolean
        get() = pendingFriendRequestsCount > 0 || totalUnreadMessagesCount > 0

    val notificationCount: Int
        get() = pendingFriendRequestsCount + unreadChatRooms.size
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val bookingRepository: BookingRepository,
    private val friendsRepository: FriendsRepository,
    private val chatRepository: ChatRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // 사용자 정보 로드
            val user = authRepository.currentUser.first()
            _uiState.value = _uiState.value.copy(user = user)

            // 4가지 데이터를 동시에 로드
            val bookingsDeferred = async { loadBookings() }
            val friendRequestsDeferred = async { loadFriendRequests() }
            val chatRoomsDeferred = async { loadChatRooms() }

            // Mock 인기 클럽 로드
            val popularClubs = getMockPopularClubs()

            // 모든 데이터 로드 완료 대기
            bookingsDeferred.await()
            friendRequestsDeferred.await()
            chatRoomsDeferred.await()

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                popularClubs = popularClubs
            )
        }
    }

    private suspend fun loadBookings() {
        bookingRepository.getMyBookings(
            timeFilter = "upcoming",
            page = 1,
            limit = 5
        ).onSuccess { paginatedData ->
            // CONFIRMED, PENDING, SLOT_RESERVED 상태만 필터링
            val upcomingBookings = paginatedData.data.filter { booking ->
                booking.status in listOf(
                    BookingStatus.CONFIRMED,
                    BookingStatus.PENDING,
                    BookingStatus.SLOT_RESERVED
                )
            }.take(3)

            _uiState.value = _uiState.value.copy(upcomingBookings = upcomingBookings)
        }.onFailure { exception ->
            // 예약 로드 실패는 무시 (빈 리스트 유지)
            android.util.Log.e("HomeViewModel", "Failed to load bookings: ${exception.message}")
        }
    }

    private suspend fun loadFriendRequests() {
        friendsRepository.getFriendRequests()
            .onSuccess { requests ->
                _uiState.value = _uiState.value.copy(friendRequests = requests)
            }
            .onFailure { exception ->
                android.util.Log.e("HomeViewModel", "Failed to load friend requests: ${exception.message}")
            }
    }

    private suspend fun loadChatRooms() {
        chatRepository.getChatRooms(page = 1, limit = 20)
            .onSuccess { paginatedData ->
                // 읽지 않은 메시지가 있는 채팅방만 필터링
                val unreadRooms = paginatedData.data.filter { it.unreadCount > 0 }
                _uiState.value = _uiState.value.copy(unreadChatRooms = unreadRooms)
            }
            .onFailure { exception ->
                android.util.Log.e("HomeViewModel", "Failed to load chat rooms: ${exception.message}")
            }
    }

    private fun getMockPopularClubs(): List<PopularClub> {
        return listOf(
            PopularClub(
                id = 1,
                name = "서울 파크골프장",
                location = "서울특별시 송파구",
                rating = 4.8f
            ),
            PopularClub(
                id = 2,
                name = "부산 해운대 파크골프",
                location = "부산광역시 해운대구",
                rating = 4.6f
            ),
            PopularClub(
                id = 3,
                name = "제주 서귀포 파크골프",
                location = "제주특별자치도 서귀포시",
                rating = 4.9f
            ),
            PopularClub(
                id = 4,
                name = "대전 유성 파크골프",
                location = "대전광역시 유성구",
                rating = 4.5f
            )
        )
    }

    // 친구 요청 수락
    fun acceptFriendRequest(requestId: Int) {
        viewModelScope.launch {
            friendsRepository.acceptFriendRequest(requestId)
                .onSuccess {
                    // 친구 요청 목록에서 제거
                    val updatedRequests = _uiState.value.friendRequests.filter { it.id != requestId }
                    _uiState.value = _uiState.value.copy(friendRequests = updatedRequests)
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(error = "친구 요청 수락에 실패했습니다")
                }
        }
    }

    // 친구 요청 거절
    fun rejectFriendRequest(requestId: Int) {
        viewModelScope.launch {
            friendsRepository.rejectFriendRequest(requestId)
                .onSuccess {
                    val updatedRequests = _uiState.value.friendRequests.filter { it.id != requestId }
                    _uiState.value = _uiState.value.copy(friendRequests = updatedRequests)
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(error = "친구 요청 거절에 실패했습니다")
                }
        }
    }

    fun refresh() {
        loadData()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
