package com.parkgolf.app.presentation.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.CurrentWeather
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.domain.model.NearbyClub
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.FriendsRepository
import com.parkgolf.app.domain.repository.LocationWeatherRepository
import com.parkgolf.app.domain.repository.NotificationRepository
import com.parkgolf.app.util.LocationManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val upcomingBookings: List<Booking> = emptyList(),
    val friendRequests: List<FriendRequest> = emptyList(),
    val unreadChatRooms: List<ChatRoom> = emptyList(),
    val unreadNotificationCount: Int = 0,
    // 위치/날씨 데이터
    val regionName: String? = null,
    val currentWeather: CurrentWeather? = null,
    val nearbyClubs: List<NearbyClub> = emptyList(),
    val hasLocation: Boolean = false,
    val locationDataLoaded: Boolean = false,
    val error: String? = null
) {
    // 알림 관련 계산 속성
    val pendingFriendRequestsCount: Int
        get() = friendRequests.size

    val totalUnreadMessagesCount: Int
        get() = unreadChatRooms.sumOf { it.unreadCount }

    val hasNotifications: Boolean
        get() = pendingFriendRequestsCount > 0 || totalUnreadMessagesCount > 0

    // 전체 알림 배지 수 (헤더 벨 아이콘용)
    // 알림 서비스에 친구요청/채팅 알림이 이미 포함되어 있으므로 중복 카운트 방지
    val notificationCount: Int
        get() = unreadNotificationCount

}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val bookingRepository: BookingRepository,
    private val friendsRepository: FriendsRepository,
    private val chatRepository: ChatRepository,
    private val notificationRepository: NotificationRepository,
    private val locationWeatherRepository: LocationWeatherRepository,
    private val locationManager: LocationManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var isLocationLoading = false

    companion object {
        private const val TAG = "HomeViewModel"
    }

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // 사용자 정보 로드
            val user = authRepository.currentUser.first()
            _uiState.value = _uiState.value.copy(user = user)

            // 5가지 데이터를 동시에 로드
            val bookingsDeferred = async { loadBookings() }
            val friendRequestsDeferred = async { loadFriendRequests() }
            val chatRoomsDeferred = async { loadChatRooms() }
            val notificationCountDeferred = async { loadUnreadNotificationCount() }

            // 모든 데이터 로드 완료 대기
            bookingsDeferred.await()
            friendRequestsDeferred.await()
            chatRoomsDeferred.await()
            notificationCountDeferred.await()

            _uiState.value = _uiState.value.copy(isLoading = false)

            // 위치 기반 데이터 로드 (메인 로딩과 별개로)
            loadLocationData()
        }
    }

    private suspend fun loadLocationData() {
        if (isLocationLoading) return
        // 이미 로드 완료된 경우 재로드 방지 (refresh 시에는 locationDataLoaded가 false로 리셋됨)
        if (_uiState.value.locationDataLoaded && _uiState.value.currentWeather != null) return

        isLocationLoading = true
        try {
            loadLocationDataInternal()
        } finally {
            isLocationLoading = false
        }
    }

    private suspend fun loadLocationDataInternal() {
        if (!locationManager.hasLocationPermission) {
            android.util.Log.d(TAG, "Location permission not granted")
            _uiState.value = _uiState.value.copy(hasLocation = false, locationDataLoaded = true)
            return
        }

        val location = locationManager.getCurrentLocation()
        if (location == null) {
            android.util.Log.w(TAG, "Failed to get current location")
            _uiState.value = _uiState.value.copy(hasLocation = false, locationDataLoaded = true)
            return
        }

        val lat = location.latitude
        val lon = location.longitude
        android.util.Log.d(TAG, "Location acquired: lat=$lat, lon=$lon")

        _uiState.value = _uiState.value.copy(hasLocation = true)

        // 행정동, 날씨, 주변 골프장 동시 로드
        val regionDeferred = viewModelScope.async { loadRegion(lat, lon) }
        val weatherDeferred = viewModelScope.async { loadWeather(lat, lon) }
        val nearbyDeferred = viewModelScope.async { loadNearbyClubs(lat, lon) }

        val region = regionDeferred.await()
        val weather = weatherDeferred.await()
        val nearby = nearbyDeferred.await()

        android.util.Log.d(TAG, "Location data loaded: region=$region, weather=${weather != null}, nearby=${nearby.size}")

        _uiState.value = _uiState.value.copy(
            regionName = region,
            currentWeather = weather,
            nearbyClubs = nearby,
            locationDataLoaded = true
        )
    }

    private suspend fun loadRegion(lat: Double, lon: Double): String? {
        return locationWeatherRepository.reverseGeo(lat, lon)
            .getOrNull()
            ?.displayName
            ?.takeIf { it.isNotEmpty() }
    }

    private suspend fun loadWeather(lat: Double, lon: Double): CurrentWeather? {
        return locationWeatherRepository.getCurrentWeather(lat, lon).getOrNull()
    }

    private suspend fun loadNearbyClubs(lat: Double, lon: Double): List<NearbyClub> {
        return locationWeatherRepository.nearbyClubs(lat, lon).getOrDefault(emptyList())
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
            .onSuccess { rooms ->
                // 읽지 않은 메시지가 있는 채팅방만 필터링
                val unreadRooms = rooms.filter { it.unreadCount > 0 }
                _uiState.value = _uiState.value.copy(unreadChatRooms = unreadRooms)
            }
            .onFailure { exception ->
                android.util.Log.e("HomeViewModel", "Failed to load chat rooms: ${exception.message}")
            }
    }

    private suspend fun loadUnreadNotificationCount() {
        notificationRepository.getUnreadCount()
            .onSuccess { count ->
                _uiState.value = _uiState.value.copy(unreadNotificationCount = count)
            }
            .onFailure { exception ->
                android.util.Log.e("HomeViewModel", "Failed to load notification count: ${exception.message}")
            }
    }

    // 위치 권한 획득 후 호출
    fun onLocationPermissionGranted() {
        viewModelScope.launch {
            loadLocationData()
        }
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
        _uiState.value = _uiState.value.copy(locationDataLoaded = false)
        loadData()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
