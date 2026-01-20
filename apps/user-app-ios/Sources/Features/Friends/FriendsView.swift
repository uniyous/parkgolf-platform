import SwiftUI

struct FriendsView: View {
    @StateObject private var viewModel = FriendsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segment Picker
                Picker("", selection: $viewModel.selectedSegment) {
                    ForEach(FriendsViewModel.FriendSegment.allCases, id: \.self) { segment in
                        HStack {
                            Text(segment.rawValue)
                            if segment == .requests && viewModel.pendingRequestsCount > 0 {
                                Text("\(viewModel.pendingRequestsCount)")
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.red)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            }
                        }
                        .tag(segment)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                Group {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        switch viewModel.selectedSegment {
                        case .friends:
                            friendsListView
                        case .requests:
                            requestsListView
                        }
                    }
                }
            }
            .navigationTitle("친구")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.showAddFriendSheet = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showAddFriendSheet) {
                AddFriendView(viewModel: viewModel)
            }
            .alert("오류", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("확인") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
        .task {
            await viewModel.loadAll()
        }
    }

    // MARK: - Friends List

    private var friendsListView: some View {
        Group {
            if viewModel.friends.isEmpty {
                ContentUnavailableView(
                    "친구가 없습니다",
                    systemImage: "person.2",
                    description: Text("친구를 추가하고 함께 골프를 즐겨보세요")
                )
            } else {
                List {
                    ForEach(viewModel.friends) { friend in
                        FriendRow(friend: friend)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task {
                                        await viewModel.removeFriend(friend)
                                    }
                                } label: {
                                    Label("삭제", systemImage: "trash")
                                }
                            }
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadFriends()
                }
            }
        }
    }

    // MARK: - Requests List

    private var requestsListView: some View {
        Group {
            if viewModel.friendRequests.isEmpty {
                ContentUnavailableView(
                    "받은 요청이 없습니다",
                    systemImage: "envelope.open",
                    description: Text("친구 요청이 오면 여기에 표시됩니다")
                )
            } else {
                List {
                    ForEach(viewModel.friendRequests) { request in
                        FriendRequestRow(
                            request: request,
                            onAccept: {
                                Task {
                                    await viewModel.acceptFriendRequest(request)
                                }
                            },
                            onReject: {
                                Task {
                                    await viewModel.rejectFriendRequest(request)
                                }
                            }
                        )
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadFriendRequests()
                }
            }
        }
    }
}

// MARK: - Friend Row

struct FriendRow: View {
    let friend: Friend

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.green.opacity(0.2))
                .frame(width: 50, height: 50)
                .overlay {
                    Text(String(friend.friendName.prefix(1)))
                        .font(.title2)
                        .fontWeight(.medium)
                        .foregroundStyle(.green)
                }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(friend.friendName)
                    .font(.headline)

                Text(friend.friendEmail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Chat Button
            NavigationLink {
                // Navigate to direct chat
                Text("채팅")
            } label: {
                Image(systemName: "message.fill")
                    .foregroundStyle(.green)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Friend Request Row

struct FriendRequestRow: View {
    let request: FriendRequest
    let onAccept: () -> Void
    let onReject: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 50, height: 50)
                .overlay {
                    Text(String(request.fromUserName.prefix(1)))
                        .font(.title2)
                        .fontWeight(.medium)
                        .foregroundStyle(.blue)
                }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(request.fromUserName)
                    .font(.headline)

                Text(request.fromUserEmail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Action Buttons
            HStack(spacing: 8) {
                Button {
                    onReject()
                } label: {
                    Image(systemName: "xmark")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.red)
                        .frame(width: 36, height: 36)
                        .background(Color.red.opacity(0.1))
                        .clipShape(Circle())
                }

                Button {
                    onAccept()
                } label: {
                    Image(systemName: "checkmark")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.green)
                        .frame(width: 36, height: 36)
                        .background(Color.green.opacity(0.1))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Add Friend View

struct AddFriendView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: FriendsViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)

                    TextField("이메일 또는 이름으로 검색", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)
                        .autocapitalization(.none)
                        .onChange(of: viewModel.searchQuery) { _, _ in
                            viewModel.searchUsers()
                        }

                    if !viewModel.searchQuery.isEmpty {
                        Button {
                            viewModel.searchQuery = ""
                            viewModel.searchResults = []
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding()

                // Find from contacts button
                Button {
                    Task {
                        await viewModel.loadContactFriends()
                    }
                } label: {
                    HStack {
                        Image(systemName: "person.crop.rectangle.stack")
                        Text("주소록에서 찾기")
                    }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.green)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(10)
                }
                .padding(.horizontal)
                .disabled(viewModel.isLoadingContacts)

                // Results
                if viewModel.isSearching || viewModel.isLoadingContacts {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.contactsPermissionDenied {
                    ContentUnavailableView(
                        "주소록 접근 권한 필요",
                        systemImage: "person.crop.rectangle.badge.xmark",
                        description: Text("설정에서 주소록 접근을 허용해주세요")
                    )
                } else if viewModel.searchResults.isEmpty && viewModel.contactFriends.isEmpty && !viewModel.searchQuery.isEmpty {
                    ContentUnavailableView(
                        "검색 결과가 없습니다",
                        systemImage: "person.slash",
                        description: Text("다른 검색어로 시도해보세요")
                    )
                } else {
                    List {
                        // Contact Friends Section
                        if !viewModel.contactFriends.isEmpty {
                            Section {
                                ForEach(viewModel.contactFriends) { user in
                                    UserSearchRow(user: user) {
                                        Task {
                                            await viewModel.sendFriendRequest(toUserId: user.id)
                                        }
                                    }
                                }
                            } header: {
                                Text("주소록 친구")
                            }
                        }

                        // Search Results Section
                        if !viewModel.searchResults.isEmpty {
                            Section {
                                ForEach(viewModel.searchResults) { user in
                                    UserSearchRow(user: user) {
                                        Task {
                                            await viewModel.sendFriendRequest(toUserId: user.id)
                                        }
                                    }
                                }
                            } header: {
                                if !viewModel.contactFriends.isEmpty {
                                    Text("검색 결과")
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("친구 추가")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        viewModel.clearContactFriends()
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - User Search Row

struct UserSearchRow: View {
    let user: UserSearchResult
    let onAddFriend: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.gray.opacity(0.2))
                .frame(width: 50, height: 50)
                .overlay {
                    Text(String(user.name.prefix(1)))
                        .font(.title2)
                        .fontWeight(.medium)
                        .foregroundStyle(.gray)
                }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.headline)

                Text(user.email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Action Button
            if user.isFriend {
                Text("친구")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(.systemGray5))
                    .cornerRadius(16)
            } else if user.hasPendingRequest {
                Text("요청됨")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(16)
            } else {
                Button {
                    onAddFriend()
                } label: {
                    Text("추가")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green)
                        .cornerRadius(16)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    FriendsView()
}
