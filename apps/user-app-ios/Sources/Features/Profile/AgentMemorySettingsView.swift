import SwiftUI

/// AI 비서 메모리 프라이버시 설정 (Phase 3 — UNI-20)
struct AgentMemorySettingsView: View {
    @StateObject private var viewModel = AgentMemorySettingsViewModel()

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: ParkSpacing.lg) {
                    // 설명
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            HStack(spacing: ParkSpacing.xs) {
                                Image(systemName: "sparkles")
                                    .foregroundStyle(Color.parkPrimary)
                                Text("AI 비서 메모리")
                                    .font(.parkHeadlineSmall)
                                    .foregroundStyle(.white)
                            }
                            Text("자주 가는 골프장, 함께하는 멤버, 선호 시간대를 기억해서 더 빠른 추천을 받을 수 있어요.")
                                .font(.parkBodyMedium)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }

                    // 토글
                    if let status = viewModel.status {
                        GlassCard {
                            HStack {
                                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                    Text("개인화 추천 사용")
                                        .font(.parkLabelLarge)
                                        .foregroundStyle(.white)
                                    Text(status.enabled
                                         ? "\"지난번처럼\" 한 마디로 부킹"
                                         : "AI가 과거 패턴을 사용하지 않음")
                                        .font(.parkCaption)
                                        .foregroundStyle(.white.opacity(0.5))
                                }
                                Spacer()
                                Toggle("", isOn: Binding(
                                    get: { status.enabled },
                                    set: { newValue in
                                        Task { await viewModel.setEnabled(newValue) }
                                    },
                                ))
                                .labelsHidden()
                                .tint(Color.parkPrimary)
                                .disabled(viewModel.isUpdating)
                            }
                        }

                        // 현재 기억 중인 내용
                        if status.hasMemory, status.enabled, let summary = status.summary, !summary.isEmpty {
                            GlassCard {
                                VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                                    Text("현재 기억 중인 내용")
                                        .font(.parkLabelLarge)
                                        .foregroundStyle(.white.opacity(0.8))
                                    Text(summary)
                                        .font(.parkBodyMedium)
                                        .foregroundStyle(.white.opacity(0.85))
                                        .fixedSize(horizontal: false, vertical: true)
                                    if let clubs = status.favoriteClubsCount, let teammates = status.frequentTeammatesCount {
                                        Text("자주 가는 클럽 \(clubs)곳 · 자주 함께하는 멤버 \(teammates)명")
                                            .font(.parkCaption)
                                            .foregroundStyle(.white.opacity(0.5))
                                    }
                                }
                            }
                        }

                        // 안내
                        VStack(alignment: .leading, spacing: 4) {
                            Text("• OFF로 두시면 AI가 과거 부킹 패턴을 추천에 사용하지 않습니다.")
                            Text("• 계정 삭제 시 메모리 데이터도 함께 삭제됩니다.")
                        }
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(.horizontal, ParkSpacing.xs)
                    } else if viewModel.isLoading {
                        ProgressView().tint(.white).frame(maxWidth: .infinity)
                    } else if let err = viewModel.errorMessage {
                        GlassCard {
                            Text(err)
                                .font(.parkBodyMedium)
                                .foregroundStyle(Color.parkError)
                        }
                    }
                }
                .padding(ParkSpacing.md)
            }
        }
        .navigationTitle("AI 메모리 설정")
        .navigationBarTitleDisplayMode(.inline)
        .subScreenTabBarHidden()
        .task { await viewModel.load() }
    }
}
