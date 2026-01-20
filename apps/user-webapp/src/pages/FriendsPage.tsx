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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { Friend, FriendRequest, SentFriendRequest, UserSearchResult } from '@/lib/api/friendApi';

type TabType = 'friends' | 'requests';

export const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
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

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 z-30 bg-black/20 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">친구</h2>
          <button
            onClick={() => setShowAddFriendModal(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
          >
            <UserPlus className="w-4 h-4" />
            친구 추가
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'friends'
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            <Users className="w-4 h-4 inline-block mr-1.5" />
            친구 {friends.length > 0 && `(${friends.length})`}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative',
              activeTab === 'requests'
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            <Clock className="w-4 h-4 inline-block mr-1.5" />
            요청
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6">
        {activeTab === 'friends' && (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="친구 검색..."
                  value={friendListSearch}
                  onChange={(e) => setFriendListSearch(e.target.value)}
                  className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Loading */}
            {isLoadingFriends && (
              <div className="space-y-3">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="glass-card p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/10" />
                        <div className="flex-1 space-y-2">
                          <div className="w-24 h-4 bg-white/10 rounded" />
                          <div className="w-32 h-3 bg-white/10 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Empty */}
            {!isLoadingFriends && filteredFriends.length === 0 && (
              <div className="glass-card p-8 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {friendListSearch ? '검색 결과가 없습니다' : '아직 친구가 없습니다'}
                </h3>
                <p className="text-white/60 mb-6">
                  {friendListSearch
                    ? '다른 검색어로 시도해보세요.'
                    : '친구를 추가하고 함께 라운드를 즐겨보세요!'}
                </p>
                {!friendListSearch && (
                  <Button
                    onClick={() => setShowAddFriendModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    친구 추가
                  </Button>
                )}
              </div>
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
              <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                받은 요청 ({friendRequests.length})
              </h3>
              {isLoadingRequests && (
                <div className="glass-card p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="w-24 h-4 bg-white/10 rounded" />
                      <div className="w-32 h-3 bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
              )}
              {!isLoadingRequests && friendRequests.length === 0 && (
                <div className="glass-card p-6 text-center text-white/40">
                  받은 친구 요청이 없습니다.
                </div>
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
              <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" />
                보낸 요청 ({sentRequests.length})
              </h3>
              {sentRequests.length === 0 && (
                <div className="glass-card p-6 text-center text-white/40">
                  보낸 친구 요청이 없습니다.
                </div>
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
      </main>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
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
      )}
    </div>
  );
};

// ============================================
// Sub Components
// ============================================

interface FriendCardProps {
  friend: Friend;
  onChat: () => void;
  onRemove: () => void;
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, onChat, onRemove }) => {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
          <span className="text-lg font-semibold text-white">
            {friend.friendName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{friend.friendName}</h4>
          <p className="text-white/50 text-sm truncate">{friend.friendEmail}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onChat}
            className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            title="채팅"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-red-500/50 hover:text-white transition-colors"
            title="삭제"
          >
            <UserMinus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center">
          <span className="text-lg font-semibold text-white">
            {request.fromUserName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{request.fromUserName}</h4>
          <p className="text-white/50 text-sm truncate">{request.fromUserEmail}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-colors"
            title="수락"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            onClick={onReject}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
            title="거절"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface SentRequestCardProps {
  request: SentFriendRequest;
}

const SentRequestCard: React.FC<SentRequestCardProps> = ({ request }) => {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-yellow-500/30 flex items-center justify-center">
          <span className="text-lg font-semibold text-white">
            {request.toUserName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{request.toUserName}</h4>
          <p className="text-white/50 text-sm truncate">{request.toUserEmail}</p>
        </div>

        {/* Status */}
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
          대기 중
        </span>
      </div>
    </div>
  );
};

// ============================================
// Add Friend Modal
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

const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onSendRequest,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <h3 className="text-lg font-semibold text-white mb-4">친구 추가</h3>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="이메일 또는 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40"
            autoFocus
          />
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {isSearching && (
            <div className="p-4 text-center text-white/40">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="p-4 text-center text-white/40">검색 결과가 없습니다.</div>
          )}

          {!isSearching && searchQuery.length < 2 && (
            <div className="p-4 text-center text-white/40">2글자 이상 입력해주세요.</div>
          )}

          {!isSearching &&
            searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{user.name}</h4>
                  <p className="text-white/50 text-xs truncate">{user.email}</p>
                </div>

                {/* Action */}
                {user.isFriend ? (
                  <span className="text-xs text-emerald-400">친구</span>
                ) : user.hasPendingRequest ? (
                  <span className="text-xs text-yellow-400">요청됨</span>
                ) : (
                  <button
                    onClick={() => onSendRequest(user.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                  >
                    요청
                  </button>
                )}
              </div>
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
