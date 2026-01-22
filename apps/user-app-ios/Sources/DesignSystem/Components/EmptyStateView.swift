import SwiftUI

// MARK: - Empty State View

struct ParkEmptyStateView: View {
    let icon: String
    let title: String
    let description: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: ParkSpacing.lg) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 100, height: 100)

                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundStyle(.white.opacity(0.6))
            }

            // Text
            VStack(spacing: ParkSpacing.xs) {
                Text(title)
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)

                Text(description)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }

            // Action Button
            if let actionTitle = actionTitle, let action = action {
                GradientButton(title: actionTitle, action: action)
                    .frame(width: 200)
            }
        }
        .padding(ParkSpacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Loading State View

struct ParkLoadingView: View {
    var message: String = "로딩 중..."

    var body: some View {
        VStack(spacing: ParkSpacing.md) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(1.2)

            Text(message)
                .font(.parkBodyMedium)
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Error State View

struct ParkErrorView: View {
    let message: String
    var retryAction: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: ParkSpacing.lg) {
            ZStack {
                Circle()
                    .fill(Color.parkError.opacity(0.2))
                    .frame(width: 80, height: 80)

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.parkError)
            }

            VStack(spacing: ParkSpacing.xs) {
                Text("오류가 발생했습니다")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)

                Text(message)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }

            if let retryAction = retryAction {
                GradientButton(
                    title: "다시 시도",
                    icon: "arrow.clockwise",
                    style: .secondary,
                    action: retryAction
                )
                .frame(width: 160)
            }
        }
        .padding(ParkSpacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        TabView {
            ParkEmptyStateView(
                icon: "calendar.badge.plus",
                title: "예약이 없습니다",
                description: "새로운 라운드를 예약해 보세요",
                actionTitle: "예약하기"
            ) {}

            ParkLoadingView()

            ParkErrorView(
                message: "네트워크 연결을 확인해주세요",
                retryAction: {}
            )
        }
        .tabViewStyle(.page)
    }
}
