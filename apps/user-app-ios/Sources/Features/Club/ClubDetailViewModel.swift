import Foundation

@MainActor
class ClubDetailViewModel: ObservableObject {
    @Published var club: ClubDetail?
    @Published var games: [Round] = []
    @Published var isLoading = false
    @Published var isLoadingGames = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private let roundService = RoundService()

    let clubId: Int

    init(clubId: Int) {
        self.clubId = clubId
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        async let c: Void = loadClub()
        async let g: Void = loadGames()

        _ = await (c, g)

        isLoading = false
    }

    private func loadClub() async {
        do {
            let endpoint = Endpoint(
                path: "/api/user/clubs/\(clubId)",
                method: .get
            )
            club = try await apiClient.request(endpoint, responseType: ClubDetail.self)
        } catch {
            errorMessage = "골프장 정보를 불러올 수 없습니다"
            #if DEBUG
            print("[ClubDetail] loadClub failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func loadGames() async {
        isLoadingGames = true
        do {
            let endpoint = Endpoint(
                path: "/api/user/games",
                method: .get,
                queryParameters: ["clubId": String(clubId)]
            )
            let response = try await apiClient.requestDirect(endpoint, responseType: RoundSearchResponse.self)
            games = response.data
        } catch {
            #if DEBUG
            print("[ClubDetail] loadGames failed: \(error.localizedDescription)")
            #endif
        }
        isLoadingGames = false
    }
}

// MARK: - ClubDetail Model

struct ClubDetail: Codable, Sendable, Identifiable {
    let id: Int
    let name: String
    let companyId: Int
    let location: String
    let address: String
    let phone: String
    let email: String?
    let website: String?
    let totalHoles: Int
    let totalCourses: Int
    let status: String
    let clubType: String
    let latitude: Double?
    let longitude: Double?
    let operatingHours: OperatingHours?
    let seasonInfo: SeasonInfo?
    let facilities: [String]
    let isActive: Bool

    struct OperatingHours: Codable, Sendable {
        let open: String
        let close: String
    }

    struct SeasonInfo: Codable, Sendable {
        let type: String
        let startDate: String
        let endDate: String
    }

    var clubTypeDisplayName: String {
        switch clubType {
        case "PUBLIC": return "퍼블릭"
        case "PRIVATE": return "프라이빗"
        default: return clubType
        }
    }

    var isOpen: Bool {
        status == "ACTIVE"
    }
}
