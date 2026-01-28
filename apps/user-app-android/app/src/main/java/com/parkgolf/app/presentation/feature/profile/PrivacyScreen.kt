package com.parkgolf.app.presentation.feature.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.TextOnGradient

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyScreen(
    onNavigateBack: () -> Unit
) {
    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "개인정보처리방침",
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
                EmptyStateView(
                    icon = Icons.Default.PrivacyTip,
                    title = "개인정보처리방침 준비 중",
                    description = "개인정보처리방침 콘텐츠는 곧 제공될 예정입니다"
                )
            }
        }
    }
}
