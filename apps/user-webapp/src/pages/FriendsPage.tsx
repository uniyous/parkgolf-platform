import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  MessageCircle,
  UserMinus,
  Clock,
  Send,
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
import { useGetOrCreateDirectChatMutation } from '@/hooks/queries/chat';
import { useDebounce } from '@/hooks/useDebounce';
import { useResponsive } from '@/hooks/useResponsive';
import { Input } from '@/components/ui/Input';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { Friend, FriendRequest, SentFriendRequest, UserSearchResult } from '@/lib/api/friendApi';

type TabType = 'friends' | 'requests';

export function FriendsPage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendListSearch, setFriendListSearch] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Queries
  const { data: friends = [], isLoading: isLoadingFriends } = useFriendsQuery();
  const { data: friendRequests = [], isLoading: isLoadingRequests } = useFriendRequestsQuery();
  const { data: sentRequests = [] } = useSentFriendRequestsQuery();
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsersQuery(debouncedSearch);

  // Mutations
  const sendRequestMutation = useSendFriendRequestMutation();
  const acceptRequestMutation = useAcceptFriendRequestMutation();
  const rejectRequestMutation = useRejectFriendRequestMutation();
  const removeFriendMutation = useRemoveFriendMutation();
  const createDirectChatMutation = useGetOrCreateDirectChatMutation();

  // Filtered friends
  const filteredFriends = friendListSearch
    ? friends.filter(
        (f) =>
          f.friendName.toLowerCase().includes(friendListSearch.toLowerCase()) ||
          f.friendEmail.toLowerCase().includes(friendListSearch.toLowerCase())
      )
    : friends;

  // Handlers
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
      if (!confirm('정말 친구를 삭제하시겠습니까?')) return;
      try {
        await removeFriendMutation.mutateAsync(friendId);
        showSuccessToast('친구를 삭제했습니다.');
      } catch {
        showErrorToast('친구 삭제에 실패했습니다.');
      }
    },
    [removeFriendMutation]
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

  const headerRight = (
    <Button
      size="sm"
      onClick={() => setShowAddFriendModal(true)}
    >
      <UserPlus className="w-4 h-4" />
      <span className="hidden sm:inline">친구 추가</span>
    </Button>
  );

  return (
    <AppLayout title="친구" headerRight={headerRight}>
      <Container className="py-4 md:py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors',
              activeTab === 'friends'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            )}
          >
            <Users className="w-4 h-4 inline-block mr-1.5" />
            친구 {friends.length > 0 && `(${friends.length})`}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors relative',
              activeTab === 'requests'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            )}
          >
            <Clock className="w-4 h-4 inline-block mr-1.5" />
            요청
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-error)] text-white text-xs rounded-full flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'friends' && (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="친구 검색..."
                  value={friendListSearch}
                  onChange={(e) => setFriendListSearch(e.target.value)}
                  className="input-glass pl-10"
                />
              </div>
            </div>

            {/* Loading */}
            {isLoadingFriends && <LoadingView />}

            {/* Empty */}
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

            {/* Friend List */}
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
          </>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Received Requests */}
            <section>
              <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                받은 요청 ({friendRequests.length})
              </h3>
              {isLoadingRequests && <LoadingView size="sm" />}
              {!isLoadingRequests && friendRequests.length === 0 && (
                <GlassCard className="text-center text-[var(--color-text-muted)] py-6">
                  받은 친구 요청이 없습니다.
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

            {/* Sent Requests */}
            <section>
              <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" />
                보낸 요청 ({sentRequests.length})
              </h3>
              {sentRequests.length === 0 && (
                <GlassCard className="text-center text-[var(--color-text-muted)] py-6">
                  보낸 친구 요청이 없습니다.
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
          </div>
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
          <AddFriendModal
            isOpen={showAddFriendModal}
            onClose={() => {
              setShowAddFriendModal(false);
              setSearchQuery('');
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onSendRequest={handleSendRequest}
          />
        )
      )}
    </AppLayout>
  );
}

// ============================================
// Sub Components
// ============================================

interface FriendCardProps {
  friend: Friend;
  onChat: () => void;
  onRemove: () => void;
}

function FriendCard({ friend, onChat, onRemove }: FriendCardProps) {
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

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
}

function FriendRequestCard({ request, onAccept, onReject }: FriendRequestCardProps) {
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

interface SentRequestCardProps {
  request: SentFriendRequest;
}

function SentRequestCard({ request }: SentRequestCardProps) {
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

// ============================================
// Add Friend Content (shared between modal and bottom sheet)
// ============================================

interface AddFriendContentProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: UserSearchResult[];
  isSearching: boolean;
  onSendRequest: (userId: number) => void;
}

function AddFriendContent({
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onSendRequest,
}: AddFriendContentProps) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="이메일 또는 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-glass pl-10"
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

// ============================================
// Add Friend Modal (Desktop)
// ============================================

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: UserSearchResult[];
  isSearching: boolean;
  onSendRequest: (userId: number) => void;
}

function AddFriendModal({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onSendRequest,
}: AddFriendModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-white mb-4">친구 추가</h3>
        <AddFriendContent
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchResults={searchResults}
          isSearching={isSearching}
          onSendRequest={onSendRequest}
        />
        <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}
