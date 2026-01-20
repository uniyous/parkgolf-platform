import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var upcomingBookings: [Booking] = []
    @Published var nearbyClubs: [Club] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient = APIClient.shared

    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await self.loadUpcomingBookings()
            }

            group.addTask {
                await self.loadNearbyClubs()
            }
        }
    }

    func refresh() async {
        await loadData()
    }

    private func loadUpcomingBookings() async {
        do {
            let response = try await apiClient.requestList(
                BookingEndpoints.list(page: 1, limit: 5, status: .confirmed),
                responseType: Booking.self
            )
            upcomingBookings = response.data
        } catch {
            self.error = error
            print("Failed to load bookings: \(error)")
        }
    }

    private func loadNearbyClubs() async {
        do {
            let response = try await apiClient.requestList(
                ClubEndpoints.list(page: 1, limit: 10),
                responseType: Club.self
            )
            nearbyClubs = response.data
        } catch {
            self.error = error
            print("Failed to load clubs: \(error)")
        }
    }
}
