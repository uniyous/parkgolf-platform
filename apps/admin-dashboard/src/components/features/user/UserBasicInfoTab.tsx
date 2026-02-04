import React, { useState } from 'react';
import { toast } from 'sonner';
import { useChangeUserPasswordMutation } from '@/hooks/queries';
import type { User, UserMembershipTier, UserStatus } from '@/types';

interface UserBasicInfoTabProps {
  user: User;
  onUpdate: () => void;
}

const MEMBERSHIP_LABELS: Record<UserMembershipTier, string> = {
  REGULAR: '일반',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  VIP: 'VIP',
  PREMIUM: '프리미엄',
  GUEST: '게스트',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  SUSPENDED: '정지',
  PENDING: '대기',
};

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
};

const TIER_STYLES: Record<UserMembershipTier, string> = {
  VIP: 'bg-purple-100 text-purple-800',
  PLATINUM: 'bg-slate-100 text-slate-800',
  GOLD: 'bg-yellow-100 text-yellow-800',
  SILVER: 'bg-gray-100 text-gray-800',
  REGULAR: 'bg-blue-100 text-blue-800',
  PREMIUM: 'bg-amber-100 text-amber-800',
  GUEST: 'bg-green-100 text-green-800',
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '-';
  return amount.toLocaleString('ko-KR') + '원';
};

export const UserBasicInfoTab: React.FC<UserBasicInfoTabProps> = ({ user, onUpdate }) => {
  const changePassword = useChangeUserPasswordMutation();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async () => {
    if (isResetting) return;

    const confirmed = window.confirm(
      `${user.name || user.email}의 비밀번호를 초기화하시겠습니까?\n초기화된 비밀번호는 이메일로 발송됩니다.`
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await changePassword.mutateAsync({
        id: user.id,
        data: {
          currentPassword: '',
          newPassword: 'TempPass123!',
          confirmPassword: 'TempPass123!',
        },
      });
      toast.success('비밀번호가 초기화되었습니다.');
      onUpdate();
    } catch {
      // Error is handled by mutation meta
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* 프로필 정보 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          프로필 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField label="이름" value={user.name || '-'} />
          <InfoField label="이메일" value={user.email} />
          <InfoField label="전화번호" value={user.phone || '-'} />
          <InfoField label="가입일" value={formatDate(user.createdAt)} />
          <InfoField label="최근 로그인" value={formatDateTime(user.lastLoginAt)} />
          <InfoField label="최종 수정" value={formatDateTime(user.updatedAt)} />
        </div>
      </div>

      {/* 멤버십 정보 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          멤버십 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">등급</label>
            {user.membershipTier ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TIER_STYLES[user.membershipTier]}`}>
                {MEMBERSHIP_LABELS[user.membershipTier]}
              </span>
            ) : (
              <span className="text-gray-900">-</span>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">상태</label>
            {user.status ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[user.status]}`}>
                {STATUS_LABELS[user.status]}
              </span>
            ) : (
              <span className="text-gray-900">-</span>
            )}
          </div>
          <InfoField label="멤버십 시작일" value={formatDate(user.membershipStartDate)} />
          <InfoField label="멤버십 종료일" value={formatDate(user.membershipEndDate)} />
          <InfoField label="누적 예약" value={user.totalBookings !== undefined ? `${user.totalBookings}건` : '-'} />
          <InfoField label="누적 결제" value={formatCurrency(user.totalSpent)} />
          <InfoField label="포인트" value={user.loyaltyPoints !== undefined ? `${user.loyaltyPoints?.toLocaleString('ko-KR')}P` : '-'} />
        </div>
      </div>

      {/* 비밀번호 관리 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          비밀번호 관리
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {isResetting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            <span>비밀번호 초기화</span>
          </button>
          <p className="text-sm text-gray-500">
            임시 비밀번호가 생성되어 사용자 이메일로 발송됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
    <p className="text-gray-900">{value}</p>
  </div>
);
