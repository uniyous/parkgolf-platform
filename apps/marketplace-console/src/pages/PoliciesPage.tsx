import React, { useState } from 'react';
import { CancellationPolicySettings } from '@/components/features/settings/CancellationPolicySettings';
import { RefundPolicySettings } from '@/components/features/settings/RefundPolicySettings';
import { NoShowPolicySettings } from '@/components/features/settings/NoShowPolicySettings';
import { OperatingPolicySettings } from '@/components/features/settings/OperatingPolicySettings';
import { PageLayout } from '@/components/layout';

type PolicyTab = 'cancellation' | 'refund' | 'noshow' | 'operating';

interface Tab {
  id: PolicyTab;
  label: string;
  icon: string;
}

const policyTabs: Tab[] = [
  { id: 'cancellation', label: '취소 정책', icon: '🚫' },
  { id: 'refund', label: '환불 정책', icon: '💰' },
  { id: 'noshow', label: '노쇼 정책', icon: '⚠️' },
  { id: 'operating', label: '운영 정책', icon: '⚙️' },
];

export const PoliciesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PolicyTab>('cancellation');

  const renderContent = () => {
    switch (activeTab) {
      case 'cancellation':
        return <CancellationPolicySettings />;
      case 'refund':
        return <RefundPolicySettings />;
      case 'noshow':
        return <NoShowPolicySettings />;
      case 'operating':
        return <OperatingPolicySettings />;
      default:
        return null;
    }
  };

  return (
    <PageLayout>
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📋</span> 정책 관리
        </h1>
        <p className="text-white/50 mt-1">
          플랫폼 기본 정책을 설정합니다. 가맹점/클럽에서 별도 설정하지 않으면 이 정책이 적용됩니다.
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
        <div className="flex gap-2 px-6 pt-5 pb-4 border-b border-white/15">
          {policyTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === tab.id
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

        <div className="p-6">{renderContent()}</div>
      </div>
    </PageLayout>
  );
};

export default PoliciesPage;
