import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, PenSquare, Users, User, Search } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button, EmptyState, LoadingView, BottomSheet } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useChatRoomsQuery, useGetOrCreateDirectChatMutation } from '@/hooks/queries/chat';
import { useFriendsQuery } from '@/hooks/queries/friend';
import { useResponsive } from '@/hooks/useResponsive';
import { showErrorToast } from '@/lib/toast';
import type { ChatRoom } from '@/lib/api/chatApi';
import type { Friend } from '@/lib/api/friendApi';

export function ChatPage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const { data: chatRoomsData, isLoading } = useChatRoomsQuery();
  const chatRooms = chatRoomsData?.data ?? [];

  const handleRoomClick = useCallback(
    (roomId: string) => {
      navigate(`/chat/${roomId}`);
    },
    [navigate]
  );

  const headerRight = (
    <Button size="sm" onClick={() => setShowNewChatModal(true)}>
      <PenSquare className="w-4 h-4" />
      <span className="hidden sm:inline">새 채팅</span>
    </Button>
  );

  return (
    <AppLayout title="채팅" headerRight={headerRight}>
      <Container className="py-4 md:py-6">
        {/* Loading */}
        {isLoading && <LoadingView />}

        {/* Empty */}
        {!isLoading && chatRooms.length === 0 && (
          <GlassCard>
            <EmptyState
              icon={MessageCircle}
              title="채팅이 없습니다"
              description="친구와 대화를 시작해보세요!"
              actionLabel="새 채팅 시작"
              onAction={() => setShowNewChatModal(true)}
            />
          </GlassCard>
        )}

        {/* Chat Room List */}
        {!isLoading && chatRooms.length > 0 && (
          <div className="space-y-3">
            {chatRooms.map((room) => (
              <ChatRoomCard
                key={room.id}
                room={room}
                onClick={() => handleRoomClick(room.id)}
              />
            ))}
          </div>
        )}
      </Container>

      {/* New Chat Modal */}
      {isMobile ? (
        <BottomSheet
          open={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          title="새 채팅"
        >
          <NewChatContent onClose={() => setShowNewChatModal(false)} />
        </BottomSheet>
      ) : (
        showNewChatModal && (
          <NewChatModal
            isOpen={showNewChatModal}
            onClose={() => setShowNewChatModal(false)}
          />
        )
      )}
    </AppLayout>
  );
}

// ============================================
// Sub Components
// ============================================

interface ChatRoomCardProps {
  room: ChatRoom;
  onClick: () => void;
}

function ChatRoomCard({ room, onClick }: ChatRoomCardProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('ko-KR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  const getRoomIcon = () => {
    switch (room.type) {
      case 'GROUP':
      case 'BOOKING':
        return <Users className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getRoomTypeLabel = () => {
    switch (room.type) {
      case 'GROUP':
        return '그룹';
      case 'BOOKING':
        return '예약';
      default:
        return null;
    }
  };

  return (
    <button onClick={onClick} className="w-full text-left">
      <GlassCard hoverable>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
              room.type === 'BOOKING'
                ? 'bg-[var(--color-info)]/30 text-[var(--color-info)]'
                : 'bg-[var(--color-primary)]/30 text-[var(--color-primary)]'
            )}
          >
            {getRoomIcon()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium truncate">{room.name}</h4>
              {getRoomTypeLabel() && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--color-surface)] text-[var(--color-text-tertiary)]">
                  {getRoomTypeLabel()}
                </span>
              )}
            </div>
            <p className="text-[var(--color-text-tertiary)] text-sm truncate">
              {room.lastMessage?.content ?? '대화를 시작해보세요'}
            </p>
          </div>

          {/* Meta */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {room.lastMessage && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatTime(room.lastMessage.createdAt)}
              </span>
            )}
            {room.unreadCount > 0 && (
              <span className="w-5 h-5 bg-[var(--color-primary)] text-white text-xs font-medium rounded-full flex items-center justify-center">
                {room.unreadCount > 99 ? '99+' : room.unreadCount}
              </span>
            )}
          </div>
        </div>
      </GlassCard>
    </button>
  );
}

// ============================================
// New Chat Content (shared)
// ============================================

interface NewChatContentProps {
  onClose: () => void;
}

function NewChatContent({ onClose }: NewChatContentProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: friends = [], isLoading } = useFriendsQuery();
  const createDirectChatMutation = useGetOrCreateDirectChatMutation();

  const filteredFriends = searchQuery
    ? friends.filter(
        (f) =>
          f.friendName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.friendEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  const handleSelectFriend = async (friend: Friend) => {
    try {
      const room = await createDirectChatMutation.mutateAsync({
        userId: String(friend.friendId),
        userName: friend.friendName,
      });
      onClose();
      navigate(`/chat/${room.id}`);
    } catch {
      showErrorToast('채팅방 생성에 실패했습니다.');
    }
  };

  return (
    <>
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="친구 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-glass pl-10"
          autoFocus
        />
      </div>

      {/* Friends List */}
      <div className="max-h-80 overflow-y-auto space-y-2">
        {isLoading && <LoadingView size="sm" />}

        {!isLoading && filteredFriends.length === 0 && (
          <div className="p-4 text-center text-[var(--color-text-muted)]">
            {searchQuery ? '검색 결과가 없습니다.' : '친구가 없습니다.'}
          </div>
        )}

        {!isLoading &&
          filteredFriends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => handleSelectFriend(friend)}
              disabled={createDirectChatMutation.isPending}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {friend.friendName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-white font-medium truncate">{friend.friendName}</h4>
                <p className="text-[var(--color-text-muted)] text-xs truncate">{friend.friendEmail}</p>
              </div>

              <MessageCircle className="w-5 h-5 text-[var(--color-text-muted)]" />
            </button>
          ))}
      </div>
    </>
  );
}

// ============================================
// New Chat Modal (Desktop)
// ============================================

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-white mb-4">새 채팅</h3>
        <NewChatContent onClose={onClose} />
        <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}
