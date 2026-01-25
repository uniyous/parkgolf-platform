import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { ShieldAlert, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const SKIP_STORAGE_KEY = 'passwordChangeSkippedAt';
const SKIP_DURATION_DAYS = 7;

export interface PasswordChangeReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysSinceChange: number | null;
}

// 7일 이내에 스킵했는지 확인
export function hasRecentlySkipped(): boolean {
  const skippedAt = localStorage.getItem(SKIP_STORAGE_KEY);
  if (!skippedAt) return false;

  const skippedDate = new Date(skippedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - skippedDate.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays < SKIP_DURATION_DAYS;
}

// 스킵 기록 저장
function saveSkipTimestamp(): void {
  localStorage.setItem(SKIP_STORAGE_KEY, new Date().toISOString());
}

// 스킵 기록 삭제 (비밀번호 변경 후 호출)
export function clearSkipTimestamp(): void {
  localStorage.removeItem(SKIP_STORAGE_KEY);
}

export const PasswordChangeReminderModal: React.FC<PasswordChangeReminderModalProps> = ({
  open,
  onOpenChange,
  daysSinceChange,
}) => {
  const navigate = useNavigate();

  const handleChangeNow = () => {
    onOpenChange(false);
    navigate('/change-password');
  };

  const handleLater = () => {
    saveSkipTimestamp();
    onOpenChange(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        {/* Overlay */}
        <AlertDialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Content */}
        <AlertDialog.Content
          className={cn(
            'fixed z-50 w-[calc(100%-2rem)] max-w-md',
            'bottom-4 left-1/2 -translate-x-1/2',
            'sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2',
            'glass-card p-6 rounded-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4',
            'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
            'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
            'duration-200'
          )}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-amber-500/20">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <AlertDialog.Title className="text-xl font-bold text-white text-center mb-2">
            비밀번호 변경 권장
          </AlertDialog.Title>

          {/* Description */}
          <AlertDialog.Description className="text-sm text-white/70 text-center mb-6">
            마지막 비밀번호 변경 후{' '}
            <span className="text-amber-400 font-semibold">
              {daysSinceChange}일
            </span>
            이 지났습니다.
            <br />
            보안을 위해 비밀번호를 변경해 주세요.
          </AlertDialog.Description>

          {/* Info Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-6">
            <Lock className="w-5 h-5 text-white/50" />
            <p className="text-sm text-white/60">
              정기적인 비밀번호 변경은 계정 보안에 도움이 됩니다.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <AlertDialog.Action asChild>
              <button
                onClick={handleChangeNow}
                className={cn(
                  'w-full py-3.5 text-sm font-semibold rounded-xl',
                  'bg-gradient-to-r from-green-500 to-emerald-500',
                  'text-white transition-all',
                  'hover:from-green-600 hover:to-emerald-600',
                  'focus:outline-none focus:ring-2 focus:ring-green-500/50'
                )}
              >
                지금 변경하기
              </button>
            </AlertDialog.Action>
            <AlertDialog.Cancel asChild>
              <button
                onClick={handleLater}
                className={cn(
                  'w-full py-3 text-sm font-medium rounded-xl',
                  'bg-white/10 text-white/70',
                  'hover:bg-white/20 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-white/30'
                )}
              >
                나중에 하기
              </button>
            </AlertDialog.Cancel>
          </div>

          {/* Skip Info */}
          <p className="text-xs text-white/40 text-center mt-4">
            "나중에 하기"를 선택하면 7일 동안 이 알림이 표시되지 않습니다.
          </p>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

export default PasswordChangeReminderModal;
