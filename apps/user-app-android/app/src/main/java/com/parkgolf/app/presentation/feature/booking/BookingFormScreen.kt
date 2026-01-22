package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.parkgolf.app.domain.model.GameTimeSlot
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingFormScreen(
    gameId: Int,
    onNavigateBack: () -> Unit,
    onBookingComplete: (String) -> Unit,
    viewModel: BookingViewModel = hiltViewModel()
) {
    val uiState by viewModel.formState.collectAsState()

    LaunchedEffect(gameId) {
        viewModel.loadGameForBooking(gameId)
    }

    LaunchedEffect(uiState.bookingSuccess) {
        if (uiState.bookingSuccess && uiState.createdBooking != null) {
            onBookingComplete(uiState.createdBooking!!.id)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("예약하기") },
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
            if (uiState.isLoading && uiState.game == null) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = ParkOnPrimary
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Game Info Card
                    uiState.game?.let { game ->
                        GlassCard {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = game.name,
                                    style = MaterialTheme.typography.titleLarge,
                                    color = ParkOnPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = game.clubName ?: "",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = ParkOnPrimary.copy(alpha = 0.8f)
                                )
                                if (game.description != null) {
                                    Text(
                                        text = game.description,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = ParkOnPrimary.copy(alpha = 0.7f)
                                    )
                                }
                            }
                        }
                    }

                    // Date Selection
                    DateSelectionSection(
                        selectedDate = uiState.selectedDate,
                        onDateSelected = { date ->
                            uiState.game?.let { game ->
                                viewModel.loadTimeSlotsForDate(game.id, date)
                            }
                        }
                    )

                    // Time Slot Selection
                    if (uiState.selectedDate.isNotBlank()) {
                        TimeSlotSection(
                            timeSlots = uiState.timeSlots,
                            selectedSlot = uiState.selectedTimeSlot,
                            onSlotSelected = { viewModel.selectTimeSlot(it) }
                        )
                    }

                    // Player Count
                    if (uiState.selectedTimeSlot != null) {
                        PlayerCountSection(
                            count = uiState.playerCount,
                            maxPlayers = uiState.selectedTimeSlot?.maxPlayers ?: 4,
                            onCountChange = { viewModel.updatePlayerCount(it) }
                        )
                    }

                    // User Info
                    GlassCard {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                text = "예약자 정보",
                                style = MaterialTheme.typography.titleMedium,
                                color = ParkOnPrimary,
                                fontWeight = FontWeight.Bold
                            )

                            GlassTextField(
                                value = uiState.userName,
                                onValueChange = { viewModel.updateUserName(it) },
                                placeholder = "이름",
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null)
                                }
                            )

                            GlassTextField(
                                value = uiState.userEmail,
                                onValueChange = { viewModel.updateUserEmail(it) },
                                placeholder = "이메일",
                                leadingIcon = {
                                    Icon(Icons.Default.Email, contentDescription = null)
                                }
                            )

                            GlassTextField(
                                value = uiState.userPhone,
                                onValueChange = { viewModel.updateUserPhone(it) },
                                placeholder = "전화번호 (선택)",
                                leadingIcon = {
                                    Icon(Icons.Default.Phone, contentDescription = null)
                                }
                            )

                            GlassTextField(
                                value = uiState.specialRequests,
                                onValueChange = { viewModel.updateSpecialRequests(it) },
                                placeholder = "특별 요청사항 (선택)",
                                singleLine = false,
                                modifier = Modifier.height(100.dp)
                            )
                        }
                    }

                    // Price Summary
                    if (uiState.totalPrice > 0) {
                        GlassCard {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "총 결제 금액",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = ParkOnPrimary
                                )
                                Text(
                                    text = formatPrice(uiState.totalPrice),
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = ParkOnPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    // Error message
                    uiState.error?.let { error ->
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }

                    // Submit Button
                    GradientButton(
                        text = if (uiState.isLoading) "예약 중..." else "예약하기",
                        onClick = { viewModel.createBooking() },
                        enabled = !uiState.isLoading &&
                                uiState.selectedDate.isNotBlank() &&
                                uiState.selectedTimeSlot != null &&
                                uiState.userName.isNotBlank() &&
                                uiState.userEmail.isNotBlank(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
private fun DateSelectionSection(
    selectedDate: String,
    onDateSelected: (String) -> Unit
) {
    val today = LocalDate.now()
    val dates = (0..13).map { today.plusDays(it.toLong()) }
    val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val displayFormatter = DateTimeFormatter.ofPattern("M/d")
    val dayFormatter = DateTimeFormatter.ofPattern("E", Locale.KOREAN)

    GlassCard {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "날짜 선택",
                style = MaterialTheme.typography.titleMedium,
                color = ParkOnPrimary,
                fontWeight = FontWeight.Bold
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(dates) { date ->
                    val dateStr = date.format(formatter)
                    val isSelected = selectedDate == dateStr

                    Surface(
                        modifier = Modifier
                            .clickable { onDateSelected(dateStr) },
                        shape = MaterialTheme.shapes.medium,
                        color = if (isSelected) ParkPrimary else GlassCard
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = date.format(dayFormatter),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) ParkOnPrimary else ParkOnPrimary.copy(alpha = 0.7f)
                            )
                            Text(
                                text = date.format(displayFormatter),
                                style = MaterialTheme.typography.titleMedium,
                                color = ParkOnPrimary,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimeSlotSection(
    timeSlots: List<GameTimeSlot>,
    selectedSlot: GameTimeSlot?,
    onSlotSelected: (GameTimeSlot) -> Unit
) {
    GlassCard {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "시간 선택",
                style = MaterialTheme.typography.titleMedium,
                color = ParkOnPrimary,
                fontWeight = FontWeight.Bold
            )

            if (timeSlots.isEmpty()) {
                Text(
                    text = "선택 가능한 시간이 없습니다",
                    style = MaterialTheme.typography.bodyMedium,
                    color = ParkOnPrimary.copy(alpha = 0.7f)
                )
            } else {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(timeSlots) { slot ->
                        val isSelected = selectedSlot?.id == slot.id
                        val isAvailable = slot.isAvailable

                        Surface(
                            modifier = Modifier
                                .clickable(enabled = isAvailable) { onSlotSelected(slot) },
                            shape = MaterialTheme.shapes.medium,
                            color = when {
                                isSelected -> ParkPrimary
                                !isAvailable -> ParkOnPrimary.copy(alpha = 0.2f)
                                else -> GlassCard
                            }
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = slot.startTime,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = if (isAvailable) ParkOnPrimary else ParkOnPrimary.copy(alpha = 0.5f),
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                                Text(
                                    text = "${slot.availablePlayers}/${slot.maxPlayers}명",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isAvailable) ParkOnPrimary.copy(alpha = 0.7f) else ParkOnPrimary.copy(alpha = 0.3f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlayerCountSection(
    count: Int,
    maxPlayers: Int,
    onCountChange: (Int) -> Unit
) {
    GlassCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "인원",
                style = MaterialTheme.typography.titleMedium,
                color = ParkOnPrimary,
                fontWeight = FontWeight.Bold
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                IconButton(
                    onClick = { onCountChange(count - 1) },
                    enabled = count > 1
                ) {
                    Icon(
                        Icons.Default.Remove,
                        contentDescription = "감소",
                        tint = if (count > 1) ParkOnPrimary else ParkOnPrimary.copy(alpha = 0.3f)
                    )
                }

                Text(
                    text = "$count 명",
                    style = MaterialTheme.typography.titleLarge,
                    color = ParkOnPrimary,
                    fontWeight = FontWeight.Bold
                )

                IconButton(
                    onClick = { onCountChange(count + 1) },
                    enabled = count < maxPlayers
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "증가",
                        tint = if (count < maxPlayers) ParkOnPrimary else ParkOnPrimary.copy(alpha = 0.3f)
                    )
                }
            }
        }
    }
}

private fun formatPrice(price: Int): String {
    val formatter = NumberFormat.getNumberInstance(Locale.KOREA)
    return "${formatter.format(price)}원"
}
