package com.parkgolf.app.presentation.feature.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.CreateBookingParams
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.domain.repository.RoundRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 예약 폼 화면 전용 ViewModel
 *
 * 담당 기능:
 * - 라운드 정보 로드
 * - 타임슬롯 조회
 * - 예약 생성
 */
data class BookingFormUiState(
    val isLoading: Boolean = false,
    val round: Round? = null,
    val timeSlots: List<TimeSlot> = emptyList(),
    val selectedDate: String = "",
    val selectedTimeSlot: TimeSlot? = null,
    val playerCount: Int = 1,
    val specialRequests: String = "",
    val userName: String = "",
    val userEmail: String = "",
    val userPhone: String = "",
    val paymentMethod: String = "CARD",
    val totalPrice: Int = 0,
    val bookingSuccess: Boolean = false,
    val createdBooking: Booking? = null,
    val error: String? = null
)

@HiltViewModel
class BookingFormViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val roundRepository: RoundRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingFormUiState())
    val uiState: StateFlow<BookingFormUiState> = _uiState.asStateFlow()

    init {
        loadUserInfo()
    }

    private fun loadUserInfo() {
        viewModelScope.launch {
            authRepository.currentUser.collect { user ->
                user?.let {
                    _uiState.update { state ->
                        state.copy(
                            userName = it.name,
                            userEmail = it.email
                        )
                    }
                }
            }
        }
    }

    fun loadRoundForBooking(roundId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            roundRepository.getRound(roundId)
                .onSuccess { round ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            round = round,
                            timeSlots = round.timeSlots ?: emptyList()
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message
                        )
                    }
                }
        }
    }

    fun loadTimeSlotsForDate(roundId: Int, date: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(selectedDate = date, selectedTimeSlot = null) }

            roundRepository.getAvailableTimeSlots(roundId, date)
                .onSuccess { slots ->
                    _uiState.update { it.copy(timeSlots = slots) }
                }
                .onFailure { exception ->
                    _uiState.update { it.copy(error = exception.message) }
                }
        }
    }

    fun selectTimeSlot(slot: TimeSlot) {
        _uiState.update { it.copy(selectedTimeSlot = slot) }
        calculateTotalPrice()
    }

    fun updatePlayerCount(count: Int) {
        val validCount = count.coerceIn(1, _uiState.value.selectedTimeSlot?.maxPlayers ?: 4)
        _uiState.update { it.copy(playerCount = validCount) }
        calculateTotalPrice()
    }

    fun updateSpecialRequests(requests: String) {
        _uiState.update { it.copy(specialRequests = requests) }
    }

    fun updateUserName(name: String) {
        _uiState.update { it.copy(userName = name) }
    }

    fun updateUserEmail(email: String) {
        _uiState.update { it.copy(userEmail = email) }
    }

    fun updateUserPhone(phone: String) {
        _uiState.update { it.copy(userPhone = phone) }
    }

    fun updatePaymentMethod(method: String) {
        _uiState.update { it.copy(paymentMethod = method) }
    }

    private fun calculateTotalPrice() {
        val slot = _uiState.value.selectedTimeSlot
        val round = _uiState.value.round
        val playerCount = _uiState.value.playerCount

        val pricePerPerson = slot?.price ?: round?.pricePerPerson ?: 0
        val total = pricePerPerson * playerCount

        _uiState.update { it.copy(totalPrice = total) }
    }

    fun createBooking() {
        val state = _uiState.value
        val round = state.round ?: return
        val timeSlot = state.selectedTimeSlot ?: return

        if (state.selectedDate.isBlank()) {
            _uiState.update { it.copy(error = "날짜를 선택해주세요") }
            return
        }

        if (state.userName.isBlank() || state.userEmail.isBlank()) {
            _uiState.update { it.copy(error = "예약자 정보를 입력해주세요") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val params = CreateBookingParams(
                gameId = round.id,  // API 호환성을 위해 gameId 유지
                gameTimeSlotId = timeSlot.id,
                bookingDate = state.selectedDate,
                playerCount = state.playerCount,
                paymentMethod = state.paymentMethod,
                specialRequests = state.specialRequests.takeIf { it.isNotBlank() },
                userEmail = state.userEmail,
                userName = state.userName,
                userPhone = state.userPhone.takeIf { it.isNotBlank() }
            )

            bookingRepository.createBooking(params)
                .onSuccess { booking ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            bookingSuccess = true,
                            createdBooking = booking
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "예약에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun resetForm() {
        _uiState.value = BookingFormUiState()
        loadUserInfo()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
