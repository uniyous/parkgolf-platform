import SwiftUI

struct ChatRoomView: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: ChatRoomViewModel
    @FocusState private var isInputFocused: Bool

    init(room: ChatRoom, currentUserId: String) {
        self.room = room
        self._viewModel = StateObject(wrappedValue: ChatRoomViewModel(
            roomId: room.id,
            currentUserId: currentUserId
        ))
    }

    var body: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Connection status indicator
                if !viewModel.isConnected {
                    connectionStatusBanner
                }

                // Messages
                messageList

                // Input
                messageInput
            }
        }
        .navigationTitle(room.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        // Invite friends
                    } label: {
                        Label("친구 초대", systemImage: "person.badge.plus")
                    }

                    if room.type == .booking {
                        Button {
                            // View booking
                        } label: {
                            Label("예약 정보", systemImage: "calendar")
                        }
                    }

                    Divider()

                    Button(role: .destructive) {
                        // Leave chat
                    } label: {
                        Label("채팅방 나가기", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .task {
            await viewModel.loadMessages()
            await viewModel.connectSocket()
        }
        .onDisappear {
            viewModel.disconnectSocket()
        }
    }

    // MARK: - Connection Status Banner

    private var connectionStatusBanner: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: "wifi.slash")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.8))

            Text("연결 끊김")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.8))

            Button {
                Task {
                    await viewModel.forceReconnect()
                }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.caption)
                    .foregroundStyle(.white)
            }
        }
        .padding(.vertical, ParkSpacing.xxs)
        .padding(.horizontal, ParkSpacing.sm)
        .background(Color.parkWarning.opacity(0.8))
        .clipShape(Capsule())
        .padding(.top, ParkSpacing.xs)
    }

    // MARK: - Message List

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: ParkSpacing.sm) {
                    ForEach(viewModel.messages) { message in
                        MessageBubble(
                            message: message,
                            isCurrentUser: message.senderId == viewModel.currentUserId
                        )
                        .id(message.id)
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.vertical, ParkSpacing.md)
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                if let lastMessage = viewModel.messages.last {
                    withAnimation(.spring(response: 0.3)) {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Message Input

    private var messageInput: some View {
        HStack(spacing: ParkSpacing.sm) {
            Button {
                // Add attachment
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.6))
            }

            TextField("메시지 입력", text: $viewModel.inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .padding(.horizontal, ParkSpacing.sm)
                .padding(.vertical, ParkSpacing.xs)
                .background(Color.white.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.full))
                .foregroundStyle(.white)
                .focused($isInputFocused)
                .lineLimit(1...5)
                .onChange(of: viewModel.inputText) { _, newValue in
                    viewModel.sendTypingIndicator(!newValue.isEmpty)
                }

            Button {
                Task {
                    await viewModel.sendMessage()
                }
            } label: {
                Image(systemName: viewModel.isSending ? "arrow.up.circle" : "arrow.up.circle.fill")
                    .font(.title)
                    .foregroundStyle(viewModel.inputText.isEmpty ? .white.opacity(0.4) : Color.parkPrimary)
            }
            .disabled(viewModel.inputText.isEmpty || viewModel.isSending)
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.sm)
        .background(
            Color.black.opacity(0.3)
                .background(.ultraThinMaterial)
        )
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let isCurrentUser: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: ParkSpacing.xs) {
            if isCurrentUser {
                Spacer(minLength: 60)
                messageTime
                messageContent
            } else {
                messageContent
                messageTime
                Spacer(minLength: 60)
            }
        }
    }

    private var messageContent: some View {
        VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
            if !isCurrentUser {
                Text(message.senderName)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.6))
            }

            Text(message.content)
                .padding(.horizontal, ParkSpacing.sm)
                .padding(.vertical, ParkSpacing.xs)
                .background(
                    isCurrentUser
                        ? LinearGradient.parkButton
                        : LinearGradient(colors: [Color.white.opacity(0.15)], startPoint: .top, endPoint: .bottom)
                )
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
        }
    }

    private var messageTime: some View {
        Text(formatTime(message.createdAt))
            .font(.system(size: 10))
            .foregroundStyle(.white.opacity(0.5))
    }

    private func formatTime(_ date: Date) -> String {
        DateHelper.toKoreanTime(date)
    }
}

// MARK: - Chat Room View Wrapper

/// Wrapper view that gets currentUserId from AppState
struct ChatRoomViewWrapper: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ChatRoomView(
            room: room,
            currentUserId: appState.currentUser?.stringId ?? ""
        )
        .environmentObject(appState)
    }
}

#Preview {
    NavigationStack {
        ChatRoomView(
            room: ChatRoom(
                id: "1",
                name: "주말 라운딩",
                type: .group,
                participants: [],
                lastMessage: nil,
                unreadCount: 0,
                createdAt: Date(),
                updatedAt: Date()
            ),
            currentUserId: "1"
        )
        .environmentObject(AppState())
    }
}
