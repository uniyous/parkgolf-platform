# TabBar / 내비게이션 노출 구성

> 최종 수정: 2026-05-24 · 관련: UNI-27

모바일 하단 TabBar(및 데스크탑 상단 메뉴)의 화면별 노출 규칙. 4개 플랫폼-모드를 일관되게 맞춘다.

## 원칙

> **서브화면 = 풀스크린.** 하단 TabBar는 메인 4탭에서만 노출하고, 서브화면(상세·설정·편집·채팅방 등)에서는 숨긴다. **기준 = Android.**
> 단, **Web 데스크탑 상단 메뉴는 항상 유지**(데스크탑 관례).

메인 탭 4개: **홈 / 예약 / 소셜 / 마이**.

## 4분류

| 분류 | 내비 | 메인 4탭 | 서브화면 | 비고 |
| -- | -- | -- | -- | -- |
| ① Web 데스크탑 (≥768px) | 상단 메뉴 (`DesktopNavHeader`) | 표시 | **표시(유지)** | 데스크탑 관례 — 항상 노출 |
| ② Web 모바일 (<768px) | 하단 TabBar (`MobileTabBar`) | 표시 | **숨김** | `AppLayout showTabBar={false}` |
| ③ iOS | 하단 TabBar (`TabView`) | 표시 | **숨김** | `.subScreenTabBarHidden()` |
| ④ Android | 하단 NavigationBar (`Scaffold`) | 표시 | **숨김** | 서브화면 = root destination |

## 플랫폼별 구현

### ① Web 데스크탑 — `DesktopNavHeader` (`hidden md:block`)
`AppLayout`에 항상 렌더. 화면별 토글 없음. 변경 대상 아님.

### ② Web 모바일 — `MobileTabBar` (`md:hidden`)
`AppLayout`의 `showTabBar`(기본 `true`)로 제어.
- 메인 페이지: 기본값(생략) → 표시
- **서브 페이지: `<AppLayout title="..." showTabBar={false}>`**

```tsx
// 서브 페이지 예
return <AppLayout title="골프장 정보" showTabBar={false}>...</AppLayout>;
```
`showTabBar={false}`는 하단 TabBar만 제거하며 데스크탑 상단 메뉴(`hidden md:block`)에는 영향 없음.

### ③ iOS — `TabView` + 탭별 `NavigationStack`
탭별 `NavigationStack`에서 `NavigationLink`로 push된 서브화면은 기본적으로 TabBar가 유지된다. 서브화면 body 루트(또는 push destination)에 헬퍼를 적용해 숨긴다.

```swift
// DesignSystem/Extensions/View+TabBar.swift
extension View {
    func subScreenTabBarHidden() -> some View {
        #if os(iOS)
        toolbar(.hidden, for: .tabBar)
        #else
        self
        #endif
    }
}

// 서브뷰 body 루트
.navigationBarTitleDisplayMode(.inline)
.subScreenTabBarHidden()
```
탭 루트(`HomeView`·`RoundBookingView`·`SocialView`·`ProfileView`)에는 적용하지 않는다. `RoundBookingView`는 예약 탭이자 push 대상(이중 용도)이므로, **push하는 call site**에만 `.subScreenTabBarHidden()`을 붙인다.

### ④ Android — `Scaffold` bottomBar
`MainScreen`의 `Scaffold`(bottomBar=4탭)는 메인 탭만 호스팅하고, 서브화면은 root `NavHost`의 별도 destination이라 `Scaffold` 밖 → 자동 풀스크린. 기준이며 변경 없음.

## 새 화면 추가 시 체크리스트

- 메인 탭(홈/예약/소셜/마이)인가? → 하단 바 유지 (기본)
- 서브화면인가? →
  - Web: `AppLayout`에 `showTabBar={false}`
  - iOS: 서브뷰 body 루트(또는 push destination)에 `.subScreenTabBarHidden()`
  - Android: root `NavHost`의 별도 destination으로 추가(자동 풀스크린)
