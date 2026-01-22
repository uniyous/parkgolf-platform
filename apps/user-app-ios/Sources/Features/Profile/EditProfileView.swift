import SwiftUI

// MARK: - Edit Profile View

struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @State private var name = ""
    @State private var phoneNumber = ""
    @State private var isSaving = false

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.lg) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Color.parkPrimary, Color.parkSecondary],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 100, height: 100)

                        Text(String(name.prefix(1)))
                            .font(.parkDisplayMedium)
                            .foregroundStyle(.white)

                        // Edit Badge
                        Circle()
                            .fill(Color.parkPrimary)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.white)
                            )
                            .offset(x: 35, y: 35)
                    }
                    .padding(.top, ParkSpacing.lg)

                    // Form
                    GlassCard {
                        VStack(spacing: ParkSpacing.md) {
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("이름")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "이름을 입력하세요",
                                    text: $name,
                                    icon: "person"
                                )
                            }

                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("이메일")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                HStack(spacing: ParkSpacing.sm) {
                                    Image(systemName: "envelope")
                                        .foregroundStyle(.white.opacity(0.3))
                                        .frame(width: 20)

                                    Text(appState.currentUser?.email ?? "")
                                        .font(.parkBodyMedium)
                                        .foregroundStyle(.white.opacity(0.5))

                                    Spacer()
                                }
                                .padding(.horizontal, ParkSpacing.md)
                                .padding(.vertical, ParkSpacing.sm)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                            }

                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("휴대폰 번호")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "010-0000-0000",
                                    text: $phoneNumber,
                                    icon: "phone"
                                )
                                .keyboardType(.phonePad)
                            }
                        }
                    }

                    GradientButton(
                        title: "저장하기",
                        isLoading: isSaving
                    ) {
                        // Save profile
                    }

                    Spacer()
                }
                .padding(.horizontal, ParkSpacing.md)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("프로필 수정")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .onAppear {
            name = appState.currentUser?.name ?? ""
            phoneNumber = appState.currentUser?.phoneNumber ?? ""
        }
    }
}

#Preview {
    NavigationStack {
        EditProfileView()
            .environmentObject(AppState())
    }
}
