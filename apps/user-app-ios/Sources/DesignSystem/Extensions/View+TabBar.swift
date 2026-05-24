import SwiftUI

extension View {
    /// 서브화면(NavigationStack push)에서 하단 탭바를 숨긴다.
    /// Android(서브화면 = Scaffold 밖 풀스크린), Web 모바일(showTabBar=false)과 일관 (UNI-27).
    /// 탭 루트(홈/예약/소셜/마이)에는 적용하지 않는다.
    @ViewBuilder
    func subScreenTabBarHidden() -> some View {
        #if os(iOS)
        toolbar(.hidden, for: .tabBar)
        #else
        self
        #endif
    }
}
