import Foundation

@MainActor
class HomeViewModel: ObservableObject {
    @Published var upcomingBookings: [BookingResponse] = []
    @Published var popularClubs: [Club] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // 알림 데이터
    @Published var friendRequests: [FriendRequest] = []
    @Published var unreadChatRooms: [ChatRoom] = []

    var pendingFriendRequestsCount: Int {
        friendRequests.count
    }

    var totalUnreadMessagesCount: Int {
        unreadChatRooms.reduce(0) { $0 + $1.unreadCount }
    }

    var hasNotifications: Bool {
        pendingFriendRequestsCount > 0 || totalUnreadMessagesCount > 0
    }

    private let bookingService = BookingService()
    private let friendService = FriendService()
    private let apiClient = APIClient.shared

    func loadData() async {
        isLoading = true
        errorMessage = nil

        // Load all data concurrently using async let
        async let bookingsTask = loadBookings()
        async let friendRequestsTask = loadFriendRequests()
        async let chatRoomsTask = loadChatRooms()

        // Await all tasks
        let (bookings, requests, rooms) = await (bookingsTask, friendRequestsTask, chatRoomsTask)

        upcomingBookings = bookings
        friendRequests = requests
        unreadChatRooms = rooms

        // Mock popular clubs for now
        popularClubs = [
            Club(id: "1", name: "서울파크골프장", address: "서울시 강남구", phoneNumber: nil, imageUrl: nil, latitude: nil, longitude: nil, courses: nil),
            Club(id: "2", name: "부산파크골프장", address: "부산시 해운대구", phoneNumber: nil, imageUrl: nil, latitude: nil, longitude: nil, courses: nil),
            Club(id: "3", name: "제주파크골프장", address: "제주시 애월읍", phoneNumber: nil, imageUrl: nil, latitude: nil, longitude: nil, courses: nil),
        ]

        isLoading = false
    }

    private func loadBookings() async -> [BookingResponse] {
        do {
            let allBookings = try await bookingService.getMyBookings(status: nil, page: 1, limit: 5)
            let now = Date()
            return allBookings.filter { booking in
                guard let date = DateHelper.fromISODateString(booking.bookingDate) else { return false }
                return date >= Calendar.current.startOfDay(for: now) &&
                       (booking.status == "PENDING" || booking.status == "SLOT_RESERVED" || booking.status == "CONFIRMED")
            }.prefix(5).map { $0 }
        } catch {
            return []
        }
    }

    private func loadFriendRequests() async -> [FriendRequest] {
        do {
            return try await friendService.getFriendRequests()
        } catch {
            return []
        }
    }

    private func loadChatRooms() async -> [ChatRoom] {
        do {
            let rooms = try await apiClient.requestArray(
                ChatEndpoints.rooms(page: 1, limit: 50),
                responseType: ChatRoom.self
            )
            return rooms.filter { $0.unreadCount > 0 }
        } catch {
            return []
        }
    }

    func refresh() async {
        await loadData()
    }
}
