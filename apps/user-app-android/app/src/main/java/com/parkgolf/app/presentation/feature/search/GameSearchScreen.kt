package com.parkgolf.app.presentation.feature.search

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassTextField

@Composable
fun GameSearchScreen(
    onNavigate: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Header
        Text(
            text = "게임 찾기",
            style = MaterialTheme.typography.headlineMedium,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Search Bar
        GlassTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = "파크골프장 검색...",
            leadingIcon = Icons.Default.Search
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Empty State or Results
        EmptyStateView(
            icon = Icons.Default.Search,
            title = "게임을 검색해보세요",
            description = "파크골프장 이름이나 지역으로 검색할 수 있습니다",
            modifier = Modifier.fillMaxWidth()
        )
    }
}
