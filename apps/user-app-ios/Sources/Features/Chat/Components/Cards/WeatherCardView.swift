import SwiftUI

struct WeatherCardView: View {
    let data: Any

    private var weatherDict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var temperature: Double {
        weatherDict["temperature"] as? Double ?? 0
    }

    private var sky: String {
        weatherDict["sky"] as? String ?? ""
    }

    private var recommendation: String {
        weatherDict["recommendation"] as? String ?? ""
    }

    private var skyIcon: String {
        let lower = sky.lowercased()
        if lower.contains("비") || lower.contains("rain") { return "cloud.rain.fill" }
        if lower.contains("맑") || lower.contains("clear") { return "sun.max.fill" }
        return "cloud.fill"
    }

    private var skyColor: Color {
        let lower = sky.lowercased()
        if lower.contains("비") || lower.contains("rain") { return .blue }
        if lower.contains("맑") || lower.contains("clear") { return .yellow }
        return .gray
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: skyIcon)
                .font(.title2)
                .foregroundColor(skyColor)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Image(systemName: "thermometer.medium")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                    Text("\(Int(temperature))°C")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                    Text(sky)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }

                if !recommendation.isEmpty {
                    Text(recommendation)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}
