import Foundation

@MainActor
final class BookingViewModel: ObservableObject {
    @Published var bookings: [Booking] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient = APIClient.shared
    private var currentPage = 1
    private var hasMorePages = true

    func loadBookings(filter: BookingFilter = .all) async {
        isLoading = true
        currentPage = 1

        defer { isLoading = false }

        do {
            let response = try await apiClient.requestList(
                BookingEndpoints.list(page: currentPage, limit: 20, status: filter.status),
                responseType: Booking.self
            )
            bookings = response.data
            hasMorePages = response.pagination.page < response.pagination.totalPages
        } catch {
            self.error = error
            print("Failed to load bookings: \(error)")
        }
    }

    func loadMore(filter: BookingFilter = .all) async {
        guard hasMorePages, !isLoading else { return }

        currentPage += 1

        do {
            let response = try await apiClient.requestList(
                BookingEndpoints.list(page: currentPage, limit: 20, status: filter.status),
                responseType: Booking.self
            )
            bookings.append(contentsOf: response.data)
            hasMorePages = response.pagination.page < response.pagination.totalPages
        } catch {
            self.error = error
            currentPage -= 1
            print("Failed to load more bookings: \(error)")
        }
    }

    func cancelBooking(_ booking: Booking) async -> Bool {
        do {
            _ = try await apiClient.request(
                BookingEndpoints.cancel(id: booking.id),
                responseType: Booking.self
            )

            // Update local state
            if bookings.contains(where: { $0.id == booking.id }) {
                // Reload to get updated status
                await loadBookings()
            }

            return true
        } catch {
            self.error = error
            print("Failed to cancel booking: \(error)")
            return false
        }
    }
}
