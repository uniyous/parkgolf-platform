package com.parkgolf.app.di

import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.data.remote.api.AccountApi
import com.parkgolf.app.data.remote.api.AuthApi
import com.parkgolf.app.data.remote.api.BookingApi
import com.parkgolf.app.data.remote.api.ChatApi
import com.parkgolf.app.data.remote.api.ClubApi
import com.parkgolf.app.data.repository.ClubRepositoryImpl
import com.parkgolf.app.domain.repository.ClubRepository
import com.parkgolf.app.data.remote.api.FriendsApi
import com.parkgolf.app.data.remote.api.LocationApi
import com.parkgolf.app.data.remote.api.NotificationApi
import com.parkgolf.app.data.remote.api.PaymentApi
import com.parkgolf.app.data.remote.api.RoundApi
import com.parkgolf.app.data.remote.api.SettingsApi
import com.parkgolf.app.data.remote.api.UserApi
import com.parkgolf.app.data.remote.api.WeatherApi
import com.parkgolf.app.data.remote.socket.ChatSocketManager
import com.parkgolf.app.data.repository.AuthRepositoryImpl
import com.parkgolf.app.data.repository.BookingRepositoryImpl
import com.parkgolf.app.data.repository.ChatRepositoryImpl
import com.parkgolf.app.data.repository.FriendsRepositoryImpl
import com.parkgolf.app.data.repository.AccountRepositoryImpl
import com.parkgolf.app.data.repository.LocationWeatherRepositoryImpl
import com.parkgolf.app.data.repository.NotificationRepositoryImpl
import com.parkgolf.app.data.repository.PaymentRepositoryImpl
import com.parkgolf.app.data.repository.RoundRepositoryImpl
import com.parkgolf.app.data.repository.SettingsRepositoryImpl
import com.parkgolf.app.domain.repository.SettingsRepository
import com.parkgolf.app.data.repository.UserRepositoryImpl
import com.parkgolf.app.domain.repository.AccountRepository
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.FriendsRepository
import com.parkgolf.app.domain.repository.LocationWeatherRepository
import com.parkgolf.app.domain.repository.NotificationRepository
import com.parkgolf.app.domain.repository.PaymentRepository
import com.parkgolf.app.domain.repository.RoundRepository
import com.parkgolf.app.domain.repository.UserRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        authPreferences: AuthPreferences
    ): AuthRepository = AuthRepositoryImpl(authApi, authPreferences)

    @Provides
    @Singleton
    fun provideUserRepository(
        userApi: UserApi
    ): UserRepository = UserRepositoryImpl(userApi)

    @Provides
    @Singleton
    fun provideRoundRepository(
        roundApi: RoundApi
    ): RoundRepository = RoundRepositoryImpl(roundApi)

    @Provides
    @Singleton
    fun provideBookingRepository(
        bookingApi: BookingApi
    ): BookingRepository = BookingRepositoryImpl(bookingApi)

    @Provides
    @Singleton
    fun provideFriendsRepository(
        friendsApi: FriendsApi
    ): FriendsRepository = FriendsRepositoryImpl(friendsApi)

    @Provides
    @Singleton
    fun provideChatRepository(
        chatApi: ChatApi,
        chatSocketManager: ChatSocketManager
    ): ChatRepository = ChatRepositoryImpl(chatApi, chatSocketManager)

    @Provides
    @Singleton
    fun provideChatSocketManager(): ChatSocketManager = ChatSocketManager()

    @Provides
    @Singleton
    fun provideSettingsRepository(
        settingsApi: SettingsApi
    ): SettingsRepository = SettingsRepositoryImpl(settingsApi)

    @Provides
    @Singleton
    fun provideNotificationRepository(
        notificationApi: NotificationApi
    ): NotificationRepository = NotificationRepositoryImpl(notificationApi)

    @Provides
    @Singleton
    fun providePaymentRepository(
        paymentApi: PaymentApi
    ): PaymentRepository = PaymentRepositoryImpl(paymentApi)

    @Provides
    @Singleton
    fun provideClubRepository(
        clubApi: ClubApi
    ): ClubRepository = ClubRepositoryImpl(clubApi)

    @Provides
    @Singleton
    fun provideLocationWeatherRepository(
        locationApi: LocationApi,
        weatherApi: WeatherApi
    ): LocationWeatherRepository = LocationWeatherRepositoryImpl(locationApi, weatherApi)

    @Provides
    @Singleton
    fun provideAccountRepository(
        accountApi: AccountApi
    ): AccountRepository = AccountRepositoryImpl(accountApi)
}
