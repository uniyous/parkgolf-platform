# Park Golf iOS App

iOS 네이티브 앱 - SwiftUI + Swift 6 기반

## 기술 스택

| 항목 | 기술 |
|------|------|
| **언어** | Swift 6.0 |
| **UI Framework** | SwiftUI |
| **최소 지원** | iOS 17.0+ |
| **아키텍처** | MVVM |
| **프로젝트 관리** | Tuist |
| **의존성 관리** | Swift Package Manager |
| **네트워킹** | Alamofire |
| **보안 저장소** | KeychainAccess |

## 프로젝트 구조

```
user-app-ios/
├── Tuist/
│   ├── Config.swift          # Tuist 전역 설정
│   └── Package.swift         # SPM 의존성 정의
├── Project.swift             # 프로젝트 정의 (타겟, 스킴 등)
├── Sources/
│   ├── App/                  # 앱 진입점
│   │   ├── ParkGolfApp.swift
│   │   └── ContentView.swift
│   ├── Features/             # 기능별 모듈
│   │   ├── Home/
│   │   ├── Booking/
│   │   ├── Chat/
│   │   └── Profile/
│   ├── Core/                 # 공통 코어
│   │   ├── Network/          # API 클라이언트, WebSocket
│   │   ├── Models/           # 데이터 모델
│   │   ├── Extensions/
│   │   └── Utils/
│   └── DesignSystem/         # UI 컴포넌트, 테마
├── Tests/
│   ├── UnitTests/
│   └── UITests/
└── Resources/
    ├── Assets.xcassets/
    └── Localizations/
```

## 개발 환경 설정

### 1. 필수 요구사항

```bash
# macOS Sonoma 14.0 이상 권장
sw_vers

# Xcode 15.0 이상 필수
xcode-select -p
xcodebuild -version

# Swift 6.0 이상
swift --version
```

### 2. Xcode 설치 (필수)

```bash
# App Store에서 Xcode 설치
# 또는 https://developer.apple.com/xcode/ 에서 다운로드

# Command Line Tools 설치
xcode-select --install

# 라이선스 동의
sudo xcodebuild -license accept
```

### 3. Tuist 설치

```bash
# Homebrew로 설치 (권장)
brew install tuist

# 또는 mise로 설치
mise install tuist

# 설치 확인
tuist version
```

### 4. 프로젝트 생성 및 실행

```bash
# 프로젝트 디렉토리로 이동
cd apps/user-app-ios

# 의존성 설치 및 Xcode 프로젝트 생성
tuist install
tuist generate

# Xcode에서 열기
open ParkGolf.xcworkspace

# 또는 CLI로 빌드
tuist build

# 테스트 실행
tuist test
```

## 아키텍처

### MVVM 패턴

```
View (SwiftUI)
    ↓ @StateObject / @ObservedObject
ViewModel (@MainActor, ObservableObject)
    ↓ async/await
Service / Repository
    ↓
Network Layer (APIClient)
```

### 데이터 흐름

```swift
// View
struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        // UI
    }
    .task {
        await viewModel.loadData()
    }
}

// ViewModel
@MainActor
final class HomeViewModel: ObservableObject {
    @Published var bookings: [Booking] = []

    func loadData() async {
        let response = try await apiClient.request(...)
        bookings = response.data
    }
}
```

## 주요 기능

### 1. 인증 (Auth)
- 이메일/비밀번호 로그인
- Apple 로그인
- 카카오 로그인
- 회원가입
- 비밀번호 재설정

### 2. 홈 (Home)
- 다가오는 예약 목록
- 주변 골프장
- 빠른 메뉴

### 3. 예약 (Booking)
- 예약 목록 조회
- 예약 상세
- 새 예약 생성
- 예약 취소

### 4. 채팅 (Chat)
- 채팅방 목록
- 실시간 메시지 (WebSocket)
- 그룹 채팅
- 예약 기반 채팅

### 5. 프로필 (Profile)
- 프로필 조회/수정
- 알림 설정
- 로그아웃

## API 연동

### REST API

```swift
// APIClient 사용
let response = try await APIClient.shared.request(
    BookingEndpoints.list(page: 1, limit: 20),
    responseType: Booking.self
)
```

### WebSocket (채팅)

```swift
// WebSocket 연결
let wsClient = WebSocketClient()
try await wsClient.connect(token: accessToken)

// 메시지 수신 핸들러
await wsClient.setMessageHandler { message in
    // 새 메시지 처리
}
```

## 테스트

### Unit Tests

```bash
# Tuist로 테스트 실행
tuist test --target ParkGolfTests

# 또는 Xcode에서 Cmd+U
```

### UI Tests

```bash
# UI 테스트 실행
tuist test --target ParkGolfUITests
```

### 테스트 커버리지

```bash
# 커버리지 리포트 생성
tuist test --coverage
```

## 빌드 및 배포

### Development 빌드

```bash
tuist build --configuration Debug
```

### Release 빌드

```bash
tuist build --configuration Release
```

### App Store 배포

```bash
# Archive 생성
tuist archive

# App Store Connect 업로드
# Xcode Organizer 또는 Transporter 앱 사용
```

## 코드 스타일

### Swift 스타일 가이드

- [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/) 준수
- SwiftLint 사용 권장

### 네이밍 컨벤션

```swift
// 타입: PascalCase
struct BookingView {}
class BookingViewModel {}

// 변수/함수: camelCase
let bookingList: [Booking]
func loadBookings() async {}

// 상수: camelCase
let maxRetryCount = 3
```

## 문제 해결

### Tuist 관련

```bash
# 캐시 정리
tuist clean

# 프로젝트 재생성
tuist generate --clean
```

### 빌드 오류

```bash
# DerivedData 정리
rm -rf ~/Library/Developer/Xcode/DerivedData

# SPM 캐시 정리
rm -rf ~/Library/Caches/org.swift.swiftpm
```

### 시뮬레이터

```bash
# 시뮬레이터 목록
xcrun simctl list devices

# 시뮬레이터 부팅
xcrun simctl boot "iPhone 15 Pro"
```

## 참고 자료

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)
- [Tuist Documentation](https://docs.tuist.io)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
