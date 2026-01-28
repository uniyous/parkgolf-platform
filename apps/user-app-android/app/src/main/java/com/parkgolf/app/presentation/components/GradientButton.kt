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
    val buttonGradient = when (style) {
        GradientButtonStyle.Primary -> ParkButtonGradient
        GradientButtonStyle.Destructive -> Brush.linearGradient(
            colors = listOf(
                ParkError,
                ParkError.copy(alpha = 0.8f)
            )
        )
        GradientButtonStyle.Ghost -> Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.15f),
                Color.White.copy(alpha = 0.10f)
            )
        )
    }

    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp),
        enabled = enabled && !isLoading,
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
                    brush = if (enabled && !isLoading) buttonGradient
                    else buttonGradient.copy(alpha = 0.5f),
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

private fun androidx.compose.ui.graphics.Brush.copy(alpha: Float): androidx.compose.ui.graphics.Brush {
    return this // Simplified for now
}
