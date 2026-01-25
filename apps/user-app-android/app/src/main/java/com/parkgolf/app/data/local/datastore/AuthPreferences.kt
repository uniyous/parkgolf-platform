package com.parkgolf.app.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        private val ACCESS_TOKEN_KEY = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val USER_PHONE_KEY = stringPreferencesKey("user_phone")
        private val PASSWORD_CHANGE_SKIPPED_AT_KEY = longPreferencesKey("password_change_skipped_at")

        private const val SKIP_DURATION_DAYS = 7L
        private const val MILLIS_PER_DAY = 24 * 60 * 60 * 1000L
    }

    // 캐시된 토큰 (동기 접근용) - OkHttp Interceptor에서 사용
    private val cachedAccessToken = AtomicReference<String?>(null)
    private val cachedRefreshToken = AtomicReference<String?>(null)

    init {
        // 앱 시작 시 DataStore에서 토큰 로드하여 캐시 초기화
        // 이 runBlocking은 앱 초기화 시 한 번만 실행되므로 허용
        runBlocking {
            try {
                val prefs = dataStore.data.first()
                cachedAccessToken.set(prefs[ACCESS_TOKEN_KEY])
                cachedRefreshToken.set(prefs[REFRESH_TOKEN_KEY])
            } catch (_: Exception) {
                // 초기화 실패 시 null 유지
            }
        }
    }

    /**
     * 동기적으로 캐시된 Access Token 반환 (OkHttp Interceptor용)
     * 네트워크 스레드를 차단하지 않음
     */
    fun getAccessTokenSync(): String? = cachedAccessToken.get()

    /**
     * 동기적으로 캐시된 Refresh Token 반환
     */
    fun getRefreshTokenSync(): String? = cachedRefreshToken.get()

    val accessToken: Flow<String?> = dataStore.data.map { preferences ->
        preferences[ACCESS_TOKEN_KEY]
    }

    val refreshToken: Flow<String?> = dataStore.data.map { preferences ->
        preferences[REFRESH_TOKEN_KEY]
    }

    val isLoggedIn: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[ACCESS_TOKEN_KEY] != null
    }

    val userId: Flow<String?> = dataStore.data.map { preferences ->
        preferences[USER_ID_KEY]
    }

    val userEmail: Flow<String?> = dataStore.data.map { preferences ->
        preferences[USER_EMAIL_KEY]
    }

    val userName: Flow<String?> = dataStore.data.map { preferences ->
        preferences[USER_NAME_KEY]
    }

    val userPhone: Flow<String?> = dataStore.data.map { preferences ->
        preferences[USER_PHONE_KEY]
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        // 캐시 먼저 업데이트 (즉시 반영)
        cachedAccessToken.set(accessToken)
        cachedRefreshToken.set(refreshToken)

        // DataStore에 영속화
        dataStore.edit { preferences ->
            preferences[ACCESS_TOKEN_KEY] = accessToken
            preferences[REFRESH_TOKEN_KEY] = refreshToken
        }
    }

    suspend fun saveUserInfo(userId: String, email: String, name: String, phoneNumber: String? = null) {
        dataStore.edit { preferences ->
            preferences[USER_ID_KEY] = userId
            preferences[USER_EMAIL_KEY] = email
            preferences[USER_NAME_KEY] = name
            if (phoneNumber != null) {
                preferences[USER_PHONE_KEY] = phoneNumber
            } else {
                preferences.remove(USER_PHONE_KEY)
            }
        }
    }

    suspend fun clearAll() {
        // 캐시 먼저 클리어
        cachedAccessToken.set(null)
        cachedRefreshToken.set(null)

        // DataStore 클리어
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    /**
     * 비밀번호 변경 스킵 시점 저장
     */
    suspend fun savePasswordChangeSkipped() {
        dataStore.edit { preferences ->
            preferences[PASSWORD_CHANGE_SKIPPED_AT_KEY] = System.currentTimeMillis()
        }
    }

    /**
     * 비밀번호 변경 스킵 기록 삭제 (비밀번호 변경 후 호출)
     */
    suspend fun clearPasswordChangeSkipped() {
        dataStore.edit { preferences ->
            preferences.remove(PASSWORD_CHANGE_SKIPPED_AT_KEY)
        }
    }

    /**
     * 최근 7일 이내에 스킵했는지 확인
     */
    suspend fun hasRecentlySkippedPasswordChange(): Boolean {
        val skippedAt = dataStore.data.first()[PASSWORD_CHANGE_SKIPPED_AT_KEY] ?: return false
        val daysSinceSkip = (System.currentTimeMillis() - skippedAt) / MILLIS_PER_DAY
        return daysSinceSkip < SKIP_DURATION_DAYS
    }
}
