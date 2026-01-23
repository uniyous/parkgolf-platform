package com.parkgolf.app.presentation.feature.profile

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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkInfo
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkSuccess
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * Change Password Screen - iOS Style
 */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangePasswordScreen(
    onNavigateBack: () -> Unit,
    viewModel: ChangePasswordViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showSuccessDialog by remember { mutableStateOf(false) }

    // Handle success
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            showSuccessDialog = true
        }
    }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "비밀번호 변경",
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
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Spacer(modifier = Modifier.height(8.dp))

                    // Password Policy Card
                    PasswordPolicyCard()

                    // Password Form Card
                    GlassCard(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Current password
                        Column {
                            Text(
                                text = "현재 비밀번호",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextOnGradientSecondary,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            GlassTextField(
                                value = uiState.currentPassword,
                                onValueChange = { viewModel.updateCurrentPassword(it) },
                                label = "현재 비밀번호 입력",
                                leadingIcon = Icons.Default.Lock,
                                isPassword = true
                            )
                        }

                        HorizontalDivider(
                            color = GlassBorder,
                            modifier = Modifier.padding(vertical = 16.dp)
                        )

                        // New password
                        Column {
                            Text(
                                text = "새 비밀번호",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextOnGradientSecondary,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            GlassTextField(
                                value = uiState.newPassword,
                                onValueChange = { viewModel.updateNewPassword(it) },
                                label = "새 비밀번호 입력",
                                leadingIcon = Icons.Default.Lock,
                                isPassword = true
                            )

                            // Password strength indicator
                            if (uiState.newPassword.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                PasswordStrengthIndicator(strength = uiState.passwordStrength)
                            }

                            // Validation errors
                            uiState.validationErrors.forEach { error ->
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = null,
                                        tint = ParkError,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = error,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = ParkError
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Confirm password
                        Column {
                            Text(
                                text = "새 비밀번호 확인",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextOnGradientSecondary,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            GlassTextField(
                                value = uiState.confirmPassword,
                                onValueChange = { viewModel.updateConfirmPassword(it) },
                                label = "새 비밀번호 다시 입력",
                                leadingIcon = Icons.Default.Lock,
                                isPassword = true
                            )

                            // Password match indicator
                            if (uiState.confirmPassword.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = if (uiState.passwordsMatch) Icons.Default.Check else Icons.Default.Close,
                                        contentDescription = null,
                                        tint = if (uiState.passwordsMatch) ParkSuccess else ParkError,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (uiState.passwordsMatch) "비밀번호가 일치합니다" else "비밀번호가 일치하지 않습니다",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (uiState.passwordsMatch) ParkSuccess else ParkError
                                    )
                                }
                            }
                        }
                    }

                    // Change button
                    GradientButton(
                        text = "비밀번호 변경",
                        onClick = { viewModel.changePassword() },
                        enabled = uiState.canSubmit && !uiState.isLoading,
                        isLoading = uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))
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

    // Success Dialog
    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = { },
            title = {
                Text(
                    text = "비밀번호 변경 완료",
                    color = TextOnGradient
                )
            },
            text = {
                Text(
                    text = "비밀번호가 성공적으로 변경되었습니다.\n보안을 위해 다시 로그인해 주세요.",
                    color = TextOnGradientSecondary
                )
            },
            containerColor = Color(0xFF065F46),
            confirmButton = {
                TextButton(
                    onClick = {
                        showSuccessDialog = false
                        viewModel.resetState()
                        onNavigateBack()
                    }
                ) {
                    Text("확인", color = ParkPrimary)
                }
            }
        )
    }
}

@Composable
private fun PasswordPolicyCard() {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = ParkInfo,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "비밀번호 정책",
                style = MaterialTheme.typography.titleSmall,
                color = TextOnGradient,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        PolicyItem(text = "8자 이상 128자 이하")
        Spacer(modifier = Modifier.height(4.dp))
        PolicyItem(text = "영문, 숫자, 특수문자 조합")
        Spacer(modifier = Modifier.height(4.dp))
        PolicyItem(text = "현재 비밀번호와 다르게 설정")
    }
}

@Composable
private fun PolicyItem(text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.Check,
            contentDescription = null,
            tint = ParkSuccess.copy(alpha = 0.8f),
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = TextOnGradientSecondary
        )
    }
}

@Composable
private fun PasswordStrengthIndicator(strength: PasswordStrength) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        // Strength bars
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.weight(1f)
        ) {
            repeat(4) { index ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .background(
                            color = if (index < strength.level) strength.color else GlassBorder,
                            shape = RoundedCornerShape(2.dp)
                        )
                )
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        Text(
            text = strength.label,
            style = MaterialTheme.typography.bodySmall,
            color = strength.color
        )
    }
}

enum class PasswordStrength(val level: Int, val label: String, val color: Color) {
    WEAK(1, "약함", ParkError),
    FAIR(2, "보통", ParkWarning),
    GOOD(3, "좋음", ParkInfo),
    STRONG(4, "강함", ParkSuccess)
}
