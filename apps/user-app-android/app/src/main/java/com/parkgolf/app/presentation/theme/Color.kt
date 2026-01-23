package com.parkgolf.app.presentation.theme

import androidx.compose.ui.graphics.Color

/**
 * Park Golf iOS-style Color System
 *
 * iOS 앱과 동일한 다크 에메랄드 그라데이션 + 글래스 모피즘 스타일
 */

// ============================================
// Primary Colors (Emerald)
// ============================================
val ParkPrimary = Color(0xFF10B981)              // Emerald 500 - 메인 브랜드 색상
val ParkPrimaryDark = Color(0xFF059669)          // Emerald 600 - 버튼 그라데이션
val ParkPrimaryLight = Color(0xFF34D399)         // Emerald 400

// ============================================
// Accent Color (Amber - Premium)
// ============================================
val ParkAccent = Color(0xFFF59E0B)               // Amber 500 - 프리미엄, 하이라이트

// ============================================
// Semantic Colors
// ============================================
val ParkSuccess = Color(0xFF22C55E)              // Green 500
val ParkSuccessContainer = Color(0xFF22C55E).copy(alpha = 0.15f)
val ParkWarning = Color(0xFFEAB308)              // Yellow 500
val ParkWarningContainer = Color(0xFFEAB308).copy(alpha = 0.15f)
val ParkError = Color(0xFFEF4444)                // Red 500
val ParkErrorContainer = Color(0xFFEF4444).copy(alpha = 0.15f)
val ParkInfo = Color(0xFF3B82F6)                 // Blue 500
val ParkInfoContainer = Color(0xFF3B82F6).copy(alpha = 0.15f)

// ============================================
// Status Colors (Booking)
// ============================================
val StatusConfirmed = Color(0xFF22C55E)          // Green
val StatusConfirmedContainer = Color(0xFF22C55E).copy(alpha = 0.15f)
val StatusPending = Color(0xFFF59E0B)            // Amber
val StatusPendingContainer = Color(0xFFF59E0B).copy(alpha = 0.15f)
val StatusCancelled = Color(0xFFEF4444)          // Red
val StatusCancelledContainer = Color(0xFFEF4444).copy(alpha = 0.15f)
val StatusCompleted = Color(0xFF6B7280)          // Gray
val StatusCompletedContainer = Color(0xFF6B7280).copy(alpha = 0.15f)

// ============================================
// Background Gradient Colors (iOS Style)
// ============================================
val GradientStart = Color(0xFF065F46)            // Dark Emerald
val GradientMiddle = Color(0xFF047857)           // Emerald
val GradientEnd = Color(0xFF10B981)              // Light Emerald

// ============================================
// Glass Effect Colors (iOS Style)
// ============================================
val GlassBackground = Color.White.copy(alpha = 0.10f)
val GlassBorder = Color.White.copy(alpha = 0.20f)
val GlassCard = Color.White.copy(alpha = 0.15f)
val GlassCardHighlight = Color.White.copy(alpha = 0.20f)
val GlassInput = Color.White.copy(alpha = 0.10f)
val GlassInputFocused = Color.White.copy(alpha = 0.15f)

// ============================================
// Text Colors (On Dark/Gradient Background)
// ============================================
val TextOnGradient = Color.White                          // 100% 불투명
val TextOnGradientSecondary = Color.White.copy(alpha = 0.7f)  // 70% 불투명
val TextOnGradientTertiary = Color.White.copy(alpha = 0.5f)   // 50% 불투명
val TextOnGradientDisabled = Color.White.copy(alpha = 0.3f)   // 30% 불투명

// ============================================
// Social Login Colors
// ============================================
val AppleButtonBackground = Color.White
val AppleButtonText = Color.Black
val KakaoButtonBackground = Color(0xFFFEE500)
val KakaoButtonText = Color.Black.copy(alpha = 0.85f)

// ============================================
// Legacy/Material Theme Support
// ============================================
// Light Theme surfaces (for compatibility)
val SurfaceLight = Color(0xFFFAFAFA)
val SurfaceVariantLight = Color(0xFFF5F5F5)
val SurfaceContainerLight = Color(0xFFFFFFFF)

// Dark Theme surfaces
val SurfaceDark = Color(0xFF065F46)              // Match gradient start
val SurfaceVariantDark = GlassCard
val SurfaceContainerDark = GlassCard

// Text colors for theme
val TextPrimaryLight = Color(0xFF1F2937)
val TextSecondaryLight = Color(0xFF6B7280)
val TextPrimaryDark = Color.White
val TextSecondaryDark = Color.White.copy(alpha = 0.7f)

// Outline colors
val OutlineLight = Color(0xFFE5E7EB)
val OutlineDark = GlassBorder
val OutlineVariantLight = Color(0xFFF3F4F6)
val OutlineVariantDark = Color.White.copy(alpha = 0.1f)

// Container colors
val ParkPrimaryContainer = GlassCard
val ParkOnPrimaryContainer = Color.White
val ParkSecondaryContainer = GlassCard
val ParkOnSecondaryContainer = Color.White
val ParkTertiaryContainer = GlassCard
val ParkOnTertiaryContainer = Color.White
val ParkTertiary = ParkAccent

// ============================================
// Legacy Color Aliases (for compatibility with existing screens)
// ============================================
val ParkOnPrimary = Color.White
val TextSecondary = TextOnGradientSecondary
val TextPrimary = TextOnGradient
val TextTertiary = TextOnGradientTertiary
