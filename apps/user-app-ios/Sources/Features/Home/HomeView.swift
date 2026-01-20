import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Welcome Section
                    welcomeSection

                    // Quick Actions
                    quickActionsSection

                    // Upcoming Bookings
                    upcomingBookingsSection

                    // Nearby Clubs
                    nearbyClubsSection
                }
                .padding()
            }
            .navigationTitle("ParkMate")
            .refreshable {
                await viewModel.refresh()
            }
        }
        .task {
            await viewModel.loadData()
        }
    }

    // MARK: - Welcome Section

    private var welcomeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("안녕하세요! 👋")
                .font(.title2)
                .fontWeight(.semibold)

            Text("오늘도 즐거운 파크골프 되세요")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("빠른 메뉴")
                .font(.headline)

            HStack(spacing: 16) {
                QuickActionButton(
                    title: "예약하기",
                    icon: "calendar.badge.plus",
                    color: .green
                ) {
                    // Navigate to booking
                }

                QuickActionButton(
                    title: "골프장 찾기",
                    icon: "map",
                    color: .blue
                ) {
                    // Navigate to search
                }

                QuickActionButton(
                    title: "친구 초대",
                    icon: "person.badge.plus",
                    color: .orange
                ) {
                    // Navigate to invite
                }
            }
        }
    }

    // MARK: - Upcoming Bookings

    private var upcomingBookingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("다가오는 예약")
                    .font(.headline)

                Spacer()

                NavigationLink("전체보기") {
                    BookingView()
                }
                .font(.subheadline)
            }

            if viewModel.upcomingBookings.isEmpty {
                EmptyStateView(
                    icon: "calendar",
                    message: "예정된 예약이 없습니다"
                )
            } else {
                ForEach(viewModel.upcomingBookings.prefix(3)) { booking in
                    BookingCard(booking: booking)
                }
            }
        }
    }

    // MARK: - Nearby Clubs

    private var nearbyClubsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("주변 골프장")
                    .font(.headline)

                Spacer()

                Button("더보기") {
                    // Navigate to club list
                }
                .font(.subheadline)
            }

            if viewModel.nearbyClubs.isEmpty {
                EmptyStateView(
                    icon: "location.slash",
                    message: "주변 골프장을 찾을 수 없습니다"
                )
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(viewModel.nearbyClubs) { club in
                            ClubCard(club: club)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(color)

                Text(title)
                    .font(.caption)
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Booking Card

struct BookingCard: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(booking.clubName)
                    .font(.headline)

                Spacer()

                StatusBadge(status: booking.status)
            }

            HStack {
                Label(formatDate(booking.bookingDate), systemImage: "calendar")
                Spacer()
                Label(booking.startTime, systemImage: "clock")
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)

            HStack {
                Label("\(booking.playerCount)명", systemImage: "person.2")
                Spacer()
                Text(booking.courseName)
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M월 d일 (E)"
        formatter.locale = Locale(identifier: "ko_KR")
        return formatter.string(from: date)
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: BookingStatus

    var body: some View {
        Text(status.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.1))
            .foregroundStyle(statusColor)
            .clipShape(Capsule())
    }

    private var statusColor: Color {
        switch status {
        case .pending: .orange
        case .confirmed: .green
        case .cancelled: .red
        case .completed: .gray
        }
    }
}

// MARK: - Club Card

struct ClubCard: View {
    let club: Club

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Placeholder image
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.green.opacity(0.2))
                .frame(width: 160, height: 100)
                .overlay {
                    Image(systemName: "flag.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.green)
                }

            Text(club.name)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(1)

            Text(club.address)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(width: 160)
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String
    let message: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundStyle(.secondary)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    HomeView()
}
