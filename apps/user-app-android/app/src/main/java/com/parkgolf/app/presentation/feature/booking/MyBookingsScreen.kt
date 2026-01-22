package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.StatusBadge
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyBookingsScreen(
    onNavigateBack: () -> Unit,
    onBookingClick: (String) -> Unit,
    viewModel: BookingViewModel = hiltViewModel()
) {
    val uiState by viewModel.myBookingsState.collectAsState()
    var showCancelDialog by remember { mutableStateOf<Booking?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadMyBookings(refresh = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("내 예약") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ParkPrimary,
                    titleContentColor = ParkOnPrimary,
                    navigationIconContentColor = ParkOnPrimary
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(GradientStart, GradientEnd)
                    )
                )
                .padding(paddingValues)
        ) {
            Column {
                // Filter Chips
                BookingFilters(
                    selectedStatus = uiState.statusFilter,
                    onStatusChange = { viewModel.setStatusFilter(it) }
                )

                if (uiState.isLoading && uiState.bookings.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = ParkOnPrimary)
                    }
                } else if (uiState.bookings.isEmpty()) {
                    EmptyStateView(
                        icon = Icons.Default.EventBusy,
                        title = "예약 내역이 없습니다",
                        description = "새로운 게임을 예약해보세요"
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.bookings) { booking ->
                            BookingCard(
                                booking = booking,
                                onClick = { onBookingClick(booking.id) },
                                onCancel = { showCancelDialog = booking }
                            )
                        }

                        if (uiState.hasMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (uiState.isLoading) {
                                        CircularProgressIndicator(
                                            color = ParkOnPrimary,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    } else {
                                        TextButton(onClick = { viewModel.loadMoreBookings() }) {
                                            Text("더 보기", color = ParkOnPrimary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Error Snackbar
            uiState.error?.let { error ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearBookingsError() }) {
                            Text("확인")
                        }
                    }
                ) {
                    Text(error)
                }
            }

            // Success Snackbar
            uiState.successMessage?.let { message ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    containerColor = ParkPrimary,
                    action = {
                        TextButton(onClick = { viewModel.clearSuccessMessage() }) {
                            Text("확인", color = ParkOnPrimary)
                        }
                    }
                ) {
                    Text(message, color = ParkOnPrimary)
                }
            }
        }
    }

    // Cancel Confirmation Dialog
    showCancelDialog?.let { booking ->
        AlertDialog(
            onDismissRequest = { showCancelDialog = null },
            title = { Text("예약 취소") },
            text = { Text("정말 이 예약을 취소하시겠습니까?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.cancelBooking(booking.id)
                        showCancelDialog = null
                    }
                ) {
                    Text("취소하기", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = null }) {
                    Text("아니오")
                }
            }
        )
    }
}

@Composable
private fun BookingFilters(
    selectedStatus: String?,
    onStatusChange: (String?) -> Unit
) {
    val filters = listOf(
        null to "전체",
        "CONFIRMED" to "확정",
        "PENDING" to "대기중",
        "CANCELLED" to "취소됨",
        "COMPLETED" to "완료"
    )

    LazyRow(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(filters) { (status, label) ->
            FilterChip(
                selected = selectedStatus == status,
                onClick = { onStatusChange(status) },
                label = { Text(label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ParkPrimary,
                    selectedLabelColor = ParkOnPrimary
                )
            )
        }
    }
}

@Composable
private fun BookingCard(
    booking: Booking,
    onClick: () -> Unit,
    onCancel: () -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("yyyy년 M월 d일")

    GlassCard(
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = booking.gameName ?: "게임",
                    style = MaterialTheme.typography.titleMedium,
                    color = ParkOnPrimary,
                    fontWeight = FontWeight.Bold
                )
                StatusBadge(
                    text = booking.status.displayName,
                    backgroundColor = getStatusColor(booking.status)
                )
            }

            if (booking.clubName != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.Place,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                    Text(
                        text = booking.clubName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                    Text(
                        text = booking.bookingDate.format(dateFormatter),
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary.copy(alpha = 0.8f)
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.AccessTime,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                    Text(
                        text = "${booking.startTime} - ${booking.endTime}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary.copy(alpha = 0.8f)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                    Text(
                        text = "${booking.playerCount}명",
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary.copy(alpha = 0.8f)
                    )
                }

                Text(
                    text = formatPrice(booking.totalPrice),
                    style = MaterialTheme.typography.titleMedium,
                    color = ParkOnPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            // Cancel button for pending/confirmed bookings
            if (booking.status == BookingStatus.PENDING || booking.status == BookingStatus.CONFIRMED) {
                OutlinedButton(
                    onClick = onCancel,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("예약 취소")
                }
            }
        }
    }
}

private fun getStatusColor(status: BookingStatus): androidx.compose.ui.graphics.Color {
    return when (status) {
        BookingStatus.CONFIRMED -> ParkPrimary
        BookingStatus.PENDING -> androidx.compose.ui.graphics.Color(0xFFF59E0B)
        BookingStatus.SLOT_RESERVED -> androidx.compose.ui.graphics.Color(0xFFF59E0B)
        BookingStatus.CANCELLED -> androidx.compose.ui.graphics.Color(0xFFEF4444)
        BookingStatus.COMPLETED -> androidx.compose.ui.graphics.Color(0xFF6B7280)
        BookingStatus.NO_SHOW -> androidx.compose.ui.graphics.Color(0xFF6B7280)
        BookingStatus.FAILED -> androidx.compose.ui.graphics.Color(0xFFEF4444)
    }
}

private fun formatPrice(price: Int): String {
    val formatter = NumberFormat.getNumberInstance(Locale.KOREA)
    return "${formatter.format(price)}원"
}
