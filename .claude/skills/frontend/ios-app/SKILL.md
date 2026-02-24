---
name: ios-app
description: iOS 앱 개발 가이드. SwiftUI + MVVM + Combine, Actor APIClient, ViewModel 패턴, Tuist 프로젝트. 트리거 키워드 - iOS, Swift, SwiftUI, 아이폰, iPhone, Tuist
---

# iOS App Guide (user-app-ios)

SwiftUI + MVVM + Combine 기반 iOS 앱 개발 가이드

---

## 1. 아키텍처

| 항목 | 기술 |
|------|------|
| UI | SwiftUI |
| 아키텍처 | MVVM |
| 비동기 | Swift Concurrency (async/await) + Combine |
| 네트워크 | Alamofire |
| 인증 저장 | KeychainAccess |
| WebSocket | SocketIO |
| 결제 | TossPayments SDK |
| 프로젝트 관리 | Tuist |
| Swift 버전 | Swift 6 |
| 최소 지원 | iOS 17+ |

---

## 2. 폴더 구조

```
Sources/
├── App/
│   ├── ParkGolfApp.swift          # 앱 진입점
│   └── ContentView.swift
├── Core/
│   ├── Network/
│   │   ├── APIClient.swift        # Actor 기반 HTTP 클라이언트
│   │   ├── APIEndpoint.swift      # 엔드포인트 정의
│   │   ├── AuthService.swift      # 인증 서비스 (토큰 관리)
│   │   └── ChatSocketManager.swift # Socket.IO 관리
│   ├── Models/                    # 데이터 모델 (Codable)
│   └── Utils/
│       ├── Configuration.swift    # 환경 설정
│       ├── LocationManager.swift  # CLLocationManager 싱글톤
│       └── Helpers/
├── Features/
│   ├── Auth/
│   │   ├── AuthView.swift
│   │   └── AuthViewModel.swift
│   ├── Booking/
│   │   ├── BookingView.swift
│   │   └── BookingViewModel.swift
│   ├── Chat/
│   │   ├── ChatView.swift
│   │   └── ChatViewModel.swift
│   └── {Feature}/
│       ├── {Feature}View.swift
│       └── {Feature}ViewModel.swift
└── Resources/
```

---

## 3. 네트워크 레이어

### Actor-based APIClient

```swift
actor APIClient {
    static let shared = APIClient()

    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        // 토큰 갱신, 재시도 로직 포함
    }
}
```

### Service 레이어

```swift
// Features/Booking/BookingService.swift
enum BookingService {
    static func getBookings() async throws -> [Booking] {
        try await APIClient.shared.request(.bookings(.list))
    }

    static func createBooking(_ dto: CreateBookingDto) async throws -> Booking {
        try await APIClient.shared.request(.bookings(.create(dto)))
    }
}
```

---

## 4. MVVM 패턴

### ViewModel

```swift
@MainActor
final class BookingViewModel: ObservableObject {
    @Published var bookings: [Booking] = []
    @Published var isLoading = false
    @Published var error: String?

    func loadBookings() async {
        isLoading = true
        defer { isLoading = false }

        do {
            bookings = try await BookingService.getBookings()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

### View

```swift
struct BookingView: View {
    @StateObject private var viewModel = BookingViewModel()

    var body: some View {
        List(viewModel.bookings) { booking in
            BookingRow(booking: booking)
        }
        .task {
            await viewModel.loadBookings()
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
    }
}
```

---

## 5. 주요 유틸리티

### LocationManager

```swift
// 싱글톤, CLLocationManagerDelegate
LocationManager.shared
```

- 위치 권한: Project.swift Info.plist에 이미 등록
- `NSLocationWhenInUseUsageDescription`

### Configuration

```swift
// 환경별 API URL 등 설정
Configuration.apiBaseURL  // → "https://dev-api.parkgolfmate.com"
```

---

## 6. Tuist 프로젝트

```bash
# 프로젝트 생성
cd apps/user-app-ios
tuist generate

# Xcode에서 열기
open ParkGolf.xcworkspace
```

- `Project.swift`에서 타겟, 의존성, Info.plist 관리
- 파일 추가 시 Tuist 타겟에 등록 필요

---

## 7. 금지 패턴

```swift
// ❌ View에서 직접 API 호출
struct MyView: View {
    var body: some View {
        Button("Load") { await APIClient.shared.request(.some) }
    }
}

// ✅ ViewModel을 통해 호출
struct MyView: View {
    @StateObject var viewModel = MyViewModel()
    var body: some View {
        Button("Load") { await viewModel.load() }
    }
}

// ❌ ObservableObject 없이 상태 관리
// ❌ 네트워크 호출 결과를 View의 @State에 직접 저장
// ❌ APIClient를 직접 생성 (싱글톤 사용)
```
