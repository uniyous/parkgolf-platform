package com.parkgolf.app.presentation.feature.booking

import androidx.lifecycle.SavedStateHandle
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

data class BookingCompleteUiState(
    val isLoading: Boolean = true,
    val booking: Booking? = null,
    val error: String? = null
)

@HiltViewModel
class BookingCompleteViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val bookingRepository: BookingRepository
) : ViewModel() {

    private val bookingId: String = checkNotNull(savedStateHandle["bookingId"])

    private val _uiState = MutableStateFlow(BookingCompleteUiState())
    val uiState: StateFlow<BookingCompleteUiState> = _uiState.asStateFlow()

    init {
        loadBooking()
    }

    private fun loadBooking() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            bookingRepository.getBooking(bookingId)
                .onSuccess { booking ->
                    _uiState.update {
                        it.copy(isLoading = false, booking = booking)
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "예약 정보를 불러올 수 없습니다"
                        )
                    }
                }
        }
    }

    fun retry() {
        loadBooking()
    }
}
