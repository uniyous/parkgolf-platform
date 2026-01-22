package com.parkgolf.app.presentation.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.outlined.Groups
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.parkgolf.app.presentation.feature.auth.LoginScreen
import com.parkgolf.app.presentation.feature.auth.SignUpScreen
import com.parkgolf.app.presentation.feature.booking.BookingFormScreen
import com.parkgolf.app.presentation.feature.booking.MyBookingsScreen
import com.parkgolf.app.presentation.feature.chat.ChatRoomScreen
import com.parkgolf.app.presentation.feature.home.HomeScreen
import com.parkgolf.app.presentation.feature.search.GameSearchScreen
import com.parkgolf.app.presentation.feature.social.SocialScreen
import com.parkgolf.app.presentation.feature.profile.ProfileScreen
import com.parkgolf.app.presentation.theme.GlassCardDark
import com.parkgolf.app.presentation.theme.ParkBackgroundGradient
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.TextSecondary

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
        label = "검색",
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
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person
    )
)

@Composable
fun ParkGolfNavHost(
    navController: NavHostController = rememberNavController()
) {
    // TODO: Check authentication state from ViewModel
    val isLoggedIn = false // Placeholder

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

        composable(Screen.MyBookings.route) {
            MyBookingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onBookingClick = { bookingId ->
                    navController.navigate("booking/detail/$bookingId")
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
    }
}

@Composable
fun MainScreen(navController: NavHostController) {
    val bottomNavController = rememberNavController()
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = GlassCardDark
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
                        label = { Text(item.label) },
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
                            unselectedIconColor = TextSecondary,
                            unselectedTextColor = TextSecondary,
                            indicatorColor = Color.Transparent
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(ParkBackgroundGradient)
                .padding(innerPadding)
        ) {
            NavHost(
                navController = bottomNavController,
                startDestination = Screen.Home.route
            ) {
                composable(Screen.Home.route) {
                    HomeScreen(onNavigate = { route -> navController.navigate(route) })
                }
                composable(Screen.Search.route) {
                    GameSearchScreen(onNavigate = { route -> navController.navigate(route) })
                }
                composable(Screen.Social.route) {
                    SocialScreen(onNavigate = { route -> navController.navigate(route) })
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
            }
        }
    }
}
