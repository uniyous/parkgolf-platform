package com.parkgolf.app.presentation.feature.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.CreateBookingParams
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.data.remote.dto.payment.PreparePaymentResponse
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.domain.repository.PaymentRepository
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
    val playerCount: Int = 2,  // 시니어 UI: 기본 2명
    val specialRequests: String = "",
    val userName: String = "",
    val userEmail: String = "",
    val userPhone: String = "",
    val paymentMethod: String = "onsite",  // 시니어 UI: 기본 현장결제
    val agreedToTerms: Boolean = false,
    val totalPrice: Int = 0,
    val bookingSuccess: Boolean = false,
    val createdBooking: Booking? = null,
    val error: String? = null,
    // Payment
    val paymentPrepareData: PreparePaymentResponse? = null,
    val showPaymentActivity: Boolean = false,
    val isPaymentProcessing: Boolean = false
) {
    val canProceed: Boolean
        get() = agreedToTerms && paymentMethod.isNotBlank() && playerCount > 0
}

@HiltViewModel
class BookingFormViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val roundRepository: RoundRepository,
    private val authRepository: AuthRepository,
    private val paymentRepository: PaymentRepository
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

    fun loadRoundForBooking(roundId: Int, preSelectedTimeSlotId: Int = 0, date: String = "") {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, selectedDate = formatDateKorean(date)) }

            roundRepository.getRound(roundId)
                .onSuccess { round ->
                    val slots = round.timeSlots ?: emptyList()
                    val preSelected = if (preSelectedTimeSlotId > 0) {
                        slots.find { it.id == preSelectedTimeSlotId }
                    } else null

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            round = round,
                            timeSlots = slots,
                            selectedTimeSlot = preSelected
                        )
                    }
                    if (preSelected != null) {
                        calculateTotalPrice()
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

    private fun formatDateKorean(dateStr: String): String {
        if (dateStr.isBlank()) return ""
        return try {
            val date = java.time.LocalDate.parse(dateStr)
            val dayOfWeek = when (date.dayOfWeek.value) {
                1 -> "월"; 2 -> "화"; 3 -> "수"; 4 -> "목"
                5 -> "금"; 6 -> "토"; 7 -> "일"; else -> ""
            }
            "${date.year}년 ${date.monthValue}월 ${date.dayOfMonth}일 (${dayOfWeek})"
        } catch (e: Exception) {
            dateStr
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

    fun updateAgreedToTerms(agreed: Boolean) {
        _uiState.update { it.copy(agreedToTerms = agreed) }
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
                gameId = round.id,
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
                    if (state.paymentMethod == "card") {
                        // Card payment: prepare and show Toss SDK
                        val orderName = "${round.clubName} - ${timeSlot.startTime}"
                        paymentRepository.preparePayment(
                            amount = state.totalPrice,
                            orderName = orderName,
                            bookingId = booking.id.toIntOrNull()
                        ).onSuccess { prepareData ->
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    createdBooking = booking,
                                    paymentPrepareData = prepareData,
                                    showPaymentActivity = true
                                )
                            }
                        }.onFailure { exception ->
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    createdBooking = booking,
                                    error = exception.message ?: "결제 준비에 실패했습니다"
                                )
                            }
                        }
                    } else {
                        // Onsite payment: go directly to completion
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                bookingSuccess = true,
                                createdBooking = booking
                            )
                        }
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

    fun onPaymentActivityLaunched() {
        _uiState.update { it.copy(showPaymentActivity = false) }
    }

    fun handlePaymentSuccess(paymentKey: String, orderId: String, amount: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isPaymentProcessing = true, error = null) }

            paymentRepository.confirmPayment(paymentKey, orderId, amount)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isPaymentProcessing = false,
                            bookingSuccess = true
                        )
                    }
                }
                .onFailure {
                    // Fallback: check payment status
                    paymentRepository.getPaymentByOrderId(orderId)
                        .onSuccess { status ->
                            if (status.status == "DONE" || status.status == "APPROVED") {
                                _uiState.update {
                                    it.copy(
                                        isPaymentProcessing = false,
                                        bookingSuccess = true
                                    )
                                }
                            } else {
                                _uiState.update {
                                    it.copy(
                                        isPaymentProcessing = false,
                                        error = "결제 승인에 실패했습니다. 다시 시도해 주세요."
                                    )
                                }
                            }
                        }
                        .onFailure {
                            _uiState.update {
                                it.copy(
                                    isPaymentProcessing = false,
                                    error = "결제 승인에 실패했습니다. 다시 시도해 주세요."
                                )
                            }
                        }
                }
        }
    }

    fun handlePaymentFailure(errorCode: String?, errorMessage: String?) {
        _uiState.update {
            it.copy(error = errorMessage ?: "결제에 실패했습니다 ($errorCode)")
        }
    }

    fun handlePaymentCancelled() {
        // Do nothing - user stays on the form
    }

    fun resetForm() {
        _uiState.value = BookingFormUiState()
        loadUserInfo()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
