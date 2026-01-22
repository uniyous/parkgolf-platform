import SwiftUI

// MARK: - Status Badge

struct StatusBadge: View {
    let status: Status
    var size: Size = .medium

    enum Status: String {
        case confirmed = "예약확정"
        case pending = "대기중"
        case cancelled = "취소됨"
        case completed = "완료"
        case noShow = "노쇼"
        case failed = "실패"

        var color: Color {
            switch self {
            case .confirmed: return .statusConfirmed
            case .pending: return .statusPending
            case .cancelled, .noShow, .failed: return .statusCancelled
            case .completed: return .statusCompleted
            }
        }

        var icon: String {
            switch self {
            case .confirmed: return "checkmark.circle.fill"
            case .pending: return "clock.fill"
            case .cancelled: return "xmark.circle.fill"
            case .completed: return "flag.checkered"
            case .noShow: return "person.slash.fill"
            case .failed: return "exclamationmark.circle.fill"
            }
        }
    }

    enum Size {
        case small, medium, large

        var fontSize: Font {
            switch self {
            case .small: return .parkLabelSmall
            case .medium: return .parkLabelMedium
            case .large: return .parkLabelLarge
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .small: return 10
            case .medium: return 12
            case .large: return 14
            }
        }

        var padding: (h: CGFloat, v: CGFloat) {
            switch self {
            case .small: return (6, 3)
            case .medium: return (8, 4)
            case .large: return (10, 6)
            }
        }
    }

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: status.icon)
                .font(.system(size: size.iconSize, weight: .semibold))
            Text(status.rawValue)
                .font(size.fontSize)
        }
        .foregroundStyle(status.color)
        .padding(.horizontal, size.padding.h)
        .padding(.vertical, size.padding.v)
        .background(status.color.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Booking Status Extension

extension StatusBadge.Status {
    init(from bookingStatus: String) {
        switch bookingStatus.uppercased() {
        case "CONFIRMED": self = .confirmed
        case "PENDING", "SLOT_RESERVED": self = .pending
        case "CANCELLED": self = .cancelled
        case "COMPLETED": self = .completed
        case "NO_SHOW": self = .noShow
        case "FAILED": self = .failed
        default: self = .pending
        }
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 16) {
            HStack(spacing: 8) {
                StatusBadge(status: .confirmed, size: .small)
                StatusBadge(status: .confirmed, size: .medium)
                StatusBadge(status: .confirmed, size: .large)
            }

            StatusBadge(status: .pending)
            StatusBadge(status: .cancelled)
            StatusBadge(status: .completed)
            StatusBadge(status: .noShow)
            StatusBadge(status: .failed)
        }
        .padding()
    }
}
