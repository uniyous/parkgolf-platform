package com.parkgolf.app.presentation.feature.profile

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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

/**
 * AI 비서 메모리 프라이버시 설정 (Phase 3 — UNI-20)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentMemorySettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: AgentMemorySettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "AI 메모리 설정",
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
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                )
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (uiState.isLoading && uiState.status == null) {
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

                        // 설명 카드
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = null,
                                    tint = ParkPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "AI 비서 메모리",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = TextOnGradient,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "자주 가는 골프장, 함께하는 멤버, 선호 시간대를 기억해서 더 빠른 추천을 받을 수 있어요.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextOnGradientSecondary
                            )
                        }

                        // 토글 카드
                        uiState.status?.let { status ->
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "개인화 추천 사용",
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = TextOnGradient,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = if (status.enabled) "\"지난번처럼\" 한 마디로 부킹"
                                            else "AI가 과거 패턴을 사용하지 않음",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextOnGradientSecondary
                                        )
                                    }
                                    Switch(
                                        checked = status.enabled,
                                        onCheckedChange = { viewModel.setEnabled(it) },
                                        enabled = !uiState.isUpdating,
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = Color.White,
                                            checkedTrackColor = ParkPrimary,
                                            uncheckedThumbColor = Color.White,
                                            uncheckedTrackColor = GlassBorder
                                        )
                                    )
                                }
                            }

                            // 현재 기억 중인 내용
                            val summary = status.summary
                            if (status.hasMemory && status.enabled && !summary.isNullOrBlank()) {
                                GlassCard(modifier = Modifier.fillMaxWidth()) {
                                    Text(
                                        text = "현재 기억 중인 내용",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextOnGradient,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = summary,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = TextOnGradientSecondary
                                    )
                                    val clubs = status.favoriteClubsCount
                                    val teammates = status.frequentTeammatesCount
                                    if (clubs != null && teammates != null) {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "자주 가는 클럽 ${clubs}곳 · 자주 함께하는 멤버 ${teammates}명",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextOnGradientSecondary
                                        )
                                    }
                                }
                            }

                            // 안내
                            Column(modifier = Modifier.padding(horizontal = 4.dp)) {
                                Text(
                                    text = "• OFF로 두시면 AI가 과거 부킹 패턴을 추천에 사용하지 않습니다.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextOnGradientSecondary
                                )
                                Text(
                                    text = "• 계정 삭제 시 메모리 데이터도 함께 삭제됩니다.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextOnGradientSecondary
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }

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
