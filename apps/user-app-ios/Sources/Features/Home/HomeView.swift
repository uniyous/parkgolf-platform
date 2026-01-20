import SwiftUI

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: ParkSpacing.lg) {
                        // Welcome Header
                        welcomeHeader

                        // Search CTA
                        searchCTA

                        // Quick Date Selection
                        quickDateSection

                        // Upcoming Bookings
                        upcomingBookingsSection

                        // Popular Clubs
                        popularClubsSection
                    }
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.bottom, ParkSpacing.xxl)
                }
                .refreshable {
                    await viewModel.loadData()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: ParkSpacing.xs) {
                        Image(systemName: "leaf.fill")
                            .foregroundStyle(Color.parkPrimary)
                        Text("ParkMate")
                            .font(.parkHeadlineMedium)
                            .foregroundStyle(.white)
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Notifications
                    } label: {
                        Image(systemName: "bell.fill")
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .task {
            await viewModel.loadData()
        }
    }

    // MARK: - Welcome Header

    private var welcomeHeader: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.xs) {
            Text(greetingMessage)
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Text(weatherMessage)
                .font(.parkBodyMedium)
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, ParkSpacing.md)
    }

    private var greetingMessage: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let name = appState.currentUser?.name ?? "회원"

        if hour < 12 {
            return "좋은 아침이에요, \(name)님! ☀️"
        } else if hour < 18 {
            return "안녕하세요, \(name)님! 👋"
        } else {
            return "좋은 저녁이에요, \(name)님! 🌙"
        }
    }

    private var weatherMessage: String {
        "오늘도 파크골프하기 좋은 날이에요"
    }

    // MARK: - Search CTA

    private var searchCTA: some View {
        NavigationLink {
            GameSearchView()
        } label: {
            HStack {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .medium))

                Text("라운드 검색하기")
                    .font(.parkHeadlineSmall)

                Spacer()

                Image(systemName: "arrow.right")
            }
            .foregroundStyle(.white)
            .padding(ParkSpacing.md)
            .background(
                LinearGradient.parkButton
            )
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
        }
    }

    // MARK: - Quick Date Section

    private var quickDateSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            Text("⚡️ 빠른 예약")
                .font(.parkHeadlineSmall)
                .foregroundStyle(.white)

            HStack(spacing: ParkSpacing.sm) {
                QuickDateButton(title: "오늘", icon: "sun.max.fill", color: .parkAccent) {
                    // Navigate with today's date
                }

                QuickDateButton(title: "내일", icon: "sunrise.fill", color: .parkInfo) {
                    // Navigate with tomorrow's date
                }

                QuickDateButton(title: "이번 주말", icon: "calendar", color: .parkPrimary) {
                    // Navigate with weekend date
                }
            }
        }
    }

    // MARK: - Upcoming Bookings Section

    private var upcomingBookingsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Text("📅 다가오는 라운드")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Spacer()

                NavigationLink {
                    MyBookingsView()
                } label: {
                    Text("전체보기")
                        .font(.parkLabelSmall)
                        .foregroundStyle(Color.parkPrimary)
                }
            }

            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if viewModel.upcomingBookings.isEmpty {
                HomeEmptyBookingCard()
            } else {
                ForEach(viewModel.upcomingBookings.prefix(3)) { booking in
                    HomeUpcomingBookingCard(booking: booking)
                }
            }
        }
    }

    // MARK: - Popular Clubs Section

    private var popularClubsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            HStack {
                Text("🏆 이번 주 인기 골프장")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: ParkSpacing.sm) {
                    ForEach(viewModel.popularClubs) { club in
                        HomePopularClubCard(club: club)
                    }
                }
            }
        }
    }
}

// MARK: - Quick Date Button

struct QuickDateButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: ParkSpacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(color)

                Text(title)
                    .font(.parkLabelMedium)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, ParkSpacing.md)
            .glassCard(padding: 0)
        }
    }
}

// MARK: - Empty Booking Card

struct HomeEmptyBookingCard: View {
    var body: some View {
        GlassCard {
            VStack(spacing: ParkSpacing.sm) {
                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 32))
                    .foregroundStyle(.white.opacity(0.5))

                Text("예정된 라운드가 없습니다")
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.7))

                Text("새로운 라운드를 예약해보세요")
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, ParkSpacing.lg)
        }
    }
}

// MARK: - Upcoming Booking Card

struct HomeUpcomingBookingCard: View {
    let booking: BookingResponse

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                HStack {
                    StatusBadge(status: .init(from: booking.status), size: .small)
                    Spacer()
                    Text(daysUntilBooking)
                        .font(.parkLabelSmall)
                        .foregroundStyle(Color.parkAccent)
                }

                if let gameName = booking.gameName {
                    Text(gameName)
                        .font(.parkHeadlineMedium)
                        .foregroundStyle(.white)
                }

                HStack(spacing: ParkSpacing.md) {
                    Label(booking.formattedDate, systemImage: "calendar")
                    Label(booking.startTime, systemImage: "clock")
                    Label("\(booking.playerCount)명", systemImage: "person.2")
                }
                .font(.parkBodySmall)
                .foregroundStyle(.white.opacity(0.7))
            }
        }
    }

    private var daysUntilBooking: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        guard let bookingDate = formatter.date(from: booking.bookingDate) else {
            return ""
        }

        let days = Calendar.current.dateComponents([.day], from: Date(), to: bookingDate).day ?? 0

        if days == 0 {
            return "오늘"
        } else if days == 1 {
            return "내일"
        } else if days < 0 {
            return ""
        } else {
            return "D-\(days)"
        }
    }
}

// MARK: - Popular Club Card

struct HomePopularClubCard: View {
    let club: Club

    var body: some View {
        GlassCard(padding: 0, cornerRadius: ParkRadius.lg) {
            VStack(alignment: .leading, spacing: 0) {
                // Image placeholder
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [Color.parkPrimary.opacity(0.3), Color.parkSecondary.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 100)
                    .overlay(
                        Image(systemName: "figure.golf")
                            .font(.system(size: 32))
                            .foregroundStyle(.white.opacity(0.5))
                    )

                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(club.name)
                        .font(.parkLabelLarge)
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    Text(club.address)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                }
                .padding(ParkSpacing.sm)
            }
            .frame(width: 160)
        }
    }
}

// HomeViewModel is defined in HomeViewModel.swift

#Preview {
    HomeView()
        .environmentObject(AppState())
}
