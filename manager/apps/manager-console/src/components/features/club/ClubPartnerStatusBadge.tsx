import React from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useMyPartnerConfigQuery } from '@/hooks/queries/partner';

/**
 * ClubListPage의 클럽 카드에 표시되는 파트너 연동 상태 배지.
 * bookingMode=PARTNER인 클럽에만 의미가 있고, 그 외에는 null 반환.
 *
 * 표시 규칙
 *   정상   파트너 활성 + 마지막 sync가 syncIntervalMin*2 안
 *   지연   activeBut 마지막 sync가 너무 오래됨
 *   미설정 partnerConfig 없음
 *   비활성 partnerConfig.isActive=false
 */
export const ClubPartnerStatusBadge: React.FC<{
  clubId: number;
  bookingMode?: string | null;
}> = ({ clubId, bookingMode }) => {
  const enabled = bookingMode === 'PARTNER';
  const { data: config, isLoading } = useMyPartnerConfigQuery(clubId, { enabled });

  if (!enabled) return null;
  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/40">
        …
      </span>
    );
  }
  if (!config) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/40">
        <WifiOff className="w-3 h-3 mr-1" />
        미설정
      </span>
    );
  }
  if (!config.isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400">
        <WifiOff className="w-3 h-3 mr-1" />
        비활성
      </span>
    );
  }

  const lastSync = config.lastSlotSyncAt ? new Date(config.lastSlotSyncAt).getTime() : null;
  const overdue =
    !lastSync || Date.now() - lastSync > config.syncIntervalMin * 2 * 60_000;
  const failed = config.lastSlotSyncStatus === 'FAILED';

  if (failed) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400">
        <AlertTriangle className="w-3 h-3 mr-1" />
        동기화 실패
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-500/15 text-yellow-400">
        <AlertTriangle className="w-3 h-3 mr-1" />
        지연
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-400">
      <Wifi className="w-3 h-3 mr-1" />
      정상
    </span>
  );
};
