import { Sparkles } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, SectionHeader, LoadingView } from '@/components/ui';
import {
  useAgentMemoryQuery,
  useUpdateAgentMemoryMutation,
} from '@/hooks/queries/settings';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/**
 * AI 비서 메모리 프라이버시 설정 (UNI-20)
 *
 * - AI가 사용자 부킹 패턴/선호도를 기억하고 추천에 활용할지 ON/OFF
 * - OFF 시 user_memory.enabled=false → LLM prefill 미적용 (일반 흐름)
 *
 * 백엔드: agent_db.user_memory.enabled (Phase 3 — Semantic Memory)
 */
export function AgentMemorySettingsPage() {
  const { data, isLoading, isError } = useAgentMemoryQuery();
  const updateMutation = useUpdateAgentMemoryMutation();

  const handleToggle = (next: boolean) => {
    updateMutation.mutate(next, {
      onSuccess: () => {
        showSuccessToast(next ? 'AI 메모리 사용을 켰어요' : 'AI 메모리 사용을 껐어요');
      },
      onError: () => {
        showErrorToast('변경에 실패했어요. 잠시 후 다시 시도해 주세요.');
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="AI 메모리 설정">
        <LoadingView />
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout title="AI 메모리 설정">
        <Container className="py-4">
          <GlassCard className="text-center">
            <p className="text-[var(--color-error)] mb-2">설정을 불러오는데 실패했습니다.</p>
            <p className="text-sm text-[var(--color-text-muted)]">잠시 후 다시 시도해주세요.</p>
          </GlassCard>
        </Container>
      </AppLayout>
    );
  }

  const enabled = data.enabled;
  const disabled = updateMutation.isPending;

  return (
    <AppLayout title="AI 메모리 설정">
      <Container className="py-4">
        <SectionHeader title="AI 비서 메모리" className="mb-2 px-1" />
        <p className="px-1 mb-3 text-sm text-[var(--color-text-muted)]">
          자주 가는 골프장, 함께하는 멤버, 선호 시간대를 기억해서 더 빠른 추천을 받을 수 있어요.
        </p>

        <GlassCard className="mt-4">
          <div className="flex items-center gap-4 py-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/10">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">개인화 추천 사용</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                "지난번처럼" 같은 표현이나 한 마디로 부킹 가능
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={disabled}
              onClick={() => handleToggle(!enabled)}
              className={cn(
                'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                enabled ? 'bg-[var(--color-primary)]' : 'bg-white/20',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 mt-1',
                  enabled ? 'translate-x-6 ml-0' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        </GlassCard>

        {data.hasMemory && enabled && data.summary && (
          <GlassCard className="mt-4">
            <SectionHeader title="현재 기억 중인 내용" />
            <p className="text-sm text-white/80 mt-2 whitespace-pre-line">{data.summary}</p>
            <div className="mt-3 text-xs text-[var(--color-text-muted)]">
              {data.favoriteClubsCount != null && (
                <span>자주 가는 클럽 {data.favoriteClubsCount}곳 · </span>
              )}
              {data.frequentTeammatesCount != null && (
                <span>자주 함께하는 멤버 {data.frequentTeammatesCount}명</span>
              )}
            </div>
          </GlassCard>
        )}

        <div className="mt-4 text-xs text-[var(--color-text-muted)] px-2">
          <p>• OFF로 두시면 AI가 과거 부킹 패턴을 추천에 사용하지 않습니다.</p>
          <p>• 계정 삭제 시 메모리 데이터도 함께 삭제됩니다.</p>
        </div>
      </Container>
    </AppLayout>
  );
}
