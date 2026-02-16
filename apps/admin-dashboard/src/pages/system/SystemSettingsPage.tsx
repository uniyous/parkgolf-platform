import React, { useState } from 'react';
import { CancellationPolicySettings } from '@/components/features/settings/CancellationPolicySettings';
import { RefundPolicySettings } from '@/components/features/settings/RefundPolicySettings';
import { NoShowPolicySettings } from '@/components/features/settings/NoShowPolicySettings';
import { OperatingPolicySettings } from '@/components/features/settings/OperatingPolicySettings';
import { PageLayout } from '@/components/layout';

type CategoryId = 'booking-policy' | 'operating' | 'notification';

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
    id: 'operating',
    label: '운영 정책',
    icon: '⚙️',
    description: '운영 시간/라운드/가격 설정',
    isReady: true,
  },
  {
    id: 'notification',
    label: '알림 설정',
    icon: '🔔',
    description: '알림 채널 및 템플릿',
    isReady: false,
  },
];

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
            <div className="flex gap-2 border-b border-white/15 pb-4">
              {bookingPolicyTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveBookingTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${
                      activeBookingTab === tab.id
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white/10 text-white/60 hover:bg-white/15'
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div>
              {activeBookingTab === 'cancellation' && <CancellationPolicySettings />}
              {activeBookingTab === 'refund' && <RefundPolicySettings />}
              {activeBookingTab === 'noshow' && <NoShowPolicySettings />}
            </div>
          </div>
        );

      case 'operating':
        return <OperatingPolicySettings />;

      case 'notification':
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">알림 설정</h3>
            <p className="text-white/50 mb-4 max-w-md">
              예약 확인, 리마인더, 취소/환불 알림 등<br />
              다양한 알림 채널과 템플릿을 설정할 수 있습니다.
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-300">
              준비 중
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  const currentCategory = categories.find((c) => c.id === activeCategory);

  return (
    <PageLayout>
      {/* 헤더 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>⚙️</span> 시스템 설정
            </h1>
            <p className="text-white/50 mt-1">
              예약 정책, 운영 설정, 알림을 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex gap-6">
        {/* 좌측 카테고리 사이드바 */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4 sticky top-6">
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">
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
                        ? 'bg-green-500/10 border-2 border-green-500'
                        : category.isReady
                        ? 'hover:bg-white/5 border-2 border-transparent'
                        : 'opacity-60 cursor-not-allowed border-2 border-transparent'
                    }
                  `}
                >
                  <span className="text-xl mt-0.5">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          activeCategory === category.id ? 'text-green-700' : 'text-white'
                        }`}
                      >
                        {category.label}
                      </span>
                      {!category.isReady && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/15 text-white/50">
                          준비중
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 truncate">
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
          <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
            <div className="px-6 py-4 border-b border-white/15 bg-white/5 rounded-t-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentCategory?.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {currentCategory?.label}
                  </h2>
                  <p className="text-sm text-white/50">{currentCategory?.description}</p>
                </div>
              </div>
            </div>

            <div className="p-6">{renderCategoryContent()}</div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SystemSettingsPage;
