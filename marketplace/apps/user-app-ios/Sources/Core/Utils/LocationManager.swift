import Foundation
import CoreLocation

@MainActor
class LocationManager: NSObject, ObservableObject {
    static let shared = LocationManager()

    @Published var latitude: Double?
    @Published var longitude: Double?
    @Published var isAuthorized = false
    @Published var isLoading = false
    @Published var error: String?

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.distanceFilter = 500 // 500m 이동 시 업데이트
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func requestLocation() {
        isLoading = true
        error = nil
        manager.requestLocation()
    }

    var hasLocation: Bool {
        latitude != nil && longitude != nil
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationManager: @preconcurrency CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            isAuthorized = true
            requestLocation()
        case .denied, .restricted:
            isAuthorized = false
            isLoading = false
            error = "위치 접근 권한이 필요합니다."
        case .notDetermined:
            isAuthorized = false
        @unknown default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        latitude = location.coordinate.latitude
        longitude = location.coordinate.longitude
        isLoading = false
        error = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        isLoading = false
        self.error = "위치 정보를 가져올 수 없습니다."
        #if DEBUG
        print("Location error: \(error.localizedDescription)")
        #endif
    }
}
