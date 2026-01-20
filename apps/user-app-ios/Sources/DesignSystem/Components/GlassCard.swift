import SwiftUI

// MARK: - Glass Card Component

struct GlassCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = ParkSpacing.md
    var cornerRadius: CGFloat = ParkRadius.lg

    init(
        padding: CGFloat = ParkSpacing.md,
        cornerRadius: CGFloat = ParkRadius.lg,
        @ViewBuilder content: () -> Content
    ) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(LinearGradient.parkCard)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.glassBorder, lineWidth: 1)
                    )
            )
    }
}

// MARK: - Glass Card Modifier

struct GlassCardModifier: ViewModifier {
    var padding: CGFloat = ParkSpacing.md
    var cornerRadius: CGFloat = ParkRadius.lg

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(LinearGradient.parkCard)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.glassBorder, lineWidth: 1)
                    )
            )
    }
}

extension View {
    func glassCard(padding: CGFloat = ParkSpacing.md, cornerRadius: CGFloat = ParkRadius.lg) -> some View {
        modifier(GlassCardModifier(padding: padding, cornerRadius: cornerRadius))
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            GlassCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Glass Card")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("This is a glass morphism card")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Text("Using modifier")
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .glassCard()
        }
        .padding()
    }
}
