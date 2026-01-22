import SwiftUI

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

// MARK: - Previews

#Preview("Friend Card") {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        FriendCard(
            friend: Friend(
                id: 1,
                friendId: 2,
                friendName: "김철수",
                friendEmail: "chulsoo@example.com",
                friendProfileImageUrl: nil,
                createdAt: Date()
            ),
            onChat: {},
            onRemove: {}
        )
        .padding()
    }
}

#Preview("Friend Request Card") {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        FriendRequestCard(
            request: FriendRequest(
                id: 1,
                fromUserId: 2,
                fromUserName: "이영희",
                fromUserEmail: "younghee@example.com",
                fromUserProfileImageUrl: nil,
                status: "pending",
                message: nil,
                createdAt: Date()
            ),
            onAccept: {},
            onReject: {}
        )
        .padding()
    }
}

#Preview("Sent Request Card") {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        SentRequestCard(
            request: SentFriendRequest(
                id: 1,
                toUserId: 3,
                toUserName: "박민수",
                toUserEmail: "minsoo@example.com",
                toUserProfileImageUrl: nil,
                status: "pending",
                message: nil,
                createdAt: Date()
            )
        )
        .padding()
    }
}

#Preview("User Search Card - Add") {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        UserSearchCard(
            user: UserSearchResult(
                id: 1,
                email: "newuser@example.com",
                name: "새 친구",
                profileImageUrl: nil,
                isFriend: false,
                hasPendingRequest: false
            ),
            onAddFriend: {}
        )
        .padding()
    }
}

#Preview("User Search Card - Friend") {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        UserSearchCard(
            user: UserSearchResult(
                id: 1,
                email: "friend@example.com",
                name: "이미 친구",
                profileImageUrl: nil,
                isFriend: true,
                hasPendingRequest: false
            ),
            onAddFriend: {}
        )
        .padding()
    }
}

#Preview("User Search Card - Pending") {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        UserSearchCard(
            user: UserSearchResult(
                id: 1,
                email: "pending@example.com",
                name: "요청 대기중",
                profileImageUrl: nil,
                isFriend: false,
                hasPendingRequest: true
            ),
            onAddFriend: {}
        )
        .padding()
    }
}
