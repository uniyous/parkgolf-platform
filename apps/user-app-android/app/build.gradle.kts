plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.parkgolf.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.parkgolf.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            buildConfigField("String", "API_BASE_URL", "\"https://dev-api.parkgolfmate.com/\"")
            // GKE dev domain for chat socket
            buildConfigField("String", "CHAT_SOCKET_URL", "\"https://dev-api.parkgolfmate.com\"")
            buildConfigField("String", "TOSS_CLIENT_KEY", "\"test_ck_yL0qZ4G1VOapeeLL1gNO8oWb2MQY\"")
        }
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", "\"https://api.parkgolfmate.com/\"")
            // GKE prod domain for chat socket
            buildConfigField("String", "CHAT_SOCKET_URL", "\"https://api.parkgolfmate.com\"")
            buildConfigField("String", "TOSS_CLIENT_KEY", "\"live_ck_REPLACE_WITH_PRODUCTION_KEY\"")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
        viewBinding = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material)
    implementation(libs.androidx.material.icons.extended)

    // Navigation
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.hilt.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    // Socket.IO
    implementation(libs.socketio) {
        exclude(group = "org.json", module = "json")
    }

    // DataStore
    implementation(libs.datastore.preferences)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // Image Loading
    implementation(libs.coil.compose)

    // Accompanist
    implementation(libs.accompanist.permissions)

    // TossPayments
    implementation(libs.tosspayments)

    // Testing
    testImplementation(libs.junit)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.kotlinx.coroutines.test)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}

ksp {
    arg("dagger.hilt.disableModulesHaveInstallInCheck", "true")
}

