import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Users,
  ChevronRight,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, LoadingView, EmptyState, Button } from '@/components/ui';
import { useClubDetailQuery } from '@/hooks/queries/club';
import { useGamesByClubQuery } from '@/hooks/queries/club';
import type { Game } from '@/lib/api/gameApi';

export function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clubId = Number(id);

  const { data: club, isLoading: isLoadingClub, error: clubError } = useClubDetailQuery(clubId);
  const { data: games, isLoading: isLoadingGames } = useGamesByClubQuery(clubId);

  if (isLoadingClub) {
    return (
      <AppLayout title="골프장 정보">
        <Container className="py-4 md:py-6">
          <LoadingView message="골프장 정보를 불러오는 중..." />
        </Container>
      </AppLayout>
    );
  }

  if (clubError || !club) {
    return (
      <AppLayout title="골프장 정보">
        <Container className="py-4 md:py-6">
          <GlassCard>
            <EmptyState
              icon={MapPin}
              title="골프장을 찾을 수 없습니다"
              description="요청한 골프장 정보를 불러올 수 없습니다"
              actionLabel="홈으로"
              onAction={() => navigate('/')}
            />
          </GlassCard>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={club.name}>
      <Container className="py-4 md:py-6 space-y-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        {/* Club Info Header */}
        <GlassCard>
          <div className="space-y-4">
            {/* Club Name & Type */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                  {club.clubType === 'PUBLIC' ? '퍼블릭' : club.clubType === 'PRIVATE' ? '프라이빗' : club.clubType}
                </span>
                {club.status === 'ACTIVE' && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)]">
                    영업중
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white">{club.name}</h1>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{club.address}</span>
            </div>

            {/* Phone */}
            {club.phone && (
              <a
                href={`tel:${club.phone}`}
                className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{club.phone}</span>
              </a>
            )}

            {/* Website */}
            {club.website && (
              <a
                href={club.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span>웹사이트 방문</span>
              </a>
            )}

            {/* Operating Hours */}
            {club.operatingHours && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{club.operatingHours.open} ~ {club.operatingHours.close}</span>
              </div>
            )}

            {/* Course / Hole Count */}
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <Layers className="w-4 h-4" />
                코스 {club.totalCourses}개
              </span>
              <span>홀 {club.totalHoles}개</span>
            </div>

            {/* Facilities */}
            {club.facilities && club.facilities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {club.facilities.map((facility) => (
                  <span
                    key={facility}
                    className="px-2.5 py-1 text-xs rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                  >
                    {facility}
                  </span>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Games Section */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">라운드 예약</h2>

          {isLoadingGames ? (
            <LoadingView size="sm" message="게임 목록을 불러오는 중..." />
          ) : games && games.length > 0 ? (
            <div className="space-y-3">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onBook={() => navigate(`/bookings?search=${encodeURIComponent(club.name)}`)}
                />
              ))}
            </div>
          ) : (
            <GlassCard>
              <EmptyState
                icon={Layers}
                title="등록된 게임이 없습니다"
                description="현재 예약 가능한 라운드가 없습니다"
              />
            </GlassCard>
          )}
        </div>
      </Container>
    </AppLayout>
  );
}

interface GameCardProps {
  game: Game;
  onBook: () => void;
}

function GameCard({ game, onBook }: GameCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-semibold text-white">{game.name}</h3>

          {/* Course Info */}
          <p className="text-sm text-[var(--color-text-secondary)]">
            전반 {game.frontNineCourseName} / 후반 {game.backNineCourseName}
          </p>

          {/* Details */}
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {game.estimatedDuration}분
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              최대 {game.maxPlayers}명
            </span>
            <span>{game.totalHoles}홀</span>
          </div>

          {/* Price */}
          <p className="text-[var(--color-primary)] font-semibold">
            {formatPrice(game.basePrice)}원
            {game.weekendPrice && game.weekendPrice !== game.basePrice && (
              <span className="text-xs text-[var(--color-text-muted)] font-normal ml-2">
                주말 {formatPrice(game.weekendPrice)}원
              </span>
            )}
          </p>
        </div>

        {/* Book Button */}
        <Button
          size="sm"
          onClick={onBook}
          className="flex-shrink-0"
        >
          예약하기
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </GlassCard>
  );
}
