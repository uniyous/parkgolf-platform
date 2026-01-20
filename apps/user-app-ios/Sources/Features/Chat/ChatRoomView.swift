import SwiftUI

struct ChatRoomView: View {
    let room: ChatRoom
    @StateObject private var viewModel: ChatRoomViewModel
    @FocusState private var isInputFocused: Bool

    init(room: ChatRoom) {
        self.room = room
        self._viewModel = StateObject(wrappedValue: ChatRoomViewModel(roomId: room.id))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            messageList

            // Input
            messageInput
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
                }
            }
        }
        .task {
            await viewModel.loadMessages()
            await viewModel.connectWebSocket()
        }
        .onDisappear {
            Task {
                await viewModel.disconnectWebSocket()
            }
        }
    }

    // MARK: - Message List

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.messages) { message in
                        MessageBubble(
                            message: message,
                            isCurrentUser: message.senderId == viewModel.currentUserId
                        )
                        .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                if let lastMessage = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Message Input

    private var messageInput: some View {
        HStack(spacing: 12) {
            Button {
                // Add attachment
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.secondary)
            }

            TextField("메시지 입력", text: $viewModel.inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .focused($isInputFocused)
                .lineLimit(1...5)

            Button {
                Task {
                    await viewModel.sendMessage()
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title)
                    .foregroundStyle(viewModel.inputText.isEmpty ? Color.secondary : Color.green)
            }
            .disabled(viewModel.inputText.isEmpty)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .overlay(alignment: .top) {
            Divider()
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let isCurrentUser: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
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
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(message.content)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isCurrentUser ? Color.green : Color(.systemGray5))
                .foregroundStyle(isCurrentUser ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    private var messageTime: some View {
        Text(formatTime(message.createdAt))
            .font(.caption2)
            .foregroundStyle(.secondary)
    }

    private func formatTime(_ date: Date) -> String {
        DateHelper.toKoreanTime(date)
    }
}

#Preview {
    NavigationStack {
        ChatRoomView(room: ChatRoom(
            id: "1",
            name: "주말 라운딩",
            type: .group,
            participants: [],
            lastMessage: nil,
            unreadCount: 0,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
