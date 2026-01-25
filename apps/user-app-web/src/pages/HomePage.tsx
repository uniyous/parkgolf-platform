import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  ChevronRight,
  CalendarDays,
  UserPlus,
  MessageCircle,
  Clock,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, EmptyState, LoadingView } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyBookingsQuery, useFriendRequestsQuery } from '@/hooks/queries';
import { useChatRoomsQuery } from '@/hooks/queries/chat';
import { cn } from '@/lib/utils';
import type { BookingResponse } from '@/lib/api/bookingApi';

// Mock popular clubs data (실제로는 API에서 가져와야 함)
const popularClubs = [
  { id: 1, name: '서울 파크골프장', location: '서울특별시 송파구', rating: 4.8 },
  { id: 2, name: '부산 해운대 파크골프', location: '부산광역시 해운대구', rating: 4.6 },
  { id: 3, name: '제주 서귀포 파크골프', location: '제주특별자치도 서귀포시', rating: 4.9 },
  { id: 4, name: '대전 유성 파크골프', location: '대전광역시 유성구', rating: 4.5 },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bookings, isLoading: isLoadingBookings } = useMyBookingsQuery();
  const { data: friendRequests = [] } = useFriendRequestsQuery();
  const { data: chatRoomsData } = useChatRoomsQuery();

  const chatRooms = chatRoomsData?.data ?? [];
  const unreadChatRooms = chatRooms.filter((room) => room.unreadCount > 0);
  const totalUnreadCount = unreadChatRooms.reduce((sum, room) => sum + room.unreadCount, 0);

  // Get upcoming bookings (CONFIRMED status and future date)
  const upcomingBookings = bookings?.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.bookingDate) >= new Date()
  );

  // Check if there are notifications
  const hasNotifications = friendRequests.length > 0 || totalUnreadCount > 0;

  return (
    <AppLayout showLogo>
      <Container className="py-4 md:py-6 space-y-6">
        {/* Welcome Header (iOS 스타일) */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {getGreetingMessage(user?.name || '회원')}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            오늘도 파크골프하기 좋은 날이에요
          </p>
        </div>

        {/* Notifications Section (iOS 스타일) */}
        {hasNotifications && (
          <div className="grid grid-cols-2 gap-3">
            {/* Friend Requests Card */}
            {friendRequests.length > 0 && (
              <button
                onClick={() => navigate('/social?tab=friends')}
                className="text-left"
              >
                <GlassCard hoverable className="h-full">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <UserPlus className="w-5 h-5 text-[var(--color-warning)]" />
                      <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-warning)] text-white rounded-full">
                        {friendRequests.length}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">친구 요청</h3>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {friendRequests[0]?.fromUserName}님이 요청
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </button>
            )}

            {/* Unread Messages Card */}
            {totalUnreadCount > 0 && (
              <button
                onClick={() => navigate('/social?tab=chat')}
                className="text-left"
              >
                <GlassCard hoverable className="h-full">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />
                      <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)] text-white rounded-full">
                        {totalUnreadCount}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">새 메시지</h3>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {unreadChatRooms[0]?.lastMessage?.content || '새 메시지가 있습니다'}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </button>
            )}
          </div>
        )}

        {/* Search CTA (iOS 스타일) */}
        <button onClick={() => navigate('/search')} className="w-full text-left">
          <GlassCard
            hoverable
            className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">라운드 검색하기</h3>
                <p className="text-sm text-white/70">주변 파크골프장을 찾아보세요</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" />
            </div>
          </GlassCard>
        </button>

        {/* Upcoming Bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              다가오는 라운드
            </h2>
            {upcomingBookings && upcomingBookings.length > 0 && (
              <button
                onClick={() => navigate('/my-bookings')}
                className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                전체보기
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {isLoadingBookings ? (
            <LoadingView size="sm" />
          ) : upcomingBookings && upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <UpcomingBookingCard
                  key={booking.bookingNumber}
                  booking={booking}
                  onClick={() => navigate(`/booking/${booking.bookingNumber}`)}
                />
              ))}
            </div>
          ) : (
            <GlassCard>
              <EmptyState
                icon={CalendarDays}
                title="예정된 라운드가 없습니다"
                description="새로운 라운드를 예약해보세요"
                actionLabel="예약하기"
                onAction={() => navigate('/search')}
              />
            </GlassCard>
          )}
        </div>

        {/* Popular Clubs Section (iOS 스타일) */}
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <span>🏆</span>
            이번 주 인기 골프장
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {popularClubs.map((club) => (
              <PopularClubCard
                key={club.id}
                club={club}
                onClick={() => navigate(`/club/${club.id}`)}
              />
            ))}
          </div>
        </div>
      </Container>
    </AppLayout>
  );
}

// Helper function for greeting message
function getGreetingMessage(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return `좋은 아침이에요, ${name}님! ☀️`;
  } else if (hour < 18) {
    return `안녕하세요, ${name}님! 👋`;
  } else {
    return `좋은 저녁이에요, ${name}님! 🌙`;
  }
}

// Upcoming booking card component
interface UpcomingBookingCardProps {
  booking: BookingResponse;
  onClick: () => void;
}

function UpcomingBookingCard({ booking, onClick }: UpcomingBookingCardProps) {
  const bookingDate = new Date(booking.bookingDate);
  const today = new Date();
  const diffDays = Math.ceil(
    (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const getDDayText = () => {
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '내일';
    if (diffDays < 0) return '';
    return `D-${diffDays}`;
  };

  return (
    <button onClick={onClick} className="w-full text-left">
      <GlassCard hoverable>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-success text-xs">확정</span>
            </div>
            <h3 className="font-semibold text-white truncate">
              {booking.clubName || '골프장'}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-[var(--color-text-tertiary)]">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {bookingDate.toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {booking.startTime.slice(0, 5)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {booking.playerCount}명
              </span>
            </div>
          </div>

          {/* D-Day Badge */}
          {getDDayText() && (
            <div className="px-3 py-1.5 bg-[var(--color-primary)]/20 rounded-lg flex-shrink-0">
              <span className="text-sm font-bold text-[var(--color-primary)]">
                {getDDayText()}
              </span>
            </div>
          )}
        </div>
      </GlassCard>
    </button>
  );
}

// Popular club card component
interface PopularClubCardProps {
  club: {
    id: number;
    name: string;
    location: string;
    rating: number;
  };
  onClick: () => void;
}

function PopularClubCard({ club, onClick }: PopularClubCardProps) {
  return (
    <button onClick={onClick} className="flex-shrink-0 w-44 text-left">
      <GlassCard hoverable className="p-0 overflow-hidden">
        {/* Image placeholder */}
        <div className="h-24 bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-secondary)]/30 flex items-center justify-center">
          <span className="text-4xl opacity-50">⛳</span>
        </div>
        <div className="p-3">
          <h4 className="text-sm font-semibold text-white truncate">{club.name}</h4>
          <p className="text-xs text-[var(--color-text-muted)] truncate flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {club.location}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-[var(--color-warning)] fill-current" />
            <span className="text-xs text-white font-medium">{club.rating.toFixed(1)}</span>
          </div>
        </div>
      </GlassCard>
    </button>
  );
}
