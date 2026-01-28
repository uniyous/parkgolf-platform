package com.parkgolf.app.presentation.feature.profile

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.ParkAccent
import com.parkgolf.app.presentation.theme.ParkInfo
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * Notification Settings Screen - iOS Style
 */

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun NotificationSettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: NotificationSettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Check system notification permission
    var systemNotificationEnabled by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        systemNotificationEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        viewModel.loadSettings()
    }

    // POST_NOTIFICATIONS permission (Android 13+)
    val notificationPermissionState = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
    } else {
        null
    }

    // Update system permission state
    LaunchedEffect(notificationPermissionState?.status?.isGranted) {
        systemNotificationEnabled = notificationPermissionState?.status?.isGranted
            ?: NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "알림 설정",
                            style = MaterialTheme.typography.titleLarge,
                            color = TextOnGradient,
                            fontWeight = FontWeight.SemiBold
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = TextOnGradient
                            )
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = Color.Transparent
                    )
                )
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (uiState.isLoading) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = ParkPrimary)
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Spacer(modifier = Modifier.height(8.dp))

                        // System notification permission banner
                        if (!systemNotificationEnabled) {
                            SystemPermissionBanner(
                                onOpenSettings = {
                                    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                                    }
                                    context.startActivity(intent)
                                }
                            )
                        }

                        // Service notifications section
                        ServiceNotificationSection(
                            settings = uiState.settings,
                            isDisabled = !systemNotificationEnabled,
                            onBookingChange = { viewModel.updateBooking(it) },
                            onChatChange = { viewModel.updateChat(it) },
                            onFriendChange = { viewModel.updateFriend(it) }
                        )

                        // Marketing notification section
                        MarketingNotificationSection(
                            settings = uiState.settings,
                            isDisabled = !systemNotificationEnabled,
                            onMarketingChange = { viewModel.updateMarketing(it) }
                        )

                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }

                // Error Snackbar
                uiState.error?.let { error ->
                    Snackbar(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(16.dp),
                        action = {
                            TextButton(onClick = { viewModel.clearError() }) {
                                Text("확인", color = TextOnGradient)
                            }
                        },
                        containerColor = Color(0xFFEF4444).copy(alpha = 0.9f),
                        contentColor = Color.White
                    ) {
                        Text(error)
                    }
                }
            }
        }
    }
}

@Composable
private fun SystemPermissionBanner(
    onOpenSettings: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = ParkWarning,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "알림 권한이 꺼져있습니다",
                style = MaterialTheme.typography.titleSmall,
                color = TextOnGradient,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "알림을 받으려면 시스템 설정에서 알림을 허용해주세요.",
            style = MaterialTheme.typography.bodySmall,
            color = TextOnGradientSecondary
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = onOpenSettings,
            colors = ButtonDefaults.buttonColors(
                containerColor = ParkPrimary
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("설정으로 이동")
        }
    }
}

@Composable
private fun ServiceNotificationSection(
    settings: com.parkgolf.app.data.remote.dto.settings.NotificationSettings,
    isDisabled: Boolean,
    onBookingChange: (Boolean) -> Unit,
    onChatChange: (Boolean) -> Unit,
    onFriendChange: (Boolean) -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        SectionHeader(
            icon = Icons.Default.Notifications,
            title = "서비스 알림"
        )

        Spacer(modifier = Modifier.height(16.dp))

        NotificationToggleRow(
            icon = Icons.Default.CalendarMonth,
            iconColor = ParkPrimary,
            title = "예약 알림",
            description = "예약 확정, 취소, 리마인더",
            isOn = settings.booking,
            isDisabled = isDisabled,
            onToggle = onBookingChange
        )

        HorizontalDivider(
            color = GlassBorder,
            modifier = Modifier.padding(vertical = 12.dp)
        )

        NotificationToggleRow(
            icon = Icons.Default.Chat,
            iconColor = ParkInfo,
            title = "채팅 알림",
            description = "새 메시지 알림",
            isOn = settings.chat,
            isDisabled = isDisabled,
            onToggle = onChatChange
        )

        HorizontalDivider(
            color = GlassBorder,
            modifier = Modifier.padding(vertical = 12.dp)
        )

        NotificationToggleRow(
            icon = Icons.Default.People,
            iconColor = ParkAccent,
            title = "친구 알림",
            description = "친구 요청, 수락 알림",
            isOn = settings.friend,
            isDisabled = isDisabled,
            onToggle = onFriendChange
        )
    }
}

@Composable
private fun MarketingNotificationSection(
    settings: com.parkgolf.app.data.remote.dto.settings.NotificationSettings,
    isDisabled: Boolean,
    onMarketingChange: (Boolean) -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        SectionHeader(
            icon = Icons.Default.LocalOffer,
            title = "마케팅"
        )

        Spacer(modifier = Modifier.height(16.dp))

        NotificationToggleRow(
            icon = Icons.Default.LocalOffer,
            iconColor = ParkWarning,
            title = "마케팅 알림",
            description = "이벤트, 프로모션 정보",
            isOn = settings.marketing,
            isDisabled = isDisabled,
            onToggle = onMarketingChange
        )
    }
}

@Composable
private fun SectionHeader(
    icon: ImageVector,
    title: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = TextOnGradient,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = TextOnGradient,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun NotificationToggleRow(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    description: String,
    isOn: Boolean,
    isDisabled: Boolean,
    onToggle: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(
                    color = iconColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(10.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = if (isDisabled) TextOnGradientSecondary else TextOnGradient,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = TextOnGradientSecondary
            )
        }

        Switch(
            checked = isOn,
            onCheckedChange = { onToggle(it) },
            enabled = !isDisabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = ParkPrimary,
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = GlassBorder,
                disabledCheckedTrackColor = ParkPrimary.copy(alpha = 0.5f),
                disabledUncheckedTrackColor = GlassBorder.copy(alpha = 0.5f)
            )
        )
    }
}
