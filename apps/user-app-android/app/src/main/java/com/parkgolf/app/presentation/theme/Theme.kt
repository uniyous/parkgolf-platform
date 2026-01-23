package com.parkgolf.app.presentation.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Park Golf iOS-style Theme
 *
 * iOS 앱과 동일한 다크 에메랄드 그라데이션 배경 + 글래스 모피즘 스타일
 * 항상 다크 테마 기반 (그라데이션 배경에 흰색 텍스트)
 */

// ============================================
// Park Color Scheme (iOS Style - Always Dark)
// ============================================
private val ParkColorScheme = darkColorScheme(
    // Primary
    primary = ParkPrimary,
    onPrimary = Color.White,
    primaryContainer = GlassCard,
    onPrimaryContainer = Color.White,

    // Secondary
    secondary = ParkPrimaryDark,
    onSecondary = Color.White,
    secondaryContainer = GlassCard,
    onSecondaryContainer = Color.White,

    // Tertiary (Accent)
    tertiary = ParkAccent,
    onTertiary = Color.White,
    tertiaryContainer = GlassCard,
    onTertiaryContainer = Color.White,

    // Background & Surface (Transparent - gradient applied separately)
    background = Color.Transparent,
    onBackground = Color.White,
    surface = GlassCard,
    onSurface = Color.White,
    surfaceVariant = GlassBackground,
    onSurfaceVariant = TextOnGradientSecondary,

    // Surface containers
    surfaceContainerLowest = Color.Transparent,
    surfaceContainerLow = GlassBackground,
    surfaceContainer = GlassCard,
    surfaceContainerHigh = GlassCardHighlight,
    surfaceContainerHighest = GlassCardHighlight,

    // Outline
    outline = GlassBorder,
    outlineVariant = OutlineVariantDark,

    // Error
    error = ParkError,
    onError = Color.White,
    errorContainer = ParkErrorContainer,
    onErrorContainer = Color.White,

    // Inverse
    inverseSurface = Color.White,
    inverseOnSurface = GradientStart,
    inversePrimary = ParkPrimaryDark,

    // Surface Tint & Scrim
    surfaceTint = ParkPrimary,
    scrim = Color.Black.copy(alpha = 0.32f)
)

// ============================================
// Gradients
// ============================================
val ParkBackgroundGradient = Brush.linearGradient(
    colors = listOf(
        GradientStart,
        GradientMiddle,
        GradientEnd
    )
)

val ParkButtonGradient = Brush.horizontalGradient(
    colors = listOf(
        ParkPrimary,
        ParkPrimaryDark
    )
)

val ParkCardGradient = Brush.linearGradient(
    colors = listOf(
        GlassCardHighlight,
        GlassBackground
    )
)

// ============================================
// Custom Park Colors Provider
// ============================================
data class ParkColors(
    val gradientStart: Color = GradientStart,
    val gradientMiddle: Color = GradientMiddle,
    val gradientEnd: Color = GradientEnd,
    val glassCard: Color = GlassCard,
    val glassBorder: Color = GlassBorder,
    val glassInput: Color = GlassInput,
    val textPrimary: Color = TextOnGradient,
    val textSecondary: Color = TextOnGradientSecondary,
    val textTertiary: Color = TextOnGradientTertiary,
    val accent: Color = ParkAccent,
    val success: Color = ParkSuccess,
    val warning: Color = ParkWarning,
    val error: Color = ParkError,
    val info: Color = ParkInfo
)

val LocalParkColors = staticCompositionLocalOf { ParkColors() }

// ============================================
// Theme Composable
// ============================================
@Composable
fun ParkGolfTheme(
    content: @Composable () -> Unit
) {
    val parkColors = ParkColors()

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window

            // Status bar - transparent to show gradient
            window.statusBarColor = GradientStart.toArgb()

            // Navigation bar - dark to match gradient end
            window.navigationBarColor = GradientEnd.toArgb()

            // Light icons on dark background
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    CompositionLocalProvider(
        LocalParkColors provides parkColors
    ) {
        MaterialTheme(
            colorScheme = ParkColorScheme,
            typography = ParkGolfTypography,
            shapes = ParkGolfShapes,
            content = content
        )
    }
}

// Extension to access park colors
object ParkTheme {
    val colors: ParkColors
        @Composable
        get() = LocalParkColors.current
}
