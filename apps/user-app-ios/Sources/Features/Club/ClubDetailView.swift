import SwiftUI

struct ClubDetailView: View {
    let clubId: Int
    @StateObject private var viewModel: ClubDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(clubId: Int) {
        self.clubId = clubId
        _viewModel = StateObject(wrappedValue: ClubDetailViewModel(clubId: clubId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: ParkSpacing.md) {
                if viewModel.isLoading {
                    loadingView
                } else if let club = viewModel.club {
                    clubInfoSection(club)
                    gamesSection
                } else if let error = viewModel.errorMessage {
                    errorView(error)
                }
            }
            .padding(.horizontal, ParkSpacing.md)
            .padding(.vertical, ParkSpacing.sm)
        }
        .background(LinearGradient.parkBackground)
        .navigationTitle(viewModel.club?.name ?? "골프장 정보")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadData()
        }
    }

    // MARK: - Club Info Section

    private func clubInfoSection(_ club: ClubDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                // Type & Status badges
                HStack(spacing: ParkSpacing.xs) {
                    Text(club.clubTypeDisplayName)
                        .font(.parkCaption)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.parkPrimary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.parkPrimary.opacity(0.2))
                        .clipShape(Capsule())

                    if club.isOpen {
                        Text("영업중")
                            .font(.parkCaption)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.parkSuccess)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.parkSuccess.opacity(0.2))
                            .clipShape(Capsule())
                    }
                }

                // Club name
                Text(club.name)
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)

                // Address
                Label(club.address, systemImage: "mappin.circle.fill")
                    .font(.parkBodySmall)
                    .foregroundStyle(.white.opacity(0.7))

                // Phone
                if !club.phone.isEmpty {
                    Link(destination: URL(string: "tel:\(club.phone)")!) {
                        Label(club.phone, systemImage: "phone.fill")
                            .font(.parkBodySmall)
                            .foregroundStyle(Color.parkPrimary)
                    }
                }

                // Website
                if let website = club.website, let url = URL(string: website) {
                    Link(destination: url) {
                        Label("웹사이트 방문", systemImage: "globe")
                            .font(.parkBodySmall)
                            .foregroundStyle(Color.parkPrimary)
                    }
                }

                // Operating Hours
                if let hours = club.operatingHours {
                    Label("\(hours.open) ~ \(hours.close)", systemImage: "clock.fill")
                        .font(.parkBodySmall)
                        .foregroundStyle(.white.opacity(0.7))
                }

                // Course / Hole count
                HStack(spacing: ParkSpacing.md) {
                    Label("코스 \(club.totalCourses)개", systemImage: "flag.fill")
                        .font(.parkBodySmall)
                        .foregroundStyle(.white.opacity(0.7))

                    Text("홀 \(club.totalHoles)개")
                        .font(.parkBodySmall)
                        .foregroundStyle(.white.opacity(0.7))
                }

                // Facilities
                if !club.facilities.isEmpty {
                    facilityTags(club.facilities)
                }
            }
        }
    }

    private func facilityTags(_ facilities: [String]) -> some View {
        FlowLayout(spacing: ParkSpacing.xs) {
            ForEach(facilities, id: \.self) { facility in
                Text(facility)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: ParkRadius.full)
                            .stroke(.white.opacity(0.2), lineWidth: 1)
                    )
                    .clipShape(Capsule())
            }
        }
    }

    // MARK: - Games Section

    private var gamesSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            Text("라운드 예약")
                .font(.parkHeadlineSmall)
                .foregroundStyle(.white)

            if viewModel.isLoadingGames {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, ParkSpacing.lg)
            } else if viewModel.games.isEmpty {
                GlassCard {
                    VStack(spacing: ParkSpacing.sm) {
                        Image(systemName: "flag.slash.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(.white.opacity(0.5))

                        Text("등록된 게임이 없습니다")
                            .font(.parkBodyMedium)
                            .foregroundStyle(.white.opacity(0.7))

                        Text("현재 예약 가능한 라운드가 없습니다")
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, ParkSpacing.md)
                }
            } else {
                ForEach(viewModel.games) { game in
                    NavigationLink {
                        RoundBookingView(showTitle: false)
                            .navigationTitle("라운드 예약")
                            .navigationBarTitleDisplayMode(.inline)
                    } label: {
                        GameCardContent(game: game)
                    }
                }
            }
        }
    }

    // MARK: - Loading / Error Views

    private var loadingView: some View {
        VStack(spacing: ParkSpacing.md) {
            ProgressView()
                .tint(.white)
            Text("골프장 정보를 불러오는 중...")
                .font(.parkBodySmall)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, ParkSpacing.xxl)
    }

    private func errorView(_ message: String) -> some View {
        GlassCard {
            VStack(spacing: ParkSpacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white.opacity(0.5))

                Text(message)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.7))

                Button("다시 시도") {
                    Task { await viewModel.loadData() }
                }
                .font(.parkLabelLarge)
                .foregroundStyle(Color.parkPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, ParkSpacing.md)
        }
    }
}

// MARK: - Game Card Content

private struct GameCardContent: View {
    let game: Round

    var body: some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    Text(game.name)
                        .font(.parkLabelLarge)
                        .foregroundStyle(.white)

                    if let front = game.frontNineCourse, let back = game.backNineCourse {
                        Text("전반 \(front.name) / 후반 \(back.name)")
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.6))
                    }

                    HStack(spacing: ParkSpacing.sm) {
                        Label("\(game.estimatedDuration)분", systemImage: "clock")
                        Label("최대 \(game.maxPlayers)명", systemImage: "person.2")
                        if let holes = game.totalHoles {
                            Text("\(holes)홀")
                        }
                    }
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.5))

                    HStack(spacing: ParkSpacing.xs) {
                        Text("\(game.basePrice.formatted())원")
                            .font(.parkLabelLarge)
                            .foregroundStyle(Color.parkPrimary)

                        if let weekendPrice = game.weekendPrice, weekendPrice != game.basePrice {
                            Text("주말 \(weekendPrice.formatted())원")
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.4))
            }
        }
    }
}

// MARK: - Flow Layout (for facility tags)

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (CGSize(width: maxX, height: y + rowHeight), positions)
    }
}
