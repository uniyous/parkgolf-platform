package com.parkgolf.app.presentation.feature.social

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.Friend
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.domain.model.SentFriendRequest
import com.parkgolf.app.domain.model.UserSearchResult
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.FriendsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SocialTab {
    FRIENDS, CHAT
}

data class SocialUiState(
    val selectedTab: SocialTab = SocialTab.FRIENDS,
    val isLoading: Boolean = false,

    // Friends
    val friends: List<Friend> = emptyList(),
    val friendRequests: List<FriendRequest> = emptyList(),
    val sentFriendRequests: List<SentFriendRequest> = emptyList(),
    val friendSearchQuery: String = "",
    val filteredFriends: List<Friend> = emptyList(),

    // User Search (for adding friends)
    val userSearchQuery: String = "",
    val userSearchResults: List<UserSearchResult> = emptyList(),
    val isSearching: Boolean = false,

    // Chat
    val chatRooms: List<ChatRoom> = emptyList(),
    val totalUnreadCount: Int = 0,

    // Navigation
    val navigateToChatRoom: String? = null,

    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class SocialViewModel @Inject constructor(
    private val friendsRepository: FriendsRepository,
    private val chatRepository: ChatRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SocialUiState())
    val uiState: StateFlow<SocialUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadFriendsData()
        loadChatRooms()
    }

    fun selectTab(tab: SocialTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
    }

    // Friends functions
    fun loadFriendsData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Load friends
            friendsRepository.getFriends()
                .onSuccess { friends ->
                    _uiState.value = _uiState.value.copy(
                        friends = friends,
                        filteredFriends = filterFriends(friends, _uiState.value.friendSearchQuery)
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message ?: "친구 목록 로드 실패")
                }

            // Load friend requests
            friendsRepository.getFriendRequests()
                .onSuccess { requests ->
                    _uiState.value = _uiState.value.copy(friendRequests = requests)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message ?: "친구 요청 목록 로드 실패")
                }

            // Load sent requests
            friendsRepository.getSentFriendRequests()
                .onSuccess { sentRequests ->
                    _uiState.value = _uiState.value.copy(sentFriendRequests = sentRequests)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message ?: "보낸 요청 목록 로드 실패")
                }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun searchFriends(query: String) {
        _uiState.value = _uiState.value.copy(
            friendSearchQuery = query,
            filteredFriends = filterFriends(_uiState.value.friends, query)
        )
    }

    private fun filterFriends(friends: List<Friend>, query: String): List<Friend> {
        if (query.isBlank()) return friends
        return friends.filter { friend ->
            friend.friendName.contains(query, ignoreCase = true) ||
            friend.friendEmail.contains(query, ignoreCase = true)
        }
    }

    fun searchUsers(query: String) {
        _uiState.value = _uiState.value.copy(userSearchQuery = query)

        searchJob?.cancel()
        if (query.length < 2) {
            _uiState.value = _uiState.value.copy(userSearchResults = emptyList())
            return
        }

        searchJob = viewModelScope.launch {
            delay(300) // Debounce
            _uiState.value = _uiState.value.copy(isSearching = true)

            friendsRepository.searchUsers(query)
                .onSuccess { results ->
                    _uiState.value = _uiState.value.copy(
                        userSearchResults = results,
                        isSearching = false
                    )
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(isSearching = false)
                }
        }
    }

    fun sendFriendRequest(toUserId: Int, message: String? = null) {
        viewModelScope.launch {
            friendsRepository.sendFriendRequest(toUserId, message)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "친구 요청을 보냈습니다"
                    )
                    loadFriendsData() // Refresh
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "친구 요청 실패"
                    )
                }
        }
    }

    fun acceptFriendRequest(requestId: Int) {
        viewModelScope.launch {
            friendsRepository.acceptFriendRequest(requestId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "친구 요청을 수락했습니다"
                    )
                    loadFriendsData()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "수락 실패"
                    )
                }
        }
    }

    fun rejectFriendRequest(requestId: Int) {
        viewModelScope.launch {
            friendsRepository.rejectFriendRequest(requestId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "친구 요청을 거절했습니다"
                    )
                    loadFriendsData()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "거절 실패"
                    )
                }
        }
    }

    fun removeFriend(friendId: Int) {
        viewModelScope.launch {
            friendsRepository.removeFriend(friendId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "친구를 삭제했습니다"
                    )
                    loadFriendsData()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "삭제 실패"
                    )
                }
        }
    }

    // Chat functions
    fun loadChatRooms() {
        viewModelScope.launch {
            chatRepository.getChatRooms(page = 1, limit = 50)
                .onSuccess { rooms ->
                    // API returns simple array, sort by updatedAt like iOS
                    val sortedRooms = rooms.sortedByDescending { it.updatedAt }
                    val unreadCount = sortedRooms.sumOf { it.unreadCount }
                    _uiState.value = _uiState.value.copy(
                        chatRooms = sortedRooms,
                        totalUnreadCount = unreadCount
                    )
                }
                .onFailure { exception ->
                    // 채팅방 로드 실패 시 에러 표시
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "채팅방 목록 로드 실패"
                    )
                }
        }
    }

    fun createChatRoom(name: String, participantIds: List<String>) {
        viewModelScope.launch {
            chatRepository.createChatRoom(
                name = name,
                type = com.parkgolf.app.domain.model.ChatRoomType.DIRECT,
                participantIds = participantIds
            )
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "채팅방이 생성되었습니다"
                    )
                    loadChatRooms()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "채팅방 생성 실패"
                    )
                }
        }
    }

    fun clearUserSearch() {
        searchJob?.cancel()
        _uiState.value = _uiState.value.copy(
            userSearchQuery = "",
            userSearchResults = emptyList(),
            isSearching = false
        )
    }

    fun createDirectChat(friend: Friend) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            chatRepository.createChatRoom(
                name = friend.friendName,
                type = com.parkgolf.app.domain.model.ChatRoomType.DIRECT,
                participantIds = listOf(friend.friendId.toString())
            )
                .onSuccess { chatRoom ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        navigateToChatRoom = chatRoom.id
                    )
                    loadChatRooms()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "채팅방 생성 실패"
                    )
                }
        }
    }

    fun clearNavigation() {
        _uiState.value = _uiState.value.copy(navigateToChatRoom = null)
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }
}
