import SwiftUI

// MARK: - Park Golf Color System

extension Color {
    // MARK: - Primary Colors
    static let parkPrimary = Color(hex: "#10B981")       // Emerald
    static let parkSecondary = Color(hex: "#059669")     // Dark Emerald
    static let parkAccent = Color(hex: "#F59E0B")        // Amber (Premium)

    // MARK: - Semantic Colors
    static let parkSuccess = Color(hex: "#22C55E")       // Green
    static let parkWarning = Color(hex: "#EAB308")       // Yellow
    static let parkError = Color(hex: "#EF4444")         // Red
    static let parkInfo = Color(hex: "#3B82F6")          // Blue

    // MARK: - Status Colors
    static let statusConfirmed = Color(hex: "#22C55E")   // Green
    static let statusPending = Color(hex: "#F59E0B")     // Amber
    static let statusCancelled = Color(hex: "#EF4444")   // Red
    static let statusCompleted = Color(hex: "#6B7280")   // Gray

    // MARK: - Glass Effect Colors
    static let glassBackground = Color.white.opacity(0.1)
    static let glassBorder = Color.white.opacity(0.2)
    static let glassCard = Color.white.opacity(0.15)

    // MARK: - Text Colors
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.7)
    static let textTertiary = Color.white.opacity(0.5)

    // MARK: - Background Gradients
    static let gradientStart = Color(hex: "#065F46")     // Dark Emerald
    static let gradientMiddle = Color(hex: "#047857")    // Emerald
    static let gradientEnd = Color(hex: "#10B981")       // Light Emerald

    // MARK: - Hex Initializer
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Gradient Presets

extension LinearGradient {
    static let parkBackground = LinearGradient(
        colors: [Color.gradientStart, Color.gradientMiddle, Color.gradientEnd],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let parkButton = LinearGradient(
        colors: [Color.parkPrimary, Color.parkSecondary],
        startPoint: .leading,
        endPoint: .trailing
    )

    static let parkCard = LinearGradient(
        colors: [Color.white.opacity(0.2), Color.white.opacity(0.05)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
