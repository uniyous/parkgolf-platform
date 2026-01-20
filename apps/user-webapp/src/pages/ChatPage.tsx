import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, PenSquare, Users, User, Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatRoomsQuery, useGetOrCreateDirectChatMutation } from '@/hooks/queries/chat';
import { useFriendsQuery } from '@/hooks/queries/friend';
import { Input } from '@/components/ui/Input';
import { showErrorToast } from '@/lib/toast';
import type { ChatRoom } from '@/lib/api/chatApi';
import type { Friend } from '@/lib/api/friendApi';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const { data: chatRoomsData, isLoading } = useChatRoomsQuery();
  const chatRooms = chatRoomsData?.data ?? [];

  const handleRoomClick = useCallback(
    (roomId: string) => {
      navigate(`/chat/${roomId}`);
    },
    [navigate]
  );

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 z-30 bg-black/20 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">채팅</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
          >
            <PenSquare className="w-4 h-4" />
            새 채팅
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="w-24 h-4 bg-white/10 rounded" />
                      <div className="w-40 h-3 bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && chatRooms.length === 0 && (
          <div className="glass-card p-8 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-lg font-semibold text-white mb-2">채팅이 없습니다</h3>
            <p className="text-white/60 mb-6">친구와 대화를 시작해보세요!</p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className={cn(
                'px-6 py-3 text-sm font-medium rounded-lg',
                'bg-emerald-500 text-white hover:bg-emerald-600',
                'transition-colors'
              )}
            >
              새 채팅 시작
            </button>
          </div>
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
      </main>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
        />
      )}
    </div>
  );
};

// ============================================
// Sub Components
// ============================================

interface ChatRoomCardProps {
  room: ChatRoom;
  onClick: () => void;
}

const ChatRoomCard: React.FC<ChatRoomCardProps> = ({ room, onClick }) => {
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
      className="w-full glass-card p-4 text-left hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            room.type === 'BOOKING' ? 'bg-blue-500/30' : 'bg-emerald-500/30'
          )}
        >
          {getRoomIcon()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium truncate">{room.name}</h4>
            {getRoomTypeLabel() && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/10 text-white/60">
                {getRoomTypeLabel()}
              </span>
            )}
          </div>
          <p className="text-white/50 text-sm truncate">
            {room.lastMessage?.content ?? '대화를 시작해보세요'}
          </p>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-1">
          {room.lastMessage && (
            <span className="text-xs text-white/40">
              {formatTime(room.lastMessage.createdAt)}
            </span>
          )}
          {room.unreadCount > 0 && (
            <span className="w-5 h-5 bg-emerald-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// ============================================
// New Chat Modal
// ============================================

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <h3 className="text-lg font-semibold text-white mb-4">새 채팅</h3>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="친구 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40"
            autoFocus
          />
        </div>

        {/* Friends List */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {isLoading && (
            <div className="p-4 text-center text-white/40">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!isLoading && filteredFriends.length === 0 && (
            <div className="p-4 text-center text-white/40">
              {searchQuery ? '검색 결과가 없습니다.' : '친구가 없습니다.'}
            </div>
          )}

          {!isLoading &&
            filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => handleSelectFriend(friend)}
                disabled={createDirectChatMutation.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {friend.friendName.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-white font-medium truncate">{friend.friendName}</h4>
                  <p className="text-white/50 text-xs truncate">{friend.friendEmail}</p>
                </div>

                <MessageCircle className="w-5 h-5 text-white/40" />
              </button>
            ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
