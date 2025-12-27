import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { menuConfig, getFavorites, toggleFavorite, isFavorite } from './SideBarMenu';
import { UserMenu } from './UserMenu';
import type { MenuItem } from './SideBarMenu';

interface MainLayoutProps {
  currentUser: { username: string; email: string; role?: string; company?: string };
  onLogout: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentUser, onLogout, children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [favorites, setFavorites] = useState<MenuItem[]>([]);

  // 메뉴 필터링 (권한 기반 - 현재는 모든 권한 허용)
  const filteredMenuConfig = useMemo(() => {
    return menuConfig.filter(group => group.items.length > 0);
  }, []);

  // 초기화
  useEffect(() => {
    setFavorites(getFavorites());

    const initialCollapsed: Record<string, boolean> = {};
    filteredMenuConfig.forEach(group => {
      if (group.collapsible) {
        initialCollapsed[group.name] = !group.defaultOpen;
      }
    });
    setCollapsedGroups(initialCollapsed);
  }, [filteredMenuConfig]);

  // 검색 기능
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results: MenuItem[] = [];
      filteredMenuConfig.forEach(group => {
        group.items.forEach(item => {
          if (item.name.toLowerCase().includes(query.toLowerCase())) {
            results.push(item);
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
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = (item: MenuItem) => {
    toggleFavorite(item);
    setFavorites(getFavorites());
  };

  // 키보드 단축키 (Ctrl+K: 검색)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 사이드바 컨텐츠
  const SidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* 브랜드 */}
        <div className="flex items-center flex-shrink-0 px-4 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">파크골프 관리</h1>
        </div>

        {/* 즐겨찾기 */}
        {favorites.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">즐겨찾기</h3>
            <div className="space-y-1">
              {favorites.map((item) => (
                <div key={item.href} className="flex items-center group">
                  <Link to={item.href} className="flex-1 flex items-center px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                    <span className="mr-2 text-sm">{item.icon}</span>
                    {item.name}
                  </Link>
                  <button onClick={() => handleToggleFavorite(item)} className="opacity-0 group-hover:opacity-100 text-yellow-500 hover:text-yellow-600 p-1">
                    ★
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메인 네비게이션 */}
        <nav className="flex-1 px-2 space-y-2">
          {filteredMenuConfig.map((group) => (
            <div key={group.name}>
              {group.collapsible ? (
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100 rounded"
                >
                  <span>{group.name}</span>
                  <svg className={`w-4 h-4 transition-transform ${collapsedGroups[group.name] ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.name}</div>
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
                            isActive ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          title={item.description}
                        >
                          <span className="mr-3 text-lg">{item.icon}</span>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                        </Link>
                        <button
                          onClick={() => handleToggleFavorite(item)}
                          className={`opacity-0 group-hover:opacity-100 p-1 ${isFav ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
                        >
                          {isFav ? '★' : '☆'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
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
            <button className="absolute top-0 right-0 -mr-12 pt-2 h-10 w-10 flex items-center justify-center" onClick={() => setSidebarOpen(false)}>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex justify-between items-center px-4 sm:px-6 h-16">
            {/* 좌측: 모바일 메뉴 + 검색 */}
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden" onClick={() => setSidebarOpen(true)}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
              <div className="md:hidden">
                <h1 className="text-lg font-semibold text-gray-900">파크골프</h1>
              </div>

              {/* 검색 */}
              <div className="hidden md:block relative">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="검색... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    {searchResults.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      >
                        <span className="mr-3">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 사용자 */}
            <UserMenu currentUser={currentUser} onLogout={onLogout} />
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 bg-gray-50">
          <div className="h-full p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
