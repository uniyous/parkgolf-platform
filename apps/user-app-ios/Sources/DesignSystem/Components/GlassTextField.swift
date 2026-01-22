import SwiftUI

// MARK: - Glass Text Field

struct GlassTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String? = nil
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundStyle(.white.opacity(0.6))
                    .frame(width: 24)
            }

            if isSecure {
                SecureField(placeholder, text: $text)
                    .textFieldStyle(.plain)
                    .foregroundStyle(.white)
                    .tint(Color.parkPrimary)
                    .focused($isFocused)
            } else {
                TextField(placeholder, text: $text)
                    .textFieldStyle(.plain)
                    .foregroundStyle(.white)
                    .tint(Color.parkPrimary)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalization)
                    .focused($isFocused)
            }

            if !text.isEmpty && isFocused {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.4))
                }
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .frame(height: 52)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .fill(.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.md)
                        .stroke(isFocused ? Color.parkPrimary : Color.white.opacity(0.2), lineWidth: 1)
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// MARK: - Glass Text Editor

struct GlassTextEditor: View {
    let placeholder: String
    @Binding var text: String
    var minHeight: CGFloat = 100

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .foregroundStyle(.white.opacity(0.4))
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.vertical, ParkSpacing.sm)
            }

            TextEditor(text: $text)
                .scrollContentBackground(.hidden)
                .foregroundStyle(.white)
                .tint(Color.parkPrimary)
                .padding(.horizontal, ParkSpacing.xs)
                .padding(.vertical, ParkSpacing.xs)
        }
        .frame(minHeight: minHeight)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .fill(.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.md)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Glass Search Field

struct GlassSearchField: View {
    let placeholder: String
    @Binding var text: String
    var onSubmit: (() -> Void)? = nil

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(.white.opacity(0.6))

            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .foregroundStyle(.white)
                .tint(Color.parkPrimary)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($isFocused)
                .onSubmit {
                    onSubmit?()
                }

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.4))
                }
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .frame(height: 48)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.xl)
                .fill(.white.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.xl)
                        .stroke(isFocused ? Color.parkPrimary : Color.white.opacity(0.2), lineWidth: 1)
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            GlassSearchField(placeholder: "골프장 검색...", text: .constant(""))

            GlassTextField(
                placeholder: "이메일",
                text: .constant(""),
                icon: "envelope"
            )

            GlassTextField(
                placeholder: "비밀번호",
                text: .constant(""),
                icon: "lock",
                isSecure: true
            )

            GlassTextEditor(
                placeholder: "요청사항을 입력해주세요...",
                text: .constant("")
            )
        }
        .padding()
    }
}
