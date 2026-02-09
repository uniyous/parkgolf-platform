import Foundation

// MARK: - Location Endpoints

enum LocationEndpoints {
    static func reverseGeo(lat: Double, lon: Double) -> Endpoint {
        Endpoint(
            path: "/api/user/location/reverse-geo",
            queryParameters: [
                "lat": String(lat),
                "lon": String(lon)
            ]
        )
    }

    static func nearbyClubs(lat: Double, lon: Double, radius: Double = 30, limit: Int = 10) -> Endpoint {
        Endpoint(
            path: "/api/user/location/nearby-clubs",
            queryParameters: [
                "lat": String(lat),
                "lon": String(lon),
                "radius": String(radius),
                "limit": String(limit)
            ]
        )
    }
}

// MARK: - Weather Endpoints

enum WeatherEndpoints {
    static func current(lat: Double, lon: Double) -> Endpoint {
        Endpoint(
            path: "/api/user/weather/current",
            queryParameters: [
                "lat": String(lat),
                "lon": String(lon)
            ]
        )
    }

    static func hourly(lat: Double, lon: Double) -> Endpoint {
        Endpoint(
            path: "/api/user/weather/hourly",
            queryParameters: [
                "lat": String(lat),
                "lon": String(lon)
            ]
        )
    }

    static func forecast(lat: Double, lon: Double) -> Endpoint {
        Endpoint(
            path: "/api/user/weather/forecast",
            queryParameters: [
                "lat": String(lat),
                "lon": String(lon)
            ]
        )
    }
}

// MARK: - Response Models

struct RegionInfo: Codable, Sendable {
    let regionType: String?
    let addressName: String?
    let region1: String?
    let region2: String?
    let region3: String?
    let region4: String?
    let code: String?

    /// 표시용 행정동 이름 (region3 우선, region2 대체)
    var displayName: String {
        region3 ?? region2 ?? addressName ?? ""
    }
}

struct CurrentWeather: Codable, Sendable {
    let temperature: Double
    let humidity: Double
    let windSpeed: Double
    let windDirection: Double
    let precipitation: Double
    let precipitationType: String
    let updatedAt: String

    var weatherDescription: String {
        switch precipitationType {
        case "RAIN": return "비"
        case "SNOW": return "눈"
        case "SLEET": return "진눈깨비"
        case "DRIZZLE": return "이슬비"
        case "SNOW_FLURRY": return "날림눈"
        default: return "맑음"
        }
    }

    var weatherIcon: String {
        switch precipitationType {
        case "RAIN": return "cloud.rain.fill"
        case "SNOW": return "cloud.snow.fill"
        case "SLEET": return "cloud.sleet.fill"
        case "DRIZZLE": return "cloud.drizzle.fill"
        case "SNOW_FLURRY": return "cloud.snow.fill"
        default: return "sun.max.fill"
        }
    }
}

struct NearbyClub: Identifiable, Codable, Sendable {
    let id: Int
    let name: String
    let location: String
    let address: String
    let phone: String
    let latitude: Double?
    let longitude: Double?
    let totalHoles: Int
    let totalCourses: Int
    let status: String
    let clubType: String
    let facilities: [String]
    let distance: Double // km
}

// MARK: - Location & Weather Service

final class LocationWeatherService: Sendable {
    private let apiClient = APIClient.shared

    func reverseGeo(lat: Double, lon: Double) async throws -> RegionInfo {
        return try await apiClient.request(
            LocationEndpoints.reverseGeo(lat: lat, lon: lon),
            responseType: RegionInfo.self
        )
    }

    func nearbyClubs(lat: Double, lon: Double, radius: Double = 30, limit: Int = 10) async throws -> [NearbyClub] {
        return try await apiClient.requestArray(
            LocationEndpoints.nearbyClubs(lat: lat, lon: lon, radius: radius, limit: limit),
            responseType: NearbyClub.self
        )
    }

    func getCurrentWeather(lat: Double, lon: Double) async throws -> CurrentWeather {
        return try await apiClient.request(
            WeatherEndpoints.current(lat: lat, lon: lon),
            responseType: CurrentWeather.self
        )
    }
}
