import SwiftUI

// MARK: - Stat Item

struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: ParkSpacing.xxs) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(Color.parkPrimary)

            Text(value)
                .font(.parkHeadlineMedium)
                .foregroundStyle(.white)

            Text(label)
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: icon)
                .foregroundStyle(Color.parkPrimary)
            Text(title)
                .font(.parkHeadlineSmall)
                .foregroundStyle(.white)
        }
        .padding(.bottom, ParkSpacing.xxs)
    }
}

// MARK: - Profile Menu Row

struct ProfileMenuRow<Destination: View>: View {
    let icon: String
    let iconColor: Color
    let title: String
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: ParkSpacing.sm) {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                    .frame(width: 24)

                Text(title)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.3))
            }
            .padding(.vertical, ParkSpacing.xs)
        }
    }
}

// MARK: - Notification Toggle Row

struct NotificationToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String
    @Binding var isOn: Bool
    var isDisabled: Bool = false

    var body: some View {
        HStack(spacing: ParkSpacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(iconColor.opacity(0.2))
                    .frame(width: 40, height: 40)

                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(iconColor)
            }

            // Text
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white)

                Text(description)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.6))
            }

            Spacer()

            // Toggle
            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(Color.parkPrimary)
                .disabled(isDisabled)
                .opacity(isDisabled ? 0.5 : 1.0)
        }
        .padding(.vertical, ParkSpacing.xs)
    }
}

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            StatItem(icon: "calendar.badge.checkmark", value: "10", label: "총 라운드")
            SectionHeader(title: "계정", icon: "person.crop.circle")
        }
        .padding()
    }
}
