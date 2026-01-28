package com.parkgolf.app.presentation.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.theme.ParkBackgroundGradient
import com.parkgolf.app.presentation.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpScreen(
    onSignUpSuccess: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    val isFormValid = email.isNotBlank() &&
            email.contains("@") &&
            password.length >= 8 &&
            password == confirmPassword &&
            name.isNotBlank()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ParkBackgroundGradient)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Top App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "회원가입",
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "ParkMate에 가입하고\n새로운 파크골프 경험을 시작하세요",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(24.dp))

                GlassCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    GlassTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = "이메일",
                        leadingIcon = Icons.Default.Email,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    GlassTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = "이름",
                        leadingIcon = Icons.Default.Person,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    GlassTextField(
                        value = phoneNumber,
                        onValueChange = { phoneNumber = it },
                        label = "전화번호 (선택)",
                        leadingIcon = Icons.Default.Phone,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Phone,
                            imeAction = ImeAction.Next
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    GlassTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "비밀번호",
                        leadingIcon = Icons.Default.Lock,
                        isPassword = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "8자 이상, 영문/숫자/특수문자 포함",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    GlassTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = "비밀번호 확인",
                        leadingIcon = Icons.Default.Lock,
                        isPassword = true,
                        isError = confirmPassword.isNotEmpty() && password != confirmPassword,
                        errorMessage = if (confirmPassword.isNotEmpty() && password != confirmPassword) "비밀번호가 일치하지 않습니다" else null,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        )
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    GradientButton(
                        text = "가입하기",
                        onClick = {
                            isLoading = true
                            // TODO: Implement actual signup
                            onSignUpSuccess()
                        },
                        enabled = isFormValid,
                        isLoading = isLoading
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
