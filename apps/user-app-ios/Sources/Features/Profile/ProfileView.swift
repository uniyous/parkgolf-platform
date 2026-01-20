import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // Profile Header
                profileHeader

                // Menu Sections
                accountSection
                appSection
                supportSection
                logoutSection
            }
            .navigationTitle("마이페이지")
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        Section {
            HStack(spacing: 16) {
                // Avatar
                Circle()
                    .fill(Color.green.opacity(0.2))
                    .frame(width: 70, height: 70)
                    .overlay {
                        Image(systemName: "person.fill")
                            .font(.title)
                            .foregroundStyle(.green)
                    }

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(appState.currentUser?.name ?? "사용자")
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text(appState.currentUser?.email ?? "")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                NavigationLink {
                    EditProfileView()
                } label: {
                    Image(systemName: "chevron.right")
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 8)
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        Section("계정") {
            NavigationLink {
                Text("예약 내역")
            } label: {
                Label("예약 내역", systemImage: "calendar")
            }

            NavigationLink {
                Text("친구 관리")
            } label: {
                Label("친구 관리", systemImage: "person.2")
            }

            NavigationLink {
                Text("결제 수단")
            } label: {
                Label("결제 수단", systemImage: "creditcard")
            }
        }
    }

    // MARK: - App Section

    private var appSection: some View {
        Section("앱 설정") {
            NavigationLink {
                NotificationSettingsView()
            } label: {
                Label("알림 설정", systemImage: "bell")
            }

            NavigationLink {
                Text("테마 설정")
            } label: {
                Label("테마", systemImage: "paintbrush")
            }

            NavigationLink {
                Text("언어 설정")
            } label: {
                Label("언어", systemImage: "globe")
            }
        }
    }

    // MARK: - Support Section

    private var supportSection: some View {
        Section("지원") {
            NavigationLink {
                Text("공지사항")
            } label: {
                Label("공지사항", systemImage: "megaphone")
            }

            NavigationLink {
                Text("자주 묻는 질문")
            } label: {
                Label("자주 묻는 질문", systemImage: "questionmark.circle")
            }

            NavigationLink {
                Text("문의하기")
            } label: {
                Label("문의하기", systemImage: "envelope")
            }

            HStack {
                Label("버전", systemImage: "info.circle")

                Spacer()

                Text("1.0.0")
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Logout Section

    private var logoutSection: some View {
        Section {
            Button(role: .destructive) {
                showLogoutAlert = true
            } label: {
                HStack {
                    Spacer()
                    Text("로그아웃")
                    Spacer()
                }
            }
        }
        .alert("로그아웃", isPresented: $showLogoutAlert) {
            Button("취소", role: .cancel) {}
            Button("로그아웃", role: .destructive) {
                appState.signOut()
            }
        } message: {
            Text("정말 로그아웃 하시겠습니까?")
        }
    }
}

// MARK: - Edit Profile View (Placeholder)

struct EditProfileView: View {
    var body: some View {
        Text("프로필 수정")
            .navigationTitle("프로필 수정")
    }
}

// MARK: - Notification Settings View (Placeholder)

struct NotificationSettingsView: View {
    @State private var bookingNotification = true
    @State private var chatNotification = true
    @State private var marketingNotification = false

    var body: some View {
        List {
            Section {
                Toggle("예약 알림", isOn: $bookingNotification)
                Toggle("채팅 알림", isOn: $chatNotification)
            } header: {
                Text("서비스 알림")
            } footer: {
                Text("예약 확정, 취소 및 채팅 메시지 알림을 받습니다.")
            }

            Section {
                Toggle("마케팅 알림", isOn: $marketingNotification)
            } header: {
                Text("마케팅")
            } footer: {
                Text("이벤트, 프로모션 정보를 받습니다.")
            }
        }
        .navigationTitle("알림 설정")
    }
}

#Preview {
    ProfileView()
        .environmentObject(AppState())
}
