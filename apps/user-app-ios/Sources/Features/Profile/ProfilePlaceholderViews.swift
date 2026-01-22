import SwiftUI

// MARK: - Payment Methods View

struct PaymentMethodsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "creditcard.fill",
                title: "결제 수단",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("결제 수단")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - My Stats View

struct MyStatsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "chart.bar.fill",
                title: "내 통계",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("내 통계")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - App Theme

enum AppTheme: String, CaseIterable {
    case system = "system"
    case dark = "dark"

    var displayName: String {
        switch self {
        case .system: return "시스템 설정"
        case .dark: return "다크 모드"
        }
    }

    var icon: String {
        switch self {
        case .system: return "iphone"
        case .dark: return "moon.fill"
        }
    }

    var description: String {
        switch self {
        case .system: return "iOS 시스템 설정을 따릅니다"
        case .dark: return "항상 다크 모드를 사용합니다"
        }
    }
}

// MARK: - Theme Settings View

struct ThemeSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("app.theme") private var selectedTheme: String = AppTheme.dark.rawValue

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.md) {
                    // 안내 문구
                    GlassCard {
                        HStack(spacing: ParkSpacing.sm) {
                            Image(systemName: "info.circle.fill")
                                .foregroundStyle(Color.parkInfo)

                            Text("이 앱은 다크 모드에 최적화되어 있습니다.")
                                .font(.parkBodySmall)
                                .foregroundStyle(.white.opacity(0.8))

                            Spacer()
                        }
                    }

                    // 테마 선택
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "테마 선택", icon: "paintbrush.fill")

                            ForEach(AppTheme.allCases, id: \.rawValue) { theme in
                                ThemeOptionRow(
                                    theme: theme,
                                    isSelected: selectedTheme == theme.rawValue,
                                    onSelect: {
                                        selectedTheme = theme.rawValue
                                    }
                                )
                            }
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.top, ParkSpacing.sm)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("테마")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - Theme Option Row

struct ThemeOptionRow: View {
    let theme: AppTheme
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: ParkSpacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(Color.parkPrimary.opacity(0.2))
                        .frame(width: 40, height: 40)

                    Image(systemName: theme.icon)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.parkPrimary)
                }

                // Text
                VStack(alignment: .leading, spacing: 2) {
                    Text(theme.displayName)
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white)

                    Text(theme.description)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? Color.parkPrimary : .white.opacity(0.3))
            }
            .padding(.vertical, ParkSpacing.xs)
        }
    }
}

// MARK: - Language Settings View

struct LanguageSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    private var currentLanguage: String {
        let preferredLanguage = Locale.preferredLanguages.first ?? "ko"
        if preferredLanguage.starts(with: "ko") {
            return "한국어"
        } else if preferredLanguage.starts(with: "en") {
            return "English"
        } else if preferredLanguage.starts(with: "ja") {
            return "日本語"
        } else if preferredLanguage.starts(with: "zh") {
            return "中文"
        }
        return preferredLanguage
    }

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.md) {
                    // 현재 언어 표시
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "현재 언어", icon: "globe")

                            HStack(spacing: ParkSpacing.md) {
                                ZStack {
                                    Circle()
                                        .fill(Color.parkSuccess.opacity(0.2))
                                        .frame(width: 40, height: 40)

                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 16))
                                        .foregroundStyle(Color.parkSuccess)
                                }

                                Text(currentLanguage)
                                    .font(.parkBodyMedium)
                                    .foregroundStyle(.white)

                                Spacer()
                            }
                            .padding(.vertical, ParkSpacing.xs)
                        }
                    }

                    // 안내 카드
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.md) {
                            HStack(spacing: ParkSpacing.sm) {
                                Image(systemName: "info.circle.fill")
                                    .foregroundStyle(Color.parkInfo)

                                Text("언어 변경 안내")
                                    .font(.parkHeadlineSmall)
                                    .foregroundStyle(.white)

                                Spacer()
                            }

                            Text("앱 언어는 iOS 시스템 설정에서 변경할 수 있습니다.\n\n설정 > 일반 > 언어 및 지역 > 앱 언어")
                                .font(.parkBodySmall)
                                .foregroundStyle(.white.opacity(0.8))
                                .lineSpacing(4)

                            Button {
                                openLanguageSettings()
                            } label: {
                                HStack {
                                    Image(systemName: "gear")
                                    Text("시스템 설정 열기")
                                }
                                .font(.parkLabelMedium)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, ParkSpacing.sm)
                                .background(Color.parkPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                            }
                        }
                    }

                    // 지원 언어 목록
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "지원 언어", icon: "list.bullet")

                            LanguageRow(language: "한국어", code: "ko", isCurrentLanguage: currentLanguage == "한국어")
                            LanguageRow(language: "English", code: "en", isCurrentLanguage: currentLanguage == "English")
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.top, ParkSpacing.sm)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("언어")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private func openLanguageSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Language Row

struct LanguageRow: View {
    let language: String
    let code: String
    let isCurrentLanguage: Bool

    var body: some View {
        HStack(spacing: ParkSpacing.md) {
            Text(language)
                .font(.parkBodyMedium)
                .foregroundStyle(.white)

            Text("(\(code))")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.5))

            Spacer()

            if isCurrentLanguage {
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.parkPrimary)
            }
        }
        .padding(.vertical, ParkSpacing.xs)
    }
}

// MARK: - Announcements View

struct AnnouncementsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "megaphone.fill",
                title: "공지사항",
                description: "새로운 공지사항이 없습니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("공지사항")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - FAQ View

struct FAQView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "questionmark.circle.fill",
                title: "자주 묻는 질문",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("자주 묻는 질문")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - Contact Us View

struct ContactUsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "envelope.fill",
                title: "문의하기",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("문의하기")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - Previews

#Preview("Payment Methods") {
    NavigationStack {
        PaymentMethodsView()
    }
}

#Preview("My Stats") {
    NavigationStack {
        MyStatsView()
    }
}

#Preview("Theme Settings") {
    NavigationStack {
        ThemeSettingsView()
    }
}

#Preview("Language Settings") {
    NavigationStack {
        LanguageSettingsView()
    }
}

#Preview("Announcements") {
    NavigationStack {
        AnnouncementsView()
    }
}

#Preview("FAQ") {
    NavigationStack {
        FAQView()
    }
}

#Preview("Contact Us") {
    NavigationStack {
        ContactUsView()
    }
}
