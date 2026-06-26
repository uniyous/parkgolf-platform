// swiftlint:disable:this file_name
// swiftlint:disable all
// swift-format-ignore-file
// swiftformat:disable all
// Generated using tuist — https://github.com/tuist/tuist

import Foundation

// swiftlint:disable superfluous_disable_command file_length implicit_return

// MARK: - Strings

// swiftlint:disable explicit_type_interface function_parameter_count identifier_name line_length
// swiftlint:disable nesting type_body_length type_name
public enum ParkGolfStrings: Sendable {

  public enum Auth: Sendable {
  /// 이메일
    public static let email = ParkGolfStrings.tr("Localizable", "auth.email")
    /// 비밀번호 찾기
    public static let forgotPassword = ParkGolfStrings.tr("Localizable", "auth.forgotPassword")
    /// 로그인
    public static let login = ParkGolfStrings.tr("Localizable", "auth.login")
    /// 로그아웃
    public static let logout = ParkGolfStrings.tr("Localizable", "auth.logout")
    /// 비밀번호
    public static let password = ParkGolfStrings.tr("Localizable", "auth.password")
    /// 회원가입
    public static let signup = ParkGolfStrings.tr("Localizable", "auth.signup")
  }

  public enum Booking: Sendable {
  /// 취소됨
    public static let cancelled = ParkGolfStrings.tr("Localizable", "booking.cancelled")
    /// 완료
    public static let completed = ParkGolfStrings.tr("Localizable", "booking.completed")
    /// 확정
    public static let confirmed = ParkGolfStrings.tr("Localizable", "booking.confirmed")
    /// 새 예약
    public static let new = ParkGolfStrings.tr("Localizable", "booking.new")
    /// 대기중
    public static let pending = ParkGolfStrings.tr("Localizable", "booking.pending")
    /// 예정
    public static let upcoming = ParkGolfStrings.tr("Localizable", "booking.upcoming")
  }

  public enum Chat: Sendable {
  /// 새 채팅
    public static let newChat = ParkGolfStrings.tr("Localizable", "chat.newChat")
    /// 대화를 시작해보세요
    public static let noMessages = ParkGolfStrings.tr("Localizable", "chat.noMessages")
  }

  public enum Common: Sendable {
  /// 취소
    public static let cancel = ParkGolfStrings.tr("Localizable", "common.cancel")
    /// 닫기
    public static let close = ParkGolfStrings.tr("Localizable", "common.close")
    /// 확인
    public static let confirm = ParkGolfStrings.tr("Localizable", "common.confirm")
    /// 삭제
    public static let delete = ParkGolfStrings.tr("Localizable", "common.delete")
    /// 수정
    public static let edit = ParkGolfStrings.tr("Localizable", "common.edit")
    /// 오류
    public static let error = ParkGolfStrings.tr("Localizable", "common.error")
    /// 로딩 중...
    public static let loading = ParkGolfStrings.tr("Localizable", "common.loading")
    /// 다시 시도
    public static let retry = ParkGolfStrings.tr("Localizable", "common.retry")
    /// 저장
    public static let save = ParkGolfStrings.tr("Localizable", "common.save")
  }

  public enum Tab: Sendable {
  /// 예약
    public static let booking = ParkGolfStrings.tr("Localizable", "tab.booking")
    /// 채팅
    public static let chat = ParkGolfStrings.tr("Localizable", "tab.chat")
    /// 홈
    public static let home = ParkGolfStrings.tr("Localizable", "tab.home")
    /// 마이
    public static let profile = ParkGolfStrings.tr("Localizable", "tab.profile")
  }
}
// swiftlint:enable explicit_type_interface function_parameter_count identifier_name line_length
// swiftlint:enable nesting type_body_length type_name

// MARK: - Implementation Details

extension ParkGolfStrings {
  private static func tr(_ table: String, _ key: String, _ args: CVarArg...) -> String {
    let format = Bundle.module.localizedString(forKey: key, value: nil, table: table)
    return String(format: format, locale: Locale.current, arguments: args)
  }
}

// swiftlint:disable convenience_type
// swiftformat:enable all
// swiftlint:enable all
