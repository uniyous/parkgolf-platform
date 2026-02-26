package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.data.remote.dto.chat.TeamMemberDto
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

data class TeamState(
    val teamNumber: Int,
    val slotId: String,
    val slotTime: String,
    val courseName: String,
    val maxPlayers: Int,
    val members: List<MemberState>
)

data class MemberState(
    val userId: Int,
    val userName: String,
    val userEmail: String
)

@Composable
fun SelectParticipantsCard(
    data: Map<String, Any?>,
    onConfirm: ((List<TeamConfirmData>) -> Unit)? = null,
    onCancel: (() -> Unit)? = null
) {
    val clubName = data["clubName"]?.toString() ?: ""
    val pricePerPerson = (data["pricePerPerson"] as? Number)?.toInt() ?: 0
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    @Suppress("UNCHECKED_CAST")
    val initialTeams = remember(data) {
        (data["teams"] as? List<Map<String, Any?>>)?.map { team ->
            val members = (team["members"] as? List<Map<String, Any?>>)?.map { m ->
                MemberState(
                    userId = (m["userId"] as? Number)?.toInt() ?: 0,
                    userName = m["userName"]?.toString() ?: "",
                    userEmail = m["userEmail"]?.toString() ?: ""
                )
            } ?: emptyList()

            TeamState(
                teamNumber = (team["teamNumber"] as? Number)?.toInt() ?: 0,
                slotId = team["slotId"]?.toString() ?: "",
                slotTime = team["slotTime"]?.toString() ?: "",
                courseName = team["courseName"]?.toString() ?: "",
                maxPlayers = (team["maxPlayers"] as? Number)?.toInt() ?: 4,
                members = members
            )
        } ?: emptyList()
    }

    @Suppress("UNCHECKED_CAST")
    val initialUnassigned = remember(data) {
        (data["unassigned"] as? List<Map<String, Any?>>)?.map { m ->
            MemberState(
                userId = (m["userId"] as? Number)?.toInt() ?: 0,
                userName = m["userName"]?.toString() ?: "",
                userEmail = m["userEmail"]?.toString() ?: ""
            )
        } ?: emptyList()
    }

    var teams by remember { mutableStateOf(initialTeams) }
    var unassigned by remember { mutableStateOf(initialUnassigned) }

    val totalAssigned = teams.sumOf { it.members.size }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = ParkPrimary.copy(alpha = 0.05f),
        border = BorderStroke(1.dp, ParkPrimary.copy(alpha = 0.2f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Group,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkPrimary
                    )
                    Text(
                        text = "팀 편성",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = ParkOnPrimary
                    )
                }
                Text(
                    text = "${totalAssigned}명 배정 · ${unassigned.size}명 미배정",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
            }

            // Teams
            teams.forEach { team ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = ParkOnPrimary.copy(alpha = 0.03f),
                    border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.1f))
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        // Team header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "팀${team.teamNumber}",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = ParkPrimary
                                )
                                Icon(
                                    Icons.Default.AccessTime,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkOnPrimary.copy(alpha = 0.4f)
                                )
                                Text(
                                    text = team.slotTime,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkOnPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = " · ${team.courseName}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkOnPrimary.copy(alpha = 0.4f)
                                )
                            }
                            Text(
                                text = "${team.members.size}/${team.maxPlayers}",
                                style = MaterialTheme.typography.labelSmall,
                                color = ParkOnPrimary.copy(alpha = 0.4f)
                            )
                        }

                        HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.05f))

                        // Members
                        Column(
                            modifier = Modifier.padding(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            if (team.members.isEmpty()) {
                                Text(
                                    text = "미배정 멤버를 추가해주세요",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkOnPrimary.copy(alpha = 0.2f),
                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 8.dp)
                                )
                            }
                            team.members.forEach { member ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = member.userName,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = ParkOnPrimary.copy(alpha = 0.8f)
                                    )
                                    // Move to unassigned button
                                    IconButton(
                                        onClick = {
                                            teams = teams.map { t ->
                                                if (t.teamNumber == team.teamNumber) {
                                                    t.copy(members = t.members.filter { it.userId != member.userId })
                                                } else t
                                            }
                                            unassigned = unassigned + member
                                        },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "제거",
                                            modifier = Modifier.size(14.dp),
                                            tint = ParkOnPrimary.copy(alpha = 0.3f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Unassigned members
            if (unassigned.isNotEmpty()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = ParkOnPrimary.copy(alpha = 0.02f),
                    border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.1f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "미배정 (${unassigned.size}명)",
                            style = MaterialTheme.typography.labelSmall,
                            color = ParkOnPrimary.copy(alpha = 0.4f)
                        )
                        unassigned.forEach { member ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = member.userName,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = ParkOnPrimary.copy(alpha = 0.6f)
                                )
                                // Assign to first available team
                                val availableTeam = teams.firstOrNull { it.members.size < it.maxPlayers }
                                if (availableTeam != null) {
                                    TextButton(
                                        onClick = {
                                            teams = teams.map { t ->
                                                if (t.teamNumber == availableTeam.teamNumber) {
                                                    t.copy(members = t.members + member)
                                                } else t
                                            }
                                            unassigned = unassigned.filter { it.userId != member.userId }
                                        },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                        modifier = Modifier.height(28.dp)
                                    ) {
                                        Text(
                                            text = "팀${availableTeam.teamNumber}에 추가",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = ParkPrimary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Summary
            HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.1f))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "1인당 ${numberFormat.format(pricePerPerson)}원",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
                Text(
                    text = "총 ${numberFormat.format(totalAssigned * pricePerPerson)}원",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkPrimary
                )
            }

            // Actions
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (onCancel != null) {
                    OutlinedButton(
                        onClick = onCancel,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = ParkOnPrimary.copy(alpha = 0.7f)
                        ),
                        border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.2f))
                    ) {
                        Text("취소", style = MaterialTheme.typography.bodySmall)
                    }
                }
                if (onConfirm != null) {
                    Button(
                        onClick = {
                            onConfirm(teams.map { t ->
                                TeamConfirmData(
                                    teamNumber = t.teamNumber,
                                    slotId = t.slotId,
                                    members = t.members.map { m ->
                                        TeamMemberDto(
                                            userId = m.userId,
                                            userName = m.userName,
                                            userEmail = m.userEmail
                                        )
                                    }
                                )
                            })
                        },
                        modifier = Modifier.weight(1f),
                        enabled = totalAssigned > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                    ) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "확정 (${totalAssigned}명)",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

data class TeamConfirmData(
    val teamNumber: Int,
    val slotId: String,
    val members: List<TeamMemberDto>
)
