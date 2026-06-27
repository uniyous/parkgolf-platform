import SwiftUI

// MARK: - Add Friend Sheet

struct AddFriendSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: FriendsViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search Bar
                    searchBar

                    // Find from Contacts Button
                    findFromContactsButton

                    // Results
                    resultsContent
                }
            }
            .navigationTitle("친구 추가")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        viewModel.clearContactFriends()
                        viewModel.addFriendSearchQuery = ""
                        viewModel.searchResults = []
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.white.opacity(0.5))

            TextField("이메일 또는 이름으로 검색", text: $viewModel.addFriendSearchQuery)
                .foregroundStyle(.white)
                .font(.parkBodyMedium)
                .autocapitalization(.none)
                .onChange(of: viewModel.addFriendSearchQuery) { _, _ in
                    viewModel.searchUsers()
                }

            if !viewModel.addFriendSearchQuery.isEmpty {
                Button {
                    viewModel.addFriendSearchQuery = ""
                    viewModel.searchResults = []
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding(ParkSpacing.md)
        .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
        .padding(ParkSpacing.md)
    }

    // MARK: - Find from Contacts Button

    private var findFromContactsButton: some View {
        Button {
            Task {
                await viewModel.loadContactFriends()
            }
        } label: {
            HStack(spacing: ParkSpacing.sm) {
                Image(systemName: "person.crop.rectangle.stack")
                Text("주소록에서 찾기")
            }
            .font(.parkLabelMedium)
            .foregroundStyle(Color.parkPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, ParkSpacing.md)
            .background(Color.parkPrimary.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
        }
        .padding(.horizontal, ParkSpacing.md)
        .disabled(viewModel.isLoadingContacts)
    }

    // MARK: - Results Content

    @ViewBuilder
    private var resultsContent: some View {
        if viewModel.isSearching || viewModel.isLoadingContacts {
            ParkLoadingView(message: "검색 중...")
        } else if viewModel.contactsPermissionDenied {
            ParkEmptyStateView(
                icon: "person.crop.rectangle.badge.xmark",
                title: "주소록 접근 권한 필요",
                description: "설정에서 주소록 접근을 허용해주세요"
            )
        } else if viewModel.searchResults.isEmpty && viewModel.contactFriends.isEmpty {
            emptyResultsContent
        } else {
            searchResultsList
        }
    }

    // MARK: - Empty Results Content

    @ViewBuilder
    private var emptyResultsContent: some View {
        if viewModel.addFriendSearchQuery.isEmpty {
            ParkEmptyStateView(
                icon: "magnifyingglass",
                title: "친구를 검색하세요",
                description: "이메일이나 이름으로 검색하거나\n주소록에서 친구를 찾아보세요"
            )
        } else {
            ParkEmptyStateView(
                icon: "person.slash",
                title: "검색 결과가 없습니다",
                description: "다른 검색어로 시도해보세요"
            )
        }
    }

    // MARK: - Search Results List

    private var searchResultsList: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                // Contact Friends Section
                if !viewModel.contactFriends.isEmpty {
                    sectionHeader("주소록 친구")

                    ForEach(viewModel.contactFriends) { user in
                        UserSearchCard(user: user) {
                            Task {
                                await viewModel.sendFriendRequest(toUserId: user.id)
                            }
                        }
                    }
                }

                // Search Results Section
                if !viewModel.searchResults.isEmpty {
                    if !viewModel.contactFriends.isEmpty {
                        sectionHeader("검색 결과")
                    }

                    ForEach(viewModel.searchResults) { user in
                        UserSearchCard(user: user) {
                            Task {
                                await viewModel.sendFriendRequest(toUserId: user.id)
                            }
                        }
                    }
                }
            }
            .padding(ParkSpacing.md)
        }
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.parkLabelMedium)
                .foregroundStyle(.white.opacity(0.6))
            Spacer()
        }
        .padding(.top, ParkSpacing.sm)
    }
}

// MARK: - Preview

#Preview {
    AddFriendSheet(viewModel: FriendsViewModel())
}
