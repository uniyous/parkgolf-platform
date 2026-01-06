import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Calendar, LogOut, ChevronDown, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // /search 페이지가 아닐 때만 뒤로가기 버튼 표시
  const showBackButton = location.pathname !== '/search';

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
  };

  const handleNavigate = (path: string) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-emerald-900/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-lg md:max-w-3xl xl:max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 왼쪽: 뒤로가기 + 로고 */}
        <div className="flex items-center gap-2">
          {/* 뒤로가기 버튼 (SearchPage 제외) */}
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {/* 로고 */}
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🏌️</span>
            <span className="font-bold text-lg text-white">Parkgolf</span>
          </button>
        </div>

        {/* 사용자 메뉴 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white/90 max-w-[80px] truncate">
              {user?.name || '사용자'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-white/70 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* 드롭다운 메뉴 */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => handleNavigate('/my-bookings')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  isActive('/my-bookings') ? 'text-emerald-600 bg-emerald-50' : 'text-gray-700'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">내 예약</span>
              </button>

              <button
                onClick={() => handleNavigate('/profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  isActive('/profile') ? 'text-emerald-600 bg-emerald-50' : 'text-gray-700'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">프로필</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
