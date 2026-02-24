---
name: android-app
description: Android 앱 개발 가이드. Kotlin + Jetpack Compose + MVVM + Clean Architecture + Hilt. Retrofit, Repository 패턴, ViewModel. 트리거 키워드 - Android, Kotlin, Compose, 안드로이드
---

# Android App Guide (user-app-android)

Kotlin + Jetpack Compose + MVVM + Clean Architecture 기반 Android 앱 개발 가이드

---

## 1. 아키텍처

| 항목 | 기술 |
|------|------|
| UI | Jetpack Compose |
| 아키텍처 | MVVM + Clean Architecture |
| DI | Hilt |
| 네트워크 | Retrofit + OkHttp |
| 인증 저장 | DataStore (AuthPreferences) |
| WebSocket | Socket.IO |
| 비동기 | Kotlin Coroutines + Flow |
| 결제 | Toss Payments SDK |

---

## 2. 패키지 구조

```
com.parkgolf.app/
├── data/
│   ├── remote/
│   │   ├── api/           # Retrofit 인터페이스 (AuthApi, BookingApi...)
│   │   ├── dto/           # 서버 응답 DTO (ApiResponse<T>)
│   │   ├── interceptor/   # AuthInterceptor, TokenAuthenticator
│   │   └── socket/        # ChatSocketManager
│   ├── local/
│   │   └── datastore/     # DataStore (AuthPreferences)
│   ├── repository/        # Repository 구현체
│   └── mapper/            # DTO → Domain 매퍼
├── domain/
│   ├── model/             # 도메인 모델 (Booking, User, Friend...)
│   └── repository/        # Repository 인터페이스
├── presentation/
│   ├── feature/
│   │   └── {Feature}/     # Screen + ViewModel
│   ├── components/        # 공통 UI 컴포넌트
│   ├── navigation/        # NavHost, 화면 라우팅
│   └── theme/             # Color, Typography, Shape
├── di/                    # Hilt 모듈
│   ├── NetworkModule.kt
│   └── RepositoryModule.kt
└── util/                  # 확장 함수, 유틸리티
```

---

## 3. DI 모듈

### NetworkModule

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient

    @Provides @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit

    @Provides @Singleton
    fun provideBookingApi(retrofit: Retrofit): BookingApi =
        retrofit.create(BookingApi::class.java)
}
```

### RepositoryModule

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds @Singleton
    abstract fun bindBookingRepository(impl: BookingRepositoryImpl): BookingRepository
}
```

---

## 4. 네트워크 레이어

### Retrofit API

```kotlin
interface BookingApi {
    @GET("api/user/bookings")
    suspend fun getBookings(): ApiResponse<List<BookingDto>>

    @POST("api/user/bookings")
    suspend fun createBooking(@Body dto: CreateBookingDto): ApiResponse<BookingDto>
}
```

### DTO → Domain 매퍼

```kotlin
// data/mapper/BookingMapper.kt
fun BookingDto.toDomain(): Booking = Booking(
    id = id,
    clubName = clubName,
    date = LocalDate.parse(date),
    // ...
)
```

### AuthInterceptor

- 요청 헤더에 `Authorization: Bearer {token}` 자동 추가
- `TokenAuthenticator`로 401 시 토큰 갱신 + 재시도

---

## 5. Repository 패턴

### Interface (domain)

```kotlin
interface BookingRepository {
    fun getBookings(): Flow<Result<List<Booking>>>
    suspend fun createBooking(dto: CreateBookingDto): Result<Booking>
}
```

### Implementation (data)

```kotlin
class BookingRepositoryImpl @Inject constructor(
    private val api: BookingApi,
) : BookingRepository {
    override fun getBookings(): Flow<Result<List<Booking>>> = flow {
        val response = api.getBookings()
        emit(Result.success(response.data.map { it.toDomain() }))
    }.catch { emit(Result.failure(it)) }
}
```

---

## 6. ViewModel 패턴

```kotlin
@HiltViewModel
class BookingViewModel @Inject constructor(
    private val repository: BookingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<BookingUiState>(BookingUiState.Loading)
    val uiState: StateFlow<BookingUiState> = _uiState.asStateFlow()

    init {
        loadBookings()
    }

    private fun loadBookings() {
        viewModelScope.launch {
            repository.getBookings().collect { result ->
                _uiState.value = result.fold(
                    onSuccess = { BookingUiState.Success(it) },
                    onFailure = { BookingUiState.Error(it.message ?: "오류 발생") },
                )
            }
        }
    }
}

sealed interface BookingUiState {
    data object Loading : BookingUiState
    data class Success(val bookings: List<Booking>) : BookingUiState
    data class Error(val message: String) : BookingUiState
}
```

---

## 7. Compose Screen

```kotlin
@Composable
fun BookingScreen(
    viewModel: BookingViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    when (val s = state) {
        is BookingUiState.Loading -> LoadingIndicator()
        is BookingUiState.Success -> BookingList(s.bookings)
        is BookingUiState.Error -> ErrorMessage(s.message)
    }
}
```

---

## 8. 빌드 & 실행

```bash
cd apps/user-app-android
./gradlew assembleDebug
```

---

## 9. 금지 패턴

```kotlin
// ❌ Composable에서 직접 API 호출
@Composable
fun MyScreen() {
    val data = remember { api.fetch() }
}

// ✅ ViewModel + collectAsStateWithLifecycle
@Composable
fun MyScreen(viewModel: MyViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
}

// ❌ Repository 없이 API 직접 호출 (ViewModel → Api)
// ❌ 구현체를 직접 생성 (Hilt @Inject 사용)
// ❌ GlobalScope 사용 (viewModelScope 사용)
```
