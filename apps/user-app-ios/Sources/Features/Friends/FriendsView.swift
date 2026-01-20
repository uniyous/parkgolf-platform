import SwiftUI

// MARK: - Friends View

struct FriendsView: View {
    @StateObject private var viewModel = FriendsViewModel()

    var body: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                friendsHeader

                // Tab Selector
                friendsTabSelector

                // Content
                if viewModel.isLoading && viewModel.friends.isEmpty {
                    ParkLoadingView(message: "친구 목록 불러오는 중...")
                } else if let error = viewModel.errorMessage, viewModel.friends.isEmpty {
                    ParkErrorView(message: error) {
                        Task { await viewModel.loadAll() }
                    }
                } else {
                    switch viewModel.selectedSegment {
                    case .friends:
                        friendsContent
                    case .requests:
                        requestsContent
                    }
                }
            }
        }
        .sheet(isPresented: $viewModel.showAddFriendSheet) {
            AddFriendSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadAll()
        }
    }

    // MARK: - Header

    private var friendsHeader: some View {
        HStack {
            Text("친구")
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Spacer()

            Button {
                viewModel.showAddFriendSheet = true
            } label: {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Tab Selector

    private var friendsTabSelector: some View {
        HStack(spacing: 0) {
            ForEach(FriendsViewModel.FriendSegment.allCases, id: \.self) { segment in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.selectedSegment = segment
                    }
                } label: {
                    VStack(spacing: ParkSpacing.xs) {
                        HStack(spacing: ParkSpacing.xs) {
                            Text(segment.rawValue)

                            if segment == .requests && viewModel.pendingRequestsCount > 0 {
                                Text("\(viewModel.pendingRequestsCount)")
                                    .font(.parkCaption)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.parkError)
                                    .clipShape(Capsule())
                            }
                        }
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(viewModel.selectedSegment == segment ? .white : .white.opacity(0.5))

                        Rectangle()
                            .fill(viewModel.selectedSegment == segment ? Color.parkPrimary : Color.clear)
                            .frame(height: 3)
                            .clipShape(Capsule())
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.md)
    }

    // MARK: - Friends Content

    private var friendsContent: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                // Search Bar
                friendsSearchBar

                // Stats Card
                friendsStatsCard

                // Friends List
                if viewModel.filteredFriends.isEmpty {
                    if viewModel.searchQuery.isEmpty {
                        ParkEmptyStateView(
                            icon: "person.2.slash",
                            title: "아직 친구가 없습니다",
                            description: "친구를 추가하고 함께 파크골프를 즐겨보세요!",
                            actionTitle: "친구 추가"
                        ) {
                            viewModel.showAddFriendSheet = true
                        }
                    } else {
                        ParkEmptyStateView(
                            icon: "magnifyingglass",
                            title: "검색 결과가 없습니다",
                            description: "다른 이름으로 검색해보세요"
                        )
                    }
                } else {
                    ForEach(viewModel.filteredFriends) { friend in
                        FriendCard(
                            friend: friend,
                            onChat: {
                                // Navigate to chat
                            },
                            onRemove: {
                                Task {
                                    await viewModel.removeFriend(friend)
                                }
                            }
                        )
                    }
                }
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            await viewModel.loadFriends()
        }
    }

    // MARK: - Search Bar

    private var friendsSearchBar: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.white.opacity(0.5))

            TextField("친구 검색...", text: $viewModel.searchQuery)
                .foregroundStyle(.white)
                .font(.parkBodyMedium)

            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding(ParkSpacing.md)
        .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
    }

    // MARK: - Stats Card

    private var friendsStatsCard: some View {
        GlassCard {
            HStack(spacing: ParkSpacing.lg) {
                // 친구 수
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(viewModel.friends.count)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(.white)
                    Text("친구")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .frame(height: 40)

                // 받은 요청
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(viewModel.receivedRequestsCount)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(viewModel.receivedRequestsCount > 0 ? Color.parkPrimary : .white)
                    Text("받은 요청")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .frame(height: 40)

                // 보낸 요청
                VStack(spacing: ParkSpacing.xxs) {
                    Text("\(viewModel.sentRequestsCount)")
                        .font(.parkDisplaySmall)
                        .foregroundStyle(viewModel.sentRequestsCount > 0 ? Color.statusPending : .white)
                    Text("보낸 요청")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Requests Content

    private var requestsContent: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.lg) {
                // 받은 요청이 없고 보낸 요청도 없으면 빈 상태 표시
                if viewModel.friendRequests.isEmpty && viewModel.sentFriendRequests.isEmpty {
                    ParkEmptyStateView(
                        icon: "person.badge.clock",
                        title: "친구 요청이 없습니다",
                        description: "친구를 추가하거나 요청이 오면 여기에 표시됩니다",
                        actionTitle: "친구 추가"
                    ) {
                        viewModel.showAddFriendSheet = true
                    }
                } else {
                    // 받은 요청 섹션
                    receivedRequestsSection

                    // 보낸 요청 섹션
                    sentRequestsSection
                }
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            await viewModel.loadFriendRequests()
            await viewModel.loadSentFriendRequests()
        }
    }

    // MARK: - Received Requests Section

    private var receivedRequestsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            // Section Header
            HStack {
                Label("받은 요청", systemImage: "envelope.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                if viewModel.receivedRequestsCount > 0 {
                    Text("\(viewModel.receivedRequestsCount)")
                        .font(.parkCaption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.parkPrimary)
                        .clipShape(Capsule())
                }

                Spacer()
            }
            .padding(.horizontal, ParkSpacing.xs)

            // Content
            if viewModel.friendRequests.isEmpty {
                // Empty state card
                GlassCard {
                    HStack(spacing: ParkSpacing.md) {
                        Image(systemName: "envelope.open")
                            .font(.system(size: 24))
                            .foregroundStyle(.white.opacity(0.4))

                        VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                            Text("받은 요청이 없습니다")
                                .font(.parkBodyMedium)
                                .foregroundStyle(.white.opacity(0.7))
                            Text("친구 요청이 오면 여기에 표시됩니다")
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Spacer()
                    }
                }
            } else {
                ForEach(viewModel.friendRequests) { request in
                    FriendRequestCard(
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
        }
    }

    // MARK: - Sent Requests Section

    private var sentRequestsSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            // Section Header
            HStack {
                Label("보낸 요청", systemImage: "paperplane.fill")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                if viewModel.sentRequestsCount > 0 {
                    Text("\(viewModel.sentRequestsCount)")
                        .font(.parkCaption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.statusPending)
                        .clipShape(Capsule())
                }

                Spacer()
            }
            .padding(.horizontal, ParkSpacing.xs)

            // Content
            if viewModel.sentFriendRequests.isEmpty {
                // Empty state card
                GlassCard {
                    HStack(spacing: ParkSpacing.md) {
                        Image(systemName: "paperplane")
                            .font(.system(size: 24))
                            .foregroundStyle(.white.opacity(0.4))

                        VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                            Text("보낸 요청이 없습니다")
                                .font(.parkBodyMedium)
                                .foregroundStyle(.white.opacity(0.7))
                            Text("친구 요청을 보내면 여기에 표시됩니다")
                                .font(.parkCaption)
                                .foregroundStyle(.white.opacity(0.5))
                        }

                        Spacer()
                    }
                }
            } else {
                ForEach(viewModel.sentFriendRequests) { request in
                    SentRequestCard(request: request)
                }
            }
        }
    }
}

// MARK: - Friend Card

struct FriendCard: View {
    let friend: Friend
    let onChat: () -> Void
    let onRemove: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        GlassCard(padding: 0) {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.parkPrimary.opacity(0.3))
                        .frame(width: 50, height: 50)

                    Text(String(friend.friendName.prefix(1)))
                        .font(.parkHeadlineLarge)
                        .foregroundStyle(.white)
                }

                // Info
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(friend.friendName)
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    Text(friend.friendEmail)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                // Chat Button
                Button(action: onChat) {
                    Image(systemName: "message.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.parkPrimary)
                        .frame(width: 40, height: 40)
                        .background(Color.parkPrimary.opacity(0.2))
                        .clipShape(Circle())
                }
            }
            .padding(ParkSpacing.md)
        }
        .contextMenu {
            Button(role: .destructive) {
                showDeleteConfirm = true
            } label: {
                Label("친구 삭제", systemImage: "person.badge.minus")
            }
        }
        .confirmationDialog(
            "친구를 삭제하시겠습니까?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("삭제", role: .destructive, action: onRemove)
            Button("취소", role: .cancel) {}
        }
    }
}

// MARK: - Friend Request Card

struct FriendRequestCard: View {
    let request: FriendRequest
    let onAccept: () -> Void
    let onReject: () -> Void

    var body: some View {
        GlassCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Label("친구 요청", systemImage: "person.badge.plus")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.5))

                    Spacer()

                    if let createdAt = request.createdAt {
                        Text(DateHelper.toRelativeTime(createdAt))
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }
                .padding(ParkSpacing.md)

                Divider()
                    .background(Color.white.opacity(0.1))

                // Content
                HStack(spacing: ParkSpacing.md) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(Color.parkPrimary.opacity(0.3))
                            .frame(width: 50, height: 50)

                        Text(String(request.fromUserName.prefix(1)))
                            .font(.parkHeadlineLarge)
                            .foregroundStyle(.white)
                    }

                    // Info
                    VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                        Text(request.fromUserName)
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)

                        Text(request.fromUserEmail)
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.6))
                    }

                    Spacer()
                }
                .padding(ParkSpacing.md)

                Divider()
                    .background(Color.white.opacity(0.1))

                // Action Buttons
                HStack(spacing: ParkSpacing.md) {
                    // Reject Button
                    Button(action: onReject) {
                        HStack(spacing: ParkSpacing.xs) {
                            Image(systemName: "xmark")
                            Text("거절")
                        }
                        .font(.parkLabelMedium)
                        .foregroundStyle(Color.parkError)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, ParkSpacing.sm)
                        .background(Color.parkError.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                    }

                    // Accept Button
                    Button(action: onAccept) {
                        HStack(spacing: ParkSpacing.xs) {
                            Image(systemName: "checkmark")
                            Text("수락")
                        }
                        .font(.parkLabelMedium)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, ParkSpacing.sm)
                        .background(Color.parkPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                    }
                }
                .padding(ParkSpacing.md)
            }
        }
    }
}

// MARK: - Sent Request Card

struct SentRequestCard: View {
    let request: SentFriendRequest

    var body: some View {
        GlassCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Label("보낸 요청", systemImage: "paperplane")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.5))

                    Spacer()

                    // Status Badge
                    Text("대기중")
                        .font(.parkCaption)
                        .foregroundStyle(Color.statusPending)
                        .padding(.horizontal, ParkSpacing.sm)
                        .padding(.vertical, ParkSpacing.xxs)
                        .background(Color.statusPending.opacity(0.15))
                        .clipShape(Capsule())
                }
                .padding(ParkSpacing.md)

                Divider()
                    .background(Color.white.opacity(0.1))

                // Content
                HStack(spacing: ParkSpacing.md) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(Color.statusPending.opacity(0.3))
                            .frame(width: 50, height: 50)

                        Text(String(request.toUserName.prefix(1)))
                            .font(.parkHeadlineLarge)
                            .foregroundStyle(.white)
                    }

                    // Info
                    VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                        Text(request.toUserName)
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)

                        Text(request.toUserEmail)
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.6))
                    }

                    Spacer()

                    // Time
                    if let createdAt = request.createdAt {
                        Text(DateHelper.toRelativeTime(createdAt))
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }
                .padding(ParkSpacing.md)
            }
        }
    }
}

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

                    // Find from Contacts Button
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

                    // Results
                    if viewModel.isSearching || viewModel.isLoadingContacts {
                        ParkLoadingView(message: "검색 중...")
                    } else if viewModel.contactsPermissionDenied {
                        ParkEmptyStateView(
                            icon: "person.crop.rectangle.badge.xmark",
                            title: "주소록 접근 권한 필요",
                            description: "설정에서 주소록 접근을 허용해주세요"
                        )
                    } else if viewModel.searchResults.isEmpty && viewModel.contactFriends.isEmpty {
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
                    } else {
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

// MARK: - User Search Card

struct UserSearchCard: View {
    let user: UserSearchResult
    let onAddFriend: () -> Void

    var body: some View {
        GlassCard(padding: 0) {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.parkPrimary.opacity(0.3))
                        .frame(width: 50, height: 50)

                    Text(String(user.name.prefix(1)))
                        .font(.parkHeadlineLarge)
                        .foregroundStyle(.white)
                }

                // Info
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(user.name)
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    Text(user.email)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                // Action Button
                if user.isFriend {
                    Text("친구")
                        .font(.parkLabelSmall)
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(.horizontal, ParkSpacing.sm)
                        .padding(.vertical, ParkSpacing.xs)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Capsule())
                } else if user.hasPendingRequest {
                    Text("요청됨")
                        .font(.parkLabelSmall)
                        .foregroundStyle(Color.statusPending)
                        .padding(.horizontal, ParkSpacing.sm)
                        .padding(.vertical, ParkSpacing.xs)
                        .background(Color.statusPending.opacity(0.15))
                        .clipShape(Capsule())
                } else {
                    Button(action: onAddFriend) {
                        Text("추가")
                            .font(.parkLabelMedium)
                            .foregroundStyle(.white)
                            .padding(.horizontal, ParkSpacing.md)
                            .padding(.vertical, ParkSpacing.xs)
                            .background(Color.parkPrimary)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(ParkSpacing.md)
        }
    }
}

// MARK: - Preview

#Preview {
    FriendsView()
}
