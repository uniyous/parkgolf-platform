package com.parkgolf.app.presentation.feature.booking

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.components.GradientButtonStyle
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun BookingCompleteScreen(
    onNewBooking: () -> Unit,
    onMyBookings: () -> Unit,
    viewModel: BookingCompleteViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Success animation
    var showSuccess by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (showSuccess) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 200f),
        label = "success_scale"
    )

    LaunchedEffect(uiState.booking) {
        if (uiState.booking != null) {
            showSuccess = true
        }
    }

    GradientBackground {
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = ParkOnPrimary)
                }
            }
            uiState.error != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = uiState.error ?: "",
                            color = ParkOnPrimary,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        GradientButton(
                            text = "다시 시도",
                            onClick = { viewModel.retry() },
                            modifier = Modifier.padding(horizontal = 32.dp)
                        )
                    }
                }
            }
            uiState.booking != null -> {
                val booking = uiState.booking!!

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Spacer(modifier = Modifier.height(24.dp))

                    // Success Header
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Success Icon
                        Box(
                            modifier = Modifier
                                .size(120.dp)
                                .scale(scale),
                            contentAlignment = Alignment.Center
                        ) {
                            // Outer circle
                            Box(
                                modifier = Modifier
                                    .size(120.dp)
                                    .background(
                                        color = ParkSuccess.copy(alpha = 0.2f),
                                        shape = CircleShape
                                    )
                            )
                            // Inner circle
                            Box(
                                modifier = Modifier
                                    .size(90.dp)
                                    .background(
                                        color = ParkSuccess.copy(alpha = 0.3f),
                                        shape = CircleShape
                                    )
                            )
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "성공",
                                modifier = Modifier.size(60.dp),
                                tint = ParkSuccess
                            )
                        }

                        Text(
                            text = "예약이 완료되었습니다!",
                            style = MaterialTheme.typography.headlineMedium,
                            color = ParkOnPrimary,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )

                        Text(
                            text = "예약 확인 메일이 발송되었습니다",
                            style = MaterialTheme.typography.bodyMedium,
                            color = ParkOnPrimary.copy(alpha = 0.7f),
                            textAlign = TextAlign.Center
                        )
                    }

                    // Booking Number Card
                    booking.bookingNumber?.let { bookingNumber ->
                        GlassCard {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "예약번호",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = ParkOnPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = bookingNumber,
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = ParkPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                                TextButton(
                                    onClick = {
                                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        val clip = ClipData.newPlainText("예약번호", bookingNumber)
                                        clipboard.setPrimaryClip(clip)
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ContentCopy,
                                        contentDescription = "복사",
                                        modifier = Modifier.size(16.dp),
                                        tint = ParkOnPrimary.copy(alpha = 0.6f)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "복사하기",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = ParkOnPrimary.copy(alpha = 0.6f)
                                    )
                                }
                            }
                        }
                    }

                    // Booking Details Card
                    GlassCard {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                text = "예약 상세",
                                style = MaterialTheme.typography.titleMedium,
                                color = ParkOnPrimary,
                                fontWeight = FontWeight.Bold
                            )

                            booking.gameName?.let {
                                DetailRow(icon = Icons.Default.Flag, label = "게임", value = it)
                            }
                            DetailRow(icon = Icons.Default.Business, label = "골프장", value = booking.clubName)
                            booking.courseName?.let {
                                DetailRow(icon = Icons.Default.Map, label = "코스", value = it)
                            }
                            DetailRow(icon = Icons.Default.CalendarToday, label = "날짜", value = booking.dateText)
                            DetailRow(icon = Icons.Default.Schedule, label = "시간", value = booking.timeText)
                            DetailRow(icon = Icons.Default.Group, label = "인원", value = booking.playerCountText)
                            booking.specialRequests?.let {
                                if (it.isNotBlank()) {
                                    DetailRow(icon = Icons.AutoMirrored.Filled.Chat, label = "요청사항", value = it)
                                }
                            }

                            HorizontalDivider(color = Color.White.copy(alpha = 0.2f))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "총 결제 금액",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = ParkOnPrimary.copy(alpha = 0.8f)
                                )
                                Text(
                                    text = booking.priceText,
                                    style = MaterialTheme.typography.titleLarge,
                                    color = ParkPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    // Notice Card
                    GlassCard {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = ParkInfo,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    text = "이용 안내",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = ParkOnPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            NoticeItem("라운드 3일 전까지 무료 취소 가능합니다")
                            NoticeItem("당일 취소는 수수료가 발생할 수 있습니다")
                            NoticeItem("드레스 코드를 확인해주세요")
                            NoticeItem("문의사항은 고객센터로 연락해주세요")
                        }
                    }

                    // Action Buttons
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        GradientButton(
                            text = "새로운 예약하기",
                            onClick = onNewBooking,
                            style = GradientButtonStyle.Ghost,
                            modifier = Modifier.fillMaxWidth()
                        )

                        GradientButton(
                            text = "내 예약 보기",
                            onClick = onMyBookings,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = ParkOnPrimary.copy(alpha = 0.6f)
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary.copy(alpha = 0.6f),
            modifier = Modifier.width(60.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary
        )
    }
}

@Composable
private fun NoticeItem(text: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = "•",
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary.copy(alpha = 0.4f)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary.copy(alpha = 0.7f)
        )
    }
}
