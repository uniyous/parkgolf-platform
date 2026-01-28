package com.parkgolf.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ShieldMoon
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.parkgolf.app.presentation.theme.GlassBackground
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GradientEnd
import com.parkgolf.app.presentation.theme.GradientStart
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * Password Change Reminder Dialog
 *
 * 비밀번호 변경 권장 다이얼로그 (90일 경과 시 표시)
 */
@Composable
fun PasswordChangeReminderDialog(
    daysSinceChange: Int?,
    onChangeNow: () -> Unit,
    onLater: () -> Unit
) {
    Dialog(
        onDismissRequest = { /* Dismiss only through buttons */ },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            color = GlassBackground
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Icon
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(ParkWarning.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.ShieldMoon,
                        contentDescription = null,
                        tint = ParkWarning,
                        modifier = Modifier.size(40.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Title
                Text(
                    text = "비밀번호 변경 권장",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextOnGradient,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Description
                Text(
                    text = buildString {
                        append("마지막 비밀번호 변경 후 ")
                        if (daysSinceChange != null) {
                            append("${daysSinceChange}일")
                        } else {
                            append("90일 이상")
                        }
                        append("이 지났습니다.\n보안을 위해 비밀번호를 변경해 주세요.")
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextOnGradientSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Info Card
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White.copy(alpha = 0.05f))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = null,
                        tint = TextOnGradientSecondary.copy(alpha = 0.6f),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "정기적인 비밀번호 변경은 계정 보안에 도움이 됩니다.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary.copy(alpha = 0.7f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Change Now Button (Gradient)
                    GradientButton(
                        text = "지금 변경하기",
                        onClick = onChangeNow,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Later Button
                    TextButton(
                        onClick = onLater,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text(
                            text = "나중에 하기",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextOnGradientSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Skip Info
                Text(
                    text = "\"나중에 하기\"를 선택하면 7일 동안 이 알림이 표시되지 않습니다.",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextOnGradientSecondary.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
