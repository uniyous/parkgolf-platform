import SwiftUI

// MARK: - Spacing System

enum ParkSpacing {
    /// 4pt
    static let xxs: CGFloat = 4
    /// 8pt
    static let xs: CGFloat = 8
    /// 12pt
    static let sm: CGFloat = 12
    /// 16pt
    static let md: CGFloat = 16
    /// 20pt
    static let lg: CGFloat = 20
    /// 24pt
    static let xl: CGFloat = 24
    /// 32pt
    static let xxl: CGFloat = 32
    /// 48pt
    static let xxxl: CGFloat = 48
}

// MARK: - Corner Radius

enum ParkRadius {
    /// 4pt
    static let xs: CGFloat = 4
    /// 8pt
    static let sm: CGFloat = 8
    /// 12pt
    static let md: CGFloat = 12
    /// 16pt
    static let lg: CGFloat = 16
    /// 20pt
    static let xl: CGFloat = 20
    /// 24pt
    static let xxl: CGFloat = 24
    /// Full rounded
    static let full: CGFloat = 9999
}

// MARK: - Icon Sizes

enum ParkIconSize {
    /// 16pt
    static let sm: CGFloat = 16
    /// 20pt
    static let md: CGFloat = 20
    /// 24pt
    static let lg: CGFloat = 24
    /// 32pt
    static let xl: CGFloat = 32
    /// 48pt
    static let xxl: CGFloat = 48
}

// MARK: - Shadow

struct ParkShadow {
    static let sm = (color: Color.black.opacity(0.1), radius: CGFloat(4), x: CGFloat(0), y: CGFloat(2))
    static let md = (color: Color.black.opacity(0.15), radius: CGFloat(8), x: CGFloat(0), y: CGFloat(4))
    static let lg = (color: Color.black.opacity(0.2), radius: CGFloat(16), x: CGFloat(0), y: CGFloat(8))
}

// MARK: - View Extensions

extension View {
    func parkShadow(_ size: ShadowSize = .md) -> some View {
        switch size {
        case .sm:
            return self.shadow(color: ParkShadow.sm.color, radius: ParkShadow.sm.radius, x: ParkShadow.sm.x, y: ParkShadow.sm.y)
        case .md:
            return self.shadow(color: ParkShadow.md.color, radius: ParkShadow.md.radius, x: ParkShadow.md.x, y: ParkShadow.md.y)
        case .lg:
            return self.shadow(color: ParkShadow.lg.color, radius: ParkShadow.lg.radius, x: ParkShadow.lg.x, y: ParkShadow.lg.y)
        }
    }
}

enum ShadowSize {
    case sm, md, lg
}
