package com.parkgolf.app.data.remote.auth

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthEvent {
    data object SessionExpired : AuthEvent()
}

@Singleton
class AuthEventBus @Inject constructor() {
    private val _events = Channel<AuthEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    fun send(event: AuthEvent) {
        _events.trySend(event)
    }
}
