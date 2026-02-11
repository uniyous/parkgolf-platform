import Foundation

@MainActor
class HomeViewModel: ObservableObject {
    @Published var upcomingBookings: [BookingResponse] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // 알림 데이터
    @Published var friendRequests: [FriendRequest] = []
    @Published var unreadChatRooms: [ChatRoom] = []
    @Published var unreadNotificationCount: Int = 0

    // 위치/날씨 데이터
    @Published var regionName: String?
    @Published var currentWeather: CurrentWeather?
    @Published var nearbyClubs: [NearbyClub] = []
    @Published var hasLocation = false
    @Published var locationDataLoaded = false

    var pendingFriendRequestsCount: Int {
        friendRequests.count
    }

    var totalUnreadMessagesCount: Int {
        unreadChatRooms.reduce(0) { $0 + $1.unreadCount }
    }

    var hasNotifications: Bool {
        pendingFriendRequestsCount > 0 || totalUnreadMessagesCount > 0
    }

    // 전체 알림 배지 수 (헤더 벨 아이콘용)
    // 알림 서비스에 친구요청/채팅 알림이 이미 포함되어 있으므로 중복 카운트 방지
    var totalNotificationBadgeCount: Int {
        unreadNotificationCount
    }

    private let bookingService = BookingService()
    private let friendService = FriendService()
    private let notificationService = NotificationService()
    private let locationWeatherService = LocationWeatherService()
    private let apiClient = APIClient.shared

    // MARK: - Public

    func loadData(isRefresh: Bool = false) async {
        if !isRefresh {
            isLoading = true
        }
        errorMessage = nil

        #if DEBUG
        print("[Home] loadData started (isRefresh: \(isRefresh))")
        #endif

        // 4가지 데이터를 동시에 로드 (실패 시 기존 데이터 유지)
        async let b: Void = refreshBookings()
        async let f: Void = refreshFriendRequests()
        async let c: Void = refreshChatRooms()
        async let n: Void = refreshNotificationCount()

        _ = await (b, f, c, n)

        // 위치 기반 데이터 로드
        await refreshLocationData()

        isLoading = false

        #if DEBUG
        print("[Home] loadData completed")
        #endif
    }

    func refresh() async {
        // .refreshable의 structured concurrency 취소 전파 방지
        // unstructured Task로 실행하여 pull 제스처 해제 시에도 API 호출이 취소되지 않도록 함
        await withCheckedContinuation { continuation in
            Task {
                await loadData(isRefresh: true)
                continuation.resume()
            }
        }
    }

    // MARK: - Data Refresh (실패 시 기존 데이터 유지)

    private func refreshBookings() async {
        do {
            let allBookings = try await bookingService.getMyBookings(status: nil, page: 1, limit: 5)
            let now = Date()
            upcomingBookings = allBookings.filter { booking in
                guard let date = DateHelper.fromISODateString(booking.bookingDate) else { return false }
                return date >= Calendar.current.startOfDay(for: now) &&
                       (booking.status == "PENDING" || booking.status == "SLOT_RESERVED" || booking.status == "CONFIRMED")
            }.prefix(5).map { $0 }
            #if DEBUG
            print("[Home] bookings refreshed: \(upcomingBookings.count)건")
            #endif
        } catch {
            #if DEBUG
            print("[Home] bookings refresh failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func refreshFriendRequests() async {
        do {
            friendRequests = try await friendService.getFriendRequests()
            #if DEBUG
            print("[Home] friendRequests refreshed: \(friendRequests.count)건")
            #endif
        } catch {
            #if DEBUG
            print("[Home] friendRequests refresh failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func refreshChatRooms() async {
        do {
            let rooms = try await apiClient.requestArray(
                ChatEndpoints.rooms(page: 1, limit: 50),
                responseType: ChatRoom.self
            )
            unreadChatRooms = rooms.filter { $0.unreadCount > 0 }
            #if DEBUG
            print("[Home] chatRooms refreshed: unread \(unreadChatRooms.count)건")
            #endif
        } catch {
            #if DEBUG
            print("[Home] chatRooms refresh failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func refreshNotificationCount() async {
        do {
            unreadNotificationCount = try await notificationService.getUnreadCount()
            #if DEBUG
            print("[Home] notificationCount refreshed: \(unreadNotificationCount)")
            #endif
        } catch {
            #if DEBUG
            print("[Home] notificationCount refresh failed: \(error.localizedDescription)")
            #endif
        }
    }

    // MARK: - Location Data

    private func refreshLocationData() async {
        let locationManager = LocationManager.shared

        guard locationManager.hasLocation,
              let lat = locationManager.latitude,
              let lon = locationManager.longitude else {
            if !locationDataLoaded {
                hasLocation = false
                locationDataLoaded = true
            }
            return
        }

        hasLocation = true

        // 행정동, 날씨, 주변 골프장 동시 로드
        async let r: Void = refreshRegion(lat: lat, lon: lon)
        async let w: Void = refreshWeather(lat: lat, lon: lon)
        async let n: Void = refreshNearbyClubs(lat: lat, lon: lon)

        _ = await (r, w, n)

        locationDataLoaded = true
    }

    private func refreshRegion(lat: Double, lon: Double) async {
        do {
            let region = try await locationWeatherService.reverseGeo(lat: lat, lon: lon)
            regionName = region.displayName.isEmpty ? nil : region.displayName
            #if DEBUG
            print("[Home] region refreshed: \(regionName ?? "nil")")
            #endif
        } catch {
            #if DEBUG
            print("[Home] region refresh failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func refreshWeather(lat: Double, lon: Double) async {
        do {
            currentWeather = try await locationWeatherService.getCurrentWeather(lat: lat, lon: lon)
            #if DEBUG
            print("[Home] weather refreshed: \(currentWeather?.temperature ?? 0)°C")
            #endif
        } catch {
            #if DEBUG
            print("[Home] weather refresh failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func refreshNearbyClubs(lat: Double, lon: Double) async {
        do {
            nearbyClubs = try await locationWeatherService.nearbyClubs(lat: lat, lon: lon)
            #if DEBUG
            print("[Home] nearbyClubs refreshed: \(nearbyClubs.count)개")
            #endif
        } catch {
            #if DEBUG
            print("[Home] nearbyClubs refresh failed: \(error.localizedDescription)")
            #endif
        }
    }
}
