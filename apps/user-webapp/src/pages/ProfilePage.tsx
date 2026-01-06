import { User, Mail, Phone, Calendar, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export const ProfilePage = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 프로필 헤더 */}
      <div className="glass-card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{user?.name || '사용자'}</h1>
            <p className="text-white/60 text-sm">{user?.email || '-'}</p>
          </div>
        </div>
      </div>

      {/* 계정 정보 */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 bg-white/10 border-b border-white/20">
          <h2 className="font-semibold text-white">계정 정보</h2>
        </div>

        <div className="divide-y divide-white/10">
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60">이메일</p>
              <p className="font-medium text-white">{user?.email || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60">전화번호</p>
              <p className="font-medium text-white">{user?.phoneNumber || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-10 h-10 rounded-full bg-purple-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60">가입일</p>
              <p className="font-medium text-white">{formatDate(user?.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 bg-white/10 border-b border-white/20">
          <h2 className="font-semibold text-white">설정</h2>
        </div>

        <div className="divide-y divide-white/10">
          <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/10 transition-colors">
            <span className="text-white/90">알림 설정</span>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/10 transition-colors">
            <span className="text-white/90">개인정보 처리방침</span>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/10 transition-colors">
            <span className="text-white/90">이용약관</span>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>
        </div>
      </div>

      {/* 로그아웃 버튼 */}
      <Button
        onClick={handleLogout}
        variant="glass"
        className="w-full py-3 text-red-300 border-red-400/30 hover:bg-red-500/20"
      >
        <LogOut className="w-5 h-5 mr-2" />
        로그아웃
      </Button>

      {/* 앱 버전 */}
      <p className="text-center text-sm text-white/40">
        버전 1.0.0
      </p>
    </div>
  );
};
