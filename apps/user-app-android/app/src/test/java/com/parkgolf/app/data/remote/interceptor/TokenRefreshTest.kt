package com.parkgolf.app.data.remote.interceptor

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.data.remote.api.AuthApi
import com.parkgolf.app.data.remote.auth.AuthEvent
import com.parkgolf.app.data.remote.auth.AuthEventBus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.File
import javax.inject.Provider

/**
 * 401 토큰 자동 갱신 Unit 테스트 (Android)
 *
 * MockWebServer로 API 응답을 모킹하여 401 시나리오 테스트.
 * Web E2E 테스트(Playwright page.route)와 동일한 4가지 시나리오 검증.
 *
 * 테스트 방법: OkHttp MockWebServer + TokenAuthenticator + AuthInterceptor
 */
class TokenRefreshTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var mockWebServer: MockWebServer
    private lateinit var client: OkHttpClient
    private lateinit var authPreferences: AuthPreferences
    private lateinit var authEventBus: AuthEventBus
    private lateinit var dataStoreScope: CoroutineScope

    companion object {
        private val REFRESH_SUCCESS_JSON = """
            {
                "accessToken": "new_access_token",
                "refreshToken": "new_refresh_token",
                "user": {
                    "id": 1,
                    "email": "test@parkgolf.com",
                    "name": "테스트사용자"
                },
                "expiresIn": 3600
            }
        """.trimIndent()

        private val API_SUCCESS_JSON = """
            {"success": true, "data": {"message": "ok"}}
        """.trimIndent()

        private val API_401_JSON = """
            {"success": false, "error": {"code": "UNAUTHORIZED", "message": "Token expired"}}
        """.trimIndent()
    }

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        // Test DataStore (파일 미리 생성하지 않음 - DataStore가 필요시 생성)
        dataStoreScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val testDataStore = PreferenceDataStoreFactory.create(
            scope = dataStoreScope,
            produceFile = { File(tempFolder.root, "test_${System.nanoTime()}.preferences_pb") }
        )
        authPreferences = AuthPreferences(testDataStore)
        authEventBus = AuthEventBus()

        // JSON config (프로덕션과 동일)
        val json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
            encodeDefaults = true
        }
        val contentType = "application/json".toMediaType()

        // AuthApi (plain client, authenticator 미포함 - 순환 호출 방지)
        val authRetrofit = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/"))
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
        val authApi = authRetrofit.create(AuthApi::class.java)

        // TokenAuthenticator
        val tokenAuthenticator = TokenAuthenticator(
            authPreferences = authPreferences,
            authApiProvider = Provider { authApi },
            authEventBus = authEventBus
        )

        // AuthInterceptor
        val authInterceptor = AuthInterceptor(authPreferences)

        // Main OkHttp client (interceptor + authenticator)
        client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(tokenAuthenticator)
            .build()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
        dataStoreScope.cancel()
    }

    // MARK: - Scenario 1: access token 만료 → refresh 성공 → 새 토큰 저장

    @Test
    fun `access token 만료 시 refresh 성공하면 새 토큰이 저장된다`() {
        // Given: 만료된 토큰 설정
        runBlocking { authPreferences.saveTokens("old_access", "old_refresh") }

        // Enqueue: API 401 → refresh 200 → retry 200
        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody(API_401_JSON))
        mockWebServer.enqueue(MockResponse().setResponseCode(200).setBody(REFRESH_SUCCESS_JSON))
        mockWebServer.enqueue(MockResponse().setResponseCode(200).setBody(API_SUCCESS_JSON))

        // When
        val request = Request.Builder()
            .url(mockWebServer.url("/api/user/test"))
            .build()
        val response = client.newCall(request).execute()

        // Then: 재시도 성공
        assertEquals(200, response.code)

        // Then: 새 토큰 저장됨
        assertEquals("new_access_token", authPreferences.getAccessTokenSync())
        assertEquals("new_refresh_token", authPreferences.getRefreshTokenSync())

        // Then: 3개 요청 (원본 + refresh + retry)
        assertEquals(3, mockWebServer.requestCount)

        // Then: refresh 엔드포인트 호출 확인
        mockWebServer.takeRequest() // 원본 요청 소비
        val refreshRequest = mockWebServer.takeRequest()
        assert(refreshRequest.path?.contains("/iam/refresh") == true) {
            "두 번째 요청은 refresh 엔드포인트여야 합니다"
        }
    }

    // MARK: - Scenario 2: refresh token 만료 → 세션 만료 이벤트

    @Test
    fun `refresh token 만료 시 세션 만료 이벤트가 발생한다`() {
        // Given
        runBlocking { authPreferences.saveTokens("old_access", "old_refresh") }

        // Enqueue: API 401 → refresh 401
        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody(API_401_JSON))
        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody(API_401_JSON))

        // When
        val request = Request.Builder()
            .url(mockWebServer.url("/api/user/test"))
            .build()
        val response = client.newCall(request).execute()

        // Then: 401 반환 (refresh 실패)
        assertEquals(401, response.code)

        // Then: 토큰 삭제됨
        assertNull(authPreferences.getAccessTokenSync())
        assertNull(authPreferences.getRefreshTokenSync())

        // Then: SessionExpired 이벤트 발생
        val event = runBlocking {
            withTimeout(1000) {
                authEventBus.events.first()
            }
        }
        assertEquals(AuthEvent.SessionExpired, event)

        // Then: 2개 요청 (원본 + refresh)
        assertEquals(2, mockWebServer.requestCount)
    }

    // MARK: - Scenario 3: refresh token 없음 → refresh 미호출

    @Test
    fun `refresh token 없을 때 바로 세션 만료된다`() {
        // Given: 토큰 없음 (refreshToken == null → refresh 미호출)
        // AuthPreferences는 saveTokens()로만 토큰 저장 가능 (access만 따로 설정 불가)
        // 토큰 없이 401 → authenticator가 refreshToken null 감지 → onRefreshFailed

        // Enqueue: API 401
        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody(API_401_JSON))

        // When
        val request = Request.Builder()
            .url(mockWebServer.url("/api/user/test"))
            .build()
        val response = client.newCall(request).execute()

        // Then: 401 반환
        assertEquals(401, response.code)

        // Then: SessionExpired 이벤트 발생
        val event = runBlocking {
            withTimeout(1000) {
                authEventBus.events.first()
            }
        }
        assertEquals(AuthEvent.SessionExpired, event)

        // Then: refresh 호출 안 됨 (1개 요청만)
        assertEquals(1, mockWebServer.requestCount)
    }

    // MARK: - Scenario 4: refresh 실패 → 무한루프 방지

    @Test
    fun `refresh 실패 시 무한루프 없이 세션 만료된다`() {
        // Given
        runBlocking { authPreferences.saveTokens("old_access", "some_refresh") }

        // Enqueue: API 401 → refresh 401
        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody(API_401_JSON))
        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody(API_401_JSON))

        // When
        val request = Request.Builder()
            .url(mockWebServer.url("/api/user/test"))
            .build()
        val response = client.newCall(request).execute()

        // Then: 401 반환
        assertEquals(401, response.code)

        // Then: SessionExpired 이벤트 발생
        val event = runBlocking {
            withTimeout(1000) {
                authEventBus.events.first()
            }
        }
        assertEquals(AuthEvent.SessionExpired, event)

        // Then: refresh는 1회만 호출됨 (무한루프 방지)
        // 총 2개 요청: 원본 API + refresh (retry 없음)
        assertEquals(2, mockWebServer.requestCount)
    }
}
