package com.parkgolf.app.presentation.feature.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.*
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

// Tab 열거형
enum class SocialMainTab(val title: String) {
    FRIENDS("친구"),
    CHAT("채팅")
}

enum class FriendSubTab(val title: String) {
    FRIENDS("친구"),
    REQUESTS("요청")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SocialScreen(
    onNavigate: (String) -> Unit,
    viewModel: SocialViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedMainTab by remember { mutableStateOf(SocialMainTab.FRIENDS) }
    var showAddFriendSheet by remember { mutableStateOf(false) }
    var showNewChatSheet by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.loadFriendsData()
        viewModel.loadChatRooms()
    }

    // Handle success message
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearSuccessMessage()
        }
    }

    // Handle error message
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = if (uiState.error != null) ParkError else ParkSuccess,
                    contentColor = TextOnGradient
                )
            }
        },
        containerColor = Color.Transparent
    ) { paddingValues ->
        GradientBackground {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Header
                SocialHeader(
                    selectedTab = selectedMainTab,
                    onAddClick = {
                        when (selectedMainTab) {
                            SocialMainTab.FRIENDS -> showAddFriendSheet = true
                            SocialMainTab.CHAT -> showNewChatSheet = true
                        }
                    }
                )

                // Segment Control
                SegmentControl(
                    selectedTab = selectedMainTab,
                    pendingRequestsCount = uiState.friendRequests.size + uiState.sentFriendRequests.size,
                    unreadChatCount = uiState.totalUnreadCount,
                    onTabSelected = { selectedMainTab = it }
                )

                // Content
                when (selectedMainTab) {
                    SocialMainTab.FRIENDS -> FriendsContent(
                        uiState = uiState,
                        viewModel = viewModel,
                        onNavigate = onNavigate
                    )
                    SocialMainTab.CHAT -> ChatContent(
                        uiState = uiState,
                        onChatRoomClick = { roomId -> onNavigate("chat/$roomId") },
                        onNewChatClick = { showNewChatSheet = true }
                    )
                }
            }
        }
    }

    // Add Friend Sheet
    if (showAddFriendSheet) {
        AddFriendSheet(
            viewModel = viewModel,
            onDismiss = {
                showAddFriendSheet = false
                viewModel.clearUserSearch()
            }
        )
    }

    // New Chat Sheet
    if (showNewChatSheet) {
        NewChatSheet(
            friends = uiState.friends,
            onDismiss = { showNewChatSheet = false },
            onFriendSelect = { friend ->
                viewModel.createDirectChat(friend)
                showNewChatSheet = false
            }
        )
    }
}

// ============================================
// Header
// ============================================
@Composable
private fun SocialHeader(
    selectedTab: SocialMainTab,
    onAddClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "소셜",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = TextOnGradient
        )

        IconButton(onClick = onAddClick) {
            Icon(
                imageVector = when (selectedTab) {
                    SocialMainTab.FRIENDS -> Icons.Default.PersonAdd
                    SocialMainTab.CHAT -> Icons.Default.Edit
                },
                contentDescription = when (selectedTab) {
                    SocialMainTab.FRIENDS -> "친구 추가"
                    SocialMainTab.CHAT -> "새 채팅"
                },
                tint = TextOnGradient
            )
        }
    }
}

// ============================================
// Segment Control
// ============================================
@Composable
private fun SegmentControl(
    selectedTab: SocialMainTab,
    pendingRequestsCount: Int,
    unreadChatCount: Int,
    onTabSelected: (SocialMainTab) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(GlassCard)
            .padding(4.dp)
    ) {
        SocialMainTab.entries.forEach { tab ->
            val isSelected = selectedTab == tab
            val badgeCount = when (tab) {
                SocialMainTab.FRIENDS -> pendingRequestsCount
                SocialMainTab.CHAT -> unreadChatCount
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isSelected) ParkPrimary else Color.Transparent)
                    .clickable { onTabSelected(tab) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = tab.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isSelected) TextOnGradient else TextOnGradientSecondary
                    )

                    if (badgeCount > 0) {
                        Badge(
                            containerColor = if (isSelected) TextOnGradient else ParkPrimary,
                            contentColor = if (isSelected) ParkPrimary else TextOnGradient
                        ) {
                            Text(badgeCount.toString())
                        }
                    }
                }
            }
        }
    }
}

// ============================================
// Friends Content
// ============================================
@Composable
private fun FriendsContent(
    uiState: SocialUiState,
    viewModel: SocialViewModel,
    onNavigate: (String) -> Unit
) {
    var selectedSubTab by remember { mutableStateOf(FriendSubTab.FRIENDS) }

    Column(modifier = Modifier.fillMaxSize()) {
        Spacer(modifier = Modifier.height(16.dp))

        // Stats Card - 탭 위에 배치
        FriendsStatsCard(
            friendsCount = uiState.friends.size,
            receivedCount = uiState.friendRequests.size,
            sentCount = uiState.sentFriendRequests.size,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Sub Tab
        FriendSubTabRow(
            selectedTab = selectedSubTab,
            requestsCount = uiState.friendRequests.size + uiState.sentFriendRequests.size,
            onTabSelected = { selectedSubTab = it }
        )

        Spacer(modifier = Modifier.height(16.dp))

        when (selectedSubTab) {
            FriendSubTab.FRIENDS -> FriendsList(
                uiState = uiState,
                viewModel = viewModel,
                onNavigate = onNavigate
            )
            FriendSubTab.REQUESTS -> RequestsList(
                uiState = uiState,
                viewModel = viewModel
            )
        }
    }
}

@Composable
private fun FriendSubTabRow(
    selectedTab: FriendSubTab,
    requestsCount: Int,
    onTabSelected: (FriendSubTab) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FriendSubTab.entries.forEach { tab ->
            val isSelected = selectedTab == tab
            val showBadge = tab == FriendSubTab.REQUESTS && requestsCount > 0

            Surface(
                onClick = { onTabSelected(tab) },
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) ParkPrimary.copy(alpha = 0.2f) else Color.Transparent
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = tab.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isSelected) ParkPrimary else TextOnGradientSecondary
                    )

                    if (showBadge) {
                        Badge(containerColor = ParkPrimary) {
                            Text(requestsCount.toString())
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendsList(
    uiState: SocialUiState,
    viewModel: SocialViewModel,
    onNavigate: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Search Bar
        item {
            GlassTextField(
                value = uiState.friendSearchQuery,
                onValueChange = { viewModel.searchFriends(it) },
                label = "친구 검색",
                leadingIcon = Icons.Default.Search
            )
        }

        // Friends List
        if (uiState.filteredFriends.isEmpty()) {
            item {
                EmptyStateView(
                    icon = Icons.Default.People,
                    title = "아직 친구가 없습니다",
                    description = "친구를 추가하고 함께 파크골프를 즐겨보세요!"
                )
            }
        } else {
            items(uiState.filteredFriends, key = { it.id }) { friend ->
                FriendCard(
                    friend = friend,
                    onChatClick = {
                        viewModel.createDirectChat(friend)
                    },
                    onRemoveClick = { viewModel.removeFriend(friend.friendId) }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun FriendsStatsCard(
    friendsCount: Int,
    receivedCount: Int,
    sentCount: Int,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                count = friendsCount,
                label = "친구",
                color = ParkPrimary
            )

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(40.dp)
                    .background(GlassBorder)
            )

            StatItem(
                count = receivedCount,
                label = "받은 요청",
                color = ParkSuccess
            )

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(40.dp)
                    .background(GlassBorder)
            )

            StatItem(
                count = sentCount,
                label = "보낸 요청",
                color = ParkWarning
            )
        }
    }
}

@Composable
private fun StatItem(
    count: Int,
    label: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextOnGradientSecondary
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FriendCard(
    friend: Friend,
    onChatClick: () -> Unit,
    onRemoveClick: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(ParkPrimary.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = friend.friendName.take(1),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = ParkPrimary
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = friend.friendName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    Text(
                        text = friend.friendEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                // Chat Button
                IconButton(onClick = onChatClick) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Chat,
                        contentDescription = "채팅",
                        tint = ParkPrimary
                    )
                }

                // Menu Button
                Box {
                    IconButton(onClick = { showMenu = true }) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "더보기",
                            tint = TextOnGradientSecondary
                        )
                    }

                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("친구 삭제", color = ParkError) },
                            onClick = {
                                showMenu = false
                                onRemoveClick()
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.PersonRemove,
                                    contentDescription = null,
                                    tint = ParkError
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}

// ============================================
// Requests List
// ============================================
@Composable
private fun RequestsList(
    uiState: SocialUiState,
    viewModel: SocialViewModel
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Received Requests
        if (uiState.friendRequests.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "받은 요청",
                    count = uiState.friendRequests.size
                )
            }

            items(uiState.friendRequests, key = { it.id }) { request ->
                FriendRequestCard(
                    request = request,
                    onAccept = { viewModel.acceptFriendRequest(request.id) },
                    onReject = { viewModel.rejectFriendRequest(request.id) }
                )
            }

            item { Spacer(modifier = Modifier.height(8.dp)) }
        }

        // Sent Requests
        if (uiState.sentFriendRequests.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "보낸 요청",
                    count = uiState.sentFriendRequests.size
                )
            }

            items(uiState.sentFriendRequests, key = { it.id }) { request ->
                SentRequestCard(request = request)
            }
        }

        // Empty State
        if (uiState.friendRequests.isEmpty() && uiState.sentFriendRequests.isEmpty()) {
            item {
                EmptyStateView(
                    icon = Icons.Default.PersonAdd,
                    title = "요청이 없습니다",
                    description = "친구 요청을 보내거나 받으면 여기에 표시됩니다"
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    count: Int
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = TextOnGradient
        )
        Badge(containerColor = ParkPrimary.copy(alpha = 0.2f)) {
            Text(
                text = count.toString(),
                color = ParkPrimary
            )
        }
    }
}

@Composable
private fun FriendRequestCard(
    request: FriendRequest,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PersonAdd,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkPrimary
                    )
                    Text(
                        text = "친구 요청",
                        style = MaterialTheme.typography.labelSmall,
                        color = ParkPrimary
                    )
                }

                request.createdAt?.let { createdAt ->
                    Text(
                        text = formatRelativeTime(createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextOnGradientTertiary
                    )
                }
            }

            // User Info
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(ParkPrimary.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = request.fromUserName.take(1),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = ParkPrimary
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = request.fromUserName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    Text(
                        text = request.fromUserEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                }
            }

            // Message
            request.message?.takeIf { it.isNotBlank() }?.let { message ->
                Text(
                    text = "\"$message\"",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnGradientSecondary
                )
            }

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onReject,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ParkError
                    )
                ) {
                    Text("거절")
                }

                Button(
                    onClick = onAccept,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ParkPrimary
                    )
                ) {
                    Text("수락")
                }
            }
        }
    }
}

@Composable
private fun SentRequestCard(request: SentFriendRequest) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkWarning
                    )
                    Text(
                        text = "보낸 요청",
                        style = MaterialTheme.typography.labelSmall,
                        color = ParkWarning
                    )
                }

                Badge(containerColor = ParkWarning.copy(alpha = 0.2f)) {
                    Text(
                        text = "대기중",
                        color = ParkWarning
                    )
                }
            }

            // User Info
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(ParkWarning.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = request.toUserName.take(1),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = ParkWarning
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = request.toUserName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    Text(
                        text = request.toUserEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                }
            }
        }
    }
}

// ============================================
// Chat Content
// ============================================
@Composable
private fun ChatContent(
    uiState: SocialUiState,
    onChatRoomClick: (String) -> Unit,
    onNewChatClick: () -> Unit
) {
    if (uiState.chatRooms.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            EmptyStateView(
                icon = Icons.AutoMirrored.Filled.Chat,
                title = "채팅이 없습니다",
                description = "친구와 대화를 시작해보세요",
                actionTitle = "새 채팅",
                onAction = onNewChatClick
            )
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(uiState.chatRooms, key = { it.id }) { room ->
                ChatRoomCard(
                    room = room,
                    onClick = { onChatRoomClick(room.id) }
                )
            }
        }
    }
}

@Composable
private fun ChatRoomCard(
    room: ChatRoom,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(ParkPrimary.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    when (room.type) {
                        ChatRoomType.DIRECT -> {
                            Text(
                                text = room.name.take(1),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = ParkPrimary
                            )
                        }
                        else -> {
                            Icon(
                                imageVector = Icons.Default.Groups,
                                contentDescription = null,
                                tint = ParkPrimary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = room.name,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = TextOnGradient,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )

                        room.lastMessage?.let { message ->
                            Text(
                                text = formatChatTime(message.createdAt),
                                style = MaterialTheme.typography.labelSmall,
                                color = TextOnGradientTertiary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = room.lastMessage?.content ?: "대화를 시작해보세요",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextOnGradientSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )

                        if (room.unreadCount > 0) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge(containerColor = ParkPrimary) {
                                Text(room.unreadCount.toString())
                            }
                        }
                    }
                }
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = TextOnGradientTertiary,
                modifier = Modifier.padding(start = 8.dp)
            )
        }
    }
}

// ============================================
// Add Friend Sheet
// ============================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFriendSheet(
    viewModel: SocialViewModel,
    onDismiss: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = GradientStart,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextOnGradientSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "친구 추가",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextOnGradient
            )

            // Search Bar
            GlassTextField(
                value = uiState.userSearchQuery,
                onValueChange = { viewModel.searchUsers(it) },
                label = "이메일 또는 이름으로 검색",
                leadingIcon = Icons.Default.Search
            )

            // Loading
            if (uiState.isSearching) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = ParkPrimary)
                }
            }

            // Search Results
            if (uiState.userSearchResults.isNotEmpty()) {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 400.dp)
                ) {
                    items(uiState.userSearchResults, key = { it.id }) { user ->
                        UserSearchCard(
                            user = user,
                            onAddClick = { viewModel.sendFriendRequest(user.id) }
                        )
                    }
                }
            } else if (uiState.userSearchQuery.length >= 2 && !uiState.isSearching) {
                Text(
                    text = "검색 결과가 없습니다",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextOnGradientSecondary,
                    modifier = Modifier.padding(vertical = 32.dp)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun UserSearchCard(
    user: UserSearchResult,
    onAddClick: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(ParkPrimary.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = user.name.take(1),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = ParkPrimary
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = user.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    Text(
                        text = user.email,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                }
            }

            when {
                user.isFriend -> {
                    Text(
                        text = "친구",
                        style = MaterialTheme.typography.labelMedium,
                        color = TextOnGradientSecondary
                    )
                }
                user.hasPendingRequest -> {
                    Text(
                        text = "요청됨",
                        style = MaterialTheme.typography.labelMedium,
                        color = ParkWarning
                    )
                }
                else -> {
                    Button(
                        onClick = onAddClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ParkPrimary
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text("추가", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

// ============================================
// New Chat Sheet
// ============================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewChatSheet(
    friends: List<Friend>,
    onDismiss: () -> Unit,
    onFriendSelect: (Friend) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val filteredFriends = friends.filter {
        it.friendName.contains(searchQuery, ignoreCase = true) ||
        it.friendEmail.contains(searchQuery, ignoreCase = true)
    }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = GradientStart,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextOnGradientSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "새 채팅",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextOnGradient
            )

            // Search Bar
            GlassTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = "친구 검색",
                leadingIcon = Icons.Default.Search
            )

            // Friends List
            if (filteredFriends.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.People,
                    title = "친구가 없습니다",
                    description = "먼저 친구를 추가해주세요"
                )
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 400.dp)
                ) {
                    items(filteredFriends, key = { it.id }) { friend ->
                        FriendSelectCard(
                            friend = friend,
                            onClick = { onFriendSelect(friend) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun FriendSelectCard(
    friend: Friend,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(ParkPrimary.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = friend.friendName.take(1),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = ParkPrimary
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = friend.friendName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = TextOnGradient
                )
                Text(
                    text = friend.friendEmail,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnGradientSecondary
                )
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = TextOnGradientSecondary
            )
        }
    }
}

// ============================================
// Utility Functions
// ============================================
private fun formatRelativeTime(dateTime: String): String {
    return try {
        val parsed = LocalDateTime.parse(dateTime.replace("Z", ""))
        val now = LocalDateTime.now()
        val minutes = ChronoUnit.MINUTES.between(parsed, now)
        val hours = ChronoUnit.HOURS.between(parsed, now)
        val days = ChronoUnit.DAYS.between(parsed, now)

        when {
            minutes < 1 -> "방금 전"
            minutes < 60 -> "${minutes}분 전"
            hours < 24 -> "${hours}시간 전"
            days < 7 -> "${days}일 전"
            else -> parsed.format(DateTimeFormatter.ofPattern("M월 d일"))
        }
    } catch (e: Exception) {
        ""
    }
}

private fun formatChatTime(dateTime: java.time.LocalDateTime): String {
    val now = java.time.LocalDate.now()
    val messageDate = dateTime.toLocalDate()

    return when {
        messageDate == now -> dateTime.format(DateTimeFormatter.ofPattern("a h:mm"))
        messageDate == now.minusDays(1) -> "어제"
        else -> dateTime.format(DateTimeFormatter.ofPattern("M/d"))
    }
}
