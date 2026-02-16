package com.parkgolf.app.util

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager as AndroidLocationManager
import android.location.LocationRequest as AndroidLocationRequest
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Looper
import androidx.core.content.ContextCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

data class UserLocation(
    val latitude: Double,
    val longitude: Double
)

class LocationManager(private val context: Context) {

    private val locationManager: AndroidLocationManager? =
        context.getSystemService(Context.LOCATION_SERVICE) as? AndroidLocationManager

    val hasLocationPermission: Boolean
        get() = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

    suspend fun getCurrentLocation(): UserLocation? {
        if (!hasLocationPermission) return null
        val manager = locationManager ?: return null

        // Try to get last known location first
        val lastKnown = getLastKnownLocation(manager)
        if (lastKnown != null) return lastKnown

        // Request a fresh location update with timeout (10 seconds)
        return withTimeoutOrNull(LOCATION_TIMEOUT_MS) {
            requestSingleUpdate(manager)
        }
    }

    companion object {
        private const val LOCATION_TIMEOUT_MS = 10_000L
    }

    @Suppress("MissingPermission")
    private fun getLastKnownLocation(manager: AndroidLocationManager): UserLocation? {
        if (!hasLocationPermission) return null

        val providers = listOf(
            AndroidLocationManager.NETWORK_PROVIDER,
            AndroidLocationManager.GPS_PROVIDER
        )

        for (provider in providers) {
            try {
                val location = manager.getLastKnownLocation(provider)
                if (location != null) {
                    return UserLocation(location.latitude, location.longitude)
                }
            } catch (_: Exception) {
                // Provider not available
            }
        }
        return null
    }

    @Suppress("MissingPermission")
    private suspend fun requestSingleUpdate(manager: AndroidLocationManager): UserLocation? {
        if (!hasLocationPermission) return null

        val provider = when {
            manager.isProviderEnabled(AndroidLocationManager.NETWORK_PROVIDER) ->
                AndroidLocationManager.NETWORK_PROVIDER
            manager.isProviderEnabled(AndroidLocationManager.GPS_PROVIDER) ->
                AndroidLocationManager.GPS_PROVIDER
            else -> {
                android.util.Log.w("LocationManager", "No location provider available")
                return null
            }
        }

        return suspendCancellableCoroutine { continuation ->
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    manager.removeUpdates(this)
                    if (continuation.isActive) {
                        continuation.resume(UserLocation(location.latitude, location.longitude))
                    }
                }

                @Deprecated("Deprecated in API level 29")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {
                    if (continuation.isActive) {
                        continuation.resume(null)
                    }
                }
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val cancellationSignal = CancellationSignal()
                    manager.getCurrentLocation(
                        provider,
                        cancellationSignal,
                        context.mainExecutor
                    ) { location ->
                        if (continuation.isActive) {
                            if (location != null) {
                                continuation.resume(UserLocation(location.latitude, location.longitude))
                            } else {
                                continuation.resume(null)
                            }
                        }
                    }
                    continuation.invokeOnCancellation {
                        cancellationSignal.cancel()
                    }
                } else {
                    @Suppress("DEPRECATION")
                    manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                    continuation.invokeOnCancellation {
                        manager.removeUpdates(listener)
                    }
                }
            } catch (_: Exception) {
                if (continuation.isActive) {
                    continuation.resume(null)
                }
            }
        }
    }
}
