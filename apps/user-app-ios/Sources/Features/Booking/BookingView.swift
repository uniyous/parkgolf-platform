import SwiftUI

struct BookingView: View {
    @StateObject private var viewModel = BookingViewModel()
    @State private var selectedFilter: BookingFilter = .all

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Tabs
                filterTabs

                // Booking List
                bookingList
            }
            .navigationTitle("내 예약")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        NewBookingView()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .task {
            await viewModel.loadBookings()
        }
    }

    // MARK: - Filter Tabs

    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(BookingFilter.allCases, id: \.self) { filter in
                    BookingFilterChip(
                        title: filter.title,
                        isSelected: selectedFilter == filter
                    ) {
                        selectedFilter = filter
                        Task {
                            await viewModel.loadBookings(filter: filter)
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Booking List

    private var bookingList: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.bookings.isEmpty {
                ContentUnavailableView(
                    "예약이 없습니다",
                    systemImage: "calendar.badge.exclamationmark",
                    description: Text("새로운 예약을 만들어보세요")
                )
            } else {
                List {
                    ForEach(viewModel.bookings) { booking in
                        NavigationLink {
                            BookingDetailView(booking: booking)
                        } label: {
                            BookingListItem(booking: booking)
                        }
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadBookings(filter: selectedFilter)
                }
            }
        }
    }
}

// MARK: - Booking Filter

enum BookingFilter: CaseIterable {
    case all
    case upcoming
    case completed
    case cancelled

    var title: String {
        switch self {
        case .all: "전체"
        case .upcoming: "예정"
        case .completed: "완료"
        case .cancelled: "취소"
        }
    }

    var status: BookingStatus? {
        switch self {
        case .all: nil
        case .upcoming: .confirmed
        case .completed: .completed
        case .cancelled: .cancelled
        }
    }
}

// MARK: - Booking Filter Chip (Legacy)

struct BookingFilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.green : Color(.systemGray6))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Booking List Item

struct BookingListItem: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(booking.clubName)
                    .font(.headline)

                Spacer()

                StatusBadge(status: .init(from: booking.status.rawValue))
            }

            Text(booking.courseName)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Label(formatDate(booking.bookingDate), systemImage: "calendar")
                Label(booking.startTime, systemImage: "clock")
                Label("\(booking.playerCount)명", systemImage: "person.2")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d (E)"
        formatter.locale = Locale(identifier: "ko_KR")
        return formatter.string(from: date)
    }
}

// MARK: - Booking Detail View (Placeholder)

struct BookingDetailView: View {
    let booking: Booking

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Club Info
                VStack(alignment: .leading, spacing: 8) {
                    Text(booking.clubName)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(booking.courseName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Booking Details
                VStack(alignment: .leading, spacing: 16) {
                    BookingDetailRow(icon: "calendar", title: "날짜", value: formatDate(booking.bookingDate))
                    BookingDetailRow(icon: "clock", title: "시간", value: "\(booking.startTime) - \(booking.endTime)")
                    BookingDetailRow(icon: "person.2", title: "인원", value: "\(booking.playerCount)명")
                    BookingDetailRow(icon: "wonsign.circle", title: "금액", value: "\(booking.totalPrice.formatted())원")
                }

                Divider()

                // Status
                HStack {
                    Text("예약 상태")
                        .font(.headline)

                    Spacer()

                    StatusBadge(status: .init(from: booking.status.rawValue))
                }

                // Actions
                if booking.status == .confirmed {
                    Button(role: .destructive) {
                        // Cancel booking
                    } label: {
                        Text("예약 취소")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding()
        }
        .navigationTitle("예약 상세")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy년 M월 d일 (E)"
        formatter.locale = Locale(identifier: "ko_KR")
        return formatter.string(from: date)
    }
}

struct BookingDetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack {
            Label(title, systemImage: icon)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .fontWeight(.medium)
        }
    }
}

// MARK: - New Booking View (Placeholder)

struct NewBookingView: View {
    var body: some View {
        Text("새 예약")
            .navigationTitle("새 예약")
    }
}

#Preview {
    BookingView()
}
