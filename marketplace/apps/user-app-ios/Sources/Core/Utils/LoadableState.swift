import Foundation
import SwiftUI

// MARK: - Loadable State

/// 비동기 데이터 로딩 상태를 나타내는 enum
enum LoadableState<T> {
    case idle
    case loading
    case loaded(T)
    case error(Error)

    var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }

    var value: T? {
        if case .loaded(let data) = self { return data }
        return nil
    }

    var error: Error? {
        if case .error(let error) = self { return error }
        return nil
    }

    var errorMessage: String? {
        error?.localizedDescription
    }
}

// MARK: - View State Protocol

/// ViewModel의 공통 로딩/에러 상태를 정의하는 프로토콜
@MainActor
protocol ViewStateManageable: ObservableObject {
    var isLoading: Bool { get set }
    var errorMessage: String? { get set }
}

extension ViewStateManageable {
    /// 에러 메시지를 설정하고 일정 시간 후 자동으로 초기화
    func setError(_ message: String, autoClearAfter seconds: TimeInterval = 5) {
        errorMessage = message
        Task {
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            if errorMessage == message {
                errorMessage = nil
            }
        }
    }

    /// 비동기 작업을 로딩 상태와 함께 실행
    func withLoading<T>(_ operation: () async throws -> T) async throws -> T {
        isLoading = true
        defer { isLoading = false }
        return try await operation()
    }

    /// 비동기 작업을 실행하고 에러 발생 시 자동으로 errorMessage 설정
    func performAsync<T>(
        showLoading: Bool = true,
        _ operation: () async throws -> T
    ) async -> T? {
        if showLoading { isLoading = true }
        defer { if showLoading { isLoading = false } }

        do {
            return try await operation()
        } catch {
            if !Task.isCancelled {
                errorMessage = error.localizedDescription
            }
            return nil
        }
    }
}

// MARK: - Pagination State

/// 페이지네이션 상태 관리
struct PaginationState {
    var currentPage: Int = 1
    var totalPages: Int = 1
    var isLoadingMore: Bool = false

    var hasMorePages: Bool {
        currentPage < totalPages
    }

    mutating func reset() {
        currentPage = 1
        totalPages = 1
        isLoadingMore = false
    }

    mutating func nextPage() {
        currentPage += 1
    }

    mutating func update(page: Int, totalPages: Int) {
        self.currentPage = page
        self.totalPages = totalPages
    }
}

// MARK: - Debouncer

/// 검색 등에서 사용하는 디바운서
actor Debouncer {
    private var task: Task<Void, Never>?
    private let delay: UInt64

    init(delay: UInt64 = Configuration.Debounce.search) {
        self.delay = delay
    }

    func debounce(_ action: @escaping @Sendable () async -> Void) {
        task?.cancel()
        task = Task {
            try? await Task.sleep(nanoseconds: delay)
            guard !Task.isCancelled else { return }
            await action()
        }
    }

    func cancel() {
        task?.cancel()
        task = nil
    }
}
