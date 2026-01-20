import Foundation

// MARK: - Date Helper

enum DateHelper: Sendable {
    // MARK: - Shared Formatters (Thread-safe, cached)

    private static let koreaLocale = Locale(identifier: "ko_KR")
    private static let koreaTimeZone = TimeZone(identifier: "Asia/Seoul") ?? .current

    /// ISO8601 날짜 포맷터 (yyyy-MM-dd)
    static let isoDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = koreaTimeZone
        return formatter
    }()

    /// ISO8601 날짜시간 포맷터 (API 응답용)
    static let iso8601Formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    /// 한국어 전체 날짜 (yyyy년 M월 d일 (E))
    static let koreanFullDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = koreaLocale
        formatter.dateFormat = "yyyy년 M월 d일 (E)"
        return formatter
    }()

    /// 한국어 짧은 날짜 (M/d (E))
    static let koreanShortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = koreaLocale
        formatter.dateFormat = "M/d (E)"
        return formatter
    }()

    /// 한국어 시간 (a h:mm)
    static let koreanTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = koreaLocale
        formatter.dateFormat = "a h:mm"
        return formatter
    }()

    /// 날짜 + 시간 (yyyy.MM.dd HH:mm)
    static let dateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = koreaLocale
        formatter.dateFormat = "yyyy.MM.dd HH:mm"
        return formatter
    }()

    /// 짧은 날짜 (M/d)
    static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d"
        return formatter
    }()

    // MARK: - Formatting Functions

    /// Date -> "yyyy-MM-dd" 문자열
    static func toISODateString(_ date: Date) -> String {
        isoDateFormatter.string(from: date)
    }

    /// "yyyy-MM-dd" 문자열 -> Date
    static func fromISODateString(_ string: String) -> Date? {
        isoDateFormatter.date(from: string)
    }

    /// Date -> "yyyy년 M월 d일 (E)" 문자열
    static func toKoreanFullDate(_ date: Date) -> String {
        koreanFullDateFormatter.string(from: date)
    }

    /// Date -> "M/d (E)" 문자열
    static func toKoreanShortDate(_ date: Date) -> String {
        koreanShortDateFormatter.string(from: date)
    }

    /// Date -> "a h:mm" 문자열 (오전/오후 시간)
    static func toKoreanTime(_ date: Date) -> String {
        koreanTimeFormatter.string(from: date)
    }

    /// Date -> "yyyy.MM.dd HH:mm" 문자열
    static func toDateTime(_ date: Date) -> String {
        dateTimeFormatter.string(from: date)
    }

    /// ISO8601 문자열 -> Date
    static func fromISO8601(_ string: String) -> Date? {
        iso8601Formatter.date(from: string)
    }

    /// ISO8601 문자열 -> "yyyy.MM.dd HH:mm"
    static func iso8601ToDateTime(_ string: String) -> String? {
        guard let date = fromISO8601(string) else { return nil }
        return toDateTime(date)
    }

    // MARK: - Relative Date Functions

    /// 오늘/내일/날짜 형식으로 반환
    static func toRelativeDate(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            return "오늘"
        } else if Calendar.current.isDateInTomorrow(date) {
            return "내일"
        } else {
            return toKoreanShortDate(date)
        }
    }

    /// 채팅 시간 표시 (오늘이면 시간, 아니면 날짜)
    static func toChatTime(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            return toKoreanTime(date)
        } else {
            return shortDateFormatter.string(from: date)
        }
    }

    // MARK: - Date Range Helpers

    /// 오늘부터 n일간의 날짜 배열
    static func dateRange(days: Int) -> [Date] {
        (0..<days).compactMap {
            Calendar.current.date(byAdding: .day, value: $0, to: Date())
        }
    }
}
