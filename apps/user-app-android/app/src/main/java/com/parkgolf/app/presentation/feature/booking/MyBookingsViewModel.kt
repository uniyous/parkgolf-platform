package com.parkgolf.app.presentation.feature.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 내 예약 목록 화면 전용 ViewModel
 *
 * 담당 기능:
 * - 내 예약 목록 조회
 * - 예약 상세 조회
 * - 예약 취소
 * - 필터링 (상태, 시간)
 */
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
class MyBookingsViewModel @Inject constructor(
    private val bookingRepository: BookingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyBookingsUiState())
    val uiState: StateFlow<MyBookingsUiState> = _uiState.asStateFlow()

    fun loadBookings(refresh: Boolean = false) {
        val currentPage = if (refresh) 1 else _uiState.value.currentPage

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            bookingRepository.getMyBookings(
                status = _uiState.value.statusFilter,
                timeFilter = _uiState.value.timeFilter,
                page = currentPage,
                limit = 20
            )
                .onSuccess { paginatedData ->
                    val bookings = if (refresh || currentPage == 1) {
                        paginatedData.data
                    } else {
                        _uiState.value.bookings + paginatedData.data
                    }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            bookings = bookings,
                            currentPage = paginatedData.page,
                            hasMore = paginatedData.page < paginatedData.totalPages,
                            error = null
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

    fun setStatusFilter(status: String?) {
        _uiState.update { it.copy(statusFilter = status, currentPage = 1) }
        loadBookings(refresh = true)
    }

    fun setTimeFilter(filter: String?) {
        _uiState.update { it.copy(timeFilter = filter, currentPage = 1) }
        loadBookings(refresh = true)
    }

    fun loadBookingDetail(bookingId: String) {
        viewModelScope.launch {
            bookingRepository.getBooking(bookingId)
                .onSuccess { booking ->
                    _uiState.update { it.copy(selectedBooking = booking) }
                }
                .onFailure { exception ->
                    _uiState.update { it.copy(error = exception.message) }
                }
        }
    }

    fun cancelBooking(bookingId: String, reason: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            bookingRepository.cancelBooking(bookingId, reason)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            successMessage = "예약이 취소되었습니다"
                        )
                    }
                    loadBookings(refresh = true)
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "예약 취소 실패"
                        )
                    }
                }
        }
    }

    fun loadMore() {
        if (_uiState.value.hasMore && !_uiState.value.isLoading) {
            _uiState.update { it.copy(currentPage = it.currentPage + 1) }
            loadBookings()
        }
    }

    fun clearSelectedBooking() {
        _uiState.update { it.copy(selectedBooking = null) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}
