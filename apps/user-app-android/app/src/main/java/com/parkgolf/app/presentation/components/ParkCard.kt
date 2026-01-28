package com.parkgolf.app.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Park Golf Material Design 3 Card Components
 *
 * 세련된 Android 네이티브 카드 스타일
 */

// ============================================
// Elevated Card (Primary - 그림자 있음)
// ============================================
@Composable
fun ParkCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    ElevatedCard(
        modifier = modifier.then(
            if (onClick != null) Modifier.clickable { onClick() } else Modifier
        ),
        elevation = CardDefaults.elevatedCardElevation(
            defaultElevation = 2.dp,
            pressedElevation = 4.dp
        ),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

// ============================================
// Filled Card (Tonal - Primary Container 색상)
// ============================================
@Composable
fun ParkFilledCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    containerColor: Color = MaterialTheme.colorScheme.primaryContainer,
    contentColor: Color = MaterialTheme.colorScheme.onPrimaryContainer,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.then(
            if (onClick != null) Modifier.clickable { onClick() } else Modifier
        ),
        colors = CardDefaults.cardColors(
            containerColor = containerColor,
            contentColor = contentColor
        ),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

// ============================================
// Outlined Card (테두리만)
// ============================================
@Composable
fun ParkOutlinedCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    OutlinedCard(
        modifier = modifier.then(
            if (onClick != null) Modifier.clickable { onClick() } else Modifier
        ),
        colors = CardDefaults.outlinedCardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

// ============================================
// Surface Variant Card (섹션 배경용)
// ============================================
@Composable
fun ParkSurfaceCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.then(
            if (onClick != null) Modifier.clickable { onClick() } else Modifier
        ),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
            contentColor = MaterialTheme.colorScheme.onSurfaceVariant
        ),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

// ============================================
// Clickable List Item Card
// ============================================
@Composable
fun ParkListItemCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            content = content
        )
    }
}
