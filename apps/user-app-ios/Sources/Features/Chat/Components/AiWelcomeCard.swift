import SwiftUI

struct AiWelcomeCard: View {
    let onQuickAction: (String) -> Void

    private let quickActions: [(icon: String, label: String, message: String, color: Color)] = [
        ("magnifyingglass", "골프장 검색", "골프장 검색해줘", Color.parkPrimary),
        ("calendar.badge.checkmark", "예약 하기", "예약하고 싶어", .blue),
        ("mappin.and.ellipse", "내 근처 찾기", "내 근처 골프장 알려줘", .orange),
        ("cloud.sun", "날씨 확인", "오늘 날씨 어때?", .purple),
    ]

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                // AI avatar + label
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                        .frame(width: 28, height: 28)
                        .background(
                            LinearGradient(
                                colors: [Color.parkPrimary, Color.parkPrimary.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(Circle())
                        .shadow(color: Color.parkPrimary.opacity(0.3), radius: 4)

                    Text("AI 예약 도우미")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(Color.parkPrimary)
                }

                // Welcome message + quick actions
                VStack(alignment: .leading, spacing: 8) {
                    Text("안녕하세요! 파크골프 예약 도우미입니다.")
                        .font(.title3)
                        .foregroundColor(.white)

                    Text("골프장 검색, 예약, 날씨 확인 등을 도와드릴게요.")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.7))

                    // Quick action buttons (2x2 grid)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach(quickActions, id: \.label) { action in
                            Button {
                                onQuickAction(action.message)
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: action.icon)
                                        .font(.system(size: 12))
                                        .foregroundColor(action.color)

                                    Text(action.label)
                                        .font(.body)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white.opacity(0.8))
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                            }
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.parkPrimary.opacity(0.05))
                .overlay(
                    Rectangle()
                        .fill(Color.parkPrimary.opacity(0.4))
                        .frame(width: 3),
                    alignment: .leading
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            Spacer(minLength: 40)
        }
    }
}
