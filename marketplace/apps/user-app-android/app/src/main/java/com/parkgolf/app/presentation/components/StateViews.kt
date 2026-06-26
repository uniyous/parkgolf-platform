package com.parkgolf.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Park Golf State View Components
 *
 * 로딩, 에러, 빈 상태 등 다양한 상태 표시 컴포넌트
 */

// ============================================
// Loading View
// ============================================
@Composable
fun LoadingView(
    modifier: Modifier = Modifier,
    message: String? = null
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(48.dp),
                color = MaterialTheme.colorScheme.primary,
                strokeWidth = 4.dp
            )
            if (message != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// ============================================
// Compact Loading (인라인 로딩)
// ============================================
@Composable
fun CompactLoading(
    modifier: Modifier = Modifier,
    message: String = "로딩 중..."
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(32.dp),
                color = MaterialTheme.colorScheme.primary,
                strokeWidth = 3.dp
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ============================================
// Error View
// ============================================
@Composable
fun ErrorView(
    modifier: Modifier = Modifier,
    title: String = "오류가 발생했습니다",
    message: String? = null,
    icon: ImageVector = Icons.Filled.Error,
    onRetry: (() -> Unit)? = null
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Icon with background
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = MaterialTheme.colorScheme.error
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )

            if (message != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }

            if (onRetry != null) {
                Spacer(modifier = Modifier.height(24.dp))
                ParkTonalButton(
                    text = "다시 시도",
                    onClick = onRetry,
                    modifier = Modifier.fillMaxWidth(0.6f)
                )
            }
        }
    }
}

// ============================================
// Network Error View
// ============================================
@Composable
fun NetworkErrorView(
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null
) {
    ErrorView(
        modifier = modifier,
        title = "네트워크 연결 오류",
        message = "인터넷 연결을 확인하고 다시 시도해주세요",
        icon = Icons.Filled.WifiOff,
        onRetry = onRetry
    )
}

// ============================================
// Server Error View
// ============================================
@Composable
fun ServerErrorView(
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null
) {
    ErrorView(
        modifier = modifier,
        title = "서버 오류",
        message = "잠시 후 다시 시도해주세요",
        icon = Icons.Filled.CloudOff,
        onRetry = onRetry
    )
}

// ============================================
// Empty State View (개선된 버전)
// ============================================
@Composable
fun EmptyStateView(
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Filled.Inbox,
    title: String,
    message: String? = null,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Icon with background
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )

            if (message != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }

            if (actionText != null && onAction != null) {
                Spacer(modifier = Modifier.height(24.dp))
                ParkButton(
                    text = actionText,
                    onClick = onAction,
                    modifier = Modifier.fillMaxWidth(0.6f)
                )
            }
        }
    }
}

// ============================================
// Search Empty State
// ============================================
@Composable
fun SearchEmptyView(
    modifier: Modifier = Modifier,
    searchQuery: String = ""
) {
    EmptyStateView(
        modifier = modifier,
        icon = Icons.Filled.SearchOff,
        title = "검색 결과가 없습니다",
        message = if (searchQuery.isNotEmpty()) {
            "'$searchQuery'에 대한 검색 결과가 없습니다.\n다른 검색어로 시도해보세요."
        } else {
            "검색어를 입력해주세요"
        }
    )
}

// ============================================
// List Empty State
// ============================================
@Composable
fun ListEmptyView(
    modifier: Modifier = Modifier,
    title: String = "목록이 비어있습니다",
    message: String? = null,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    EmptyStateView(
        modifier = modifier,
        icon = Icons.Filled.Inbox,
        title = title,
        message = message,
        actionText = actionText,
        onAction = onAction
    )
}
