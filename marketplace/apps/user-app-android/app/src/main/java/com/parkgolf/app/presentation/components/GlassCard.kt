package com.parkgolf.app.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.GlassCardHighlight
import com.parkgolf.app.presentation.theme.GradientEnd
import com.parkgolf.app.presentation.theme.GradientMiddle
import com.parkgolf.app.presentation.theme.GradientStart

/**
 * iOS-style Glass Morphism Components
 *
 * 에메랄드 그라데이션 배경 위의 글래스 효과 컴포넌트
 */

// ============================================
// Gradient Background Container
// ============================================
@Composable
fun GradientBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        GradientStart,
                        GradientMiddle,
                        GradientEnd
                    )
                )
            )
    ) {
        content()
    }
}

// ============================================
// Glass Card (iOS Style)
// ============================================
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = 16.dp,
    cornerRadius: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)

    Card(
        modifier = modifier
            .clip(shape)
            .then(
                if (onClick != null) Modifier.clickable { onClick() } else Modifier
            ),
        colors = CardDefaults.cardColors(
            containerColor = GlassCard
        ),
        border = BorderStroke(1.dp, GlassBorder),
        shape = shape
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

// ============================================
// Glass Card with Gradient Overlay
// ============================================
@Composable
fun GlassGradientCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = 16.dp,
    cornerRadius: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)

    Card(
        modifier = modifier
            .clip(shape)
            .then(
                if (onClick != null) Modifier.clickable { onClick() } else Modifier
            ),
        colors = CardDefaults.cardColors(
            containerColor = Color.Transparent
        ),
        border = BorderStroke(1.dp, GlassBorder),
        shape = shape
    ) {
        Box(
            modifier = Modifier
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            GlassCardHighlight,
                            GlassCard
                        )
                    )
                )
        ) {
            Column(
                modifier = Modifier.padding(contentPadding),
                content = content
            )
        }
    }
}

// ============================================
// Glass Input Field Background
// ============================================
@Composable
fun GlassInputBackground(
    modifier: Modifier = Modifier,
    isFocused: Boolean = false,
    cornerRadius: Dp = 12.dp,
    content: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)
    val backgroundColor = if (isFocused) {
        Color.White.copy(alpha = 0.15f)
    } else {
        Color.White.copy(alpha = 0.10f)
    }
    val borderColor = if (isFocused) {
        Color(0xFF10B981) // ParkPrimary
    } else {
        GlassBorder
    }

    Box(
        modifier = modifier
            .clip(shape)
            .background(backgroundColor)
            .then(
                Modifier.padding(1.dp) // Border simulation
            )
    ) {
        content()
    }
}

// ============================================
// Glass Section Card (Wider padding)
// ============================================
@Composable
fun GlassSectionCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    contentPadding: Dp = 20.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        contentPadding = contentPadding,
        cornerRadius = 20.dp
    ) {
        content()
    }
}
