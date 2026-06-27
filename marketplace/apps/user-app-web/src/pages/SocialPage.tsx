import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  MessageCircle,
  UserPlus,
  Check,
  X,
  UserMinus,
  Send,
  PenSquare,
  User,
  ArrowLeft,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button, EmptyState, LoadingView, BottomSheet } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  useFriendsQuery,
  useFriendRequestsQuery,
  useSentFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
} from '@/hooks/queries';
import { useChatRoomsQuery, useGetOrCreateDirectChatMutation, useCreateChatRoomMutation, useLeaveChatRoomMutation } from '@/hooks/queries/chat';
import { useDebounce } from '@/hooks/useDebounce';
import { DEBOUNCE_DELAY_MS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { Friend, FriendRequest, SentFriendRequest, UserSearchResult } from '@/lib/api/friendApi';
import { getChatRoomDisplayName, type ChatRoom } from '@/lib/api/chatApi';
import { useAuthStore } from '@/stores/authStore';

type MainTab = 'friends' | 'chat';
type FriendSubTab = 'friends' | 'requests';

export function SocialPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile } = useResponsive();
  const user = useAuthStore((state) => state.user);
  const currentUserId = String(user?.id ?? '');

  // Tab state from URL
  const mainTab = (searchParams.get('tab') as MainTab) || 'friends';

  // Friend sub tab state
  const [friendSubTab, setFriendSubTab] = useState<FriendSubTab>('friends');

  // Modal states
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const { confirm } = useConfirm();

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [friendListSearch, setFriendListSearch] = useState('');
  const debouncedSearch = useDebounce(searchQuery, DEBOUNCE_DELAY_MS);

  // Queries
  const { data: friends = [], isLoading: isLoadingFriends, refetch: refetchFriends } = useFriendsQuery();
  const { data: friendRequests = [], isLoading: isLoadingRequests, refetch: refetchRequests } = useFriendRequestsQuery();
  const { data: sentRequests = [], refetch: refetchSentRequests } = useSentFriendRequestsQuery();
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsersQuery(debouncedSearch);
  const { data: chatRoomsData, isLoading: isLoadingChats, refetch: refetchChatRooms } = useChatRoomsQuery();
  const chatRooms = chatRoomsData?.data ?? [];

  // Mutations
  const sendRequestMutation = useSendFriendRequestMutation();
  const acceptRequestMutation = useAcceptFriendRequestMutation();
  const rejectRequestMutation = useRejectFriendRequestMutation();
  const removeFriendMutation = useRemoveFriendMutation();
  const createDirectChatMutation = useGetOrCreateDirectChatMutation();
  const createChatRoomMutation = useCreateChatRoomMutation();
  const leaveChatMutation = useLeaveChatRoomMutation();

  // Filtered friends
  const filteredFriends = friendListSearch
    ? friends.filter(
        (f) =>
          f.friendName.toLowerCase().includes(friendListSearch.toLowerCase()) ||
          f.friendEmail.toLowerCase().includes(friendListSearch.toLowerCase())
      )
    : friends;

  // Tab handlers
  const setMainTab = (tab: MainTab) => {
    const newParams = new URLSearchParams();
    if (tab !== 'friends') newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });

    // 탭 전환 시 데이터 새로고침
    if (tab === 'chat') {
      refetchChatRooms();
    } else {
      refetchFriends();
      refetchRequests();
      refetchSentRequests();
    }
  };

  const handleFriendSubTab = (tab: FriendSubTab) => {
    setFriendSubTab(tab);

    // 서브탭 전환 시 데이터 새로고침
    if (tab === 'friends') {
      refetchFriends();
    } else {
      refetchRequests();
      refetchSentRequests();
    }
  };

  // Friend handlers
  const handleSendRequest = useCallback(
    async (userId: number) => {
      try {
        await sendRequestMutation.mutateAsync({ toUserId: userId });
        showSuccessToast('친구 요청을 보냈습니다.');
      } catch {
        showErrorToast('친구 요청 전송에 실패했습니다.');
      }
    },
    [sendRequestMutation]
  );

  const handleAcceptRequest = useCallback(
    async (requestId: number) => {
      try {
        await acceptRequestMutation.mutateAsync(requestId);
        showSuccessToast('친구 요청을 수락했습니다.');
      } catch {
        showErrorToast('친구 요청 수락에 실패했습니다.');
      }
    },
    [acceptRequestMutation]
  );

  const handleRejectRequest = useCallback(
    async (requestId: number) => {
      try {
        await rejectRequestMutation.mutateAsync(requestId);
        showSuccessToast('친구 요청을 거절했습니다.');
      } catch {
        showErrorToast('친구 요청 거절에 실패했습니다.');
      }
    },
    [rejectRequestMutation]
  );

  const handleRemoveFriend = useCallback(
    async (friendId: number) => {
      const confirmed = await confirm({
        type: 'danger',
        title: '친구 삭제',
        description: '정말 친구를 삭제하시겠습니까?',
        okText: '삭제',
      });
      if (!confirmed) return;
      try {
        await removeFriendMutation.mutateAsync(friendId);
        showSuccessToast('친구를 삭제했습니다.');
      } catch {
        showErrorToast('친구 삭제에 실패했습니다.');
      }
    },
    [removeFriendMutation, confirm]
  );

  const handleStartChat = useCallback(
    async (friend: Friend) => {
      try {
        const room = await createDirectChatMutation.mutateAsync({
          userId: String(friend.friendId),
          userName: friend.friendName,
        });
        navigate(`/chat/${room.id}`);
      } catch {
        showErrorToast('채팅방 생성에 실패했습니다.');
      }
    },
    [createDirectChatMutation, navigate]
  );

  const handleLeaveChatRoom = useCallback(
    async (roomId: string) => {
      const confirmed = await confirm({
        type: 'warning',
        title: '채팅방 나가기',
        description: '채팅방을 나가시겠습니까?',
        okText: '나가기',
      });
      if (!confirmed) return;
      try {
        await leaveChatMutation.mutateAsync(roomId);
      } catch {
        showErrorToast('채팅방 나가기에 실패했습니다.');
      }
    },
    [leaveChatMutation, confirm]
  );

  // Header right button
  const headerRight =
    mainTab === 'friends' ? (
      <Button size="sm" onClick={() => setShowAddFriendModal(true)}>
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">친구 추가</span>
      </Button>
    ) : (
      <Button size="sm" onClick={() => setShowNewChatModal(true)} aria-label="새 채팅">
        <PenSquare className="w-4 h-4" />
        <span className="hidden sm:inline">새 채팅</span>
      </Button>
    );

  return (
    <AppLayout title="소셜" headerRight={headerRight}>
      <Container className="py-4 md:py-6">
        {/* Main Tabs */}
        <div className="flex gap-2 p-1 bg-[var(--color-surface)] rounded-xl mb-4">
          <button
            onClick={() => setMainTab('friends')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all',
              mainTab === 'friends'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            친구
            {friends.length > 0 && (
              <span className="text-xs opacity-70">({friends.length})</span>
            )}
          </button>
          <button
            onClick={() => setMainTab('chat')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all relative',
              mainTab === 'chat'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-white'
            )}
          >
            <MessageCircle className="w-4 h-4" />
            채팅
            {chatRooms.some((r) => r.unreadCount > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-error)] rounded-full" />
            )}
          </button>
        </div>

        {/* Friends Tab Content */}
        {mainTab === 'friends' && (
          <div className="space-y-4">
            {/* Stats Card (iOS 스타일) */}
            <FriendsStatsCard
              friendsCount={friends.length}
              receivedCount={friendRequests.length}
              sentCount={sentRequests.length}
            />

            {/* Friend Sub Tabs (칩 스타일) */}
            <div className="flex gap-2">
              <button
                onClick={() => handleFriendSubTab('friends')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  friendSubTab === 'friends'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                )}
              >
                친구
              </button>
              <button
                onClick={() => handleFriendSubTab('requests')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  friendSubTab === 'requests'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                )}
              >
                요청
                {(friendRequests.length + sentRequests.length) > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-[var(--color-primary)] text-white rounded-full">
                    {friendRequests.length + sentRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Friends Sub Tab Content */}
            {friendSubTab === 'friends' && (
              <section className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="친구 검색..."
                    value={friendListSearch}
                    onChange={(e) => setFriendListSearch(e.target.value)}
                    className="input-glass"
                  />
                </div>

                {isLoadingFriends && <LoadingView />}

                {!isLoadingFriends && filteredFriends.length === 0 && (
                  <GlassCard>
                    <EmptyState
                      icon={Users}
                      title={friendListSearch ? '검색 결과가 없습니다' : '아직 친구가 없습니다'}
                      description={
                        friendListSearch
                          ? '다른 검색어로 시도해보세요.'
                          : '친구를 추가하고 함께 라운드를 즐겨보세요!'
                      }
                      actionLabel={friendListSearch ? undefined : '친구 추가'}
                      onAction={friendListSearch ? undefined : () => setShowAddFriendModal(true)}
                    />
                  </GlassCard>
                )}

                {!isLoadingFriends && filteredFriends.length > 0 && (
                  <div className="space-y-3">
                    {filteredFriends.map((friend) => (
                      <FriendCard
                        key={friend.id}
                        friend={friend}
                        onChat={() => handleStartChat(friend)}
                        onRemove={() => handleRemoveFriend(friend.friendId)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Requests Sub Tab Content */}
            {friendSubTab === 'requests' && (
              <div className="space-y-6">
                {/* Empty State */}
                {friendRequests.length === 0 && sentRequests.length === 0 && (
                  <GlassCard>
                    <EmptyState
                      icon={UserPlus}
                      title="친구 요청이 없습니다"
                      description="친구를 추가하거나 요청이 오면 여기에 표시됩니다"
                      actionLabel="친구 추가"
                      onAction={() => setShowAddFriendModal(true)}
                    />
                  </GlassCard>
                )}

                {/* Received Requests */}
                {(friendRequests.length > 0 || sentRequests.length > 0) && (
                  <section>
                    <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      받은 요청
                      {friendRequests.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-[var(--color-primary)] text-white rounded-full">
                          {friendRequests.length}
                        </span>
                      )}
                    </h3>
                    {isLoadingRequests && <LoadingView size="sm" />}
                    {!isLoadingRequests && friendRequests.length === 0 && (
                      <GlassCard>
                        <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                          <UserPlus className="w-6 h-6 opacity-40" />
                          <div>
                            <p className="text-sm">받은 요청이 없습니다</p>
                            <p className="text-xs opacity-70">친구 요청이 오면 여기에 표시됩니다</p>
                          </div>
                        </div>
                      </GlassCard>
                    )}
                    {!isLoadingRequests && friendRequests.length > 0 && (
                      <div className="space-y-3">
                        {friendRequests.map((request) => (
                          <FriendRequestCard
                            key={request.id}
                            request={request}
                            onAccept={() => handleAcceptRequest(request.id)}
                            onReject={() => handleRejectRequest(request.id)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Sent Requests */}
                {(friendRequests.length > 0 || sentRequests.length > 0) && (
                  <section>
                    <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3 flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      보낸 요청
                      {sentRequests.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-[var(--color-warning)] text-white rounded-full">
                          {sentRequests.length}
                        </span>
                      )}
                    </h3>
                    {sentRequests.length === 0 && (
                      <GlassCard>
                        <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                          <Send className="w-6 h-6 opacity-40" />
                          <div>
                            <p className="text-sm">보낸 요청이 없습니다</p>
                            <p className="text-xs opacity-70">친구 요청을 보내면 여기에 표시됩니다</p>
                          </div>
                        </div>
                      </GlassCard>
                    )}
                    {sentRequests.length > 0 && (
                      <div className="space-y-3">
                        {sentRequests.map((request) => (
                          <SentRequestCard key={request.id} request={request} />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab Content */}
        {mainTab === 'chat' && (
          <>
            {isLoadingChats && <LoadingView />}

            {!isLoadingChats && chatRooms.length === 0 && (
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

            {!isLoadingChats && chatRooms.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0">
                    <PenSquare className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <span className="text-[var(--color-primary)] font-medium text-sm">새 채팅 시작</span>
                </button>
                {chatRooms.map((room) => (
                  <ChatRoomCard
                    key={room.id}
                    room={room}
                    currentUserId={currentUserId}
                    onClick={() => navigate(`/chat/${room.id}`)}
                    onLeave={() => handleLeaveChatRoom(room.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Container>

      {/* Add Friend Modal */}
      {isMobile ? (
        <BottomSheet
          open={showAddFriendModal}
          onClose={() => {
            setShowAddFriendModal(false);
            setSearchQuery('');
          }}
          title="친구 추가"
        >
          <AddFriendContent
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onSendRequest={handleSendRequest}
          />
        </BottomSheet>
      ) : (
        showAddFriendModal && (
          <ModalWrapper
            title="친구 추가"
            onClose={() => {
              setShowAddFriendModal(false);
              setSearchQuery('');
            }}
          >
            <AddFriendContent
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSendRequest={handleSendRequest}
            />
          </ModalWrapper>
        )
      )}

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
          <ModalWrapper title="새 채팅" onClose={() => setShowNewChatModal(false)}>
            <NewChatContent onClose={() => setShowNewChatModal(false)} />
          </ModalWrapper>
        )
      )}
    </AppLayout>
  );
}

// ============================================
// Sub Components
// ============================================

function FriendsStatsCard({
  friendsCount,
  receivedCount,
  sentCount,
}: {
  friendsCount: number;
  receivedCount: number;
  sentCount: number;
}) {
  return (
    <GlassCard>
      <div className="flex items-center justify-around">
        <div className="text-center">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{friendsCount}</div>
          <div className="text-xs text-[var(--color-text-muted)]">친구</div>
        </div>
        <div className="w-px h-10 bg-[var(--color-border)]" />
        <div className="text-center">
          <div className={cn(
            'text-2xl font-bold',
            receivedCount > 0 ? 'text-[var(--color-success)]' : 'text-white'
          )}>
            {receivedCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">받은 요청</div>
        </div>
        <div className="w-px h-10 bg-[var(--color-border)]" />
        <div className="text-center">
          <div className={cn(
            'text-2xl font-bold',
            sentCount > 0 ? 'text-[var(--color-warning)]' : 'text-white'
          )}>
            {sentCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">보낸 요청</div>
        </div>
      </div>
    </GlassCard>
  );
}

function FriendCard({
  friend,
  onChat,
  onRemove,
}: {
  friend: Friend;
  onChat: () => void;
  onRemove: () => void;
}) {
  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-white">
            {friend.friendName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{friend.friendName}</h4>
          <p className="text-[var(--color-text-tertiary)] text-sm truncate">{friend.friendEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onChat}
            className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white transition-colors"
            title="채팅"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/20 hover:text-[var(--color-error)] transition-colors"
            title="삭제"
          >
            <UserMinus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

function FriendRequestCard({
  request,
  onAccept,
  onReject,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--color-info)]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-white">
            {request.fromUserName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{request.fromUserName}</h4>
          <p className="text-[var(--color-text-tertiary)] text-sm truncate">{request.fromUserEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            className="p-2 rounded-lg bg-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/30 transition-colors"
            title="수락"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            onClick={onReject}
            className="p-2 rounded-lg bg-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/30 transition-colors"
            title="거절"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

function SentRequestCard({ request }: { request: SentFriendRequest }) {
  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--color-warning)]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-white">
            {request.toUserName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{request.toUserName}</h4>
          <p className="text-[var(--color-text-tertiary)] text-sm truncate">{request.toUserEmail}</p>
        </div>
        <span className="badge-warning">대기 중</span>
      </div>
    </GlassCard>
  );
}

function ChatRoomCard({ room, currentUserId, onClick, onLeave }: { room: ChatRoom; currentUserId: string; onClick: () => void; onLeave: () => void }) {
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
      case 'CHANNEL':
      case 'BOOKING':
        return <Users className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium truncate">
                {getChatRoomDisplayName(room, currentUserId)}
              </h4>
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
// Modal Components
// ============================================

function ModalWrapper({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        {children}
        <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}

function AddFriendContent({
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onSendRequest,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: UserSearchResult[];
  isSearching: boolean;
  onSendRequest: (userId: number) => void;
}) {
  return (
    <>
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="이메일 또는 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-glass"
          autoFocus
        />
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {isSearching && <LoadingView size="sm" />}

        {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="p-4 text-center text-[var(--color-text-muted)]">검색 결과가 없습니다.</div>
        )}

        {!isSearching && searchQuery.length < 2 && (
          <div className="p-4 text-center text-[var(--color-text-muted)]">2글자 이상 입력해주세요.</div>
        )}

        {!isSearching &&
          searchResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{user.name}</h4>
                <p className="text-[var(--color-text-muted)] text-xs truncate">{user.email}</p>
              </div>
              {user.isFriend ? (
                <span className="text-xs text-[var(--color-success)]">친구</span>
              ) : user.hasPendingRequest ? (
                <span className="text-xs text-[var(--color-warning)]">요청됨</span>
              ) : (
                <Button size="sm" onClick={() => onSendRequest(user.id)}>
                  요청
                </Button>
              )}
            </div>
          ))}
      </div>
    </>
  );
}

function NewChatContent({ onClose }: { onClose: () => void }) {
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
      setStep('name');
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim() || [user?.name, ...selectedFriends.map((f) => f.friendName)].filter(Boolean).join(', ');
    try {
      const room = await createChatRoomMutation.mutateAsync({
        name,
        type: 'CHANNEL',
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
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="친구 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-glass"
          autoFocus
        />
      </div>

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
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {friend.friendName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-white font-medium truncate">{friend.friendName}</h4>
                <p className="text-[var(--color-text-muted)] text-xs truncate">{friend.friendEmail}</p>
              </div>
            </button>
          ))}
      </div>

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
