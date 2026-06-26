import SwiftUI

// MARK: - Glass Secure Field

struct GlassSecureField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String? = nil
    @State private var isSecured = true

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(width: 20)
            }

            Group {
                if isSecured {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(.white.opacity(0.4)))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundColor(.white.opacity(0.4)))
                }
            }
            .foregroundStyle(.white)
            .font(.parkBodyMedium)

            Button {
                isSecured.toggle()
            } label: {
                Image(systemName: isSecured ? "eye.slash" : "eye")
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.sm)
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
    }
}

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        GlassSecureField(
            placeholder: "비밀번호를 입력하세요",
            text: .constant(""),
            icon: "lock"
        )
        .padding()
    }
}
