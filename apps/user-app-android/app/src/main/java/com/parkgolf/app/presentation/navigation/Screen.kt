package com.parkgolf.app.presentation.navigation

sealed class Screen(val route: String) {
    // Auth
    data object Login : Screen("login")
    data object SignUp : Screen("signup")
    data object ForgotPassword : Screen("forgot_password")

    // Main Tabs
    data object Home : Screen("home")
    data object Search : Screen("search")
    data object Social : Screen("social")
    data object Profile : Screen("profile")

    // Booking Flow
    data object BookingForm : Screen("booking/{gameId}/{timeSlotId}") {
        fun createRoute(gameId: Int, timeSlotId: Int) = "booking/$gameId/$timeSlotId"
    }
    data object BookingComplete : Screen("booking/complete/{bookingId}") {
        fun createRoute(bookingId: String) = "booking/complete/$bookingId"
    }
    data object MyBookings : Screen("my_bookings")
    data object BookingDetail : Screen("booking/detail/{bookingId}") {
        fun createRoute(bookingId: String) = "booking/detail/$bookingId"
    }

    // Chat
    data object ChatRoom : Screen("chat/{roomId}") {
        fun createRoute(roomId: String) = "chat/$roomId"
    }
    data object NewChat : Screen("chat/new")

    // Friends
    data object AddFriend : Screen("friends/add")
    data object FriendRequests : Screen("friends/requests")
    data object UnreadChats : Screen("chats/unread")

    // Profile
    data object EditProfile : Screen("profile/edit")
    data object Settings : Screen("settings")
    data object NotificationSettings : Screen("settings/notifications")
    data object ChangePassword : Screen("settings/change_password")
    data object PaymentMethods : Screen("settings/payment")
    data object DeleteAccount : Screen("settings/delete_account")
    data object ThemeSettings : Screen("settings/theme")
    data object LanguageSettings : Screen("settings/language")
    data object Announcements : Screen("settings/announcements")
    data object Faq : Screen("settings/faq")
    data object Contact : Screen("settings/contact")
    data object Terms : Screen("settings/terms")
    data object Privacy : Screen("settings/privacy")
}

// Bottom Navigation Items
enum class BottomNavItem(
    val route: String,
    val label: String,
    val iconName: String
) {
    HOME("home", "홈", "home"),
    SEARCH("search", "검색", "search"),
    SOCIAL("social", "소셜", "people"),
    PROFILE("profile", "마이", "person")
}
