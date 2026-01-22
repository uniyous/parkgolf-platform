package com.parkgolf.app.presentation.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = ParkPrimary,
    secondary = ParkSecondary,
    tertiary = ParkAccent,
    background = GradientStart,
    surface = SurfaceDark,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White,
    error = ParkError,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = ParkPrimary,
    secondary = ParkSecondary,
    tertiary = ParkAccent,
    background = SurfaceLight,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.Black,
    onBackground = SurfaceDark,
    onSurface = SurfaceDark,
    error = ParkError,
    onError = Color.White
)

// Background gradient brush
val ParkBackgroundGradient = Brush.verticalGradient(
    colors = listOf(
        GradientStart,
        GradientMiddle,
        GradientEnd
    )
)

// Button gradient brush
val ParkButtonGradient = Brush.horizontalGradient(
    colors = listOf(
        ParkPrimary,
        ParkSecondary
    )
)

@Composable
fun ParkGolfTheme(
    darkTheme: Boolean = true, // Always use dark theme for this app
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ParkGolfTypography,
        shapes = ParkGolfShapes,
        content = content
    )
}
