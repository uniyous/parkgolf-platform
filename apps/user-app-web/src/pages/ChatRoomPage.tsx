import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Send, MoreVertical, Users, LogOut, WifiOff, RefreshCw, Loader2, UserPlus, Search, X, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubPageHeader } from '@/components/layout';
import { Button, LoadingView } from '@/components/ui';
import { useChatRoomQuery, useMessagesInfiniteQuery, useSendMessageMutation, useLeaveChatRoomMutation, useInviteMembersMutation } from '@/hooks/queries/chat';
import { useFriendsQuery } from '@/hooks/queries/friend';
import { chatSocket } from '@/lib/socket/chatSocket';
import { authStorage } from '@/lib/storage';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import { chatApi, getChatRoomDisplayName, type ChatMessage, type ChatAction, type AiChatRequest } from '@/lib/api/chatApi';
import { useAiChat } from '@/hooks/useAiChat';
import { AiButton } from '@/components/features/chat/AiButton';
import { AiMessageBubble } from '@/components/features/chat/AiMessageBubble';
import { AiUserMessageBubble } from '@/components/features/chat/AiUserMessageBubble';
import { AiWelcomeCard } from '@/components/features/chat/AiWelcomeCard';
import { paymentApi } from '@/lib/api/paymentApi';
import { CHAT_PAYMENT_CONTEXT_KEY, type ChatPaymentContext } from '@/lib/constants';

export const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { confirm } = useConfirm();
  const currentUserId = String(user?.id ?? '');

  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isNatsConnected, setIsNatsConnected] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [aiMessageActions, setAiMessageActions] = useState<Map<string, ChatAction[]>>(new Map());
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // Queries
  const { data: room, isLoading: isLoadingRoom } = useChatRoomQuery(roomId ?? '');
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessagesInfiniteQuery(roomId ?? '');
  const sendMessageMutation = useSendMessageMutation();
  const leaveMutation = useLeaveChatRoomMutation();
  const { isAiMode, toggleAiMode, sendAiMessage, isAiLoading, conversationState, conversationId } = useAiChat(roomId ?? '');
  const [searchParams] = useSearchParams();

  // ── Toss 결제 복귀 처리 ──
  const paymentHandledRef = useRef(false);

  useEffect(() => {
    if (paymentHandledRef.current || !roomId) return;

    const paymentKey = searchParams.get('paymentKey');
    const paymentOrderId = searchParams.get('orderId');
    const paymentAmount = searchParams.get('amount');
    const paymentFail = searchParams.get('payment') === 'fail';

    if (paymentKey && paymentOrderId && paymentAmount) {
      paymentHandledRef.current = true;
      handlePaymentReturn(paymentKey, paymentOrderId, Number(paymentAmount));
    } else if (paymentFail) {
      paymentHandledRef.current = true;
      handlePaymentFailure();
    }
  }, [roomId, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaymentReturn = async (paymentKey: string, orderId: string, amount: number) => {
    // sessionStorage에서 결제 컨텍스트 읽기
    const raw = sessionStorage.getItem(CHAT_PAYMENT_CONTEXT_KEY);
    const ctx: ChatPaymentContext | null = raw ? JSON.parse(raw) : null;
    const paymentType = ctx?.type || 'single';

    try {
      if (paymentType === 'split') {
        await paymentApi.confirmSplitPayment({ paymentKey, orderId, amount });
        // 에이전트에 분할결제 완료 통지 (페이지 리다이렉트로 React state 유실 → sessionStorage에서 복원)
        const response = await sendAiMessage({
          message: '결제 완료',
          splitPaymentComplete: true,
          splitOrderId: orderId,
          conversationId: ctx?.conversationId || undefined,
        });
        if (response.actions) {
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            roomId: roomId!,
            senderId: 'ai',
            senderName: 'AI 예약 도우미',
            content: response.message,
            messageType: 'AI_ASSISTANT',
            createdAt: new Date().toISOString(),
            readBy: null,
          };
          setAiMessageActions((prev) => new Map(prev).set(aiMsg.id, response.actions!));
          setRealtimeMessages((prev) => [...prev, aiMsg]);
        }
      } else {
        await paymentApi.confirmPayment({ paymentKey, orderId, amount });
        // 에이전트에 결제 완료 통지 (페이지 리다이렉트로 React state 유실 → sessionStorage에서 복원)
        const response = await sendAiMessage({
          message: '결제 완료',
          paymentComplete: true,
          paymentSuccess: true,
          conversationId: ctx?.conversationId || undefined,
        });
        if (response.actions) {
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            roomId: roomId!,
            senderId: 'ai',
            senderName: 'AI 예약 도우미',
            content: response.message,
            messageType: 'AI_ASSISTANT',
            createdAt: new Date().toISOString(),
            readBy: null,
          };
          setAiMessageActions((prev) => new Map(prev).set(aiMsg.id, response.actions!));
          setRealtimeMessages((prev) => [...prev, aiMsg]);
        }
      }
    } catch (err) {
      console.error('결제 승인 실패:', err);
      // fallback: 서버에서 이미 승인된 경우 확인
      try {
        const status = await paymentApi.getPaymentByOrderId(orderId);
        if (status.status === 'DONE' || status.status === 'PAID') {
          const notifyReq = paymentType === 'split'
            ? { message: '결제 완료', splitPaymentComplete: true, splitOrderId: orderId, conversationId: ctx?.conversationId || undefined }
            : { message: '결제 완료', paymentComplete: true, paymentSuccess: true, conversationId: ctx?.conversationId || undefined };
          await sendAiMessage(notifyReq);
        } else {
          showErrorToast('결제 승인에 실패했습니다. 다시 시도해주세요.');
        }
      } catch {
        showErrorToast('결제 승인에 실패했습니다.');
      }
    } finally {
      sessionStorage.removeItem(CHAT_PAYMENT_CONTEXT_KEY);
      window.history.replaceState({}, '', `/chat/${roomId}`);
    }
  };

  const handlePaymentFailure = async () => {
    // sessionStorage에서 conversationId 복원 후 삭제
    const raw = sessionStorage.getItem(CHAT_PAYMENT_CONTEXT_KEY);
    const ctx: ChatPaymentContext | null = raw ? JSON.parse(raw) : null;
    sessionStorage.removeItem(CHAT_PAYMENT_CONTEXT_KEY);
    window.history.replaceState({}, '', `/chat/${roomId}`);
    // 에이전트에 실패 통지
    try {
      await sendAiMessage({
        message: '결제 취소',
        paymentComplete: true,
        paymentSuccess: false,
        conversationId: ctx?.conversationId || undefined,
      });
    } catch {
      // 실패 통지가 안 되어도 무시
    }
  };

  // Merge DB messages from infinite query with realtime messages
  const messages = useMemo(() => {
    const dbMessages: ChatMessage[] = [];
    if (messagesData?.pages) {
      // Pages are in reverse order (newest first), so we reverse to get oldest first
      for (let i = messagesData.pages.length - 1; i >= 0; i--) {
        const page = messagesData.pages[i];
        dbMessages.push(...page.messages);
      }
    }
    // Sort by createdAt ascending (oldest first = newest at bottom)
    const sorted = [...dbMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    // Add realtime messages that are not in DB yet
    const allMessages = [...sorted];
    realtimeMessages.forEach((rtMsg) => {
      if (!allMessages.some((m) => m.id === rtMsg.id)) {
        allMessages.push(rtMsg);
      }
    });
    return allMessages;
  }, [messagesData, realtimeMessages]);

  // joinRoom 재시도 래퍼 — 실패 시 최대 3회 백오프 재시도
  const joinRoomWithRetry = useCallback(async (id: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const success = await chatSocket.joinRoom(id);
      if (success) return true;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    return false;
  }, []);

  // Socket connection (Socket.IO 내장 재연결에 위임)
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token || !roomId) return;

    // Connect socket
    chatSocket.connect(token);

    // 이미 연결된 상태면 즉시 방 참여 + 읽음 처리
    // (다른 채팅방에서 돌아온 경우 connect 이벤트가 재발생하지 않음)
    if (chatSocket.isConnected) {
      setIsConnected(true);
      joinRoomWithRetry(roomId);
      chatApi.markAsRead(roomId).catch(() => {});
    }

    // 초기 연결 및 재연결 시 방 참여 + 읽음 처리
    const unsubConnect = chatSocket.onConnect(() => {
      setIsConnected(true);
      joinRoomWithRetry(roomId);
      chatApi.markAsRead(roomId).catch(() => {});
    });

    const unsubDisconnect = chatSocket.onDisconnect(() => {
      setIsConnected(false);
    });

    // Socket.IO 자동 재연결 완료 시 — 방 재참여 + 메시지 갭 복구
    const unsubReconnect = chatSocket.onReconnect(() => {
      setIsConnected(true);
      joinRoomWithRetry(roomId);
      // 끊긴 동안의 메시지를 DB에서 다시 가져옴
      setRealtimeMessages([]);
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', roomId] });
    });

    const unsubMessage = chatSocket.onMessage((message) => {
      if (message.roomId === roomId) {
        setRealtimeMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    const unsubError = chatSocket.onError((error) => {
      console.error('Socket error:', error);
    });

    // NATS status — 서버 측 NATS 연결 상태 추적
    const unsubNatsStatus = chatSocket.onNatsStatus((connected) => {
      setIsNatsConnected(connected);
      if (connected && roomId) {
        // NATS 복구 시 방 재참여 + 메시지 갱신
        joinRoomWithRetry(roomId);
        setRealtimeMessages([]);
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', roomId] });
      }
    });

    // 탭 백그라운드 → 포그라운드 전환 시 소켓 재연결 + 메시지 갭 복구
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect socket if disconnected during background
        if (!chatSocket.isConnected) {
          const token = authStorage.getToken();
          if (token) chatSocket.forceReconnect(token);
        } else {
          // 연결 유지 중이어도 방 재참여 보장
          joinRoomWithRetry(roomId);
        }
        setRealtimeMessages([]);
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', roomId] });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubReconnect();
      unsubMessage();
      unsubError();
      unsubNatsStatus();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (roomId) {
        chatSocket.leaveRoom(roomId);
      }
    };
  }, [roomId, queryClient, joinRoomWithRetry]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showWelcome]);

  // AI loading state text
  const aiLoadingText = useMemo(() => {
    switch (conversationState) {
      case 'COLLECTING': return '검색 중...';
      case 'SELECTING_MEMBERS': return '멤버 선택 중...';
      case 'CONFIRMING': return '예약 확인 중...';
      case 'BOOKING': return '예약 처리 중...';
      case 'SETTLING': return '정산 처리 중...';
      case 'TEAM_COMPLETE': return '다음 팀 준비 중...';
      default: return '생각 중...';
    }
  }, [conversationState]);

  // Toggle AI mode with welcome card
  const handleToggleAiMode = useCallback(() => {
    const wasOff = !isAiMode;
    toggleAiMode();
    if (wasOff) {
      setShowWelcome(true);
      setSelectedClubId(null);
      setSelectedSlotId(null);
    } else {
      setShowWelcome(false);
    }
  }, [isAiMode, toggleAiMode]);

  // Handle quick action from welcome card
  const handleQuickAction = useCallback(async (message: string) => {
    if (!roomId) return;
    setShowWelcome(false);

    // Add user message locally (AI_USER type for violet styling)
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      roomId,
      senderId: currentUserId,
      senderName: user?.name || '',
      content: message,
      messageType: 'AI_USER' as ChatMessage['messageType'],
      createdAt: new Date().toISOString(),
      readBy: null,
    };
    setRealtimeMessages((prev) => [...prev, userMsg]);

    try {
      const response = await sendAiMessage(message);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        roomId,
        senderId: 'ai',
        senderName: 'AI 예약 도우미',
        content: response.message,
        messageType: 'AI_ASSISTANT',
        createdAt: new Date().toISOString(),
        readBy: null,
      };

      if (response.actions) {
        setAiMessageActions((prev) => new Map(prev).set(aiMsg.id, response.actions!));
      }

      setRealtimeMessages((prev) => [...prev, aiMsg]);
    } catch {
      showErrorToast('AI 응답에 실패했습니다.');
    }
  }, [roomId, currentUserId, user?.name, sendAiMessage]);

  // Send AI follow-up message (from card interaction)
  const handleAiFollowUp = useCallback(async (followUpMessage: string | AiChatRequest) => {
    if (!roomId) return;
    try {
      const response = await sendAiMessage(followUpMessage);

      // Add AI response as a local message
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        roomId,
        senderId: 'ai',
        senderName: 'AI 예약 도우미',
        content: response.message,
        messageType: 'AI_ASSISTANT',
        createdAt: new Date().toISOString(),
        readBy: null,
      };

      if (response.actions) {
        setAiMessageActions((prev) => new Map(prev).set(aiMsg.id, response.actions!));
      }

      setRealtimeMessages((prev) => [...prev, aiMsg]);
    } catch {
      showErrorToast('AI 응답에 실패했습니다.');
    }
  }, [roomId, sendAiMessage]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !roomId) return;

    setInputText('');

    // AI mode: send to AI endpoint
    if (isAiMode) {
      setShowWelcome(false);

      // Add user message locally (AI_USER type for violet styling)
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        roomId,
        senderId: currentUserId,
        senderName: user?.name || '',
        content: text,
        messageType: 'AI_USER' as ChatMessage['messageType'],
        createdAt: new Date().toISOString(),
        readBy: null,
      };
      setRealtimeMessages((prev) => [...prev, userMsg]);

      try {
        const response = await sendAiMessage(text);

        // Add AI response as a local message
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          roomId,
          senderId: 'ai',
          senderName: 'AI 예약 도우미',
          content: response.message,
          messageType: 'AI_ASSISTANT',
          createdAt: new Date().toISOString(),
          readBy: null,
        };

        if (response.actions) {
          setAiMessageActions((prev) => new Map(prev).set(aiMsg.id, response.actions!));
        }

        setRealtimeMessages((prev) => [...prev, aiMsg]);
      } catch {
        showErrorToast('AI 응답에 실패했습니다.');
        setInputText(text);
      }
      return;
    }

    // Normal mode: Try socket first
    if (chatSocket.isConnected) {
      const result = await chatSocket.sendMessage(roomId, text);
      if (result) {
        // 발신자는 broadcast에서 제외되므로 ACK 응답으로 메시지 추가
        setRealtimeMessages((prev) => {
          if (prev.some((m) => m.id === result.id)) return prev;
          return [...prev, result];
        });
        return;
      }
    }

    // Fallback to REST API
    try {
      const message = await sendMessageMutation.mutateAsync({
        roomId,
        content: text,
      });
      setRealtimeMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    } catch {
      showErrorToast('메시지 전송에 실패했습니다.');
      setInputText(text); // Restore input
    }
  }, [inputText, roomId, isAiMode, currentUserId, user?.name, sendAiMessage, sendMessageMutation]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Handle scroll to load more messages
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      // Load more when scrolled near top (within 100px)
      if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
        // Save current scroll height to maintain position after loading
        prevScrollHeightRef.current = container.scrollHeight;
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Maintain scroll position after loading more messages
  useEffect(() => {
    if (prevScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      if (scrollDiff > 0) {
        container.scrollTop = scrollDiff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [messagesData?.pages?.length]);

  // Loading state
  if (isLoadingRoom) {
    return (
      <div className="h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Not found
  if (!room) {
    return (
      <div className="h-screen bg-[var(--color-bg-primary)] flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-white mb-2">채팅방을 찾을 수 없습니다</h2>
        <button
          onClick={() => navigate('/chat')}
          className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
        >
          채팅 목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--color-bg-primary)] flex flex-col">
      <SubPageHeader
        title={getChatRoomDisplayName(room, currentUserId)}
        onBack={() => navigate('/social?tab=chat')}
        rightContent={
          <>
            <div className="flex items-center gap-2 text-xs">
              {(room.participants?.length ?? 0) > 0 && (
                <button
                  onClick={() => setShowParticipants(true)}
                  className="text-white/50 flex items-center gap-1 hover:text-white/80 transition-colors"
                >
                  <Users className="w-3 h-3" />
                  {room.participants.length}
                </button>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-white" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowInviteModal(true);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      친구 초대
                    </button>
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        const confirmed = await confirm({
                          type: 'warning',
                          title: '채팅방 나가기',
                          description: '채팅방을 나가시겠습니까?',
                          okText: '나가기',
                        });
                        if (!confirmed) return;
                        try {
                          await leaveMutation.mutateAsync(roomId!);
                          navigate('/social?tab=chat');
                        } catch {
                          showErrorToast('채팅방 나가기에 실패했습니다.');
                        }
                      }}
                      disabled={leaveMutation.isPending}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {leaveMutation.isPending ? '나가는 중...' : '나가기'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        }
      />

      {/* Socket disconnected banner */}
      {!isConnected && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/90 text-white text-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>연결 끊김</span>
          </div>
          <button
            onClick={() => {
              const token = authStorage.getToken();
              if (token) {
                chatSocket.forceReconnect(token);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>재연결</span>
          </button>
        </div>
      )}

      {/* NATS disconnected warning banner */}
      {isConnected && !isNatsConnected && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/90 text-white text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>서버 내부 연결 불안정 — 메시지 전송이 지연될 수 있습니다</span>
        </div>
      )}

      {/* Messages — full-width scroll area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="w-full max-w-screen-xl mx-auto px-4 py-4">
          {/* Load more indicator */}
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-3 mb-2">
              <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
              <span className="ml-2 text-sm text-white/50">이전 메시지 불러오는 중...</span>
            </div>
          )}

          {isLoadingMessages && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {!isLoadingMessages && messages.length === 0 && !showWelcome && (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <p>대화를 시작해보세요!</p>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((message, index) => {
              // 최신 AI 메시지 판별: 이후에 다른 AI_ASSISTANT 메시지가 없으면 최신
              const isLatestAiMessage = message.messageType === 'AI_ASSISTANT' &&
                !messages.slice(index + 1).some((m) => m.messageType === 'AI_ASSISTANT');

              // AI 메시지는 AiMessageBubble로 렌더링
              if (message.messageType === 'AI_ASSISTANT') {
                // realtime actions 우선, 없으면 DB metadata에서 파싱
                let actions = aiMessageActions.get(message.id);
                let parsedMeta: Record<string, unknown> | null = null;
                if (message.metadata) {
                  try {
                    parsedMeta = typeof message.metadata === 'string'
                      ? JSON.parse(message.metadata)
                      : message.metadata;
                    if (!actions) actions = parsedMeta?.actions as ChatAction[] | undefined;
                  } catch {
                    // metadata 파싱 실패 시 무시
                  }
                }

                // 브로드캐스트 AI 메시지: targetUserIds 필터링
                if (parsedMeta?.targetUserIds) {
                  const targetIds = parsedMeta.targetUserIds as number[];
                  if (!targetIds.includes(Number(currentUserId))) {
                    return null; // 내가 대상이 아니면 렌더링하지 않음
                  }
                }

                // 연속 AI 메시지 그룹핑: 이전 메시지도 AI면 라벨 숨김
                const prevIsAi = index > 0 && messages[index - 1]?.messageType === 'AI_ASSISTANT';

                return (
                  <AiMessageBubble
                    key={message.id}
                    content={message.content}
                    actions={actions}
                    createdAt={message.createdAt}
                    showLabel={!prevIsAi}
                    currentUserId={user?.id ? Number(user.id) : undefined}
                    roomId={roomId}
                    conversationId={conversationId}
                    selectedClubId={selectedClubId}
                    selectedSlotId={selectedSlotId}
                    isLatestAiMessage={isLatestAiMessage}
                    onClubSelect={(clubId, clubName) => {
                      setSelectedClubId(clubId);
                      setSelectedSlotId(null);
                      handleAiFollowUp({
                        message: `${clubName} 선택`,
                        selectedClubId: clubId,
                        selectedClubName: clubName,
                      });
                    }}
                    onSlotSelect={(slotId, time, price, clubId, clubName, gameName) => {
                      setSelectedSlotId(slotId);
                      handleAiFollowUp({
                        message: `${time} 선택`,
                        selectedSlotId: slotId,
                        selectedSlotTime: time,
                        selectedSlotPrice: price,
                        ...(clubId ? { selectedClubId: clubId, selectedClubName: clubName } : {}),
                        ...(gameName ? { selectedGameName: gameName } : {}),
                      });
                    }}
                    onConfirmBooking={(paymentMethod: 'onsite' | 'card' | 'dutchpay') => {
                      const labels: Record<string, string> = {
                        card: '카드결제로 예약 확인',
                        dutchpay: '더치페이로 예약 확인',
                        onsite: '예약 확인',
                      };
                      handleAiFollowUp({
                        message: labels[paymentMethod] || '예약 확인',
                        confirmBooking: true,
                        paymentMethod,
                      });
                    }}
                    onCancelBooking={() => {
                      setSelectedSlotId(null);
                      handleAiFollowUp({
                        message: '취소',
                        cancelBooking: true,
                      });
                    }}
                    onPaymentComplete={(success: boolean) => {
                      handleAiFollowUp({
                        message: success ? '결제 완료' : '결제 취소',
                        paymentComplete: true,
                        paymentSuccess: success,
                      });
                    }}
                    onTeamMemberSelect={(members) => {
                      handleAiFollowUp({
                        message: '멤버 확정',
                        teamMembers: members,
                      });
                    }}
                    onNextTeam={() => {
                      handleAiFollowUp({
                        message: '다음 팀',
                        nextTeam: true,
                      });
                    }}
                    onFinishGroup={() => {
                      handleAiFollowUp({
                        message: '종료',
                        finishGroup: true,
                      });
                    }}
                    onSendReminder={() => {
                      handleAiFollowUp({
                        message: '리마인더',
                        sendReminder: true,
                      });
                    }}
                    onRefreshSettlement={() => {
                      handleAiFollowUp({
                        message: '정산 현황',
                        splitPaymentComplete: true,
                      });
                    }}
                    onSplitPaymentComplete={(success: boolean, orderId: string) => {
                      handleAiFollowUp({
                        message: success ? '결제 완료' : '결제 실패',
                        splitPaymentComplete: true,
                        splitOrderId: orderId,
                      });
                    }}
                  />
                );
              }

              // AI 모드 사용자 메시지는 AiUserMessageBubble로 렌더링
              if (message.messageType === 'AI_USER') {
                return (
                  <AiUserMessageBubble
                    key={message.id}
                    content={message.content}
                    createdAt={message.createdAt}
                  />
                );
              }

              const isCurrentUser = String(message.senderId) === String(currentUserId);
              const showSender =
                !isCurrentUser &&
                (index === 0 || String(messages[index - 1]?.senderId) !== String(message.senderId));

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={isCurrentUser}
                  showSender={showSender}
                />
              );
            })}

            {/* AI 웰컴 카드 — 메시지 카드로 표시 */}
            {showWelcome && isAiMode && (
              <AiWelcomeCard onQuickAction={handleQuickAction} />
            )}

            {/* AI 타이핑 인디케이터 */}
            {isAiLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs text-violet-400 font-semibold">AI 예약 도우미</span>
                  </div>
                  <div className="bg-violet-500/5 border-l-[3px] border-l-violet-500/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-white/50">{aiLoadingText}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10">
        <div className="w-full max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAiMode ? 'AI에게 예약 요청하기...' : '메시지 입력...'}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-full',
                'bg-white/10 text-white placeholder:text-white/40',
                'outline-none transition-colors',
                isAiMode
                  ? 'border border-violet-500/50 focus:border-violet-500'
                  : 'border border-white/10 focus:border-emerald-500/50'
              )}
            />
            <AiButton active={isAiMode} onClick={handleToggleAiMode} />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || sendMessageMutation.isPending || isAiLoading}
              className={cn(
                'p-2.5 rounded-full transition-colors',
                inputText.trim()
                  ? isAiMode
                    ? 'bg-violet-500 text-white hover:bg-violet-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-white/10 text-white/40'
              )}
            >
              {isAiLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Participants Modal */}
      {showParticipants && room && (
        <ParticipantsModal
          participants={room.participants}
          currentUserId={currentUserId}
          onClose={() => setShowParticipants(false)}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && room && (
        <InviteFriendsModal
          roomId={room.id}
          participants={room.participants}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
};

// ============================================
// Participants Modal
// ============================================

interface ParticipantsModalProps {
  participants: { userId: string; userName: string; userEmail: string | null }[];
  currentUserId: string;
  onClose: () => void;
}

function ParticipantsModal({ participants, currentUserId, onClose }: ParticipantsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const showSearch = participants.length >= 5;

  const filtered = searchQuery
    ? participants.filter((p) =>
        p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.userEmail ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : participants;

  // 본인을 맨 위로 정렬
  const sorted = [...filtered].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return a.userName.localeCompare(b.userName);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-800 rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            참여자 ({participants.length}명)
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {showSearch && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="참여자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl',
                'bg-white/10 text-white placeholder:text-white/40',
                'border border-white/10 focus:border-emerald-500/50',
                'outline-none transition-colors'
              )}
              autoFocus
            />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto space-y-2">
          {sorted.length === 0 && (
            <div className="p-4 text-center text-white/50">
              검색 결과가 없습니다.
            </div>
          )}

          {sorted.map((p) => {
            const isMe = p.userId === currentUserId;
            return (
              <div
                key={p.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {p.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">
                    {p.userName}
                    {isMe && (
                      <span className="ml-1.5 text-xs text-emerald-400 font-normal">(나)</span>
                    )}
                  </h4>
                  {p.userEmail && (
                    <p className="text-white/40 text-xs truncate">{p.userEmail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Invite Friends Modal
// ============================================

interface InviteFriendsModalProps {
  roomId: string;
  participants: { userId: string }[];
  onClose: () => void;
}

function InviteFriendsModal({ roomId, participants, onClose }: InviteFriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: friends = [], isLoading } = useFriendsQuery();
  const inviteMutation = useInviteMembersMutation();

  const participantUserIds = new Set(participants.map((p) => p.userId));

  const availableFriends = friends.filter(
    (f) => !participantUserIds.has(String(f.friendId))
  );

  const filteredFriends = searchQuery
    ? availableFriends.filter(
        (f) =>
          f.friendName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.friendEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableFriends;

  const toggleSelect = (friendId: string) => {
    setSelectedIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleInvite = async () => {
    if (selectedIds.length === 0) return;
    try {
      await inviteMutation.mutateAsync({ roomId, userIds: selectedIds });
      showSuccessToast(`${selectedIds.length}명을 초대했습니다.`);
      onClose();
    } catch {
      showErrorToast('초대에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-800 rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">친구 초대</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="친구 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl',
              'bg-white/10 text-white placeholder:text-white/40',
              'border border-white/10 focus:border-emerald-500/50',
              'outline-none transition-colors'
            )}
            autoFocus
          />
        </div>

        {/* Friends List */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {isLoading && <LoadingView size="sm" />}

          {!isLoading && availableFriends.length === 0 && (
            <div className="p-4 text-center text-white/50">
              초대할 수 있는 친구가 없습니다.
            </div>
          )}

          {!isLoading && availableFriends.length > 0 && filteredFriends.length === 0 && (
            <div className="p-4 text-center text-white/50">
              검색 결과가 없습니다.
            </div>
          )}

          {!isLoading &&
            filteredFriends.map((friend) => {
              const friendIdStr = String(friend.friendId);
              const selected = selectedIds.includes(friendIdStr);

              return (
                <button
                  key={friend.id}
                  onClick={() => toggleSelect(friendIdStr)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      selected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-white/30'
                    )}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">
                      {friend.friendName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-white font-medium truncate">{friend.friendName}</h4>
                    <p className="text-white/50 text-xs truncate">{friend.friendEmail}</p>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleInvite}
            disabled={selectedIds.length === 0 || inviteMutation.isPending}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              selectedIds.length > 0
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            )}
          >
            {inviteMutation.isPending
              ? '초대 중...'
              : selectedIds.length > 0
                ? `초대 (${selectedIds.length}명)`
                : '초대'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Message Bubble
// ============================================

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  showSender: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showSender,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn('flex', isCurrentUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%]', isCurrentUser ? 'items-end' : 'items-start')}>
        {showSender && (
          <span className="text-xs text-white/50 mb-1 ml-1">{message.senderName}</span>
        )}
        <div className={cn('flex items-end gap-1.5', isCurrentUser && 'flex-row-reverse')}>
          <div
            className={cn(
              'px-3.5 py-2 rounded-2xl',
              isCurrentUser
                ? 'bg-emerald-500 text-white rounded-br-sm'
                : 'bg-white/10 text-white rounded-bl-sm'
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <span className="text-[10px] text-white/40 shrink-0">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
