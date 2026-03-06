import SwiftUI

struct AiUserMessageBubble: View {
    let content: String
    let createdAt: Date

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            Spacer(minLength: 40)

            VStack(alignment: .trailing, spacing: 4) {
                HStack(alignment: .bottom, spacing: 6) {
                    Text(DateHelper.toKoreanTime(createdAt))
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.4))

                    Text(content)
                        .font(.body)
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.parkPrimary.opacity(0.15))
                        .overlay(
                            Rectangle()
                                .fill(Color.parkPrimary)
                                .frame(width: 3),
                            alignment: .trailing
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }
}
