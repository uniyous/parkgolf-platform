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

// MARK: - Theme Settings View

struct ThemeSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "moon.fill",
                title: "테마 설정",
                description: "준비중입니다"
            )
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

// MARK: - Language Settings View

struct LanguageSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "globe",
                title: "언어 설정",
                description: "준비중입니다"
            )
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
