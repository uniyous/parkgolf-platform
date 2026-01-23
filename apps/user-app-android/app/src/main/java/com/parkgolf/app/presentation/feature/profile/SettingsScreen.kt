package com.parkgolf.app.presentation.feature.profile

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * Settings Screen - iOS Style
 */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onNavigate: (String) -> Unit
) {
    var showDeleteAccountDialog by remember { mutableStateOf(false) }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "설정",
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
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Spacer(modifier = Modifier.height(8.dp))

                // App Info Section
                GlassCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    SettingsItem(
                        icon = Icons.Default.Info,
                        title = "앱 정보",
                        onClick = { onNavigate("settings/app_info") }
                    )
                }

                // Legal Section
                GlassCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    SettingsItem(
                        icon = Icons.Default.Description,
                        title = "이용약관",
                        onClick = { onNavigate("settings/terms") }
                    )

                    HorizontalDivider(color = GlassBorder)

                    SettingsItem(
                        icon = Icons.Default.PrivacyTip,
                        title = "개인정보처리방침",
                        onClick = { onNavigate("settings/privacy") }
                    )
                }

                // Danger Zone
                GlassCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    SettingsItem(
                        icon = Icons.Default.Delete,
                        title = "계정 삭제",
                        titleColor = ParkError,
                        iconTint = ParkError,
                        onClick = { showDeleteAccountDialog = true }
                    )
                }

                // Version Info
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "버전 1.0.0",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }

    // Delete Account Confirmation Dialog
    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountDialog = false },
            title = {
                Text(
                    text = "계정 삭제",
                    color = TextOnGradient
                )
            },
            text = {
                Text(
                    text = "정말 계정을 삭제하시겠습니까?\n삭제된 계정은 복구할 수 없습니다.",
                    color = TextOnGradientSecondary
                )
            },
            containerColor = Color(0xFF065F46),
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteAccountDialog = false
                        onNavigate("settings/delete_account")
                    }
                ) {
                    Text("삭제", color = ParkError)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountDialog = false }) {
                    Text("취소", color = TextOnGradient)
                }
            }
        )
    }
}

@Composable
private fun SettingsItem(
    icon: ImageVector,
    title: String,
    titleColor: Color = TextOnGradient,
    iconTint: Color = TextOnGradientSecondary,
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
            tint = iconTint,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = titleColor,
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = TextOnGradientSecondary
        )
    }
}
