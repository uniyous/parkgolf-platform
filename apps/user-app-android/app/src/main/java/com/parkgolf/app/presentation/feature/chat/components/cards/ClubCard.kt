package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary

@Composable
fun ClubCard(
    data: Map<String, Any?>,
    onSelect: ((String, String) -> Unit)? = null
) {
    @Suppress("UNCHECKED_CAST")
    val clubs = (data["clubs"] as? List<*>)?.filterIsInstance<Map<String, Any?>>() ?: return

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        clubs.forEach { club ->
            val id = club["id"]?.toString() ?: ""
            val name = club["name"]?.toString() ?: ""
            val address = club["address"]?.toString() ?: ""

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = GlassCard
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = name,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = ParkOnPrimary
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = ParkOnPrimary.copy(alpha = 0.5f)
                            )
                            Text(
                                text = address,
                                style = MaterialTheme.typography.bodySmall,
                                color = ParkOnPrimary.copy(alpha = 0.5f),
                                maxLines = 1
                            )
                        }
                    }

                    if (onSelect != null) {
                        Button(
                            onClick = { onSelect(id, name) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = ParkPrimary.copy(alpha = 0.2f),
                                contentColor = ParkPrimary
                            ),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "선택하기",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}
