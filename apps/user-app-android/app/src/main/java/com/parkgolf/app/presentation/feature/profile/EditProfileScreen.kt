package com.parkgolf.app.presentation.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.feature.auth.AuthViewModel
import com.parkgolf.app.presentation.theme.GradientEnd
import com.parkgolf.app.presentation.theme.GradientStart
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import com.parkgolf.app.util.formatPhoneNumber

/**
 * Edit Profile Screen - iOS Style
 */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    onNavigateBack: () -> Unit,
    viewModel: EditProfileViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val authState by authViewModel.uiState.collectAsState()

    var name by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }

    // Fetch fresh profile data on screen load
    LaunchedEffect(Unit) {
        authViewModel.refreshProfile()
    }

    // Initialize with current user data
    LaunchedEffect(authState.user) {
        authState.user?.let { user ->
            name = user.name
            phoneNumber = (user.phoneNumber ?: "").formatPhoneNumber()
        }
    }

    // Handle success
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            authViewModel.refreshProfile()
            viewModel.resetState()
            onNavigateBack()
        }
    }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "프로필 수정",
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
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(24.dp))

                    // Avatar with edit badge
                    Box {
                        Box(
                            modifier = Modifier
                                .size(100.dp)
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
                                style = MaterialTheme.typography.displaySmall,
                                color = TextOnGradient
                            )
                        }

                        // Camera badge
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .align(Alignment.BottomEnd)
                                .offset(x = 4.dp, y = 4.dp)
                                .clip(CircleShape)
                                .background(ParkPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = "Change photo",
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    // Form Card
                    GlassCard(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Name field
                        Column {
                            Text(
                                text = "이름",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextOnGradientSecondary,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            GlassTextField(
                                value = name,
                                onValueChange = { name = it },
                                label = "이름을 입력하세요",
                                leadingIcon = Icons.Default.Person
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Email field (read-only)
                        Column {
                            Text(
                                text = "이메일",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextOnGradientSecondary,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            GlassTextField(
                                value = authState.user?.email ?: "",
                                onValueChange = { },
                                label = "이메일",
                                leadingIcon = Icons.Default.Email,
                                enabled = false
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Phone number field
                        Column {
                            Text(
                                text = "휴대폰 번호",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextOnGradientSecondary,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            GlassTextField(
                                value = phoneNumber,
                                onValueChange = { newValue ->
                                    // 숫자와 하이픈만 허용, 최대 13자 (010-0000-0000)
                                    val filtered = newValue.filter { it.isDigit() || it == '-' }
                                    if (filtered.length <= 13) {
                                        phoneNumber = filtered.formatPhoneNumber()
                                    }
                                },
                                label = "010-0000-0000",
                                leadingIcon = Icons.Default.Phone
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Save button
                    GradientButton(
                        text = "저장하기",
                        onClick = {
                            viewModel.updateProfile(
                                name = name.takeIf { it != authState.user?.name },
                                phoneNumber = phoneNumber.takeIf { it != authState.user?.phoneNumber }
                            )
                        },
                        enabled = name.isNotBlank() && !uiState.isLoading,
                        isLoading = uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(32.dp))
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
