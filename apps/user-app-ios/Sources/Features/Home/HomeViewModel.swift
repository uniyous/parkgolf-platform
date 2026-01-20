import Foundation

@MainActor
class HomeViewModel: ObservableObject {
    @Published var upcomingBookings: [BookingResponse] = []
    @Published var popularClubs: [Club] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let bookingService = BookingService()

    func loadData() async {
        isLoading = true
        errorMessage = nil

        // Load upcoming bookings
        do {
            let response = try await bookingService.getMyBookings(status: .upcoming, page: 1, limit: 5)
            upcomingBookings = response.data
        } catch {
            // Handle error silently for home
        }

        // Mock popular clubs for now
        popularClubs = [
            Club(id: "1", name: "서울파크골프장", address: "서울시 강남구", phoneNumber: nil, imageUrl: nil, latitude: nil, longitude: nil, courses: nil),
            Club(id: "2", name: "부산파크골프장", address: "부산시 해운대구", phoneNumber: nil, imageUrl: nil, latitude: nil, longitude: nil, courses: nil),
            Club(id: "3", name: "제주파크골프장", address: "제주시 애월읍", phoneNumber: nil, imageUrl: nil, latitude: nil, longitude: nil, courses: nil),
        ]

        isLoading = false
    }

    func refresh() async {
        await loadData()
    }
}
