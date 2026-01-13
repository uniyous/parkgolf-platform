import React, { useState } from 'react';
import { CancellationPolicySettings } from '@/components/features/settings/CancellationPolicySettings';
import { RefundPolicySettings } from '@/components/features/settings/RefundPolicySettings';
import { NoShowPolicySettings } from '@/components/features/settings/NoShowPolicySettings';

// 카테고리 정의
type CategoryId = 'booking-policy' | 'notification' | 'general';

interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  description: string;
  isReady: boolean;
}

const categories: Category[] = [
  {
    id: 'booking-policy',
    label: '예약 정책',
    icon: '📋',
    description: '취소/환불/노쇼 정책',
    isReady: true,
  },
  {
    id: 'notification',
    label: '알림 설정',
    icon: '🔔',
    description: '알림 채널 및 템플릿',
    isReady: false,
  },
  {
    id: 'general',
    label: '일반 설정',
    icon: '⚙️',
    description: '운영/휴일/기타 설정',
    isReady: false,
  },
];

// 예약 정책 서브탭
type BookingPolicyTab = 'cancellation' | 'refund' | 'noshow';

interface SubTab {
  id: BookingPolicyTab;
  label: string;
  icon: string;
}

const bookingPolicyTabs: SubTab[] = [
  { id: 'cancellation', label: '취소 정책', icon: '🚫' },
  { id: 'refund', label: '환불 정책', icon: '💰' },
  { id: 'noshow', label: '노쇼 정책', icon: '⚠️' },
];

export const SystemSettingsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('booking-policy');
  const [activeBookingTab, setActiveBookingTab] = useState<BookingPolicyTab>('cancellation');

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'booking-policy':
        return (
          <div className="space-y-4">
            {/* 서브 탭 */}
            <div className="flex gap-2 border-b border-gray-200 pb-4">
              {bookingPolicyTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveBookingTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${
                      activeBookingTab === tab.id
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 서브 탭 컨텐츠 */}
            <div>
              {activeBookingTab === 'cancellation' && <CancellationPolicySettings />}
              {activeBookingTab === 'refund' && <RefundPolicySettings />}
              {activeBookingTab === 'noshow' && <NoShowPolicySettings />}
            </div>
          </div>
        );

      case 'notification':
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">알림 설정</h3>
            <p className="text-gray-500 mb-4 max-w-md">
              예약 확인, 리마인더, 취소/환불 알림 등<br />
              다양한 알림 채널과 템플릿을 설정할 수 있습니다.
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              준비 중
            </span>
            <div className="mt-8 text-left bg-gray-50 rounded-lg p-4 max-w-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">예정 기능:</p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• 예약 알림 (확인/리마인더)</li>
                <li>• 취소/환불 알림</li>
                <li>• 마케팅 알림</li>
                <li>• 채널 설정 (이메일/SMS/푸시/카카오)</li>
              </ul>
            </div>
          </div>
        );

      case 'general':
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">⚙️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">일반 설정</h3>
            <p className="text-gray-500 mb-4 max-w-md">
              운영 시간, 휴일 관리 등<br />
              시스템 전반의 설정을 관리합니다.
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              준비 중
            </span>
            <div className="mt-8 text-left bg-gray-50 rounded-lg p-4 max-w-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">예정 기능:</p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• 운영 시간 설정</li>
                <li>• 휴일/공휴일 관리</li>
                <li>• 시스템 점검 설정</li>
                <li>• 기타 환경 설정</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentCategory = categories.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>⚙️</span> 시스템 설정
            </h1>
            <p className="text-gray-500 mt-1">
              예약 정책, 알림, 시스템 설정을 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 좌측 카테고리 + 우측 컨텐츠 */}
      <div className="flex gap-6">
        {/* 좌측 카테고리 사이드바 */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
              카테고리
            </h2>
            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => category.isReady && setActiveCategory(category.id)}
                  disabled={!category.isReady}
                  className={`
                    w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all
                    ${
                      activeCategory === category.id
                        ? 'bg-green-50 border-2 border-green-500'
                        : category.isReady
                        ? 'hover:bg-gray-50 border-2 border-transparent'
                        : 'opacity-60 cursor-not-allowed border-2 border-transparent'
                    }
                  `}
                >
                  <span className="text-xl mt-0.5">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          activeCategory === category.id ? 'text-green-700' : 'text-gray-900'
                        }`}
                      >
                        {category.label}
                      </span>
                      {!category.isReady && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">
                          준비중
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {category.description}
                    </p>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 우측 컨텐츠 영역 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-gray-200">
            {/* 컨텐츠 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentCategory?.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentCategory?.label}
                  </h2>
                  <p className="text-sm text-gray-500">{currentCategory?.description}</p>
                </div>
              </div>
            </div>

            {/* 컨텐츠 본문 */}
            <div className="p-6">{renderCategoryContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
