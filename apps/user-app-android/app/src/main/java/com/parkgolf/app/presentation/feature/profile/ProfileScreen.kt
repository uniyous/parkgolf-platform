package com.parkgolf.app.presentation.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.components.GradientButtonStyle
import com.parkgolf.app.presentation.feature.auth.AuthViewModel
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GradientEnd
import com.parkgolf.app.presentation.theme.ParkAccent
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkInfo
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkSuccess
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * Profile Screen - iOS Style
 *
 * iOS 앱과 동일한 구성: 프로필 헤더, 통계 카드, 계정/앱설정/지원 섹션
 */

@Composable
fun ProfileScreen(
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    profileViewModel: ProfileViewModel = hiltViewModel()
) {
    val authState by authViewModel.uiState.collectAsState()
    val profileState by profileViewModel.uiState.collectAsState()
    var showLogoutDialog by remember { mutableStateOf(false) }

    // 로그아웃 완료 시 화면 전환
    LaunchedEffect(authState.isLoggedIn) {
        if (!authState.isLoggedIn && authState.user == null) {
            onLogout()
        }
    }

    GradientBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Text(
                text = "마이페이지",
                style = MaterialTheme.typography.headlineMedium,
                color = TextOnGradient,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp)
            )

            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Profile Header Card
                ProfileHeaderCard(
                    name = authState.user?.name ?: "사용자",
                    email = authState.user?.email ?: "",
                    onEditClick = { onNavigate("profile/edit") }
                )

                // Stats Card
                StatsCard(
                    totalRounds = profileState.stats?.totalBookings ?: 0,
                    friendsCount = profileState.stats?.friendsCount ?: 0,
                    achievementCount = 0 // TODO: Add achievements
                )

                // 계정 섹션
                AccountSection(onNavigate = onNavigate)

                // 앱 설정 섹션
                AppSettingsSection(onNavigate = onNavigate)

                // 지원 섹션
                SupportSection(onNavigate = onNavigate)

                // 로그아웃 버튼
                GradientButton(
                    text = "로그아웃",
                    onClick = { showLogoutDialog = true },
                    style = GradientButtonStyle.Destructive
                )

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    // Logout Confirmation Dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("로그아웃", color = TextOnGradient) },
            text = { Text("정말 로그아웃 하시겠습니까?", color = TextOnGradientSecondary) },
            containerColor = Color(0xFF065F46),
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        authViewModel.logout()
                    }
                ) {
                    Text("로그아웃", color = ParkError)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("취소", color = TextOnGradient)
                }
            }
        )
    }
}

// MARK: - Profile Header Card

@Composable
private fun ProfileHeaderCard(
    name: String,
    email: String,
    onEditClick: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar with gradient
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(ParkPrimary, GradientEnd)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = name.firstOrNull()?.toString() ?: "U",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextOnGradient
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleLarge,
                    color = TextOnGradient,
                    fontWeight = FontWeight.SemiBold
                )

                Text(
                    text = email,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnGradientSecondary
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Membership Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(
                            color = ParkAccent.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = ParkAccent,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "일반 회원",
                        style = MaterialTheme.typography.labelSmall,
                        color = ParkAccent
                    )
                }
            }

            // Edit button
            IconButton(onClick = onEditClick) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "Edit Profile",
                    tint = ParkPrimary,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

// MARK: - Stats Card

@Composable
private fun StatsCard(
    totalRounds: Int,
    friendsCount: Int,
    achievementCount: Int
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = 12.dp
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            StatItem(
                icon = Icons.Default.CalendarMonth,
                value = totalRounds.toString(),
                label = "총 라운드"
            )

            VerticalDivider(
                modifier = Modifier.height(40.dp),
                color = TextOnGradientSecondary.copy(alpha = 0.2f)
            )

            StatItem(
                icon = Icons.Default.People,
                value = friendsCount.toString(),
                label = "친구"
            )

            VerticalDivider(
                modifier = Modifier.height(40.dp),
                color = TextOnGradientSecondary.copy(alpha = 0.2f)
            )

            StatItem(
                icon = Icons.Default.EmojiEvents,
                value = achievementCount.toString(),
                label = "업적"
            )
        }
    }
}

@Composable
private fun StatItem(
    icon: ImageVector,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(horizontal = 16.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = ParkPrimary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            color = TextOnGradient,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextOnGradientSecondary
        )
    }
}

// MARK: - Account Section

@Composable
private fun AccountSection(onNavigate: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            icon = Icons.Default.People,
            title = "계정"
        )

        Spacer(modifier = Modifier.height(8.dp))

        ProfileMenuItem(
            icon = Icons.Default.CalendarMonth,
            iconColor = ParkPrimary,
            title = "예약 내역",
            onClick = { onNavigate("my_bookings") }
        )

        ProfileMenuItem(
            icon = Icons.Default.CreditCard,
            iconColor = ParkAccent,
            title = "결제 수단",
            onClick = { onNavigate("settings/payment") }
        )

        ProfileMenuItem(
            icon = Icons.Default.Key,
            iconColor = ParkWarning,
            title = "비밀번호 변경",
            onClick = { onNavigate("settings/change_password") }
        )

        ProfileMenuItem(
            icon = Icons.Default.Delete,
            iconColor = ParkError,
            title = "계정 삭제",
            onClick = { onNavigate("settings/delete_account") }
        )
    }
}

// MARK: - App Settings Section

@Composable
private fun AppSettingsSection(onNavigate: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            icon = Icons.Default.Info,
            title = "앱 설정"
        )

        Spacer(modifier = Modifier.height(8.dp))

        ProfileMenuItem(
            icon = Icons.Default.Notifications,
            iconColor = ParkError,
            title = "알림 설정",
            onClick = { onNavigate("settings/notifications") }
        )

        ProfileMenuItem(
            icon = Icons.Default.DarkMode,
            iconColor = Color(0xFF9333EA), // Purple
            title = "테마",
            onClick = { onNavigate("settings/theme") }
        )

        ProfileMenuItem(
            icon = Icons.Default.Language,
            iconColor = ParkSuccess,
            title = "언어",
            onClick = { onNavigate("settings/language") }
        )
    }
}

// MARK: - Support Section

@Composable
private fun SupportSection(onNavigate: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            icon = Icons.Default.HelpOutline,
            title = "지원"
        )

        Spacer(modifier = Modifier.height(8.dp))

        ProfileMenuItem(
            icon = Icons.Default.Campaign,
            iconColor = ParkInfo,
            title = "공지사항",
            onClick = { onNavigate("settings/announcements") }
        )

        ProfileMenuItem(
            icon = Icons.Default.HelpOutline,
            iconColor = ParkPrimary,
            title = "자주 묻는 질문",
            onClick = { onNavigate("settings/faq") }
        )

        ProfileMenuItem(
            icon = Icons.Default.Email,
            iconColor = ParkAccent,
            title = "문의하기",
            onClick = { onNavigate("settings/contact") }
        )

        ProfileMenuItem(
            icon = Icons.Default.Description,
            iconColor = ParkInfo,
            title = "이용약관",
            onClick = { onNavigate("settings/terms") }
        )

        ProfileMenuItem(
            icon = Icons.Default.PrivacyTip,
            iconColor = ParkWarning,
            title = "개인정보처리방침",
            onClick = { onNavigate("settings/privacy") }
        )

        // Version row (no navigation)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = TextOnGradientSecondary.copy(alpha = 0.5f),
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = "버전",
                style = MaterialTheme.typography.bodyLarge,
                color = TextOnGradient,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "1.0.0",
                style = MaterialTheme.typography.bodyLarge,
                color = TextOnGradientSecondary.copy(alpha = 0.5f)
            )
        }
    }
}

// MARK: - Section Header

@Composable
private fun SectionHeader(
    icon: ImageVector,
    title: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(bottom = 4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = ParkPrimary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = TextOnGradient,
            fontWeight = FontWeight.SemiBold
        )
    }
}

// MARK: - Profile Menu Item

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = TextOnGradient,
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = TextOnGradientSecondary.copy(alpha = 0.3f),
            modifier = Modifier.size(16.dp)
        )
    }
}
