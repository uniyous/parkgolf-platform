package com.parkgolf.app.presentation.feature.chat.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary

private data class QuickAction(
    val icon: ImageVector,
    val label: String,
    val message: String,
    val color: Color
)

private val quickActions = listOf(
    QuickAction(Icons.Default.Search, "골프장 검색", "골프장 검색해줘", ParkPrimary),
    QuickAction(Icons.Default.CalendarMonth, "예약 하기", "예약하고 싶어", Color(0xFF60A5FA)),
    QuickAction(Icons.Default.LocationOn, "내 근처 찾기", "내 근처 골프장 알려줘", Color(0xFFFBBF24)),
    QuickAction(Icons.Default.WbSunny, "날씨 확인", "오늘 날씨 어때?", Color(0xFFA78BFA)),
)

@Composable
fun AiWelcomeCard(
    onQuickAction: (String) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        // AI avatar + label
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.padding(start = 8.dp, bottom = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(ParkPrimary, ParkPrimary.copy(alpha = 0.7f))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = Color.White
                )
            }
            Text(
                text = "AI 예약 도우미",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = ParkPrimary
            )
        }

        // Welcome message + quick actions
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = ParkPrimary.copy(alpha = 0.05f)
        ) {
            Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                // Left accent border
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .fillMaxHeight()
                        .background(ParkPrimary.copy(alpha = 0.4f))
                )

                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "안녕하세요! 파크골프 예약 도우미입니다.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = ParkOnPrimary
                    )
                    Text(
                        text = "골프장 검색, 예약, 날씨 확인 등을 도와드릴게요.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = ParkOnPrimary.copy(alpha = 0.7f)
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // 2x2 grid of quick actions
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (rowIndex in 0..1) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                for (colIndex in 0..1) {
                                    val action = quickActions[rowIndex * 2 + colIndex]
                                    Surface(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(12.dp))
                                            .clickable { onQuickAction(action.message) }
                                            .border(
                                                1.dp,
                                                ParkOnPrimary.copy(alpha = 0.1f),
                                                RoundedCornerShape(12.dp)
                                            ),
                                        color = ParkOnPrimary.copy(alpha = 0.05f),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp)
                                        ) {
                                            Icon(
                                                action.icon,
                                                contentDescription = null,
                                                modifier = Modifier.size(14.dp),
                                                tint = action.color
                                            )
                                            Text(
                                                text = action.label,
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.Medium,
                                                color = ParkOnPrimary.copy(alpha = 0.8f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
