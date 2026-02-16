import {
  Bell,
  CalendarCheck,
  MessageCircle,
  Users,
  Tag,
  Megaphone,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, SectionHeader, LoadingView } from '@/components/ui';
import {
  useNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
} from '@/hooks/queries/settings';
import type { UpdateNotificationSettings } from '@/lib/api/settingsApi';
import { showErrorToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, title, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/10">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--color-primary)]' : 'bg-white/20',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 mt-1',
            checked ? 'translate-x-6 ml-0' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

export function NotificationSettingsPage() {
  const { data: settings, isLoading, isError } = useNotificationSettingsQuery();
  const updateMutation = useUpdateNotificationSettingsMutation();

  const handleToggle = (key: keyof UpdateNotificationSettings, value: boolean) => {
    updateMutation.mutate(
      { [key]: value },
      {
        onError: () => {
          showErrorToast('알림 설정 변경에 실패했습니다.');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <AppLayout title="알림 설정">
        <LoadingView />
      </AppLayout>
    );
  }

  if (isError || !settings) {
    return (
      <AppLayout title="알림 설정">
        <Container className="py-4">
          <GlassCard className="text-center">
            <p className="text-[var(--color-error)] mb-2">설정을 불러오는데 실패했습니다.</p>
            <p className="text-sm text-[var(--color-text-muted)]">잠시 후 다시 시도해주세요.</p>
          </GlassCard>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="알림 설정">
      <Container className="py-4 md:py-6 space-y-4">
        {/* 안내 카드 */}
        <GlassCard>
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <h3 className="font-semibold text-white">알림 설정</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                원하는 알림을 선택하여 관리하세요
              </p>
            </div>
          </div>
        </GlassCard>

        {/* 서비스 알림 */}
        <div>
          <SectionHeader title="서비스 알림" icon={Bell} className="mb-3 px-1" />
          <GlassCard>
            <div className="divide-y divide-[var(--color-border)]">
              <ToggleRow
                icon={<CalendarCheck className="w-5 h-5 text-[var(--color-primary)]" />}
                title="예약 알림"
                description="예약 확정, 취소, 리마인더"
                checked={settings.booking}
                onChange={(v) => handleToggle('booking', v)}
                disabled={updateMutation.isPending}
              />
              <ToggleRow
                icon={<MessageCircle className="w-5 h-5 text-[var(--color-info)]" />}
                title="채팅 알림"
                description="새 메시지 알림"
                checked={settings.chat}
                onChange={(v) => handleToggle('chat', v)}
                disabled={updateMutation.isPending}
              />
              <ToggleRow
                icon={<Users className="w-5 h-5 text-[var(--color-warning)]" />}
                title="친구 알림"
                description="친구 요청, 수락 알림"
                checked={settings.friend}
                onChange={(v) => handleToggle('friend', v)}
                disabled={updateMutation.isPending}
              />
            </div>
          </GlassCard>
        </div>

        {/* 마케팅 알림 */}
        <div>
          <SectionHeader title="마케팅" icon={Megaphone} className="mb-3 px-1" />
          <GlassCard>
            <ToggleRow
              icon={<Tag className="w-5 h-5 text-[var(--color-warning)]" />}
              title="마케팅 알림"
              description="이벤트, 프로모션 정보"
              checked={settings.marketing}
              onChange={(v) => handleToggle('marketing', v)}
              disabled={updateMutation.isPending}
            />
          </GlassCard>
        </div>
      </Container>
    </AppLayout>
  );
}
