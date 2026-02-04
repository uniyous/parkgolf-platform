import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, PenSquare, Users, User, Search, X, ArrowLeft, Check } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button, EmptyState, LoadingView, BottomSheet } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useChatRoomsQuery, useGetOrCreateDirectChatMutation, useCreateChatRoomMutation, useLeaveChatRoomMutation } from '@/hooks/queries/chat';
import { useFriendsQuery } from '@/hooks/queries/friend';
import { useResponsive } from '@/hooks/useResponsive';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showErrorToast } from '@/lib/toast';
import { getChatRoomDisplayName, type ChatRoom } from '@/lib/api/chatApi';
import { useAuthStore } from '@/stores/authStore';
import type { Friend } from '@/lib/api/friendApi';

export function ChatPage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const currentUserId = String(user?.id ?? '');

  const { confirm } = useConfirm();
  const { data: chatRoomsData, isLoading } = useChatRoomsQuery();
  const chatRooms = chatRoomsData?.data ?? [];
  const leaveMutation = useLeaveChatRoomMutation();

  const handleRoomClick = useCallback(
    (roomId: string) => {
      navigate(`/chat/${roomId}`);
    },
    [navigate]
  );

  const handleLeaveRoom = useCallback(
    async (roomId: string) => {
      const confirmed = await confirm({
        type: 'warning',
        title: '채팅방 나가기',
        description: '채팅방을 나가시겠습니까?',
        okText: '나가기',
      });
      if (!confirmed) return;
      try {
        await leaveMutation.mutateAsync(roomId);
      } catch {
        showErrorToast('채팅방 나가기에 실패했습니다.');
      }
    },
    [leaveMutation, confirm]
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
                currentUserId={currentUserId}
                onClick={() => handleRoomClick(room.id)}
                onLeave={() => handleLeaveRoom(room.id)}
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
  currentUserId: string;
  onClick: () => void;
  onLeave: () => void;
}

function ChatRoomCard({ room, currentUserId, onClick, onLeave }: ChatRoomCardProps) {
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
    <button
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onLeave();
      }}
      className="w-full text-left"
    >
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
              <h4 className="text-white font-medium truncate">
                {getChatRoomDisplayName(room, currentUserId)}
              </h4>
              {getRoomTypeLabel() && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--color-surface)] text-[var(--color-text-tertiary)]">
                  {getRoomTypeLabel()}
                </span>
              )}
              {room.type !== 'DIRECT' && (room.participants?.length ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                  {room.participants.length}
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
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [groupName, setGroupName] = useState('');
  const { data: friends = [], isLoading } = useFriendsQuery();
  const createDirectChatMutation = useGetOrCreateDirectChatMutation();
  const createChatRoomMutation = useCreateChatRoomMutation();

  const filteredFriends = searchQuery
    ? friends.filter(
        (f) =>
          f.friendName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.friendEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  const toggleFriend = (friend: Friend) => {
    setSelectedFriends((prev) => {
      const exists = prev.some((f) => f.id === friend.id);
      if (exists) return prev.filter((f) => f.id !== friend.id);
      return [...prev, friend];
    });
  };

  const isSelected = (friend: Friend) => selectedFriends.some((f) => f.id === friend.id);

  const handleNext = async () => {
    if (selectedFriends.length === 0) return;

    if (selectedFriends.length === 1) {
      // DIRECT chat
      try {
        const friend = selectedFriends[0];
        const room = await createDirectChatMutation.mutateAsync({
          userId: String(friend.friendId),
          userName: friend.friendName,
        });
        onClose();
        navigate(`/chat/${room.id}`);
      } catch {
        showErrorToast('채팅방 생성에 실패했습니다.');
      }
    } else {
      // GROUP chat - go to name step
      setStep('name');
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim() || [user?.name, ...selectedFriends.map((f) => f.friendName)].filter(Boolean).join(', ');
    try {
      const room = await createChatRoomMutation.mutateAsync({
        name,
        type: 'GROUP',
        participantIds: selectedFriends.map((f) => String(f.friendId)),
      });
      onClose();
      navigate(`/chat/${room.id}`);
    } catch {
      showErrorToast('그룹 채팅방 생성에 실패했습니다.');
    }
  };

  const isPending = createDirectChatMutation.isPending || createChatRoomMutation.isPending;

  if (step === 'name') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep('select')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </button>

        <div className="flex flex-wrap gap-2">
          {selectedFriends.map((f) => (
            <span
              key={f.id}
              className="px-3 py-1 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm"
            >
              {f.friendName}
            </span>
          ))}
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
            그룹 이름 (선택)
          </label>
          <input
            type="text"
            placeholder={[user?.name, ...selectedFriends.map((f) => f.friendName)].filter(Boolean).join(', ')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="input-glass w-full"
            autoFocus
          />
        </div>

        <Button
          className="w-full"
          onClick={handleCreateGroup}
          disabled={isPending}
        >
          {isPending ? '생성 중...' : '만들기'}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Search Input */}
      <div className="relative mb-3">
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

      {/* Selected Friends Chips */}
      {selectedFriends.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedFriends.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFriend(f)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm hover:bg-[var(--color-primary)]/30 transition-colors"
            >
              {f.friendName}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="max-h-64 overflow-y-auto space-y-2">
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
              onClick={() => toggleFriend(friend)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  isSelected(friend)
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                    : 'border-[var(--color-text-muted)]'
                )}
              >
                {isSelected(friend) && <Check className="w-3 h-3 text-white" />}
              </div>

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
            </button>
          ))}
      </div>

      {/* Action Button */}
      <Button
        className="w-full mt-4"
        onClick={handleNext}
        disabled={selectedFriends.length === 0 || isPending}
      >
        {isPending
          ? '생성 중...'
          : selectedFriends.length === 0
            ? '대화 상대 선택'
            : selectedFriends.length === 1
              ? '채팅 시작'
              : `다음 (${selectedFriends.length}명)`}
      </Button>
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
