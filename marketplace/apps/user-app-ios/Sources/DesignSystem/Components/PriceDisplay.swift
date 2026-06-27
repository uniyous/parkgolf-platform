import SwiftUI

// MARK: - Price Display

struct PriceDisplay: View {
    let amount: Int
    var size: Size = .medium
    var showCurrency: Bool = true
    var strikethrough: Bool = false
    var color: Color = .white

    enum Size {
        case small, medium, large, xlarge

        var fontSize: Font {
            switch self {
            case .small: return .parkBodySmall
            case .medium: return .parkBodyLarge
            case .large: return .parkHeadlineMedium
            case .xlarge: return .parkDisplaySmall
            }
        }

        var currencySize: Font {
            switch self {
            case .small: return .parkCaption
            case .medium: return .parkBodySmall
            case .large: return .parkBodyMedium
            case .xlarge: return .parkBodyLarge
            }
        }
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
            if showCurrency {
                Text("₩")
                    .font(size.currencySize)
                    .foregroundStyle(color.opacity(0.8))
            }
            Text(formattedAmount)
                .font(size.fontSize)
                .fontWeight(.semibold)
                .foregroundStyle(color)
                .strikethrough(strikethrough, color: color.opacity(0.5))
        }
    }

    private var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: amount)) ?? "\(amount)"
    }
}

// MARK: - Price Range Display

struct PriceRangeDisplay: View {
    let minPrice: Int
    let maxPrice: Int
    var size: PriceDisplay.Size = .medium

    var body: some View {
        HStack(spacing: 4) {
            PriceDisplay(amount: minPrice, size: size)
            Text("~")
                .foregroundStyle(.white.opacity(0.6))
            PriceDisplay(amount: maxPrice, size: size, showCurrency: false)
        }
    }
}

// MARK: - Price Summary Row

struct PriceSummaryRow: View {
    let label: String
    let amount: Int
    var isTotal: Bool = false
    var color: Color = .white

    var body: some View {
        HStack {
            Text(label)
                .font(isTotal ? .parkHeadlineSmall : .parkBodyMedium)
                .foregroundStyle(color.opacity(isTotal ? 1 : 0.8))

            Spacer()

            PriceDisplay(
                amount: amount,
                size: isTotal ? .large : .medium,
                color: color
            )
        }
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Price Sizes")
                    .foregroundStyle(.white.opacity(0.6))

                PriceDisplay(amount: 25000, size: .small)
                PriceDisplay(amount: 25000, size: .medium)
                PriceDisplay(amount: 25000, size: .large)
                PriceDisplay(amount: 25000, size: .xlarge)
            }

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Text("Price Range")
                    .foregroundStyle(.white.opacity(0.6))

                PriceRangeDisplay(minPrice: 20000, maxPrice: 35000)
            }

            Divider()

            VStack(spacing: 8) {
                Text("Price Summary")
                    .foregroundStyle(.white.opacity(0.6))

                GlassCard {
                    VStack(spacing: 12) {
                        PriceSummaryRow(label: "기본 요금 (4명)", amount: 100000)
                        PriceSummaryRow(label: "서비스 수수료", amount: 3000)
                        Divider()
                        PriceSummaryRow(label: "총 결제 금액", amount: 103000, isTotal: true)
                    }
                }
            }
        }
        .padding()
    }
}
