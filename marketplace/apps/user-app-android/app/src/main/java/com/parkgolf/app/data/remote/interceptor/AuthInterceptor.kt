package com.parkgolf.app.data.remote.interceptor

import com.parkgolf.app.data.local.datastore.AuthPreferences
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val authPreferences: AuthPreferences
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip auth header for login/register endpoints
        val path = originalRequest.url.encodedPath
        if (path.contains("/login") || path.contains("/register") || path.contains("/refresh")) {
            return chain.proceed(originalRequest)
        }

        // 캐시된 토큰 사용 (동기적, 스레드 차단 없음)
        val token = authPreferences.getAccessTokenSync()

        val request = if (token != null) {
            originalRequest.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(request)
    }
}
