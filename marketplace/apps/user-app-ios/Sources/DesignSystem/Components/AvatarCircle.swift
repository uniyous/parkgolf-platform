import SwiftUI

// MARK: - Avatar Circle

/// 사용자 이니셜을 표시하는 원형 아바타 컴포넌트
struct AvatarCircle: View {
    let name: String
    var size: CGFloat = 50
    var opacity: Double = 0.3

    private var fontSize: Font {
        switch size {
        case ...40:
            return .parkHeadlineSmall
        case 41...55:
            return .parkHeadlineLarge
        default:
            return .parkDisplaySmall
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.parkPrimary.opacity(opacity))
                .frame(width: size, height: size)

            Text(String(name.prefix(1)))
                .font(fontSize)
                .foregroundStyle(.white)
        }
    }
}
