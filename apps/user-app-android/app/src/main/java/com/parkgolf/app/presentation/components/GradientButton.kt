package com.parkgolf.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.ButtonShape
import com.parkgolf.app.presentation.theme.ParkButtonGradient
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkPrimaryDark

enum class GradientButtonStyle {
    Primary,
    Destructive,
    Ghost
}

@Composable
fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    style: GradientButtonStyle = GradientButtonStyle.Primary
) {
    val isActive = enabled && !isLoading
    val buttonGradient = when (style) {
        GradientButtonStyle.Primary -> if (isActive) ParkButtonGradient else Brush.horizontalGradient(
            colors = listOf(
                ParkPrimary.copy(alpha = 0.5f),
                ParkPrimaryDark.copy(alpha = 0.5f)
            )
        )
        GradientButtonStyle.Destructive -> Brush.linearGradient(
            colors = listOf(
                ParkError.copy(alpha = if (isActive) 1f else 0.5f),
                ParkError.copy(alpha = if (isActive) 0.8f else 0.4f)
            )
        )
        GradientButtonStyle.Ghost -> Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = if (isActive) 0.15f else 0.08f),
                Color.White.copy(alpha = if (isActive) 0.10f else 0.05f)
            )
        )
    }

    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp),
        enabled = isActive,
        shape = ButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            disabledContainerColor = Color.Transparent
        ),
        contentPadding = PaddingValues(0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .background(
                    brush = buttonGradient,
                    shape = ButtonShape
                ),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    text = text,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
            }
        }
    }
}
