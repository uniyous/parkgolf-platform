import SwiftUI

// MARK: - Test User Card

struct TestUserCard: View {
    let user: TestUser
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(user.name)
                    .font(.parkLabelSmall)
                    .foregroundStyle(.white)

                Text(user.email)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.5))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(ParkSpacing.sm)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: ParkRadius.sm)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        TestUserCard(
            user: TestUser(email: "test@parkgolf.com", password: "test1234", name: "테스트사용자", role: "USER")
        ) {
            // Action
        }
        .padding()
    }
}
