package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

// 시니어 UI: 결제 방법 2개
private data class PaymentMethodOption(
    val id: String,
    val name: String,
    val icon: String
)

private val SIMPLE_PAYMENT_METHODS = listOf(
    PaymentMethodOption("onsite", "현장결제", "🏪"),
    PaymentMethodOption("card", "카드결제", "💳")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingFormScreen(
    gameId: Int,  // API 호환성을 위해 파라미터명 유지
    onNavigateBack: () -> Unit,
    onBookingComplete: (String) -> Unit,
    viewModel: BookingFormViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(gameId) {
        viewModel.loadRoundForBooking(gameId)
    }

    LaunchedEffect(uiState.bookingSuccess) {
        if (uiState.bookingSuccess && uiState.createdBooking != null) {
            onBookingComplete(uiState.createdBooking!!.id)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "예약 확인",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = ParkOnPrimary,
                    navigationIconContentColor = ParkOnPrimary
                )
            )
        },
        containerColor = Color.Transparent
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
            if (uiState.isLoading && uiState.round == null) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = ParkOnPrimary
                )
            } else {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Scrollable Content
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        // 시니어 UI: 단일 카드 레이아웃
                        GlassCard(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = 0.dp
                        ) {
                            Column {
                                // 예약 정보
                                BookingInfoSection(uiState)

                                SectionDivider()

                                // 인원 선택
                                PlayerCountSection(
                                    count = uiState.playerCount,
                                    maxPlayers = uiState.selectedTimeSlot?.availablePlayers ?: 4,
                                    onCountChange = { viewModel.updatePlayerCount(it) }
                                )

                                SectionDivider()

                                // 결제 방법
                                PaymentMethodSection(
                                    selectedMethod = uiState.paymentMethod,
                                    onMethodChange = { viewModel.updatePaymentMethod(it) }
                                )

                                SectionDivider()

                                // 결제 금액
                                PriceSection(
                                    totalPrice = uiState.totalPrice,
                                    playerCount = uiState.playerCount,
                                    pricePerPerson = uiState.selectedTimeSlot?.price ?: uiState.round?.pricePerPerson ?: 0
                                )

                                SectionDivider()

                                // 약관 동의
                                TermsSection(
                                    agreed = uiState.agreedToTerms,
                                    onAgreedChange = { viewModel.updateAgreedToTerms(it) }
                                )
                            }
                        }
                    }

                    // Error message
                    uiState.error?.let { error ->
                        Text(
                            text = error,
                            color = ParkError,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }

                    // Bottom Button (시니어 UI: 큰 버튼)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))
                                )
                            )
                            .padding(16.dp)
                    ) {
                        GradientButton(
                            text = if (uiState.isLoading) "처리 중..." else "₩${formatPrice(uiState.totalPrice)} 예약하기",
                            onClick = { viewModel.createBooking() },
                            enabled = !uiState.isLoading && uiState.canProceed,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(64.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionDivider() {
    HorizontalDivider(
        color = GlassBorder,
        modifier = Modifier.padding(vertical = 16.dp)
    )
}

// MARK: - Booking Info Section (시니어 UI: 단순화)

@Composable
private fun BookingInfoSection(uiState: BookingFormUiState) {
    Column(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        uiState.round?.let { round ->
            Text(
                text = round.clubName,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = TextOnGradient
            )

            round.club?.address?.let { address ->
                Text(
                    text = "📍 $address",
                    fontSize = 16.sp,
                    color = TextOnGradientSecondary
                )
            }
        }

        if (uiState.selectedDate.isNotBlank()) {
            Text(
                text = "📅 ${uiState.selectedDate}",
                fontSize = 16.sp,
                color = TextOnGradient.copy(alpha = 0.9f)
            )
        }

        uiState.selectedTimeSlot?.let { slot ->
            Text(
                text = "🕐 ${slot.startTime}",
                fontSize = 16.sp,
                color = TextOnGradient.copy(alpha = 0.9f)
            )
        }
    }
}

// MARK: - Player Count Section (시니어 UI: 버튼 토글)

@Composable
private fun PlayerCountSection(
    count: Int,
    maxPlayers: Int,
    onCountChange: (Int) -> Unit
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "인원 선택",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextOnGradient.copy(alpha = 0.9f)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            (1..minOf(maxPlayers, 4)).forEach { num ->
                PlayerCountButton(
                    count = num,
                    isSelected = count == num,
                    onClick = { onCountChange(num) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun PlayerCountButton(
    count: Int,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) ParkSuccess.copy(alpha = 0.3f) else GlassBackground
            )
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "${count}명",
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = if (isSelected) ParkSuccess else TextOnGradientSecondary
        )
    }
}

// MARK: - Payment Method Section (시니어 UI: 2개 큰 버튼)

@Composable
private fun PaymentMethodSection(
    selectedMethod: String,
    onMethodChange: (String) -> Unit
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "결제 방법",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextOnGradient.copy(alpha = 0.9f)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SIMPLE_PAYMENT_METHODS.forEach { method ->
                PaymentMethodButton(
                    method = method,
                    isSelected = selectedMethod == method.id,
                    onClick = { onMethodChange(method.id) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun PaymentMethodButton(
    method: PaymentMethodOption,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .height(80.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (isSelected) ParkSuccess.copy(alpha = 0.3f) else GlassBackground
            )
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = method.icon,
            fontSize = 28.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = method.name,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = if (isSelected) ParkSuccess else TextOnGradientSecondary
        )
    }
}

// MARK: - Price Section (시니어 UI: 큰 금액 표시)

@Composable
private fun PriceSection(
    totalPrice: Int,
    playerCount: Int,
    pricePerPerson: Int
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "총 결제 금액",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextOnGradient.copy(alpha = 0.9f)
        )

        Text(
            text = "₩${formatPrice(totalPrice)}",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = TextOnGradient
        )

        Text(
            text = "(${playerCount}명 × ₩${formatPrice(pricePerPerson)})",
            fontSize = 16.sp,
            color = TextOnGradientSecondary
        )
    }
}

// MARK: - Terms Section (시니어 UI: 1개로 통합)

@Composable
private fun TermsSection(
    agreed: Boolean,
    onAgreedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable { onAgreedChange(!agreed) },
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Checkbox(
            checked = agreed,
            onCheckedChange = { onAgreedChange(it) },
            colors = CheckboxDefaults.colors(
                checkedColor = ParkPrimary,
                uncheckedColor = TextOnGradientSecondary
            ),
            modifier = Modifier.size(24.dp)
        )

        Text(
            text = "이용약관 및 개인정보처리방침에 동의합니다",
            fontSize = 16.sp,
            color = TextOnGradient.copy(alpha = 0.9f)
        )
    }
}

private fun formatPrice(price: Int): String {
    val formatter = NumberFormat.getNumberInstance(Locale.KOREA)
    return formatter.format(price)
}
