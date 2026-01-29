package com.parkgolf.app.data.remote.interceptor

import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.data.remote.api.AuthApi
import com.parkgolf.app.data.remote.auth.AuthEvent
import com.parkgolf.app.data.remote.auth.AuthEventBus
import com.parkgolf.app.data.remote.dto.auth.RefreshTokenRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class TokenAuthenticator @Inject constructor(
    private val authPreferences: AuthPreferences,
    private val authApiProvider: Provider<AuthApi>,
    private val authEventBus: AuthEventBus
) : Authenticator {

    @Volatile
    private var isRefreshing = false

    override fun authenticate(route: Route?, response: Response): Request? {
        // Don't retry refresh endpoint itself to prevent infinite loop
        val path = response.request.url.encodedPath
        if (path.contains("/refresh")) {
            return null
        }

        // Prevent retry loops: give up after 1 retry
        if (responseCount(response) > 1) {
            return null
        }

        synchronized(this) {
            // Double-check: another thread may have already refreshed
            val currentToken = authPreferences.getAccessTokenSync()
            val requestToken = response.request.header("Authorization")
                ?.removePrefix("Bearer ")

            // If the token has been updated by another thread, retry with the new token
            if (currentToken != null && currentToken != requestToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .build()
            }

            // This thread performs the refresh
            val refreshToken = authPreferences.getRefreshTokenSync() ?: run {
                onRefreshFailed()
                return null
            }

            return try {
                val refreshResponse = runBlocking {
                    authApiProvider.get().refreshToken(RefreshTokenRequest(refreshToken))
                }

                // Save new tokens
                runBlocking {
                    authPreferences.saveTokens(
                        refreshResponse.accessToken,
                        refreshResponse.refreshToken
                    )
                }

                // Retry original request with new access token
                response.request.newBuilder()
                    .header("Authorization", "Bearer ${refreshResponse.accessToken}")
                    .build()
            } catch (e: Exception) {
                onRefreshFailed()
                null
            }
        }
    }

    private fun onRefreshFailed() {
        runBlocking {
            authPreferences.clearAll()
        }
        authEventBus.send(AuthEvent.SessionExpired)
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var priorResponse = response.priorResponse
        while (priorResponse != null) {
            count++
            priorResponse = priorResponse.priorResponse
        }
        return count
    }
}
