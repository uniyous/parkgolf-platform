package com.parkgolf.app.presentation.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.TextFieldShape
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary

@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    isPassword: Boolean = false,
    isError: Boolean = false,
    errorMessage: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    singleLine: Boolean = true,
    enabled: Boolean = true
) {
    var passwordVisible by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        leadingIcon = leadingIcon?.let {
            { Icon(imageVector = it, contentDescription = null, tint = TextOnGradientSecondary) }
        },
        trailingIcon = if (isPassword) {
            {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = if (passwordVisible) "Hide password" else "Show password",
                        tint = TextOnGradientSecondary
                    )
                }
            }
        } else null,
        visualTransformation = if (isPassword && !passwordVisible) {
            PasswordVisualTransformation()
        } else {
            VisualTransformation.None
        },
        isError = isError,
        enabled = enabled,
        supportingText = if (isError && errorMessage != null) {
            { Text(errorMessage) }
        } else null,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        singleLine = singleLine,
        shape = TextFieldShape,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = GlassCard,
            unfocusedContainerColor = GlassCard,
            disabledContainerColor = GlassCard.copy(alpha = 0.5f),
            focusedBorderColor = ParkPrimary,
            unfocusedBorderColor = GlassBorder,
            disabledBorderColor = GlassBorder.copy(alpha = 0.5f),
            focusedLabelColor = ParkPrimary,
            unfocusedLabelColor = TextOnGradientSecondary,
            disabledLabelColor = TextOnGradientSecondary.copy(alpha = 0.5f),
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            disabledTextColor = Color.White.copy(alpha = 0.5f),
            cursorColor = ParkPrimary
        )
    )
}
