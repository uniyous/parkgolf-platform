import React from 'react';
import { Settings, Bell, Calendar, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

// ===== Component =====

export const SystemSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">시스템 설정</h1>
        <p className="mt-1 text-sm text-white/50">
          플랫폼 전체 설정을 관리합니다
        </p>
      </div>

      {/* 기본 설정 */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            <CardTitle>기본 설정</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">플랫폼 이름</p>
                <p className="text-xs text-white/40">대시보드에 표시되는 플랫폼 이름</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                ParkMate Platform
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">기본 언어</p>
                <p className="text-xs text-white/40">시스템 기본 표시 언어</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                한국어
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">시간대</p>
                <p className="text-xs text-white/40">예약 및 로그 시간 표시 기준</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                Asia/Seoul (UTC+9)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 예약 정책 */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-400" />
            <CardTitle>예약 정책</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">최대 예약 가능 일수</p>
                <p className="text-xs text-white/40">오늘부터 예약 가능한 최대 일수</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                30일
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">취소 가능 기한</p>
                <p className="text-xs text-white/40">예약일 기준 취소 가능한 최소 기한</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                2일 전
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">최대 동시 예약 수</p>
                <p className="text-xs text-white/40">사용자당 보유 가능한 최대 예약 건수</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                5건
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">노쇼 페널티</p>
                <p className="text-xs text-white/40">노쇼 시 적용되는 제재 정책</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/60">
                3회 누적 시 7일 이용 제한
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <CardTitle>알림 설정</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">예약 확정 알림</p>
                <p className="text-xs text-white/40">예약 확정 시 사용자에게 푸시 알림 발송</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-emerald-500/60 p-0.5">
                <div className="h-5 w-5 translate-x-5 rounded-full bg-white shadow transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">예약 리마인더</p>
                <p className="text-xs text-white/40">예약일 하루 전 리마인더 발송</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-emerald-500/60 p-0.5">
                <div className="h-5 w-5 translate-x-5 rounded-full bg-white shadow transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">취소 알림</p>
                <p className="text-xs text-white/40">예약 취소 시 이메일 알림 발송</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-emerald-500/60 p-0.5">
                <div className="h-5 w-5 translate-x-5 rounded-full bg-white shadow transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">시스템 점검 알림</p>
                <p className="text-xs text-white/40">시스템 점검 시 전체 사용자 공지</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-white/20 p-0.5">
                <div className="h-5 w-5 rounded-full bg-white/60 shadow transition-transform" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보안 설정 placeholder */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-400" />
            <CardTitle>보안 설정</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-white/30">
            보안 설정 기능은 추후 업데이트 예정입니다
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
