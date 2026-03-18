import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useRefundPolicyResolveQuery,
  useCreateRefundPolicyMutation,
  useUpdateRefundPolicyMutation,
} from '@/hooks/queries';
import type { RefundPolicy, RefundRateTier } from '@/types/settings';
import { DEFAULT_REFUND_TIERS } from '@/types/settings';

// 기본 환불 정책 설정 (폴백용)
const defaultPolicy: RefundPolicy = {
  name: '기본 환불 정책',
  code: 'DEFAULT_REFUND',
  description: '모든 골프장에 적용되는 기본 환불 정책입니다.',
  tiers: DEFAULT_REFUND_TIERS,
  adminCancelRefundRate: 100,
  minRefundAmount: 0,
  refundFee: 0,
  isDefault: true,
  isActive: true,
};

export const RefundPolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<RefundPolicy>(defaultPolicy);
  const [originalPolicy, setOriginalPolicy] = useState<RefundPolicy>(defaultPolicy);
  const [isEditing, setIsEditing] = useState(false);

  const { data: apiPolicy, isLoading } = useRefundPolicyResolveQuery();
  const createMutation = useCreateRefundPolicyMutation();
  const updateMutation = useUpdateRefundPolicyMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (apiPolicy) {
      setPolicy(apiPolicy);
      setOriginalPolicy(apiPolicy);
    }
  }, [apiPolicy]);

  const handleSave = async () => {
    try {
      if (policy.id) {
        await updateMutation.mutateAsync({
          id: policy.id,
          data: {
            name: policy.name,
            description: policy.description,
            tiers: policy.tiers,
            adminCancelRefundRate: policy.adminCancelRefundRate,
            minRefundAmount: policy.minRefundAmount,
            refundFee: policy.refundFee,
            isActive: policy.isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          ...policy,
          scopeLevel: 'PLATFORM',
          isDefault: true,
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save refund policy:', error);
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setPolicy(originalPolicy);
    setIsEditing(false);
  };

  const updateTier = (index: number, field: keyof RefundRateTier, value: number | string) => {
    const newTiers = [...policy.tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setPolicy({ ...policy, tiers: newTiers });
  };

  const hoursToDisplay = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return '무제한';
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}일`;
    }
    return `${hours}시간`;
  };

  const getRefundRateColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-500/20 text-green-700';
    if (rate >= 50) return 'bg-yellow-500/20 text-yellow-700';
    if (rate > 0) return 'bg-orange-500/20 text-orange-700';
    return 'bg-red-500/20 text-red-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-white/60">정책을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 정책 개요 */}
      <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-xl">
            💰
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">환불 정책 안내</h3>
            <p className="text-sm text-white/60 mt-1">
              예약 취소 시점에 따른 환불율을 설정합니다.
              취소 시점이 예약일에 가까울수록 환불율이 낮아집니다.
            </p>
          </div>
        </div>
      </div>

      {/* 환불율 구간 설정 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">환불율 구간 설정</h3>
            <p className="text-sm text-white/50">예약일 기준 취소 시점별 환불율</p>
          </div>
          <div className="flex items-center gap-2">
            {policy.isActive ? (
              <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-700 rounded">
                활성
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white/60 rounded">
                비활성
              </span>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
              >
                수정
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* 환불율 구간 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left font-medium text-white/70">취소 시점</th>
                  <th className="px-4 py-3 text-left font-medium text-white/70">설명</th>
                  <th className="px-4 py-3 text-center font-medium text-white/70">환불율</th>
                  {isEditing && (
                    <th className="px-4 py-3 text-center font-medium text-white/70">수정</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {policy.tiers.map((tier, index) => (
                  <tr key={index} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">
                        {tier.maxHoursBefore === null || tier.maxHoursBefore === undefined
                          ? `${hoursToDisplay(tier.minHoursBefore)} 이상`
                          : `${hoursToDisplay(tier.minHoursBefore)} ~ ${hoursToDisplay(tier.maxHoursBefore)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{tier.label}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={tier.refundRate}
                            onChange={(e) =>
                              updateTier(index, 'refundRate', Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 text-center border border-white/15 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <span className="text-white/60">%</span>
                        </div>
                      ) : (
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded ${getRefundRateColor(tier.refundRate)}`}
                        >
                          {tier.refundRate}%
                        </span>
                      )}
                    </td>
                    {isEditing && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          value={tier.label || ''}
                          onChange={(e) => updateTier(index, 'label', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-white/15 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 환불율 시각화 */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <h4 className="text-sm font-medium text-white/70 mb-3">환불율 미리보기</h4>
            <div className="flex items-end gap-2 h-32">
              {policy.tiers
                .slice()
                .reverse()
                .map((tier, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        tier.refundRate >= 80
                          ? 'bg-green-400'
                          : tier.refundRate >= 50
                          ? 'bg-yellow-400'
                          : tier.refundRate > 0
                          ? 'bg-orange-400'
                          : 'bg-red-400'
                      }`}
                      style={{ height: `${tier.refundRate}%` }}
                    />
                    <div className="text-xs text-white/60 mt-2 text-center">
                      <div className="font-medium">{tier.refundRate}%</div>
                      <div className="text-white/40">
                        {tier.maxHoursBefore === null || tier.maxHoursBefore === undefined
                          ? `${hoursToDisplay(tier.minHoursBefore)}+`
                          : hoursToDisplay(tier.minHoursBefore)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 추가 설정 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">추가 설정</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* 관리자 취소 시 환불율 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-white">관리자/시스템 취소 시 환불율</label>
              <p className="text-sm text-white/50">관리자 또는 시스템에 의한 취소 시 환불율</p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={policy.adminCancelRefundRate}
                  onChange={(e) =>
                    setPolicy({ ...policy, adminCancelRefundRate: Number(e.target.value) })
                  }
                  className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <span className="text-white/60">%</span>
              </div>
            ) : (
              <span className="px-4 py-2 bg-green-500/20 text-green-700 font-medium rounded-lg">
                {policy.adminCancelRefundRate}%
              </span>
            )}
          </div>

          {/* 최소 환불 금액 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-white">최소 환불 금액</label>
              <p className="text-sm text-white/50">환불 금액이 이 금액 미만이면 환불하지 않음</p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={policy.minRefundAmount}
                  onChange={(e) =>
                    setPolicy({ ...policy, minRefundAmount: Number(e.target.value) })
                  }
                  className="w-28 px-3 py-2 text-right border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <span className="text-white/60">원</span>
              </div>
            ) : (
              <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                {policy.minRefundAmount.toLocaleString()}원
              </span>
            )}
          </div>

          {/* 환불 수수료 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-white">환불 수수료 (고정)</label>
              <p className="text-sm text-white/50">환불 처리 시 공제되는 고정 수수료</p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={policy.refundFee}
                  onChange={(e) => setPolicy({ ...policy, refundFee: Number(e.target.value) })}
                  className="w-28 px-3 py-2 text-right border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <span className="text-white/60">원</span>
              </div>
            ) : (
              <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                {policy.refundFee.toLocaleString()}원
              </span>
            )}
          </div>

          {/* 활성화 상태 */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              <label className="font-medium text-white">정책 활성화</label>
              <p className="text-sm text-white/50">비활성화 시 기본 정책이 적용됩니다</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.isActive}
                onChange={(e) =>
                  isEditing && setPolicy({ ...policy, isActive: e.target.checked })
                }
                disabled={!isEditing}
                className="sr-only peer"
              />
              <div className={`
                w-11 h-6 rounded-full peer
                peer-focus:ring-4 peer-focus:ring-green-100
                peer-checked:after:translate-x-full
                after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                ${policy.isActive ? 'bg-green-500' : 'bg-white/30'}
                ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
              `} />
            </label>
          </div>
        </div>

        {/* 저장/취소 버튼 */}
        {isEditing && (
          <div className="px-6 py-4 bg-white/5 border-t border-white/15 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-white/70 bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      {/* 환불 계산 예시 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">환불 금액 계산 예시</h3>
          <p className="text-sm text-white/50">결제 금액 50,000원 기준</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {policy.tiers.map((tier, index) => {
              const paymentAmount = 50000;
              const refundAmount = Math.floor(paymentAmount * (tier.refundRate / 100)) - policy.refundFee;
              const finalRefund = Math.max(refundAmount, 0);

              return (
                <div key={index} className="p-4 bg-white/5 rounded-lg">
                  <div className="text-sm text-white/50">{tier.label}</div>
                  <div className="mt-2">
                    <span className={`text-lg font-bold ${tier.refundRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {finalRefund.toLocaleString()}원
                    </span>
                    <span className="text-sm text-white/40 ml-1">환불</span>
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    ({tier.refundRate}% 적용)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicySettings;
