import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  FileText,
  HelpCircle,
  Settings,
  CalendarCheck,
  CreditCard,
  KeyRound,
  UserX,
  Megaphone,
  MessageSquare,
  Moon,
  Globe,
  Star,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, SectionHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-4 hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className={danger ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}>
          {icon}
        </span>
        <span className={danger ? 'text-[var(--color-error)]' : 'text-white'}>{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
    </button>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get avatar initial from user name
  const avatarInitial = (user?.name || '사용자').charAt(0).toUpperCase();

  return (
    <AppLayout title="마이페이지">
      <Container className="py-4 md:py-6 space-y-6">
        {/* Profile Header */}
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-2xl font-bold text-white">{avatarInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">
                {user?.name || '사용자'}
              </h1>
              <p className="text-[var(--color-text-tertiary)] text-sm truncate">
                {user?.email || '-'}
              </p>
              {/* Membership Badge */}
              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[var(--color-warning)]/20">
                <Star className="w-3 h-3 text-[var(--color-warning)]" />
                <span className="text-xs font-medium text-[var(--color-warning)]">일반 회원</span>
              </div>
            </div>
            <button
              onClick={() => {/* TODO: Edit profile */}}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              편집
            </button>
          </div>
        </GlassCard>

        {/* Account Information */}
        <div>
          <SectionHeader title="내 정보" icon={User} className="mb-3 px-1" />
          <GlassCard padding="none" className="overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="icon-container icon-container-md" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                  <Mail className="w-5 h-5 text-[var(--color-info)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-tertiary)]">이메일</p>
                  <p className="font-medium text-white truncate">{user?.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-4 py-4">
                <div className="icon-container icon-container-md" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                  <Phone className="w-5 h-5 text-[var(--color-success)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-tertiary)]">전화번호</p>
                  <p className="font-medium text-white">{user?.phoneNumber || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-4 py-4">
                <div className="icon-container icon-container-md" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-tertiary)]">가입일</p>
                  <p className="font-medium text-white">{formatDate(user?.createdAt)}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Account Menu */}
        <div>
          <SectionHeader title="계정" icon={User} className="mb-3 px-1" />
          <GlassCard padding="none" className="overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              <MenuItem
                icon={<CalendarCheck className="w-5 h-5" />}
                label="예약 내역"
                onClick={() => navigate('/my-bookings')}
              />
              <MenuItem
                icon={<CreditCard className="w-5 h-5" />}
                label="결제 수단"
                onClick={() => navigate('/payment-methods')}
              />
              <MenuItem
                icon={<KeyRound className="w-5 h-5" />}
                label="비밀번호 변경"
                onClick={() => navigate('/change-password')}
              />
              <MenuItem
                icon={<UserX className="w-5 h-5" />}
                label="계정 삭제"
                onClick={() => navigate('/delete-account')}
                danger
              />
            </div>
          </GlassCard>
        </div>

        {/* App Settings */}
        <div>
          <SectionHeader title="앱 설정" icon={Settings} className="mb-3 px-1" />
          <GlassCard padding="none" className="overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              <MenuItem
                icon={<Bell className="w-5 h-5" />}
                label="알림 설정"
                onClick={() => navigate('/settings/notifications')}
              />
              <MenuItem
                icon={<Moon className="w-5 h-5" />}
                label="테마"
                onClick={() => navigate('/settings/theme')}
              />
              <MenuItem
                icon={<Globe className="w-5 h-5" />}
                label="언어"
                onClick={() => navigate('/settings/language')}
              />
            </div>
          </GlassCard>
        </div>

        {/* Support */}
        <div>
          <SectionHeader title="지원" icon={HelpCircle} className="mb-3 px-1" />
          <GlassCard padding="none" className="overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              <MenuItem
                icon={<Megaphone className="w-5 h-5" />}
                label="공지사항"
                onClick={() => navigate('/announcements')}
              />
              <MenuItem
                icon={<MessageSquare className="w-5 h-5" />}
                label="자주 묻는 질문"
                onClick={() => navigate('/faq')}
              />
              <MenuItem
                icon={<Mail className="w-5 h-5" />}
                label="문의하기"
                onClick={() => navigate('/contact')}
              />
              <MenuItem
                icon={<FileText className="w-5 h-5" />}
                label="이용약관"
                onClick={() => navigate('/terms')}
              />
              <MenuItem
                icon={<Shield className="w-5 h-5" />}
                label="개인정보 처리방침"
                onClick={() => navigate('/privacy')}
              />
            </div>
          </GlassCard>
        </div>

        {/* Logout */}
        <GlassCard padding="none" className="overflow-hidden">
          <MenuItem
            icon={<LogOut className="w-5 h-5" />}
            label="로그아웃"
            onClick={handleLogout}
            danger
          />
        </GlassCard>

        {/* App Version */}
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          버전 1.0.0
        </p>
      </Container>
    </AppLayout>
  );
}
