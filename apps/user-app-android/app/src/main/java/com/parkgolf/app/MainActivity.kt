package com.parkgolf.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import com.parkgolf.app.data.remote.auth.AuthEvent
import com.parkgolf.app.data.remote.auth.AuthEventBus
import com.parkgolf.app.presentation.navigation.ParkGolfNavHost
import com.parkgolf.app.presentation.navigation.Screen
import com.parkgolf.app.presentation.theme.ParkGolfTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authEventBus: AuthEventBus

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ParkGolfTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    ParkGolfNavHost(authEventBus = authEventBus)
                }
            }
        }
    }
}
