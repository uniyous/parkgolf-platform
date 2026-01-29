package com.parkgolf.app.presentation.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Search
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.GradientStart
import com.parkgolf.app.presentation.theme.ParkPrimary
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.parkgolf.app.presentation.feature.auth.LoginScreen
import com.parkgolf.app.presentation.feature.auth.SignUpScreen
import com.parkgolf.app.presentation.feature.booking.BookingFormScreen
import com.parkgolf.app.presentation.feature.booking.MyBookingsScreen
import com.parkgolf.app.presentation.feature.chat.ChatRoomScreen
import com.parkgolf.app.presentation.feature.home.FriendRequestsScreen
import com.parkgolf.app.presentation.feature.home.HomeScreen
import com.parkgolf.app.presentation.feature.home.UnreadChatsScreen
import com.parkgolf.app.presentation.feature.notifications.NotificationsScreen
import com.parkgolf.app.presentation.feature.profile.AnnouncementsScreen
import com.parkgolf.app.presentation.feature.profile.ChangePasswordScreen
import com.parkgolf.app.presentation.feature.profile.ContactScreen
import com.parkgolf.app.presentation.feature.profile.DeleteAccountScreen
import com.parkgolf.app.presentation.feature.profile.EditProfileScreen
import com.parkgolf.app.presentation.feature.profile.FaqScreen
import com.parkgolf.app.presentation.feature.profile.LanguageSettingsScreen
import com.parkgolf.app.presentation.feature.profile.PrivacyScreen
import com.parkgolf.app.presentation.feature.profile.TermsScreen
import com.parkgolf.app.presentation.feature.profile.ThemeSettingsScreen
import com.parkgolf.app.presentation.feature.profile.NotificationSettingsScreen
import com.parkgolf.app.presentation.feature.profile.PaymentMethodsScreen
import com.parkgolf.app.presentation.feature.profile.ProfileScreen
import com.parkgolf.app.presentation.feature.profile.SettingsScreen
import com.parkgolf.app.presentation.feature.booking.RoundBookingScreen
import com.parkgolf.app.presentation.feature.social.SocialScreen
import com.parkgolf.app.presentation.components.PasswordChangeReminderDialog
import com.parkgolf.app.data.remote.auth.AuthEvent
import com.parkgolf.app.data.remote.auth.AuthEventBus
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Park Golf Navigation
 *
 * Material Design 3 스타일 네비게이션
 */

data class BottomNavItemData(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItemData(
        route = Screen.Home.route,
        label = "홈",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    ),
    BottomNavItemData(
        route = Screen.Search.route,
        label = "예약",
        selectedIcon = Icons.Filled.Search,
        unselectedIcon = Icons.Outlined.Search
    ),
    BottomNavItemData(
        route = Screen.Social.route,
        label = "소셜",
        selectedIcon = Icons.Filled.Groups,
        unselectedIcon = Icons.Outlined.Groups
    ),
    BottomNavItemData(
        route = Screen.Profile.route,
        label = "마이",
        selectedIcon = Icons.Filled.AccountCircle,
        unselectedIcon = Icons.Outlined.AccountCircle
    )
)

@Composable
fun ParkGolfNavHost(
    navController: NavHostController = rememberNavController(),
    authEventBus: AuthEventBus? = null
) {
    // TODO: Check authentication state from ViewModel
    val isLoggedIn = false // Placeholder

    // Handle session expired events from TokenAuthenticator
    if (authEventBus != null) {
        LaunchedEffect(authEventBus) {
            authEventBus.events.collect { event ->
                when (event) {
                    is AuthEvent.SessionExpired -> {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) "main" else Screen.Login.route
    ) {
        // Auth screens
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("main") {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToSignUp = {
                    navController.navigate(Screen.SignUp.route)
                }
            )
        }

        composable(Screen.SignUp.route) {
            SignUpScreen(
                onSignUpSuccess = {
                    navController.navigate("main") {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // Main screen with bottom navigation
        composable("main") {
            MainScreen(navController = navController)
        }

        // Booking screens
        composable(
            route = "booking/{gameId}",
            arguments = listOf(navArgument("gameId") { type = NavType.IntType })
        ) { backStackEntry ->
            val gameId = backStackEntry.arguments?.getInt("gameId") ?: 0
            BookingFormScreen(
                gameId = gameId,
                onNavigateBack = { navController.popBackStack() },
                onBookingComplete = { bookingId ->
                    navController.navigate("booking/complete/$bookingId") {
                        popUpTo("main")
                    }
                }
            )
        }

        // Chat screen
        composable(
            route = "chat/{roomId}",
            arguments = listOf(navArgument("roomId") { type = NavType.StringType })
        ) { backStackEntry ->
            val roomId = backStackEntry.arguments?.getString("roomId") ?: ""
            ChatRoomScreen(
                roomId = roomId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Social screen (separate from bottom nav for full screen)
        composable(Screen.Social.route) {
            SocialScreen(
                onNavigate = { route -> navController.navigate(route) }
            )
        }

        // Profile screens
        composable(Screen.EditProfile.route) {
            EditProfileScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.NotificationSettings.route) {
            NotificationSettingsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.ChangePassword.route) {
            ChangePasswordScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.PaymentMethods.route) {
            PaymentMethodsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.DeleteAccount.route) {
            DeleteAccountScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.ThemeSettings.route) {
            ThemeSettingsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.LanguageSettings.route) {
            LanguageSettingsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Announcements.route) {
            AnnouncementsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Faq.route) {
            FaqScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Contact.route) {
            ContactScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Terms.route) {
            TermsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Privacy.route) {
            PrivacyScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigate = { route -> navController.navigate(route) }
            )
        }

        // My Bookings screen (accessed from Profile menu)
        composable(Screen.MyBookings.route) {
            MyBookingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onBookingClick = { bookingId ->
                    // Booking detail is shown in bottom sheet, no navigation needed
                }
            )
        }

        // Friend Requests screen (from Home notification card)
        composable(Screen.FriendRequests.route) {
            FriendRequestsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Unread Chats screen (from Home notification card)
        composable(Screen.UnreadChats.route) {
            UnreadChatsScreen(
                onNavigateBack = { navController.popBackStack() },
                onChatRoomClick = { roomId -> navController.navigate("chat/$roomId") }
            )
        }

        // Notifications screen (from Home header bell icon)
        composable(Screen.Notifications.route) {
            NotificationsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigate = { route -> navController.navigate(route) }
            )
        }
    }
}

@Composable
fun MainScreen(
    navController: NavHostController,
    viewModel: MainViewModel = hiltViewModel()
) {
    val bottomNavController = rememberNavController()
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val uiState by viewModel.uiState.collectAsState()

    // Bottom bar visibility
    val bottomBarVisible = rememberSaveable { mutableStateOf(true) }

    // Password Change Reminder Dialog
    if (uiState.showPasswordReminder) {
        PasswordChangeReminderDialog(
            daysSinceChange = uiState.passwordExpiryInfo?.daysSinceChange,
            onChangeNow = {
                viewModel.onDismissReminder()
                navController.navigate(Screen.ChangePassword.route)
            },
            onLater = {
                viewModel.onSkipPasswordChange()
            }
        )
    }

    Scaffold(
        bottomBar = {
            AnimatedVisibility(
                visible = bottomBarVisible.value,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it })
            ) {
                NavigationBar(
                    containerColor = GradientStart,
                    contentColor = Color.White,
                    tonalElevation = 0.dp
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true

                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.label
                                )
                            },
                            label = {
                                Text(
                                    text = item.label,
                                    style = MaterialTheme.typography.labelSmall
                                )
                            },
                            selected = selected,
                            onClick = {
                                bottomNavController.navigate(item.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = ParkPrimary,
                                selectedTextColor = ParkPrimary,
                                unselectedIconColor = Color.White.copy(alpha = 0.6f),
                                unselectedTextColor = Color.White.copy(alpha = 0.6f),
                                indicatorColor = Color.Transparent
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            color = MaterialTheme.colorScheme.background
        ) {
            NavHost(
                navController = bottomNavController,
                startDestination = Screen.Home.route
            ) {
                composable(Screen.Home.route) {
                    HomeScreen(
                        onNavigate = { route ->
                            // 바텀 네비게이션 탭으로 이동하는 경우
                            if (route == Screen.Search.route) {
                                bottomNavController.navigate(route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            } else {
                                // 다른 화면(상세, 설정 등)으로 이동
                                navController.navigate(route)
                            }
                        }
                    )
                }
                composable(Screen.Search.route) {
                    RoundBookingScreen(
                        onNavigate = { route -> navController.navigate(route) }
                    )
                }
                composable(Screen.Profile.route) {
                    ProfileScreen(
                        onNavigate = { route -> navController.navigate(route) },
                        onLogout = {
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    )
                }
                composable(Screen.Social.route) {
                    SocialScreen(
                        onNavigate = { route -> navController.navigate(route) }
                    )
                }
            }
        }
    }
}
