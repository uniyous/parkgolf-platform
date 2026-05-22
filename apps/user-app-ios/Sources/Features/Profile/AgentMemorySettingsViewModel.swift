import Foundation

@MainActor
class AgentMemorySettingsViewModel: ObservableObject {
    @Published var status: AgentMemoryStatus?
    @Published var isLoading = false
    @Published var isUpdating = false
    @Published var errorMessage: String?

    private let settingsService = SettingsService()

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            status = try await settingsService.getAgentMemory()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func setEnabled(_ enabled: Bool) async {
        guard let current = status else { return }
        let previous = current.enabled
        // Optimistic update
        status = AgentMemoryStatus(
            userId: current.userId,
            enabled: enabled,
            hasMemory: current.hasMemory,
            summary: current.summary,
            favoriteClubsCount: current.favoriteClubsCount,
            frequentTeammatesCount: current.frequentTeammatesCount,
        )
        isUpdating = true
        do {
            _ = try await settingsService.setAgentMemoryEnabled(enabled)
            // 성공 시 다시 fetch (summary 갱신 가능성)
            status = try? await settingsService.getAgentMemory() ?? status
        } catch {
            // 롤백
            status = AgentMemoryStatus(
                userId: current.userId,
                enabled: previous,
                hasMemory: current.hasMemory,
                summary: current.summary,
                favoriteClubsCount: current.favoriteClubsCount,
                frequentTeammatesCount: current.frequentTeammatesCount,
            )
            errorMessage = error.localizedDescription
        }
        isUpdating = false
    }
}
