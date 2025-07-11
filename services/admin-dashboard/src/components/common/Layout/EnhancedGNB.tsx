import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navigationConfig, quickAccessItems, getRecentPages, getFavorites, toggleFavorite, isFavorite, addRecentPage } from './navigation';
import { UserDropdown } from './UserDropdown';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import type { NavigationItem, NavigationGroup } from './navigation';

interface EnhancedGNBProps {
  currentUser: { username: string; email: string };
  onLogout: () => void;
  children: React.ReactNode;
}

export const EnhancedGNB: React.FC<EnhancedGNBProps> = ({ currentUser, onLogout, children }) => {
  const location = useLocation();
  const { hasPermission } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NavigationItem[]>([]);
  const [recentPages, setRecentPages] = useState<NavigationItem[]>([]);
  const [favorites, setFavorites] = useState<NavigationItem[]>([]);

  // 권한 기반 네비게이션 필터링
  const filterNavigationByPermission = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      // 권한이 설정되지 않은 항목은 모두 표시
      if (!item.permission) return true;
      // 권한이 있는 항목만 표시
      return hasPermission(item.permission as any);
    });
  };

  const filterGroupsByPermission = (groups: NavigationGroup[]): NavigationGroup[] => {
    return groups.map(group => ({
      ...group,
      items: filterNavigationByPermission(group.items)
    })).filter(group => group.items.length > 0); // 빈 그룹은 제거
  };

  const filteredNavigationConfig = filterGroupsByPermission(navigationConfig);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    setRecentPages(getRecentPages());
    setFavorites(getFavorites());
  }, []);

  // 권한 변경 시 collapsed 상태 재설정
  useEffect(() => {
    const initialCollapsed: Record<string, boolean> = {};
    filteredNavigationConfig.forEach(group => {
      if (group.collapsible) {
        initialCollapsed[group.name] = !group.defaultOpen;
      }
    });
    setCollapsedGroups(initialCollapsed);
  }, [hasPermission]);

  // 현재 페이지 정보를 최근 방문에 추가
  useEffect(() => {
    const currentPage = findCurrentPage(location.pathname);
    if (currentPage) {
      addRecentPage(currentPage);
      setRecentPages(getRecentPages());
    }
  }, [location.pathname]);

  // 현재 페이지 찾기
  const findCurrentPage = (pathname: string): NavigationItem | null => {
    for (const group of filteredNavigationConfig) {
      for (const item of group.items) {
        if (item.href === pathname) return item;
        if (item.children) {
          const found = item.children.find(child => child.href === pathname);
          if (found) return found;
        }
      }
    }
    return null;
  };

  // 검색 기능
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results: NavigationItem[] = [];
      filteredNavigationConfig.forEach(group => {
        group.items.forEach(item => {
          if (item.name.toLowerCase().includes(query.toLowerCase()) || 
              item.description?.toLowerCase().includes(query.toLowerCase())) {
            results.push(item);
          }
          if (item.children) {
            item.children.forEach(child => {
              if (child.name.toLowerCase().includes(query.toLowerCase()) || 
                  child.description?.toLowerCase().includes(query.toLowerCase())) {
                results.push(child);
              }
            });
          }
        });
      });
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // 그룹 토글
  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = (item: NavigationItem) => {
    toggleFavorite(item);
    setFavorites(getFavorites());
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case 'b':
            e.preventDefault();
            window.location.href = '/bookings';
            break;
          // 더 많은 단축키 추가 가능
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const SidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* 브랜드 */}
        <div className="flex items-center flex-shrink-0 px-4 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">
            🏌️ 파크골프 관리
          </h1>
        </div>

        {/* 빠른 액세스 */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              빠른 액세스
            </h3>
            <button
              onClick={() => setShowQuickAccess(!showQuickAccess)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className={`w-4 h-4 transform transition-transform ${showQuickAccess ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {showQuickAccess && (
            <div className="grid grid-cols-2 gap-2">
              {quickAccessItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 즐겨찾기 */}
        {favorites.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              즐겨찾기
            </h3>
            <div className="space-y-1">
              {favorites.map((item) => (
                <div key={item.href} className="flex items-center group">
                  <Link
                    to={item.href}
                    className="flex-1 flex items-center px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <span className="mr-2 text-sm">{item.icon}</span>
                    {item.name}
                  </Link>
                  <button
                    onClick={() => handleToggleFavorite(item)}
                    className="opacity-0 group-hover:opacity-100 text-yellow-500 hover:text-yellow-600 p-1"
                  >
                    ⭐
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메인 네비게이션 */}
        <nav className="flex-1 px-2 space-y-2">
          {filteredNavigationConfig.map((group) => (
            <div key={group.name}>
              {group.collapsible ? (
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100 rounded"
                >
                  <div className="flex items-center">
                    {group.icon && <span className="mr-2">{group.icon}</span>}
                    {group.name}
                  </div>
                  <svg className={`w-4 h-4 transform transition-transform ${collapsedGroups[group.name] ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {group.name}
                </div>
              )}
              
              {(!group.collapsible || !collapsedGroups[group.name]) && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const isFav = isFavorite(item.href);
                    
                    return (
                      <div key={item.href} className="flex items-center group">
                        <Link
                          to={item.href}
                          className={`flex-1 flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-500'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          title={item.description}
                        >
                          <span className="mr-3 text-lg">{item.icon}</span>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                          {item.shortcut && (
                            <span className="ml-2 text-xs text-gray-400">
                              {item.shortcut}
                            </span>
                          )}
                        </Link>
                        <button
                          onClick={() => handleToggleFavorite(item)}
                          className={`opacity-0 group-hover:opacity-100 p-1 ${isFav ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
                        >
                          {isFav ? '⭐' : '☆'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 최근 방문 */}
        {recentPages.length > 0 && (
          <div className="px-4 mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              최근 방문
            </h3>
            <div className="space-y-1">
              {recentPages.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  <span className="mr-2 text-sm">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 사이드바 */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* 데스크톱 사이드바 */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* 향상된 GNB */}
        <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex-1 flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
            {/* 좌측 영역 */}
            <div className="flex items-center space-x-4">
              {/* 모바일 메뉴 버튼 */}
              <button
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>

              {/* 브랜드 (모바일) */}
              <div className="md:hidden">
                <h1 className="text-lg font-semibold text-gray-900">🏌️ 파크골프</h1>
              </div>

              {/* 향상된 검색 */}
              <div className="hidden md:block relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="검색... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* 검색 결과 드롭다운 */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      {searchResults.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <span className="mr-3">{item.icon}</span>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500">{item.description}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우측 영역 */}
            <div className="flex items-center space-x-4">
              {/* 알림 */}
              <div className="relative">
                <button 
                  className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a4 4 0 01-4-4V7a7 7 0 1114 0v6a4 4 0 01-4 4z" />
                  </svg>
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
                </button>

                {/* 알림 드롭다운 */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">알림</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <div className="font-medium">새로운 예약이 있습니다</div>
                          <div className="text-xs text-gray-500">5분 전</div>
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <div className="font-medium">시스템 백업이 완료되었습니다</div>
                          <div className="text-xs text-gray-500">1시간 전</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 사용자 드롭다운 */}
              <UserDropdown 
                currentUser={currentUser} 
                onLogout={onLogout} 
              />
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 bg-gray-50">
          <div className="py-6">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};