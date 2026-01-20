import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MoreVertical, Users, LogOut, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatRoomQuery, useMessagesQuery, useSendMessageMutation } from '@/hooks/queries/chat';
import { chatSocket } from '@/lib/socket/chatSocket';
import { authStorage } from '@/lib/storage';
import { showErrorToast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { ChatMessage } from '@/lib/api/chatApi';

export const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentUserId = String(user?.id ?? '');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: room, isLoading: isLoadingRoom } = useChatRoomQuery(roomId ?? '');
  const { data: messagesData, isLoading: isLoadingMessages } = useMessagesQuery(roomId ?? '');
  const sendMessageMutation = useSendMessageMutation();

  // Initialize messages from query
  useEffect(() => {
    if (messagesData?.data) {
      // Reverse to show oldest first
      setMessages([...messagesData.data].reverse());
    }
  }, [messagesData]);

  // Socket connection
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token || !roomId) return;

    // Connect socket
    chatSocket.connect(token);

    // Subscribe to events
    const unsubConnect = chatSocket.onConnect(() => {
      setIsConnected(true);
      chatSocket.joinRoom(roomId);
    });

    const unsubDisconnect = chatSocket.onDisconnect(() => {
      setIsConnected(false);
    });

    const unsubMessage = chatSocket.onMessage((message) => {
      if (message.roomId === roomId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    const unsubError = chatSocket.onError((error) => {
      console.error('Socket error:', error);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubMessage();
      unsubError();
      if (roomId) {
        chatSocket.leaveRoom(roomId);
      }
    };
  }, [roomId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !roomId) return;

    setInputText('');

    // Try socket first
    if (chatSocket.isConnected) {
      const result = await chatSocket.sendMessage(roomId, text);
      if (result) {
        // Message will be added via socket event
        return;
      }
    }

    // Fallback to REST API
    try {
      const message = await sendMessageMutation.mutateAsync({
        roomId,
        content: text,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    } catch {
      showErrorToast('메시지 전송에 실패했습니다.');
      setInputText(text); // Restore input
    }
  }, [inputText, roomId, sendMessageMutation]);

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

  // Loading state
  if (isLoadingRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Not found
  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
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
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/40 backdrop-blur-md px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">{room.name}</h2>
            <div className="flex items-center gap-2 text-xs text-white/50">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">연결됨</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-400">연결 중...</span>
                </>
              )}
              {room.participants.length > 0 && (
                <>
                  <span>•</span>
                  <Users className="w-3 h-3" />
                  <span>{room.participants.length}명</span>
                </>
              )}
            </div>
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
                      if (confirm('채팅방을 나가시겠습니까?')) {
                        navigate('/chat');
                      }
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    나가기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoadingMessages && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <p>대화를 시작해보세요!</p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((message, index) => {
            const isCurrentUser = message.senderId === currentUserId;
            const showSender =
              !isCurrentUser &&
              (index === 0 || messages[index - 1]?.senderId !== message.senderId);

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isCurrentUser={isCurrentUser}
                showSender={showSender}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-black/40 backdrop-blur-md px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지 입력..."
            className={cn(
              'flex-1 px-4 py-2.5 rounded-full',
              'bg-white/10 text-white placeholder:text-white/40',
              'border border-white/10 focus:border-emerald-500/50',
              'outline-none transition-colors'
            )}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className={cn(
              'p-2.5 rounded-full transition-colors',
              inputText.trim()
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-white/10 text-white/40'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

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
