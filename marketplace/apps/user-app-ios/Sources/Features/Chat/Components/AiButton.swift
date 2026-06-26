import SwiftUI

struct AiButton: View {
    let isActive: Bool
    let action: () -> Void

    @State private var isPulsing = false

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "sparkles")
                    .font(.system(size: 18))
                    .foregroundColor(isActive ? Color.parkPrimary : .white.opacity(0.4))
                    .scaleEffect(isActive && isPulsing ? 1.15 : 1.0)
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

                if isActive {
                    Circle()
                        .fill(Color.parkPrimary)
                        .frame(width: 8, height: 8)
                        .scaleEffect(isPulsing ? 1.8 : 1.0)
                        .opacity(isPulsing ? 0 : 1)
                        .offset(x: 1, y: -1)
                }
            }
        }
        .accessibilityLabel(isActive ? "AI 모드 끄기" : "AI 예약 도우미")
        .onChange(of: isActive) { _, newValue in
            if newValue {
                withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            } else {
                isPulsing = false
            }
        }
    }
}
