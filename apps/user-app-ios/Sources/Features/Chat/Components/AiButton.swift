import SwiftUI

struct AiButton: View {
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "sparkles")
                .font(.system(size: 18))
                .foregroundColor(isActive ? Color.parkPrimary : .white.opacity(0.4))
                .frame(width: 40, height: 40)
                .background(
                    isActive
                        ? Color.parkPrimary.opacity(0.2)
                        : Color.white.opacity(0.1)
                )
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(isActive ? Color.parkPrimary : Color.clear, lineWidth: 1)
                )
        }
        .accessibilityLabel(isActive ? "AI 모드 끄기" : "AI 예약 도우미")
    }
}
