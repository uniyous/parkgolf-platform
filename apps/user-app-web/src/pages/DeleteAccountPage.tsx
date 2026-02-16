import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Clock,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button } from '@/components/ui';
import {
  useDeletionStatusQuery,
  useRequestDeletionMutation,
  useCancelDeletionMutation,
  useLogoutMutation,
} from '@/hooks/queries/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const DELETION_REASONS = [
  '더 이상 서비스를 이용하지 않아요',
  '다른 계정을 사용할 거예요',
  '개인정보가 걱정돼요',
  '서비스에 불만이 있어요',
  '기타',
];

export function DeleteAccountPage() {
  const navigate = useNavigate();
  const { data: status, isLoading } = useDeletionStatusQuery();
  const requestMutation = useRequestDeletionMutation();
  const cancelMutation = useCancelDeletionMutation();
  const logoutMutation = useLogoutMutation();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const canSubmit = password && confirmed;

  const handleRequestDeletion = async () => {
    if (!canSubmit) return;

    try {
      await requestMutation.mutateAsync({
        password,
        reason: reason || undefined,
      });
      showSuccessToast('계정 삭제가 요청되었습니다. 7일 후 삭제됩니다.');
      // 삭제 요청 시 로그아웃
      await logoutMutation.mutateAsync();
      navigate('/login');
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message || '계정 삭제 요청에 실패했습니다.';
      showErrorToast(message);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelMutation.mutateAsync();
      showSuccessToast('계정 삭제가 취소되었습니다.');
    } catch {
      showErrorToast('계정 삭제 취소에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="계정 삭제">
        <Container className="py-4 md:py-6">
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        </Container>
      </AppLayout>
    );
  }

  // 유예 기간 중인 경우
  if (status?.isDeletionRequested) {
    return (
      <AppLayout title="계정 삭제">
        <Container className="py-4 md:py-6 space-y-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--color-warning)]" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">삭제 예정</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  계정 삭제가 진행 중입니다
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-secondary)]">요청일</span>
                <span className="text-white">
                  {status.deletionRequestedAt
                    ? new Date(status.deletionRequestedAt).toLocaleDateString('ko-KR')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-secondary)]">삭제 예정일</span>
                <span className="text-white">
                  {status.deletionScheduledAt
                    ? new Date(status.deletionScheduledAt).toLocaleDateString('ko-KR')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[var(--color-text-secondary)]">남은 기간</span>
                <span className="text-[var(--color-warning)] font-bold text-lg">
                  D-{status.daysRemaining}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 mb-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                삭제 예정일까지 로그인하거나 아래 버튼을 누르면 삭제가 취소됩니다.
              </p>
            </div>
          </GlassCard>

          <Button
            className="w-full"
            onClick={handleCancelDeletion}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? '취소 중...' : '계정 삭제 취소'}
          </Button>

          <button
            onClick={() => navigate('/profile')}
            className="w-full text-center text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors py-2"
          >
            돌아가기
          </button>
        </Container>
      </AppLayout>
    );
  }

  // 삭제 요청 폼
  return (
    <AppLayout title="계정 삭제">
      <Container className="py-4 md:py-6 space-y-4">
        {/* 경고 안내 */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
            <h3 className="font-semibold text-[var(--color-error)]">주의사항</h3>
          </div>
          <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <WarningItem text="계정 삭제 요청 후 7일의 유예 기간이 있습니다" />
            <WarningItem text="유예 기간 내 로그인하면 삭제가 자동 취소됩니다" />
            <WarningItem text="삭제 후 예약 내역, 채팅, 친구 등 모든 데이터가 삭제됩니다" />
            <WarningItem text="삭제된 계정은 복구할 수 없습니다" />
          </div>
        </GlassCard>

        {/* 삭제 사유 */}
        <GlassCard>
          <h3 className="font-semibold text-white mb-3">삭제 사유 (선택)</h3>
          <div className="space-y-2">
            {DELETION_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  reason === r
                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                    : 'bg-[var(--color-bg-tertiary)] border border-transparent hover:border-[var(--color-border)]'
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
                <span className="text-sm text-white">{r}</span>
              </label>
            ))}
          </div>
        </GlassCard>

        {/* 비밀번호 확인 */}
        <GlassCard>
          <h3 className="font-semibold text-white mb-3">본인 확인</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            계정 삭제를 위해 비밀번호를 입력해 주세요.
          </p>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="input-glass"
              style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </GlassCard>

        {/* 최종 확인 */}
        <label className="flex items-start gap-3 px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-[var(--color-error)] flex-shrink-0"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            위 내용을 확인했으며, 계정 삭제를 요청합니다. 7일 후 모든 데이터가 영구
            삭제됨을 이해합니다.
          </span>
        </label>

        {/* 삭제 요청 버튼 */}
        <Button
          variant="destructive"
          className="w-full"
          disabled={!canSubmit || requestMutation.isPending}
          onClick={handleRequestDeletion}
        >
          {requestMutation.isPending ? '처리 중...' : '계정 삭제 요청'}
        </Button>

        <button
          onClick={() => navigate('/profile')}
          className="w-full text-center text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors py-2"
        >
          돌아가기
        </button>
      </Container>
    </AppLayout>
  );
}

function WarningItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <ShieldAlert className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}
