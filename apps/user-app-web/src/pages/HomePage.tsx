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
  CloudSun,
  Navigation,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, EmptyState, LoadingView } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyBookingsQuery, useFriendRequestsQuery } from '@/hooks/queries';
import { useReverseGeoQuery, useNearbyClubsQuery, useCurrentWeatherQuery } from '@/hooks/queries';
import { useChatRoomsQuery } from '@/hooks/queries/chat';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { cn } from '@/lib/utils';
import type { BookingResponse } from '@/lib/api/bookingApi';
import type { NearbyClub } from '@/lib/api/locationApi';
import type { CurrentWeather, PrecipitationType } from '@/lib/api/weatherApi';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bookings, isLoading: isLoadingBookings } = useMyBookingsQuery();
  const { data: friendRequests = [] } = useFriendRequestsQuery();
  const { data: chatRoomsData } = useChatRoomsQuery();

  // Location & Weather
  const { latitude, longitude } = useCurrentLocation();
  const { data: regionData } = useReverseGeoQuery(latitude, longitude);
  const { data: weather } = useCurrentWeatherQuery(latitude, longitude);
  const { data: nearbyClubs } = useNearbyClubsQuery(latitude, longitude, 30, 10);

  const regionName = regionData?.region3 || regionData?.region2 || null;

  const chatRooms = chatRoomsData?.data ?? [];
  const unreadChatRooms = chatRooms.filter((room) => room.unreadCount > 0);
  const totalUnreadCount = unreadChatRooms.reduce((sum, room) => sum + room.unreadCount, 0);

  // Get upcoming bookings (CONFIRMED status and future date)
  const upcomingBookings = bookings?.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.bookingDate) >= new Date()
  );

  // Check notification counts
  const hasFriendRequests = friendRequests.length > 0;
  const hasUnreadMessages = totalUnreadCount > 0;
  const notificationCount = (hasFriendRequests ? 1 : 0) + (hasUnreadMessages ? 1 : 0);

  // Search CTA Component (재사용을 위해 분리)
  const SearchCTA = ({ className = '' }: { className?: string }) => (
    <button onClick={() => navigate('/bookings')} className={cn('text-left', className)}>
      <GlassCard
        hoverable
        className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] h-full"
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
  );

  return (
    <AppLayout showLogo>
      <Container className="py-4 md:py-6 space-y-6">
        {/* Welcome Header with Location & Weather */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {getGreetingMessage(user?.name || '회원')}
          </h1>
          <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
            {regionName && (
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                {regionName}
              </span>
            )}
            {weather && (
              <span className="flex items-center gap-1">
                <CloudSun className="w-3.5 h-3.5" />
                {weather.temperature}°C
                {weather.precipitationType !== 'NONE' && ` · ${getWeatherLabel(weather.precipitationType)}`}
              </span>
            )}
            {!regionName && !weather && (
              <span>오늘도 파크골프하기 좋은 날이에요</span>
            )}
          </div>
        </div>

        {/*
          Desktop Layout:
          - 알림 2개: [알림1] [알림2] / [검색CTA]
          - 알림 1개: [알림] [검색CTA]
          - 알림 0개: [검색CTA 전체]

          Mobile Layout:
          - 알림이 있으면 알림 섹션 먼저, 그 다음 검색 CTA
        */}

        {/* Mobile Layout */}
        <div className="md:hidden space-y-3">
          {/* Notifications - 1열로 표시 */}
          {hasFriendRequests && (
            <NotificationCard
              icon={<UserPlus className="w-5 h-5 text-[var(--color-warning)]" />}
              badgeColor="var(--color-warning)"
              count={friendRequests.length}
              title="친구 요청"
              subtitle={`${friendRequests[0]?.fromUserName}님이 요청`}
              onClick={() => navigate('/social?tab=friends')}
            />
          )}
          {hasUnreadMessages && (
            <NotificationCard
              icon={<MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />}
              badgeColor="var(--color-primary)"
              count={totalUnreadCount}
              title="새 메시지"
              subtitle={unreadChatRooms[0]?.lastMessage?.content || '새 메시지가 있습니다'}
              onClick={() => navigate('/social?tab=chat')}
            />
          )}
          <SearchCTA className="w-full" />
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block space-y-4">
          {notificationCount === 2 ? (
            // 알림 2개: 알림들 먼저, 검색 CTA는 다음 줄
            <>
              <div className="grid grid-cols-2 gap-3">
                <NotificationCard
                  icon={<UserPlus className="w-5 h-5 text-[var(--color-warning)]" />}
                  badgeColor="var(--color-warning)"
                  count={friendRequests.length}
                  title="친구 요청"
                  subtitle={`${friendRequests[0]?.fromUserName}님이 요청`}
                  onClick={() => navigate('/social?tab=friends')}
                />
                <NotificationCard
                  icon={<MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />}
                  badgeColor="var(--color-primary)"
                  count={totalUnreadCount}
                  title="새 메시지"
                  subtitle={unreadChatRooms[0]?.lastMessage?.content || '새 메시지가 있습니다'}
                  onClick={() => navigate('/social?tab=chat')}
                />
              </div>
              <SearchCTA className="w-full" />
            </>
          ) : notificationCount === 1 ? (
            // 알림 1개: 알림과 검색 CTA를 같은 줄에
            <div className="grid grid-cols-2 gap-3">
              {hasFriendRequests && (
                <NotificationCard
                  icon={<UserPlus className="w-5 h-5 text-[var(--color-warning)]" />}
                  badgeColor="var(--color-warning)"
                  count={friendRequests.length}
                  title="친구 요청"
                  subtitle={`${friendRequests[0]?.fromUserName}님이 요청`}
                  onClick={() => navigate('/social?tab=friends')}
                />
              )}
              {hasUnreadMessages && (
                <NotificationCard
                  icon={<MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />}
                  badgeColor="var(--color-primary)"
                  count={totalUnreadCount}
                  title="새 메시지"
                  subtitle={unreadChatRooms[0]?.lastMessage?.content || '새 메시지가 있습니다'}
                  onClick={() => navigate('/social?tab=chat')}
                />
              )}
              <SearchCTA />
            </div>
          ) : (
            // 알림 0개: 검색 CTA만 전체 너비
            <SearchCTA className="w-full" />
          )}
        </div>

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
                onAction={() => navigate('/bookings')}
              />
            </GlassCard>
          )}
        </div>

        {/* Nearby / Popular Clubs Section */}
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            {nearbyClubs && nearbyClubs.length > 0 ? (
              <>
                <MapPin className="w-5 h-5" />
                주변 골프장
              </>
            ) : (
              <>
                <span>🏆</span>
                이번 주 인기 골프장
              </>
            )}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {nearbyClubs && nearbyClubs.length > 0 ? (
              nearbyClubs.map((club) => (
                <NearbyClubCard
                  key={club.id}
                  club={club}
                  onClick={() => navigate(`/club/${club.id}`)}
                />
              ))
            ) : (
              // Fallback to static list when location unavailable
              [
                { id: 1, name: '서울 파크골프장', location: '서울특별시 송파구', rating: 4.8 },
                { id: 2, name: '부산 해운대 파크골프', location: '부산광역시 해운대구', rating: 4.6 },
                { id: 3, name: '제주 서귀포 파크골프', location: '제주특별자치도 서귀포시', rating: 4.9 },
                { id: 4, name: '대전 유성 파크골프', location: '대전광역시 유성구', rating: 4.5 },
              ].map((club) => (
                <PopularClubCard
                  key={club.id}
                  club={club}
                  onClick={() => navigate(`/club/${club.id}`)}
                />
              ))
            )}
          </div>
        </div>
      </Container>
    </AppLayout>
  );
}

// Helper function for weather label
function getWeatherLabel(type: PrecipitationType): string {
  switch (type) {
    case 'RAIN': return '비';
    case 'SNOW': return '눈';
    case 'SLEET': return '진눈깨비';
    case 'DRIZZLE': return '이슬비';
    case 'SNOW_FLURRY': return '날림눈';
    default: return '';
  }
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

// Notification card component
interface NotificationCardProps {
  icon: React.ReactNode;
  badgeColor: string;
  count: number;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function NotificationCard({ icon, badgeColor, count, title, subtitle, onClick }: NotificationCardProps) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <GlassCard hoverable className="h-full">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            {icon}
            <span
              className="px-2 py-0.5 text-xs font-medium text-white rounded-full"
              style={{ backgroundColor: badgeColor }}
            >
              {count}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</p>
          </div>
        </div>
      </GlassCard>
    </button>
  );
}

// Nearby club card component (real data)
interface NearbyClubCardProps {
  club: NearbyClub;
  onClick: () => void;
}

function NearbyClubCard({ club, onClick }: NearbyClubCardProps) {
  return (
    <button onClick={onClick} className="flex-shrink-0 w-44 text-left">
      <GlassCard hoverable className="p-0 overflow-hidden">
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
            <Navigation className="w-3 h-3 text-[var(--color-primary)]" />
            <span className="text-xs text-white font-medium">{club.distance.toFixed(1)}km</span>
          </div>
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
