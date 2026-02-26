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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ShieldMoon
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.components.GradientButtonStyle
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import com.parkgolf.app.presentation.theme.TextOnGradientTertiary
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val DELETION_REASONS = listOf(
    "더 이상 서비스를 이용하지 않아요",
    "다른 계정을 사용할 거예요",
    "개인정보가 걱정돼요",
    "서비스에 불만이 있어요",
    "기타"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit,
    viewModel: DeleteAccountViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.logoutComplete) {
        if (uiState.logoutComplete) {
            onLogout()
        }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "계정 삭제",
                            style = MaterialTheme.typography.titleLarge,
                            color = TextOnGradient,
                            fontWeight = FontWeight.SemiBold
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "뒤로가기",
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
            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = ParkPrimary)
                    }
                }
                uiState.status?.isDeletionRequested == true -> {
                    DeletionStatusContent(
                        modifier = Modifier.padding(innerPadding),
                        status = uiState.status!!,
                        isCancelling = uiState.isCancelling,
                        onCancel = viewModel::cancelDeletion,
                        onNavigateBack = onNavigateBack
                    )
                }
                else -> {
                    DeletionRequestForm(
                        modifier = Modifier.padding(innerPadding),
                        uiState = uiState,
                        onPasswordChange = viewModel::updatePassword,
                        onReasonChange = viewModel::updateReason,
                        onConfirmedChange = viewModel::updateConfirmed,
                        onSubmit = viewModel::requestDeletion,
                        onNavigateBack = onNavigateBack
                    )
                }
            }
        }
    }
}

@Composable
private fun DeletionStatusContent(
    modifier: Modifier = Modifier,
    status: com.parkgolf.app.domain.model.DeletionStatus,
    isCancelling: Boolean,
    onCancel: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(modifier = Modifier.height(4.dp))

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(ParkWarning.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AccessTime,
                        contentDescription = null,
                        tint = ParkWarning,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "삭제 예정",
                        color = TextOnGradient,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "계정 삭제가 진행 중입니다",
                        color = TextOnGradientSecondary,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Timeline info
            StatusRow(label = "요청일", value = formatDate(status.deletionRequestedAt))
            HorizontalDivider(color = GlassBorder, modifier = Modifier.padding(vertical = 8.dp))
            StatusRow(label = "삭제 예정일", value = formatDate(status.deletionScheduledAt))
            HorizontalDivider(color = GlassBorder, modifier = Modifier.padding(vertical = 8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "남은 기간",
                    color = TextOnGradientSecondary,
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "D-${status.daysRemaining ?: 0}",
                    color = ParkWarning,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Info box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(ParkPrimary.copy(alpha = 0.1f))
                    .padding(12.dp)
            ) {
                Text(
                    text = "삭제 예정일까지 로그인하거나 아래 버튼을 누르면 삭제가 취소됩니다.",
                    color = TextOnGradientSecondary,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        GradientButton(
            text = if (isCancelling) "취소 중..." else "계정 삭제 취소",
            onClick = onCancel,
            enabled = !isCancelling
        )

        TextButton(
            onClick = onNavigateBack,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "돌아가기",
                color = TextOnGradientSecondary
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun DeletionRequestForm(
    modifier: Modifier = Modifier,
    uiState: DeleteAccountUiState,
    onPasswordChange: (String) -> Unit,
    onReasonChange: (String) -> Unit,
    onConfirmedChange: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(modifier = Modifier.height(4.dp))

        // Warning card
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ParkError,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "주의사항",
                    color = ParkError,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))

            val warnings = listOf(
                "계정 삭제 요청 후 7일의 유예 기간이 있습니다",
                "유예 기간 내 로그인하면 삭제가 자동 취소됩니다",
                "삭제 후 예약 내역, 채팅, 친구 등 모든 데이터가 삭제됩니다",
                "삭제된 계정은 복구할 수 없습니다"
            )
            warnings.forEach { warning ->
                WarningRow(text = warning)
                Spacer(modifier = Modifier.height(6.dp))
            }
        }

        // Reason card
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "삭제 사유 (선택)",
                color = TextOnGradient,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            DELETION_REASONS.forEach { reason ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (uiState.reason == reason) ParkPrimary.copy(alpha = 0.1f)
                            else Color.Transparent
                        )
                        .clickable { onReasonChange(reason) }
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = uiState.reason == reason,
                        onClick = { onReasonChange(reason) },
                        colors = RadioButtonDefaults.colors(
                            selectedColor = ParkPrimary,
                            unselectedColor = TextOnGradientTertiary
                        )
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = reason,
                        color = TextOnGradient,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        // Password card
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "본인 확인",
                color = TextOnGradient,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "계정 삭제를 위해 비밀번호를 입력해 주세요.",
                color = TextOnGradientSecondary,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.height(12.dp))

            GlassTextField(
                value = uiState.password,
                onValueChange = onPasswordChange,
                label = "비밀번호 입력",
                leadingIcon = Icons.Default.Lock,
                isPassword = true
            )
        }

        // Confirmation checkbox
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onConfirmedChange(!uiState.confirmed) }
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.Top
        ) {
            Checkbox(
                checked = uiState.confirmed,
                onCheckedChange = onConfirmedChange,
                colors = CheckboxDefaults.colors(
                    checkedColor = ParkError,
                    uncheckedColor = TextOnGradientTertiary,
                    checkmarkColor = Color.White
                )
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "위 내용을 확인했으며, 계정 삭제를 요청합니다. 7일 후 모든 데이터가 영구 삭제됨을 이해합니다.",
                color = TextOnGradientSecondary,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 12.dp)
            )
        }

        // Submit button
        GradientButton(
            text = if (uiState.isSubmitting) "처리 중..." else "계정 삭제 요청",
            onClick = onSubmit,
            enabled = uiState.canSubmit,
            isLoading = uiState.isSubmitting,
            style = GradientButtonStyle.Destructive
        )

        TextButton(
            onClick = onNavigateBack,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "돌아가기",
                color = TextOnGradientSecondary
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun StatusRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = TextOnGradientSecondary,
            style = MaterialTheme.typography.bodyMedium
        )
        Text(
            text = value,
            color = TextOnGradient,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun WarningRow(text: String) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(
            imageVector = Icons.Default.ShieldMoon,
            contentDescription = null,
            tint = ParkError,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = text,
            color = TextOnGradientSecondary,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

private fun formatDate(dateString: String?): String {
    if (dateString == null) return "-"
    return try {
        val date = LocalDate.parse(dateString.substring(0, 10))
        date.format(DateTimeFormatter.ofPattern("yyyy년 M월 d일"))
    } catch (_: Exception) {
        dateString
    }
}
