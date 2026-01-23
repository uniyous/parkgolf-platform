package com.parkgolf.app.presentation.feature.auth

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.R
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GlassCard as GlassCardColor
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * Login Screen - iOS Style
 *
 * 에메랄드 그라데이션 배경 + 글래스 모피즘 스타일
 */

// Test User Data Class
data class TestUser(
    val email: String,
    val password: String,
    val name: String,
    val role: String
) {
    companion object {
        val allUsers = listOf(
            TestUser(
                email = "test@parkgolf.com",
                password = "test1234",
                name = "테스트사용자",
                role = "USER"
            ),
            TestUser(
                email = "kim@parkgolf.com",
                password = "test1234",
                name = "김철수",
                role = "USER"
            ),
            TestUser(
                email = "park@parkgolf.com",
                password = "test1234",
                name = "박영희",
                role = "USER"
            ),
            TestUser(
                email = "lee@parkgolf.com",
                password = "test1234",
                name = "이민수",
                role = "USER"
            )
        )
    }
}

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToSignUp: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val isFormValid = email.isNotBlank() && password.isNotBlank() && email.contains("@")

    // 로그인 성공 시 화면 전환
    LaunchedEffect(uiState.loginSuccess) {
        if (uiState.loginSuccess) {
            viewModel.resetLoginSuccess()
            onLoginSuccess()
        }
    }

    GradientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(60.dp))

                // Logo Section - ParkMate Brand Icon
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .background(
                            color = Color.White.copy(alpha = 0.2f),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_parkmate_logo),
                        contentDescription = "ParkMate Logo",
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "ParkMate",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextOnGradient
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "친구와 함께하는 파크골프",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextOnGradientSecondary
                )

                Spacer(modifier = Modifier.height(48.dp))

                // Login Form - Glass Card
                GlassCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "로그인",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    GlassTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = "이메일"
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    GlassTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "비밀번호",
                        isPassword = true
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Forgot Password
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { /* TODO */ }) {
                            Text(
                                text = "비밀번호를 잊으셨나요?",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextOnGradientSecondary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    GradientButton(
                        text = "로그인",
                        onClick = { viewModel.login(email, password) },
                        enabled = isFormValid && !uiState.isLoading,
                        isLoading = uiState.isLoading
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Sign Up Link
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "계정이 없으신가요?",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextOnGradientSecondary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    TextButton(onClick = onNavigateToSignUp) {
                        Text(
                            text = "회원가입",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = TextOnGradient
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Divider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = GlassBorder
                    )
                    Text(
                        text = "또는",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = GlassBorder
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Test Users Section
                TestUsersSection(
                    onUserSelected = { testUser ->
                        email = testUser.email
                        password = testUser.password
                    }
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

@Composable
private fun TestUsersSection(
    onUserSelected: (TestUser) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "테스트 계정",
            style = MaterialTheme.typography.titleSmall,
            color = TextOnGradientSecondary,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.height(200.dp)
        ) {
            items(TestUser.allUsers) { user ->
                TestUserCard(
                    user = user,
                    onClick = { onUserSelected(user) }
                )
            }
        }
    }
}

@Composable
private fun TestUserCard(
    user: TestUser,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        contentPadding = 12.dp,
        cornerRadius = 12.dp
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(GlassCardColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = TextOnGradient,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Name
            Text(
                text = user.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = TextOnGradient
            )

            // Email
            Text(
                text = user.email,
                style = MaterialTheme.typography.bodySmall,
                color = TextOnGradientSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
