package com.parkgolf.app.presentation.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation

/**
 * Park Golf Material Design 3 TextField Components
 *
 * Outlined TextField 스타일 (Android 표준)
 */

// ============================================
// Outlined Text Field (기본)
// ============================================
@Composable
fun ParkTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    leadingIcon: ImageVector? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    singleLine: Boolean = true,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = label?.let { { Text(it) } },
        placeholder = placeholder?.let { { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) } },
        leadingIcon = leadingIcon?.let {
            {
                Icon(
                    imageVector = it,
                    contentDescription = null,
                    tint = if (isError) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        trailingIcon = trailingIcon,
        isError = isError,
        supportingText = if (isError && errorMessage != null) {
            { Text(errorMessage) }
        } else null,
        enabled = enabled,
        readOnly = readOnly,
        singleLine = singleLine,
        maxLines = maxLines,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        shape = MaterialTheme.shapes.medium,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            focusedLabelColor = MaterialTheme.colorScheme.primary,
            cursorColor = MaterialTheme.colorScheme.primary
        )
    )
}

// ============================================
// Password Text Field
// ============================================
@Composable
fun ParkPasswordField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "비밀번호",
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Done,
    onImeAction: () -> Unit = {}
) {
    var passwordVisible by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        isError = isError,
        supportingText = if (isError && errorMessage != null) {
            { Text(errorMessage) }
        } else null,
        enabled = enabled,
        singleLine = true,
        visualTransformation = if (passwordVisible) VisualTransformation.None
        else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Password,
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onDone = { onImeAction() }
        ),
        trailingIcon = {
            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                Icon(
                    imageVector = if (passwordVisible) Icons.Filled.Visibility
                    else Icons.Filled.VisibilityOff,
                    contentDescription = if (passwordVisible) "비밀번호 숨기기" else "비밀번호 보기",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        shape = MaterialTheme.shapes.medium,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            focusedLabelColor = MaterialTheme.colorScheme.primary,
            cursorColor = MaterialTheme.colorScheme.primary
        )
    )
}

// ============================================
// Search Text Field
// ============================================
@Composable
fun ParkSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "검색",
    onSearch: () -> Unit = {},
    enabled: Boolean = true
) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = { Text(placeholder) },
        leadingIcon = {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = "검색",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        trailingIcon = {
            if (value.isNotEmpty()) {
                IconButton(onClick = { onValueChange("") }) {
                    Icon(
                        imageVector = Icons.Filled.Clear,
                        contentDescription = "지우기",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        enabled = enabled,
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            imeAction = ImeAction.Search
        ),
        keyboardActions = KeyboardActions(
            onSearch = { onSearch() }
        ),
        shape = MaterialTheme.shapes.extraLarge,
        colors = TextFieldDefaults.colors(
            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            focusedIndicatorColor = androidx.compose.ui.graphics.Color.Transparent,
            unfocusedIndicatorColor = androidx.compose.ui.graphics.Color.Transparent,
            cursorColor = MaterialTheme.colorScheme.primary
        )
    )
}

// ============================================
// Email Text Field
// ============================================
@Composable
fun ParkEmailField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "이메일",
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {}
) {
    ParkTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        label = label,
        isError = isError,
        errorMessage = errorMessage,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Email,
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onNext = { onImeAction() },
            onDone = { onImeAction() }
        )
    )
}

// ============================================
// Phone Text Field
// ============================================
@Composable
fun ParkPhoneField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "전화번호",
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {}
) {
    ParkTextField(
        value = value,
        onValueChange = { newValue ->
            // 숫자만 허용
            onValueChange(newValue.filter { it.isDigit() })
        },
        modifier = modifier,
        label = label,
        placeholder = "01012345678",
        isError = isError,
        errorMessage = errorMessage,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Phone,
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onNext = { onImeAction() },
            onDone = { onImeAction() }
        )
    )
}
