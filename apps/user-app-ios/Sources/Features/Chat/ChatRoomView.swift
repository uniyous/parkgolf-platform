import SwiftUI

struct ChatRoomView: View {
    let room: ChatRoom
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: ChatRoomViewModel
    @StateObject private var aiViewModel = AiChatViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isInputFocused: Bool
    @State private var showInviteSheet = false
    @State private var showParticipantsSheet = false
    @State private var showLeaveAlert = false
    @State private var showPaymentSheet = false

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

                // NATS disconnected warning banner
                if viewModel.isConnected && !viewModel.isNatsConnected {
                    natsWarningBanner
                }

                // Messages
                messageList

                // Typing indicator
                if let typingName = viewModel.typingUserName {
                    typingIndicator(name: typingName)
                }

                // Input
                messageInput
            }
        }
        .navigationTitle(room.displayName(currentUserId: viewModel.currentUserId))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showParticipantsSheet = true
                    } label: {
                        Label("참여자 목록", systemImage: "person.2")
                    }

                    Button {
                        showInviteSheet = true
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
                        showLeaveAlert = true
                    } label: {
                        Label("채팅방 나가기", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .rotationEffect(.degrees(90))
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .sheet(isPresented: $showParticipantsSheet) {
            ParticipantsSheet(
                participants: room.participants,
                currentUserId: viewModel.currentUserId
            )
        }
        .sheet(isPresented: $showInviteSheet) {
            InviteFriendsSheet(
                existingParticipantIds: room.participants.map(\.userId),
                onInvite: { userIds in
                    Task {
                        await viewModel.inviteMembers(userIds: userIds)
                        showInviteSheet = false
                    }
                }
            )
        }
        .alert("채팅방 나가기", isPresented: $showLeaveAlert) {
            Button("취소", role: .cancel) { }
            Button("나가기", role: .destructive) {
                Task {
                    await viewModel.leaveChatRoom()
                    dismiss()
                }
            }
        } message: {
            Text("채팅방을 나가시겠습니까?")
        }
        .sheet(isPresented: $showPaymentSheet) {
            if let payment = aiViewModel.pendingPayment {
                TossPaymentView(
                    clientKey: Configuration.Payment.tossClientKey,
                    orderId: payment.orderId,
                    orderName: payment.orderName,
                    amount: payment.amount,
                    onResult: { outcome in
                        showPaymentSheet = false
                        handlePaymentResult(outcome)
                    },
                    isPresented: $showPaymentSheet
                )
            }
        }
        .task {
            await viewModel.loadMessages()
            await viewModel.connectSocket()
            // 결제 복구
            if let saved = aiViewModel.loadPendingPayment() {
                aiViewModel.pendingPayment = saved
            }
        }
        .onDisappear {
            viewModel.disconnectSocket()
        }
        .overlay(alignment: .top) {
            if let error = aiViewModel.lastError {
                Text(error)
                    .font(.parkCaption)
                    .foregroundStyle(.white)
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.vertical, ParkSpacing.xs)
                    .background(Color.red.opacity(0.9))
                    .clipShape(Capsule())
                    .padding(.top, ParkSpacing.sm)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        // 3초 후 자동 dismiss
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            withAnimation { aiViewModel.lastError = nil }
                        }
                    }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: aiViewModel.lastError)
    }

    // MARK: - Connection Status Banner

    private var connectionStatusBanner: some View {
        HStack {
            HStack(spacing: ParkSpacing.xs) {
                Image(systemName: "wifi.slash")
                    .font(.caption)
                    .foregroundStyle(.white)

                Text("연결 끊김")
                    .font(.parkCaption)
                    .foregroundStyle(.white)
            }

            Spacer()

            Button {
                Task {
                    await viewModel.forceReconnect()
                }
            } label: {
                HStack(spacing: ParkSpacing.xxs) {
                    Image(systemName: "arrow.clockwise")
                        .font(.caption)
                        .foregroundStyle(.white)
                    Text("재연결")
                        .font(.parkCaption)
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, ParkSpacing.xs)
                .padding(.vertical, ParkSpacing.xxs)
            }
        }
        .padding(.vertical, ParkSpacing.xxs)
        .padding(.horizontal, ParkSpacing.sm)
        .frame(maxWidth: .infinity)
        .background(Color.parkWarning.opacity(0.9))
    }

    // MARK: - NATS Warning Banner

    private var natsWarningBanner: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.9))

            Text("서버 내부 연결 불안정 — 메시지 전송이 지연될 수 있습니다")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.9))
        }
        .padding(.vertical, ParkSpacing.xxs)
        .padding(.horizontal, ParkSpacing.sm)
        .frame(maxWidth: .infinity)
        .background(Color.yellow.opacity(0.8))
        .transition(.move(edge: .top).combined(with: .opacity))
        .animation(.easeInOut(duration: 0.3), value: viewModel.isNatsConnected)
    }

    // MARK: - Message List

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: ParkSpacing.sm) {
                    // 이전 메시지 로드 버튼/인디케이터
                    if viewModel.hasMoreMessages {
                        loadMoreButton
                    }

                    // AI 웰컴 카드
                    if aiViewModel.showWelcome && aiViewModel.isAiMode {
                        AiWelcomeCard { message in
                            aiViewModel.showWelcome = false
                            sendAiFollowUp(message)
                        }
                    }

                    // 빈 상태 메시지
                    if viewModel.messages.isEmpty && !aiViewModel.isAiMode {
                        VStack(spacing: 12) {
                            Image(systemName: "bubble.left.and.bubble.right")
                                .font(.system(size: 40))
                                .foregroundColor(.white.opacity(0.2))
                            Text("대화를 시작해보세요!")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 60)
                    }

                    ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                        if message.messageType == .aiAssistant && !isFilteredByTargetUserIds(message) {
                            // 연속 AI 메시지 그룹핑: 이전 메시지도 AI면 라벨 숨김
                            let prevIsAi = index > 0 && viewModel.messages[index - 1].messageType == .aiAssistant

                            AiMessageBubble(
                                content: message.content,
                                actions: aiViewModel.getActions(for: message.id, message: message),
                                createdAt: message.createdAt,
                                showLabel: !prevIsAi,
                                onClubSelect: { clubId, clubName in
                                    aiViewModel.selectedClubId = clubId
                                    sendAiFollowUp("\(clubName) 선택", request: AiChatRequest(
                                        message: "\(clubName) 선택",
                                        selectedClubId: clubId,
                                        selectedClubName: clubName
                                    ))
                                },
                                onSlotSelect: { slotId, time, price, clubId, clubName in
                                    aiViewModel.selectedSlotId = slotId
                                    var request = AiChatRequest(
                                        message: "\(time) 선택",
                                        selectedSlotId: slotId,
                                        selectedSlotTime: time,
                                        selectedSlotPrice: price
                                    )
                                    if let clubId = clubId {
                                        request.selectedClubId = clubId
                                        request.selectedClubName = clubName
                                    }
                                    sendAiFollowUp("\(time) 선택", request: request)
                                },
                                onConfirmBooking: { paymentMethod in
                                    sendAiFollowUp("예약 확인", request: AiChatRequest(message: "예약 확인", confirmBooking: true, paymentMethod: paymentMethod))
                                },
                                onCancelBooking: {
                                    sendAiFollowUp("예약 취소", request: AiChatRequest(message: "예약 취소", cancelBooking: true))
                                },
                                onPaymentComplete: { success in
                                    sendAiFollowUp(success ? "결제 완료" : "결제 취소", request: AiChatRequest(message: success ? "결제 완료" : "결제 취소", paymentComplete: true, paymentSuccess: success))
                                },
                                onRequestPayment: { orderId, orderName, amount in
                                    let payment = AiChatViewModel.PendingPayment(orderId: orderId, orderName: orderName, amount: amount, type: "single")
                                    aiViewModel.pendingPayment = payment
                                    aiViewModel.savePendingPayment(payment)
                                    showPaymentSheet = true
                                },
                                onConfirmGroup: { paymentMethod in
                                    sendAiFollowUp("그룹 예약 확인", request: AiChatRequest(message: "그룹 예약 확인", paymentMethod: paymentMethod, confirmGroupBooking: true))
                                },
                                onCancelGroup: {
                                    sendAiFollowUp("예약 취소", request: AiChatRequest(message: "예약 취소", cancelBooking: true))
                                },
                                onTeamConfirm: { teamsData in
                                    let members = teamsData.flatMap { $0.members }
                                    sendAiFollowUp("팀 편성 확인", request: AiChatRequest(message: "팀 편성 확인", teamMembers: members))
                                },
                                onSplitPaymentComplete: { success, orderId in
                                    sendAiFollowUp(success ? "결제 완료" : "결제 실패", request: AiChatRequest(message: "분할결제 완료", splitPaymentComplete: true, splitOrderId: orderId))
                                },
                                onRequestSplitPayment: { orderId, amount in
                                    let payment = AiChatViewModel.PendingPayment(orderId: orderId, orderName: "더치페이", amount: amount, type: "split")
                                    aiViewModel.pendingPayment = payment
                                    aiViewModel.savePendingPayment(payment)
                                    showPaymentSheet = true
                                },
                                onNextTeam: {
                                    sendAiFollowUp("다음 팀 예약", request: AiChatRequest(message: "다음 팀 예약", nextTeam: true))
                                },
                                onFinish: {
                                    sendAiFollowUp("예약 종료", request: AiChatRequest(message: "예약 종료", finishGroup: true))
                                },
                                onSendReminder: {
                                    sendAiFollowUp("리마인더 전송", request: AiChatRequest(message: "리마인더 전송", sendReminder: true))
                                },
                                onRefresh: {
                                    sendAiFollowUp("정산 현황 확인")
                                },
                                currentUserId: Int(viewModel.currentUserId),
                                selectedClubId: aiViewModel.selectedClubId,
                                selectedSlotId: aiViewModel.selectedSlotId
                            )
                            .id(message.id)
                        } else if message.messageType == .aiUser {
                            AiUserMessageBubble(
                                content: message.content,
                                createdAt: message.createdAt
                            )
                            .id(message.id)
                        } else {
                            let isCurrentUser = message.senderId == viewModel.currentUserId
                            let showSender = !isCurrentUser &&
                                (index == 0 || viewModel.messages[index - 1].senderId != message.senderId)

                            MessageBubble(
                                message: message,
                                isCurrentUser: isCurrentUser,
                                showSender: showSender
                            )
                            .id(message.id)
                            .onAppear {
                                // 첫 번째 메시지가 보이면 이전 메시지 로드
                                if message.id == viewModel.messages.first?.id {
                                    Task {
                                        await viewModel.loadMoreMessages()
                                    }
                                }
                            }
                        }
                    }

                    // AI 로딩 인디케이터
                    if aiViewModel.isAiLoading {
                        aiTypingIndicator
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.vertical, ParkSpacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
            .refreshable {
                // 당겨서 새로고침 - 이전 메시지 로드
                await viewModel.loadMoreMessages()
            }
            .onChange(of: viewModel.messages.count) { oldCount, newCount in
                // 새 메시지가 추가된 경우에만 스크롤 (이전 메시지 로드 시에는 스크롤 안함)
                if newCount > oldCount, let lastMessage = viewModel.messages.last {
                    // 새 메시지인지 확인 (마지막에 추가된 경우)
                    withAnimation(.spring(response: 0.3)) {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Load More Button

    private var loadMoreButton: some View {
        Group {
            if viewModel.isLoadingMore {
                ProgressView()
                    .tint(.white)
                    .padding(.vertical, ParkSpacing.sm)
            } else {
                Button {
                    Task {
                        await viewModel.loadMoreMessages()
                    }
                } label: {
                    HStack(spacing: ParkSpacing.xs) {
                        Image(systemName: "arrow.up.circle")
                        Text("이전 메시지 보기")
                    }
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.vertical, ParkSpacing.sm)
                }
            }
        }
    }

    // MARK: - Typing Indicator

    private func typingIndicator(name: String) -> some View {
        HStack(spacing: ParkSpacing.xs) {
            Text("\(name)님이 입력 중...")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.xxs)
        .frame(maxWidth: .infinity, alignment: .leading)
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.2), value: name)
    }

    // MARK: - AI Typing Indicator

    private var aiTypingIndicator: some View {
        HStack(alignment: .bottom, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 10))
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                        .background(
                            LinearGradient(
                                colors: [Color.parkPrimary, Color.parkPrimary.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(Circle())
                        .shadow(color: Color.parkPrimary.opacity(0.3), radius: 3)

                    Text("AI 예약 도우미")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(Color.parkPrimary)
                }

                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        ForEach(0..<3, id: \.self) { i in
                            Circle()
                                .fill(Color.parkPrimary.opacity(0.6))
                                .frame(width: 5, height: 5)
                                .offset(y: aiViewModel.isAiLoading ? -3 : 0)
                                .animation(
                                    .easeInOut(duration: 0.5)
                                        .repeatForever(autoreverses: true)
                                        .delay(Double(i) * 0.15),
                                    value: aiViewModel.isAiLoading
                                )
                        }
                    }

                    Text(aiViewModel.aiLoadingText)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.parkPrimary.opacity(0.05))
                .overlay(
                    Rectangle()
                        .fill(Color.parkPrimary.opacity(0.4))
                        .frame(width: 3),
                    alignment: .leading
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            Spacer(minLength: 40)
        }
    }

    // MARK: - Helpers

    /// targetUserIds가 있는 브로드캐스트 메시지가 현재 사용자에게 해당하지 않으면 true 반환
    private func isFilteredByTargetUserIds(_ message: ChatMessage) -> Bool {
        guard let metadata = message.metadata,
              let data = metadata.data(using: .utf8),
              let meta = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let targetUserIds = meta["targetUserIds"] as? [Any] else {
            return false
        }
        let targetIds = targetUserIds.compactMap { id -> Int? in
            if let intId = id as? Int { return intId }
            if let strId = id as? String { return Int(strId) }
            return nil
        }
        guard !targetIds.isEmpty, let myId = Int(viewModel.currentUserId) else {
            return false
        }
        return !targetIds.contains(myId)
    }

    // MARK: - AI Follow-up

    private func sendAiFollowUp(_ message: String, request: AiChatRequest? = nil) {
        Task {
            // 사용자 후속 메시지를 로컬에 추가 (AI_USER 타입)
            let userMsg = ChatMessage(
                id: UUID().uuidString,
                roomId: room.id,
                senderId: viewModel.currentUserId,
                senderName: "나",
                content: message,
                messageType: .aiUser,
                createdAt: Date(),
                readBy: nil
            )
            viewModel.messages.append(userMsg)

            // AI에 메시지 전송 (구조화된 요청 또는 텍스트)
            if let request = request {
                await aiViewModel.sendAiRequest(roomId: room.id, request: request)
            } else {
                await aiViewModel.sendAiMessage(roomId: room.id, message: message)
            }

            // 에러 발생 시 입력 복원
            if aiViewModel.lastError != nil {
                viewModel.inputText = message
                return
            }

            // AI 응답을 메시지로 추가
            if let response = aiViewModel.lastResponse {
                let aiMsgId = UUID().uuidString
                let aiMsg = ChatMessage(
                    id: aiMsgId,
                    roomId: room.id,
                    senderId: "ai-assistant",
                    senderName: "AI 예약 도우미",
                    content: response.message,
                    messageType: .aiAssistant,
                    createdAt: Date(),
                    readBy: nil
                )

                // actions 저장 (Web의 aiMessageActions 패턴)
                if let actions = response.actions, !actions.isEmpty {
                    aiViewModel.storeActions(messageId: aiMsgId, actions: actions)
                }

                viewModel.messages.append(aiMsg)
            }
        }
    }

    // MARK: - Payment Result Handler

    private func handlePaymentResult(_ outcome: TossPaymentOutcome) {
        guard let payment = aiViewModel.pendingPayment else { return }

        switch outcome {
        case .success(let paymentKey, let orderId, let amount):
            Task {
                let paymentService = PaymentService()
                let confirmRequest = ConfirmPaymentRequest(paymentKey: paymentKey, orderId: orderId, amount: amount)
                do {
                    if payment.type == "split" {
                        _ = try await paymentService.confirmSplitPayment(request: confirmRequest)
                        aiViewModel.clearPendingPayment()
                        sendAiFollowUp("결제 완료", request: AiChatRequest(message: "분할결제 완료", splitPaymentComplete: true, splitOrderId: orderId))
                    } else {
                        _ = try await paymentService.confirmPayment(request: confirmRequest)
                        aiViewModel.clearPendingPayment()
                        sendAiFollowUp("결제 완료", request: AiChatRequest(message: "결제 완료", paymentComplete: true, paymentSuccess: true))
                    }
                } catch {
                    #if DEBUG
                    print("Payment confirm failed: \(error), checking status...")
                    #endif
                    // Fallback: 서버 상태 확인
                    do {
                        let status = try await paymentService.getPaymentByOrderId(orderId: orderId)
                        if status.status == "DONE" || status.status == "PAID" {
                            aiViewModel.clearPendingPayment()
                            if payment.type == "split" {
                                sendAiFollowUp("결제 완료", request: AiChatRequest(message: "분할결제 완료", splitPaymentComplete: true, splitOrderId: orderId))
                            } else {
                                sendAiFollowUp("결제 완료", request: AiChatRequest(message: "결제 완료", paymentComplete: true, paymentSuccess: true))
                            }
                        } else {
                            notifyPaymentFailed(payment)
                        }
                    } catch {
                        notifyPaymentFailed(payment)
                    }
                }
            }
        case .failure, .cancelled:
            notifyPaymentFailed(payment)
        }
    }

    private func notifyPaymentFailed(_ payment: AiChatViewModel.PendingPayment) {
        aiViewModel.clearPendingPayment()
        if payment.type == "split" {
            sendAiFollowUp("결제 실패", request: AiChatRequest(message: "결제 실패", splitPaymentComplete: true, splitOrderId: payment.orderId))
        } else {
            sendAiFollowUp("결제 취소", request: AiChatRequest(message: "결제 취소", paymentComplete: true, paymentSuccess: false))
        }
    }

    // MARK: - Message Input

    private var messageInput: some View {
        VStack(spacing: 0) {
            Divider()
                .background(Color.white.opacity(0.1))

            HStack(spacing: ParkSpacing.xs) {
                TextField(
                    aiViewModel.isAiMode ? "AI에게 예약 요청하기..." : "메시지 입력...",
                    text: $viewModel.inputText,
                    axis: .vertical
                )
                    .textFieldStyle(.plain)
                    .padding(.horizontal, ParkSpacing.sm)
                    .padding(.vertical, 10)
                    .background(
                        aiViewModel.isAiMode
                            ? Color.parkPrimary.opacity(0.15)
                            : Color.white.opacity(0.1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: ParkRadius.full))
                    .overlay(
                        RoundedRectangle(cornerRadius: ParkRadius.full)
                            .stroke(
                                aiViewModel.isAiMode
                                    ? Color.parkPrimary.opacity(0.4)
                                    : Color.white.opacity(0.1),
                                lineWidth: 1
                            )
                    )
                    .foregroundStyle(.white)
                    .focused($isInputFocused)
                    .lineLimit(1...5)
                    .onSubmit {
                        // 키보드 엔터키로 전송하지 않음 (멀티라인)
                    }
                    .task(id: viewModel.inputText) {
                        // Debounce typing indicator (300ms)
                        try? await Task.sleep(nanoseconds: 300_000_000)
                        if !aiViewModel.isAiMode {
                            viewModel.sendTypingIndicator(!viewModel.inputText.isEmpty)
                        }
                    }

                AiButton(isActive: aiViewModel.isAiMode) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        aiViewModel.toggleAiMode()
                    }
                }

                Button {
                    if aiViewModel.isAiMode {
                        let text = viewModel.inputText
                        viewModel.inputText = ""
                        sendAiFollowUp(text)
                    } else {
                        Task {
                            await viewModel.sendMessage()
                        }
                    }
                } label: {
                    Group {
                        if aiViewModel.isAiLoading {
                            ProgressView()
                                .tint(.white)
                                .frame(width: 20, height: 20)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(width: 40, height: 40)
                    .background(
                        viewModel.inputText.isEmpty
                            ? Color.white.opacity(0.1)
                            : Color.parkPrimary
                    )
                    .clipShape(Circle())
                }
                .disabled(viewModel.inputText.isEmpty || viewModel.isSending || aiViewModel.isAiLoading)
            }
            .padding(.horizontal, ParkSpacing.md)
            .padding(.vertical, ParkSpacing.sm)
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let isCurrentUser: Bool
    var showSender: Bool = true

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
            if showSender {
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
        VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 2) {
            if isCurrentUser, let readBy = message.readBy, readBy.count > 1 {
                Text("읽음")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.parkPrimary.opacity(0.8))
            }
            Text(formatTime(message.createdAt))
                .font(.system(size: 10))
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    private func formatTime(_ date: Date) -> String {
        DateHelper.toKoreanTime(date)
    }
}

// MARK: - Invite Friends Sheet

struct InviteFriendsSheet: View {
    let existingParticipantIds: [String]
    let onInvite: ([String]) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var friends: [Friend] = []
    @State private var selectedFriendIds: Set<Int> = []
    @State private var searchQuery = ""
    @State private var isLoading = true

    private var availableFriends: [Friend] {
        friends.filter { !existingParticipantIds.contains(String($0.friendId)) }
    }

    private var filteredFriends: [Friend] {
        if searchQuery.isEmpty {
            return availableFriends
        }
        return availableFriends.filter {
            $0.friendName.localizedCaseInsensitiveContains(searchQuery) ||
            $0.friendEmail.localizedCaseInsensitiveContains(searchQuery)
        }
    }

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

                        TextField("친구 검색", text: $searchQuery)
                            .foregroundStyle(.white)
                            .font(.parkBodyMedium)

                        if !searchQuery.isEmpty {
                            Button {
                                searchQuery = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.white.opacity(0.5))
                            }
                        }
                    }
                    .padding(ParkSpacing.md)
                    .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
                    .padding(ParkSpacing.md)

                    if isLoading {
                        ParkLoadingView(message: "친구 목록 불러오는 중...")
                    } else if filteredFriends.isEmpty {
                        ParkEmptyStateView(
                            icon: "person.2",
                            title: "초대할 친구가 없습니다",
                            description: "모든 친구가 이미 참여 중이거나 친구가 없습니다"
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: ParkSpacing.md) {
                                ForEach(filteredFriends) { friend in
                                    Button {
                                        if selectedFriendIds.contains(friend.friendId) {
                                            selectedFriendIds.remove(friend.friendId)
                                        } else {
                                            selectedFriendIds.insert(friend.friendId)
                                        }
                                    } label: {
                                        FriendSelectCard(
                                            friend: friend,
                                            isSelected: selectedFriendIds.contains(friend.friendId)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(ParkSpacing.md)
                        }
                    }

                    // Invite Button
                    if !selectedFriendIds.isEmpty {
                        Button {
                            onInvite(selectedFriendIds.map { String($0) })
                        } label: {
                            Text("초대 (\(selectedFriendIds.count)명)")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, ParkSpacing.sm)
                                .background(Color.parkPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
                        }
                        .padding(ParkSpacing.md)
                    }
                }
            }
            .navigationTitle("친구 초대")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task {
            let friendService = FriendService()
            do {
                friends = try await friendService.getFriends()
            } catch {
                #if DEBUG
                print("Failed to load friends: \(error)")
                #endif
            }
            isLoading = false
        }
    }
}

// MARK: - Participants Sheet

struct ParticipantsSheet: View {
    let participants: [ChatParticipant]
    let currentUserId: String

    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery = ""

    private var showSearch: Bool {
        participants.count >= 5
    }

    private var filteredParticipants: [ChatParticipant] {
        let list = searchQuery.isEmpty ? participants : participants.filter {
            $0.userName.localizedCaseInsensitiveContains(searchQuery) ||
            ($0.userEmail ?? "").localizedCaseInsensitiveContains(searchQuery)
        }
        // 본인을 맨 위로 정렬
        return list.sorted { a, b in
            if a.userId == currentUserId { return true }
            if b.userId == currentUserId { return false }
            return a.userName < b.userName
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    if showSearch {
                        HStack(spacing: ParkSpacing.sm) {
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(.white.opacity(0.5))

                            TextField("참여자 검색", text: $searchQuery)
                                .foregroundStyle(.white)
                                .font(.parkBodyMedium)

                            if !searchQuery.isEmpty {
                                Button {
                                    searchQuery = ""
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

                    if filteredParticipants.isEmpty {
                        ParkEmptyStateView(
                            icon: "person.2",
                            title: "검색 결과가 없습니다",
                            description: ""
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: ParkSpacing.sm) {
                                ForEach(filteredParticipants) { participant in
                                    participantRow(participant)
                                }
                            }
                            .padding(ParkSpacing.md)
                        }
                    }
                }
            }
            .navigationTitle("참여자 (\(participants.count)명)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func participantRow(_ participant: ChatParticipant) -> some View {
        let isMe = participant.userId == currentUserId

        return HStack(spacing: ParkSpacing.md) {
            // Avatar
            AvatarCircle(name: participant.userName, size: 40, opacity: 0.2)

            // Name + Email
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: ParkSpacing.xs) {
                    Text(participant.userName)
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white)

                    if isMe {
                        Text("(나)")
                            .font(.parkCaption)
                            .foregroundStyle(Color.parkPrimary)
                    }
                }

                if let email = participant.userEmail, !email.isEmpty {
                    Text(email)
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.5))
                        .lineLimit(1)
                }
            }

            Spacer()
        }
        .padding(ParkSpacing.sm)
        .glassCard(padding: 0, cornerRadius: ParkRadius.lg)
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
