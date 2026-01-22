import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Users,
  MessageCircle,
  Clock,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button, EmptyState, LoadingView } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyBookingsQuery } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import type { BookingResponse } from '@/lib/api/bookingApi';

// Quick action items
const quickActions = [
  {
    icon: Search,
    label: '예약하기',
    path: '/bookings',
    color: 'var(--color-primary)',
  },
  {
    icon: Calendar,
    label: '내 예약',
    path: '/my-bookings',
    color: 'var(--color-info)',
  },
  {
    icon: Users,
    label: '소셜',
    path: '/social',
    color: 'var(--color-warning)',
  },
  {
    icon: MessageCircle,
    label: '채팅',
    path: '/social?tab=chat',
    color: 'var(--color-error)',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bookings, isLoading } = useMyBookingsQuery();

  // Get upcoming bookings (CONFIRMED status and future date)
  const upcomingBookings = bookings?.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.bookingDate) >= new Date()
  );

  return (
    <AppLayout showLogo>
      <Container className="py-4 md:py-6 space-y-6">
        {/* Welcome Banner */}
        <GlassCard className="relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[var(--color-text-tertiary)] text-sm">
              안녕하세요
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              {user?.name || '골퍼'}님
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-2">
              오늘도 좋은 라운드 되세요!
            </p>
            <Button className="mt-4" onClick={() => navigate('/search')}>
              <Search className="w-4 h-4" />
              골프장 찾기
            </Button>
          </div>
          {/* Decorative background */}
          <div className="absolute -right-8 -bottom-8 text-8xl opacity-10">
            🏌️
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">빠른 메뉴</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="glass-card-hover flex flex-col items-center gap-2 p-4"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${action.color}20` }}
                >
                  <action.icon
                    className="w-6 h-6"
                    style={{ color: action.color }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">다가오는 예약</h2>
            <button
              onClick={() => navigate('/my-bookings')}
              className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              전체보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
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
                title="예정된 예약이 없습니다"
                description="새로운 라운드를 예약해보세요"
                actionLabel="예약하기"
                onAction={() => navigate('/search')}
              />
            </GlassCard>
          )}
        </div>
      </Container>
    </AppLayout>
  );
}

// Upcoming booking card component
interface UpcomingBookingCardProps {
  booking: BookingResponse;
  onClick: () => void;
}

function UpcomingBookingCard({ booking, onClick }: UpcomingBookingCardProps) {
  const bookingDate = new Date(booking.bookingDate);
  const isToday = new Date().toDateString() === bookingDate.toDateString();

  // Get course name - combine front and back nine if available
  const courseName =
    booking.frontNineCourseName && booking.backNineCourseName
      ? `${booking.frontNineCourseName} / ${booking.backNineCourseName}`
      : booking.frontNineCourseName || booking.gameName || '';

  return (
    <button onClick={onClick} className="w-full text-left">
      <GlassCard hoverable className="flex items-center gap-4">
        {/* Date badge */}
        <div
          className={cn(
            'flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0',
            isToday
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
          )}
        >
          <span className="text-xs font-medium">
            {bookingDate.toLocaleDateString('ko-KR', { month: 'short' })}
          </span>
          <span className="text-xl font-bold">{bookingDate.getDate()}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {booking.clubName || '골프장'}
          </h3>
          <p className="text-sm text-[var(--color-text-tertiary)] truncate">
            {courseName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {booking.startTime.slice(0, 5)}
            </span>
            <span>{booking.playerCount}명</span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)] flex-shrink-0" />
      </GlassCard>
    </button>
  );
}
