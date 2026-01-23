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
import kotlinx.coroutines.launch
import javax.inject.Inject

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

data class MyBookingsUiState(
    val isLoading: Boolean = false,
    val bookings: List<Booking> = emptyList(),
    val selectedBooking: Booking? = null,
    val statusFilter: String? = null,
    val timeFilter: String? = null,
    val currentPage: Int = 1,
    val hasMore: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class BookingViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val roundRepository: RoundRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _formState = MutableStateFlow(BookingFormUiState())
    val formState: StateFlow<BookingFormUiState> = _formState.asStateFlow()

    private val _myBookingsState = MutableStateFlow(MyBookingsUiState())
    val myBookingsState: StateFlow<MyBookingsUiState> = _myBookingsState.asStateFlow()

    init {
        loadUserInfo()
    }

    private fun loadUserInfo() {
        viewModelScope.launch {
            authRepository.currentUser.collect { user ->
                user?.let {
                    _formState.value = _formState.value.copy(
                        userName = it.name,
                        userEmail = it.email
                    )
                }
            }
        }
    }

    // Booking Form Functions
    fun loadRoundForBooking(roundId: Int) {
        viewModelScope.launch {
            _formState.value = _formState.value.copy(isLoading = true)

            roundRepository.getRound(roundId)
                .onSuccess { round ->
                    _formState.value = _formState.value.copy(
                        isLoading = false,
                        round = round,
                        timeSlots = round.timeSlots ?: emptyList()
                    )
                }
                .onFailure { exception ->
                    _formState.value = _formState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }

    fun loadTimeSlotsForDate(roundId: Int, date: String) {
        viewModelScope.launch {
            _formState.value = _formState.value.copy(selectedDate = date, selectedTimeSlot = null)

            roundRepository.getAvailableTimeSlots(roundId, date)
                .onSuccess { slots ->
                    _formState.value = _formState.value.copy(timeSlots = slots)
                }
                .onFailure { exception ->
                    _formState.value = _formState.value.copy(error = exception.message)
                }
        }
    }

    fun selectTimeSlot(slot: TimeSlot) {
        _formState.value = _formState.value.copy(selectedTimeSlot = slot)
        calculateTotalPrice()
    }

    fun updatePlayerCount(count: Int) {
        val validCount = count.coerceIn(1, _formState.value.selectedTimeSlot?.maxPlayers ?: 4)
        _formState.value = _formState.value.copy(playerCount = validCount)
        calculateTotalPrice()
    }

    fun updateSpecialRequests(requests: String) {
        _formState.value = _formState.value.copy(specialRequests = requests)
    }

    fun updateUserName(name: String) {
        _formState.value = _formState.value.copy(userName = name)
    }

    fun updateUserEmail(email: String) {
        _formState.value = _formState.value.copy(userEmail = email)
    }

    fun updateUserPhone(phone: String) {
        _formState.value = _formState.value.copy(userPhone = phone)
    }

    fun updatePaymentMethod(method: String) {
        _formState.value = _formState.value.copy(paymentMethod = method)
    }

    private fun calculateTotalPrice() {
        val slot = _formState.value.selectedTimeSlot
        val round = _formState.value.round
        val playerCount = _formState.value.playerCount

        val pricePerPerson = slot?.price ?: round?.pricePerPerson ?: 0
        val total = pricePerPerson * playerCount

        _formState.value = _formState.value.copy(totalPrice = total)
    }

    fun createBooking() {
        val state = _formState.value
        val round = state.round ?: return
        val timeSlot = state.selectedTimeSlot ?: return

        if (state.selectedDate.isBlank()) {
            _formState.value = state.copy(error = "날짜를 선택해주세요")
            return
        }

        if (state.userName.isBlank() || state.userEmail.isBlank()) {
            _formState.value = state.copy(error = "예약자 정보를 입력해주세요")
            return
        }

        viewModelScope.launch {
            _formState.value = state.copy(isLoading = true, error = null)

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
                    _formState.value = _formState.value.copy(
                        isLoading = false,
                        bookingSuccess = true,
                        createdBooking = booking
                    )
                }
                .onFailure { exception ->
                    _formState.value = _formState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "예약에 실패했습니다"
                    )
                }
        }
    }

    fun resetBookingForm() {
        _formState.value = BookingFormUiState()
        loadUserInfo()
    }

    // My Bookings Functions
    fun loadMyBookings(refresh: Boolean = false) {
        val currentPage = if (refresh) 1 else _myBookingsState.value.currentPage

        viewModelScope.launch {
            _myBookingsState.value = _myBookingsState.value.copy(isLoading = true)

            bookingRepository.getMyBookings(
                status = _myBookingsState.value.statusFilter,
                timeFilter = _myBookingsState.value.timeFilter,
                page = currentPage,
                limit = 20
            )
                .onSuccess { paginatedData ->
                    val bookings = if (refresh || currentPage == 1) {
                        paginatedData.data
                    } else {
                        _myBookingsState.value.bookings + paginatedData.data
                    }

                    _myBookingsState.value = _myBookingsState.value.copy(
                        isLoading = false,
                        bookings = bookings,
                        currentPage = paginatedData.page,
                        hasMore = paginatedData.page < paginatedData.totalPages,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _myBookingsState.value = _myBookingsState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }

    fun setStatusFilter(status: String?) {
        _myBookingsState.value = _myBookingsState.value.copy(statusFilter = status, currentPage = 1)
        loadMyBookings(refresh = true)
    }

    fun setTimeFilter(filter: String?) {
        _myBookingsState.value = _myBookingsState.value.copy(timeFilter = filter, currentPage = 1)
        loadMyBookings(refresh = true)
    }

    fun loadBookingDetail(bookingId: String) {
        viewModelScope.launch {
            bookingRepository.getBooking(bookingId)
                .onSuccess { booking ->
                    _myBookingsState.value = _myBookingsState.value.copy(
                        selectedBooking = booking
                    )
                }
                .onFailure { exception ->
                    _myBookingsState.value = _myBookingsState.value.copy(
                        error = exception.message
                    )
                }
        }
    }

    fun cancelBooking(bookingId: String, reason: String? = null) {
        viewModelScope.launch {
            _myBookingsState.value = _myBookingsState.value.copy(isLoading = true)

            bookingRepository.cancelBooking(bookingId, reason)
                .onSuccess {
                    _myBookingsState.value = _myBookingsState.value.copy(
                        isLoading = false,
                        successMessage = "예약이 취소되었습니다"
                    )
                    loadMyBookings(refresh = true)
                }
                .onFailure { exception ->
                    _myBookingsState.value = _myBookingsState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "예약 취소 실패"
                    )
                }
        }
    }

    fun loadMoreBookings() {
        if (_myBookingsState.value.hasMore && !_myBookingsState.value.isLoading) {
            _myBookingsState.value = _myBookingsState.value.copy(
                currentPage = _myBookingsState.value.currentPage + 1
            )
            loadMyBookings()
        }
    }

    fun clearFormError() {
        _formState.value = _formState.value.copy(error = null)
    }

    fun clearBookingsError() {
        _myBookingsState.value = _myBookingsState.value.copy(error = null)
    }

    fun clearSuccessMessage() {
        _myBookingsState.value = _myBookingsState.value.copy(successMessage = null)
    }
}
