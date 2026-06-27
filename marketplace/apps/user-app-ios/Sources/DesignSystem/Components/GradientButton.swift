import SwiftUI

// MARK: - Gradient Button

struct GradientButton: View {
    let title: String
    let icon: String?
    let style: ButtonStyle
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    enum ButtonStyle {
        case primary
        case secondary
        case destructive
        case ghost
    }

    init(
        title: String,
        icon: String? = nil,
        style: ButtonStyle = .primary,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(action: {
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()
            action()
        }) {
            HStack(spacing: ParkSpacing.xs) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: textColor))
                        .scaleEffect(0.8)
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .semibold))
                    }
                    Text(title)
                        .font(.parkLabelLarge)
                        .fontWeight(.semibold)
                }
            }
            .foregroundStyle(textColor)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: ParkRadius.md)
                    .stroke(borderColor, lineWidth: style == .ghost ? 1.5 : 0)
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
        .animation(.easeInOut(duration: 0.2), value: isDisabled)
    }

    @ViewBuilder
    private var background: some View {
        switch style {
        case .primary:
            LinearGradient.parkButton
        case .secondary:
            Color.white.opacity(0.15)
        case .destructive:
            Color.parkError
        case .ghost:
            Color.clear
        }
    }

    private var textColor: Color {
        switch style {
        case .primary, .destructive:
            return .white
        case .secondary, .ghost:
            return .white
        }
    }

    private var borderColor: Color {
        switch style {
        case .ghost:
            return .white.opacity(0.3)
        default:
            return .clear
        }
    }
}

// MARK: - Small Button Variant

struct SmallButton: View {
    let title: String
    let icon: String?
    let color: Color
    let action: () -> Void

    init(
        title: String,
        icon: String? = nil,
        color: Color = .parkPrimary,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.color = color
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .semibold))
                }
                Text(title)
                    .font(.parkLabelMedium)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, ParkSpacing.sm)
            .padding(.vertical, ParkSpacing.xs)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.sm))
        }
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 16) {
            GradientButton(title: "Primary Button", icon: "arrow.right") {}

            GradientButton(title: "Secondary", style: .secondary) {}

            GradientButton(title: "Destructive", icon: "trash", style: .destructive) {}

            GradientButton(title: "Ghost Button", style: .ghost) {}

            GradientButton(title: "Loading...", isLoading: true) {}

            GradientButton(title: "Disabled", isDisabled: true) {}

            HStack {
                SmallButton(title: "Accept", icon: "checkmark", color: .parkSuccess) {}
                SmallButton(title: "Reject", icon: "xmark", color: .parkError) {}
            }
        }
        .padding()
    }
}
