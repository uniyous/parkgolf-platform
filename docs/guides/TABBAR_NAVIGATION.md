# 내비게이션 / 화면 구성 (메인 vs 서브)

> 최종 수정: 2026-05-24 · 관련: UNI-27

메인 화면과 서브화면의 내비게이션·헤더 구성 규칙. 4개 플랫폼-모드를 일관되게 맞춘다.

## 원칙

> **메인 4탭 = 내비 chrome / 그 외 서브화면 = 전체화면.**
> 메인 페이지(홈/예약/소셜/마이)만 내비게이션(데스크탑 상단 메뉴 · 모바일 하단 바)을 노출한다.
> 서브화면(상세·설정·편집·채팅방 등)은 **전체화면 + 뒤로가기 헤더**로 통일한다. **기준 = Android.**

메인 탭 4개: **홈 / 예약 / 소셜 / 마이**.

## 4분류

| 분류 | 메인 4탭 | 서브화면 |
| -- | -- | -- |
| ① Web 데스크탑 (≥768px) | `AppLayout` → 상단 메뉴(`DesktopNavHeader`) | **전체화면 + `SubPageHeader`**(뒤로가기) |
| ② Web 모바일 (<768px) | `AppLayout` → 하단 TabBar(`MobileTabBar`) | **전체화면 + `SubPageHeader`**(뒤로가기) |
| ③ iOS | `TabView` 탭바 | **push + `.subScreenTabBarHidden()`** |
| ④ Android | `Scaffold` 하단 NavigationBar | **root destination 전체화면** |

웹 서브화면은 데스크탑·모바일 공통으로 `SubPageHeader`(뒤로가기+제목)만 노출하는 전체화면이다.

## 플랫폼별 구현

### Web — 메인은 `AppLayout`, 서브는 `SubPageHeader`

**메인 페이지** (`HomePage`·`BookingsPage`·`SocialPage`·`ProfilePage`): `AppLayout` 사용.
- 데스크탑: `DesktopNavHeader`(`hidden md:block`) 상단 메뉴
- 모바일: `MobileHeader` + `MobileTabBar`(`md:hidden`) 하단 바

**서브 페이지** (골프장상세·예약내역·프로필수정·설정류·알림·채팅방·예약상세 등): `AppLayout` 대신 전체화면 + `SubPageHeader`.

```tsx
import { SubPageHeader, Container } from '@/components/layout';

return (
  <div className="min-h-screen bg-[var(--color-bg-primary)]">
    <SubPageHeader title="골프장 정보" />        {/* 뒤로가기 navigate(-1) 기본 */}
    <Container className="py-4 md:py-6 space-y-4">...</Container>
  </div>
);
```
- `SubPageHeader`는 `md:hidden`이 아니라 **데스크탑·모바일 공통** 노출 → 두 모드 모두 동일한 전체화면.
- 우측 액션은 `rightContent`, 뒤로가기 커스텀은 `onBack` (숨기려면 `onBack={false}`).
- 메인 4탭만 `AppLayout`을 쓰므로 서브화면엔 상단 메뉴·하단 바가 모두 없다.

> 참고: `AppLayout`의 `showTabBar` prop은 메인 페이지 내부에서 하단 바를 끄는 용도로 남아있다(현재 서브화면은 `SubPageHeader`로 분리되어 불필요).

### iOS — `TabView` + 탭별 `NavigationStack`

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

### Android — `Scaffold` bottomBar

`MainScreen`의 `Scaffold`(bottomBar=4탭)는 메인 탭만 호스팅하고, 서브화면은 root `NavHost`의 별도 destination이라 `Scaffold` 밖 → 자동 풀스크린. 기준이며 변경 없음.

## 새 화면 추가 시 체크리스트

- 메인 탭(홈/예약/소셜/마이)인가? → 내비 chrome 유지
  - Web: `AppLayout`
  - iOS: `TabView` 탭 추가 / Android: `Scaffold` bottomNav
- 서브화면인가? → 전체화면
  - Web: `<div className="min-h-screen ..."><SubPageHeader title=.../>...</div>` (AppLayout 사용 안 함)
  - iOS: 서브뷰 body 루트(또는 push destination)에 `.subScreenTabBarHidden()`
  - Android: root `NavHost`의 별도 destination으로 추가(자동 풀스크린)
