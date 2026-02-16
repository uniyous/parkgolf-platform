package com.parkgolf.app.presentation.feature.club

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.ClubDetail
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.GradientStart
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkSuccess
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import com.parkgolf.app.presentation.theme.TextOnGradientTertiary
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClubDetailScreen(
    onNavigateBack: () -> Unit,
    onNavigateToSearch: () -> Unit,
    viewModel: ClubDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            text = uiState.club?.name ?: "골프장 정보",
                            color = TextOnGradient,
                            style = MaterialTheme.typography.titleMedium
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
                    colors = TopAppBarDefaults.topAppBarColors(
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
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = ParkPrimary)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "골프장 정보를 불러오는 중...",
                                color = TextOnGradientSecondary,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
                uiState.error != null -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = uiState.error ?: "오류가 발생했습니다",
                                color = TextOnGradientSecondary,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(onClick = { viewModel.loadData() }) {
                                Text("다시 시도", color = ParkPrimary)
                            }
                        }
                    }
                }
                uiState.club != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Spacer(modifier = Modifier.height(4.dp))
                        ClubInfoCard(club = uiState.club!!)
                        GamesSection(
                            games = uiState.games,
                            onBookClick = onNavigateToSearch
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ClubInfoCard(club: ClubDetail) {
    val uriHandler = LocalUriHandler.current

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        // Type & Status badges
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Badge(text = club.clubTypeDisplayName, color = ParkPrimary)
            if (club.isOpen) {
                Badge(text = "영업중", color = ParkSuccess)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Club name
        Text(
            text = club.name,
            color = TextOnGradient,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Address
        IconInfoRow(
            icon = { Icon(Icons.Filled.LocationOn, contentDescription = null, tint = TextOnGradientSecondary, modifier = Modifier.size(16.dp)) },
            text = club.address,
            color = TextOnGradientSecondary
        )

        // Phone
        if (club.phone.isNotEmpty()) {
            Spacer(modifier = Modifier.height(6.dp))
            IconInfoRow(
                icon = { Icon(Icons.Filled.Phone, contentDescription = null, tint = ParkPrimary, modifier = Modifier.size(16.dp)) },
                text = club.phone,
                color = ParkPrimary,
                onClick = { uriHandler.openUri("tel:${club.phone}") }
            )
        }

        // Website
        if (club.website != null) {
            Spacer(modifier = Modifier.height(6.dp))
            IconInfoRow(
                icon = { Icon(Icons.Filled.Language, contentDescription = null, tint = ParkPrimary, modifier = Modifier.size(16.dp)) },
                text = "웹사이트 방문",
                color = ParkPrimary,
                onClick = { uriHandler.openUri(club.website) }
            )
        }

        // Operating Hours
        if (club.operatingHours != null) {
            Spacer(modifier = Modifier.height(6.dp))
            IconInfoRow(
                icon = { Icon(Icons.Filled.AccessTime, contentDescription = null, tint = TextOnGradientSecondary, modifier = Modifier.size(16.dp)) },
                text = "${club.operatingHours.open} ~ ${club.operatingHours.close}",
                color = TextOnGradientSecondary
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Course / Hole Count
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            IconInfoRow(
                icon = { Icon(Icons.Filled.Layers, contentDescription = null, tint = TextOnGradientSecondary, modifier = Modifier.size(16.dp)) },
                text = "코스 ${club.totalCourses}개",
                color = TextOnGradientSecondary
            )
            Text(
                text = "홀 ${club.totalHoles}개",
                color = TextOnGradientSecondary,
                style = MaterialTheme.typography.bodySmall
            )
        }

        // Facilities
        if (club.facilities.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                club.facilities.forEach { facility ->
                    FacilityChip(text = facility)
                }
            }
        }
    }
}

@Composable
private fun GamesSection(
    games: List<Round>,
    onBookClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = "라운드 예약",
            color = TextOnGradient,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        if (games.isEmpty()) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "등록된 게임이 없습니다",
                        color = TextOnGradientSecondary,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "현재 예약 가능한 라운드가 없습니다",
                        color = TextOnGradientTertiary,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        } else {
            games.forEach { game ->
                GameCard(game = game, onClick = onBookClick)
            }
        }
    }
}

@Composable
private fun GameCard(game: Round, onClick: () -> Unit) {
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = game.name,
                    color = TextOnGradient,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Course names
                Text(
                    text = "전반 ${game.frontNineCourse?.name ?: "-"} / 후반 ${game.backNineCourse?.name ?: "-"}",
                    color = TextOnGradientSecondary,
                    style = MaterialTheme.typography.bodySmall
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Details
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.AccessTime, contentDescription = null, tint = TextOnGradientTertiary, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("${game.estimatedDuration}분", color = TextOnGradientTertiary, fontSize = 12.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.People, contentDescription = null, tint = TextOnGradientTertiary, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("최대 ${game.maxPlayers}명", color = TextOnGradientTertiary, fontSize = 12.sp)
                    }
                    game.totalHoles?.let {
                        Text("${it}홀", color = TextOnGradientTertiary, fontSize = 12.sp)
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Price
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "${numberFormat.format(game.basePrice)}원",
                        color = ParkPrimary,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (game.weekendPrice != null && game.weekendPrice != game.basePrice) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "주말 ${numberFormat.format(game.weekendPrice)}원",
                            color = TextOnGradientTertiary,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = TextOnGradientTertiary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// ============================================
// Shared UI Components
// ============================================

@Composable
private fun Badge(text: String, color: Color) {
    Text(
        text = text,
        color = color,
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier
            .clip(CircleShape)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

@Composable
private fun IconInfoRow(
    icon: @Composable () -> Unit,
    text: String,
    color: Color,
    onClick: (() -> Unit)? = null
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = if (onClick != null) {
            Modifier.padding(vertical = 2.dp)
        } else {
            Modifier.padding(vertical = 2.dp)
        }
    ) {
        icon()
        Spacer(modifier = Modifier.width(6.dp))
        if (onClick != null) {
            TextButton(
                onClick = onClick,
                modifier = Modifier.height(24.dp)
            ) {
                Text(text = text, color = color, style = MaterialTheme.typography.bodySmall)
            }
        } else {
            Text(text = text, color = color, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun FacilityChip(text: String) {
    Text(
        text = text,
        color = TextOnGradientSecondary,
        fontSize = 12.sp,
        modifier = Modifier
            .clip(CircleShape)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    )
}
