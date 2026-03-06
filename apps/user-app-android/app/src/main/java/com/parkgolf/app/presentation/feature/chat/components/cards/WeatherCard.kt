package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.ParkOnPrimary

@Composable
fun WeatherCard(data: Map<String, Any?>) {
    val temperature = (data["temperature"] as? Number)?.toDouble() ?: 0.0
    val sky = data["sky"]?.toString() ?: ""
    val recommendation = data["recommendation"]?.toString() ?: ""

    val skyLower = sky.lowercase()
    val skyIcon = when {
        skyLower.contains("비") || skyLower.contains("rain") -> Icons.Default.WaterDrop
        skyLower.contains("맑") || skyLower.contains("clear") -> Icons.Default.WbSunny
        else -> Icons.Default.Cloud
    }
    val skyColor = when {
        skyLower.contains("비") || skyLower.contains("rain") -> Color(0xFF3B82F6)
        skyLower.contains("맑") || skyLower.contains("clear") -> Color(0xFFFBBF24)
        else -> Color(0xFF9CA3AF)
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = GlassCard
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = skyIcon,
                contentDescription = sky,
                tint = skyColor,
                modifier = Modifier.size(32.dp)
            )

            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Thermostat,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                    Text(
                        text = "${temperature.toInt()}°C",
                        style = MaterialTheme.typography.bodyLarge,
                        color = ParkOnPrimary
                    )
                    Text(
                        text = sky,
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                }

                if (recommendation.isNotEmpty()) {
                    Text(
                        text = recommendation,
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
}
