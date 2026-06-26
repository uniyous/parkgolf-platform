package com.parkgolf.app.presentation.feature.chat.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary

@Composable
fun AiButton(
    isActive: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ai_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isActive) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )
    val pingScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isActive) 2f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Restart
        ),
        label = "ping_scale"
    )
    val pingAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isActive) 0f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Restart
        ),
        label = "ping_alpha"
    )

    Box(contentAlignment = Alignment.TopEnd) {
        IconButton(
            onClick = onClick,
            modifier = modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(
                    if (isActive) ParkPrimary.copy(alpha = 0.2f)
                    else ParkOnPrimary.copy(alpha = 0.1f)
                )
                .then(
                    if (isActive) Modifier.border(1.dp, ParkPrimary, CircleShape)
                    else Modifier
                )
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = if (isActive) "AI 모드 끄기" else "AI 모드 켜기",
                tint = if (isActive) ParkPrimary else ParkOnPrimary.copy(alpha = 0.5f),
                modifier = Modifier
                    .size(20.dp)
                    .scale(if (isActive) pulseScale else 1f)
            )
        }

        if (isActive) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .scale(pingScale)
                    .clip(CircleShape)
                    .background(ParkPrimary.copy(alpha = pingAlpha))
            )
        }
    }
}
