import SwiftUI

// MARK: - Typography System

extension Font {
    // MARK: - Display
    static let parkDisplayLarge = Font.system(size: 32, weight: .bold, design: .rounded)
    static let parkDisplayMedium = Font.system(size: 28, weight: .bold, design: .rounded)
    static let parkDisplaySmall = Font.system(size: 24, weight: .bold, design: .rounded)

    // MARK: - Headline
    static let parkHeadlineLarge = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let parkHeadlineMedium = Font.system(size: 18, weight: .semibold, design: .rounded)
    static let parkHeadlineSmall = Font.system(size: 16, weight: .semibold, design: .rounded)

    // MARK: - Body
    static let parkBodyLarge = Font.system(size: 16, weight: .regular, design: .rounded)
    static let parkBodyMedium = Font.system(size: 14, weight: .regular, design: .rounded)
    static let parkBodySmall = Font.system(size: 12, weight: .regular, design: .rounded)

    // MARK: - Label
    static let parkLabelLarge = Font.system(size: 14, weight: .medium, design: .rounded)
    static let parkLabelMedium = Font.system(size: 12, weight: .medium, design: .rounded)
    static let parkLabelSmall = Font.system(size: 10, weight: .medium, design: .rounded)

    // MARK: - Caption
    static let parkCaption = Font.system(size: 11, weight: .regular, design: .rounded)
}

// MARK: - Text Style Modifiers

struct ParkTextStyle: ViewModifier {
    enum Style {
        case displayLarge, displayMedium, displaySmall
        case headlineLarge, headlineMedium, headlineSmall
        case bodyLarge, bodyMedium, bodySmall
        case labelLarge, labelMedium, labelSmall
        case caption
    }

    let style: Style
    let color: Color

    func body(content: Content) -> some View {
        content
            .font(font)
            .foregroundStyle(color)
    }

    private var font: Font {
        switch style {
        case .displayLarge: return .parkDisplayLarge
        case .displayMedium: return .parkDisplayMedium
        case .displaySmall: return .parkDisplaySmall
        case .headlineLarge: return .parkHeadlineLarge
        case .headlineMedium: return .parkHeadlineMedium
        case .headlineSmall: return .parkHeadlineSmall
        case .bodyLarge: return .parkBodyLarge
        case .bodyMedium: return .parkBodyMedium
        case .bodySmall: return .parkBodySmall
        case .labelLarge: return .parkLabelLarge
        case .labelMedium: return .parkLabelMedium
        case .labelSmall: return .parkLabelSmall
        case .caption: return .parkCaption
        }
    }
}

extension View {
    func parkTextStyle(_ style: ParkTextStyle.Style, color: Color = .textPrimary) -> some View {
        modifier(ParkTextStyle(style: style, color: color))
    }
}
