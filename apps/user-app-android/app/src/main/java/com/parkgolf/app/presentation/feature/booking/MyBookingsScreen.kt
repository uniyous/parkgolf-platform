package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.components.GradientButtonStyle
import com.parkgolf.app.presentation.components.StatusBadge
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

// MARK: - Booking Tab

enum class BookingTab(val title: String) {
    UPCOMING("예정된 예약"),
    PAST("지난 예약")
}

// MARK: - Cancellation Reason

enum class CancellationReason(val title: String) {
    SCHEDULE_CHANGE("일정 변경"),
    PERSONAL_REASONS("개인 사정"),
    HEALTH_ISSUES("건강 문제"),
    WEATHER("날씨 이유"),
    OTHER_BOOKING("다른 예약 확정"),
    OTHER("기타")
}

// MARK: - My Bookings Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyBookingsScreen(
    onNavigateBack: () -> Unit,
    onBookingClick: (String) -> Unit,
    viewModel: MyBookingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(BookingTab.UPCOMING) }
    var bookingToCancel by remember { mutableStateOf<Booking?>(null) }
    var selectedBooking by remember { mutableStateOf<Booking?>(null) }

    // Load bookings on tab change
    LaunchedEffect(selectedTab) {
        viewModel.setTimeFilter(
            when (selectedTab) {
                BookingTab.UPCOMING -> "UPCOMING"
                BookingTab.PAST -> "PAST"
            }
        )
    }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "예약",
                            style = MaterialTheme.typography.titleLarge,
                            color = TextOnGradient,
                            fontWeight = FontWeight.SemiBold
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = TextOnGradient
                            )
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = Color.Transparent
                    )
                )
            }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                // Tab Selector
                TabSelector(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it }
                )

                // Content
                when {
                    uiState.isLoading && uiState.bookings.isEmpty() -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                CircularProgressIndicator(color = TextOnGradient)
                                Text(
                                    text = "예약 불러오는 중...",
                                    color = TextOnGradientSecondary
                                )
                            }
                        }
                    }
                    uiState.error != null && uiState.bookings.isEmpty() -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Text(
                                    text = uiState.error ?: "오류가 발생했습니다",
                                    color = ParkError
                                )
                                TextButton(onClick = { viewModel.loadBookings(refresh = true) }) {
                                    Text("다시 시도", color = ParkPrimary)
                                }
                            }
                        }
                    }
                    uiState.bookings.isEmpty() -> {
                        EmptyStateView(
                            icon = if (selectedTab == BookingTab.UPCOMING)
                                Icons.Default.CalendarMonth else Icons.Default.History,
                            title = if (selectedTab == BookingTab.UPCOMING)
                                "예정된 예약이 없습니다" else "지난 예약이 없습니다",
                            description = if (selectedTab == BookingTab.UPCOMING)
                                "새로운 라운드를 예약해 보세요!" else "아직 완료된 라운드가 없습니다"
                        )
                    }
                    else -> {
                        BookingList(
                            bookings = uiState.bookings,
                            isLoadingMore = uiState.isLoading && uiState.bookings.isNotEmpty(),
                            hasMore = uiState.hasMore,
                            onBookingClick = { booking ->
                                selectedBooking = booking
                            },
                            onCancelClick = { booking ->
                                bookingToCancel = booking
                            },
                            onLoadMore = { viewModel.loadMore() }
                        )
                    }
                }
            }

            // Success Snackbar
            uiState.successMessage?.let { message ->
                Snackbar(
                    modifier = Modifier
                        .padding(16.dp),
                    containerColor = ParkSuccess,
                    action = {
                        TextButton(onClick = { viewModel.clearSuccessMessage() }) {
                            Text("확인", color = TextOnGradient)
                        }
                    }
                ) {
                    Text(message, color = TextOnGradient)
                }
            }
        }
    }

    // Cancel Booking Sheet
    bookingToCancel?.let { booking ->
        CancelBookingSheet(
            booking = booking,
            onDismiss = { bookingToCancel = null },
            onCancel = { reason ->
                viewModel.cancelBooking(booking.id, reason)
                bookingToCancel = null
            }
        )
    }

    // Booking Detail Sheet
    selectedBooking?.let { booking ->
        BookingDetailSheet(
            booking = booking,
            onDismiss = { selectedBooking = null }
        )
    }
}

// MARK: - Tab Selector

@Composable
private fun TabSelector(
    selectedTab: BookingTab,
    onTabSelected: (BookingTab) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        BookingTab.entries.forEach { tab ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onTabSelected(tab) },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = tab.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = if (selectedTab == tab) TextOnGradient else TextOnGradientSecondary.copy(alpha = 0.5f),
                    fontWeight = if (selectedTab == tab) FontWeight.SemiBold else FontWeight.Normal,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.6f)
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (selectedTab == tab) ParkPrimary else Color.Transparent)
                )
            }
        }
    }
}

// MARK: - Booking List

@Composable
private fun BookingList(
    bookings: List<Booking>,
    isLoadingMore: Boolean,
    hasMore: Boolean,
    onBookingClick: (Booking) -> Unit,
    onCancelClick: (Booking) -> Unit,
    onLoadMore: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(bookings, key = { it.id }) { booking ->
            BookingListCard(
                booking = booking,
                onTap = { onBookingClick(booking) },
                onCancel = if (booking.canCancel) {
                    { onCancelClick(booking) }
                } else null
            )

            // Load more when reaching the last item
            if (booking == bookings.lastOrNull() && hasMore && !isLoadingMore) {
                LaunchedEffect(booking.id) {
                    onLoadMore()
                }
            }
        }

        if (isLoadingMore) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        color = TextOnGradient,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}

// MARK: - Booking List Card

@Composable
private fun BookingListCard(
    booking: Booking,
    onTap: () -> Unit,
    onCancel: (() -> Unit)?
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onTap),
        contentPadding = 0.dp
    ) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusBadge(statusString = booking.status.name)
                Text(
                    text = booking.bookingNumber ?: "",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextOnGradientSecondary.copy(alpha = 0.5f)
                )
            }

            HorizontalDivider(color = TextOnGradientSecondary.copy(alpha = 0.1f))

            // Content
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Game Name
                booking.gameName?.let { gameName ->
                    Text(
                        text = gameName,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextOnGradient,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Club & Course
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Business,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = TextOnGradientSecondary.copy(alpha = 0.7f)
                        )
                        Text(
                            text = booking.clubName,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextOnGradientSecondary.copy(alpha = 0.7f)
                        )
                    }

                    booking.courseName?.let { courseName ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Flag,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = TextOnGradientSecondary.copy(alpha = 0.7f)
                            )
                            Text(
                                text = courseName,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextOnGradientSecondary.copy(alpha = 0.7f)
                            )
                        }
                    }
                }

                // Date, Time, Players
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    InfoChip(
                        icon = Icons.Default.CalendarToday,
                        text = booking.dateText
                    )
                    InfoChip(
                        icon = Icons.Default.AccessTime,
                        text = booking.startTime
                    )
                    InfoChip(
                        icon = Icons.Default.People,
                        text = "${booking.playerCount}명"
                    )
                }
            }

            HorizontalDivider(color = TextOnGradientSecondary.copy(alpha = 0.1f))

            // Footer
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Price
                Text(
                    text = booking.priceText,
                    style = MaterialTheme.typography.titleMedium,
                    color = ParkPrimary,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Cancel Button
                    onCancel?.let {
                        SmallButton(
                            text = "취소",
                            icon = Icons.Default.Close,
                            color = ParkError.copy(alpha = 0.8f),
                            onClick = it
                        )
                    }

                    // Chevron
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = TextOnGradientSecondary.copy(alpha = 0.4f)
                    )
                }
            }
        }
    }
}

@Composable
private fun InfoChip(
    icon: ImageVector,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(12.dp),
            tint = TextOnGradientSecondary.copy(alpha = 0.6f)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = TextOnGradientSecondary.copy(alpha = 0.6f)
        )
    }
}

@Composable
private fun SmallButton(
    text: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = color.copy(alpha = 0.2f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = color
            )
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
        }
    }
}

// MARK: - Cancel Booking Sheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CancelBookingSheet(
    booking: Booking,
    onDismiss: () -> Unit,
    onCancel: (String?) -> Unit
) {
    var selectedReason by remember { mutableStateOf<CancellationReason?>(null) }
    var customReason by remember { mutableStateOf("") }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = GradientStart,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextOnGradientSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Title
            Text(
                text = "예약 취소",
                style = MaterialTheme.typography.titleLarge,
                color = TextOnGradient,
                fontWeight = FontWeight.Bold
            )

            // Warning Banner
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = ParkWarning.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ParkWarning
                )
                Text(
                    text = "다음 예약을 취소하시겠습니까?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextOnGradient
                )
            }

            // Booking Info Card
            GlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    booking.gameName?.let { gameName ->
                        Text(
                            text = gameName,
                            style = MaterialTheme.typography.titleMedium,
                            color = TextOnGradient,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Text(
                        text = booking.dateText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextOnGradientSecondary.copy(alpha = 0.7f)
                    )
                    Text(
                        text = booking.timeText,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary.copy(alpha = 0.6f)
                    )
                }
            }

            // Reason Selection
            GlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "취소 사유 선택",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextOnGradient,
                        fontWeight = FontWeight.SemiBold
                    )

                    CancellationReason.entries.forEach { reason ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedReason = reason }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = if (selectedReason == reason)
                                    Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (selectedReason == reason) ParkPrimary else TextOnGradientSecondary.copy(alpha = 0.4f)
                            )
                            Text(
                                text = reason.title,
                                color = TextOnGradient
                            )
                        }
                    }

                    // Custom reason text field
                    if (selectedReason == CancellationReason.OTHER) {
                        OutlinedTextField(
                            value = customReason,
                            onValueChange = { customReason = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = {
                                Text(
                                    "취소 사유를 입력해주세요...",
                                    color = TextOnGradientSecondary.copy(alpha = 0.5f)
                                )
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextOnGradient,
                                unfocusedTextColor = TextOnGradient,
                                focusedBorderColor = ParkPrimary,
                                unfocusedBorderColor = GlassBorder
                            ),
                            minLines = 2
                        )
                    }
                }
            }

            // Notice
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = ParkInfo.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    tint = ParkInfo
                )
                Text(
                    text = "3일 전까지 무료 취소 가능합니다",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnGradientSecondary.copy(alpha = 0.7f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Cancel Button
            GradientButton(
                text = "예약 취소하기",
                onClick = {
                    val reason = if (selectedReason == CancellationReason.OTHER) {
                        customReason.takeIf { it.isNotBlank() }
                    } else {
                        selectedReason?.title
                    }
                    onCancel(reason)
                },
                enabled = selectedReason != null,
                style = GradientButtonStyle.Destructive
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

// MARK: - Booking Detail Sheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BookingDetailSheet(
    booking: Booking,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = GradientStart,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextOnGradientSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Title
            Text(
                text = "예약 상세",
                style = MaterialTheme.typography.titleLarge,
                color = TextOnGradient,
                fontWeight = FontWeight.Bold
            )

            // Status Card
            GlassCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    StatusBadge(statusString = booking.status.name)
                    Text(
                        text = booking.bookingNumber ?: "",
                        style = MaterialTheme.typography.labelMedium,
                        color = TextOnGradientSecondary.copy(alpha = 0.5f)
                    )
                }
            }

            // Game Info Section
            GlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionTitle(text = "라운드 정보")

                    booking.gameName?.let { gameName ->
                        DetailRow(icon = Icons.Default.Flag, label = "게임", value = gameName)
                    }
                    DetailRow(icon = Icons.Default.Business, label = "골프장", value = booking.clubName)
                    booking.courseName?.let { courseName ->
                        DetailRow(icon = Icons.Default.Map, label = "코스", value = courseName)
                    }
                    DetailRow(icon = Icons.Default.CalendarToday, label = "날짜", value = booking.dateText)
                    DetailRow(icon = Icons.Default.AccessTime, label = "시간", value = booking.timeText)
                    DetailRow(icon = Icons.Default.People, label = "인원", value = "${booking.playerCount}명")
                }
            }

            // Special Requests Section
            booking.specialRequests?.takeIf { it.isNotBlank() }?.let { requests ->
                GlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle(text = "요청사항")
                        Text(
                            text = requests,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextOnGradientSecondary.copy(alpha = 0.8f)
                        )
                    }
                }
            }

            // Payment Info Section
            GlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionTitle(text = "결제 정보")

                    HorizontalDivider(color = TextOnGradientSecondary.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "총 결제 금액",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextOnGradient,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = booking.priceText,
                            style = MaterialTheme.typography.titleMedium,
                            color = ParkPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    booking.paymentMethod?.let { method ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "결제 수단",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextOnGradientSecondary.copy(alpha = 0.6f)
                            )
                            Text(
                                text = getPaymentMethodDisplay(method),
                                style = MaterialTheme.typography.bodySmall,
                                color = TextOnGradient
                            )
                        }
                    }
                }
            }

            // Booker Info Section
            booking.userName?.let { userName ->
                GlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle(text = "예약자 정보")

                        DetailRow(icon = Icons.Default.Person, label = "이름", value = userName)
                        booking.userEmail?.let { email ->
                            DetailRow(icon = Icons.Default.Email, label = "이메일", value = email)
                        }
                        booking.userPhone?.let { phone ->
                            DetailRow(icon = Icons.Default.Phone, label = "연락처", value = phone)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        color = TextOnGradient,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = TextOnGradientSecondary.copy(alpha = 0.6f)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = TextOnGradientSecondary.copy(alpha = 0.6f)
            )
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = TextOnGradient
        )
    }
}

private fun getPaymentMethodDisplay(method: String): String {
    return when (method.lowercase()) {
        "card" -> "💳 신용카드"
        "kakaopay" -> "💛 카카오페이"
        "naverpay" -> "💚 네이버페이"
        "tosspay" -> "💙 토스페이"
        "bank" -> "🏦 계좌이체"
        else -> method
    }
}
