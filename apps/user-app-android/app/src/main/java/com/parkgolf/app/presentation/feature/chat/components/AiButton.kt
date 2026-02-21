package com.parkgolf.app.presentation.feature.chat.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary

@Composable
fun AiButton(
    isActive: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
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
            modifier = Modifier.size(20.dp)
        )
    }
}
