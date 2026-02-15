import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useRefundPolicyResolveQuery,
  useCreateRefundPolicyMutation,
  useUpdateRefundPolicyMutation,
  useDeleteRefundPolicyMutation,
} from '@/hooks/queries';
import type { RefundPolicy, RefundRateTier, ResolvedRefundPolicy } from '@/types/settings';
import { DEFAULT_REFUND_TIERS } from '@/types/settings';
import { PolicyInheritanceBadge } from './PolicyInheritanceBadge';

const defaultPolicy: RefundPolicy = {
  name: '기본 환불 정책',
  code: 'DEFAULT_REFUND',
  description: '기본 환불 정책입니다.',
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
  const [inherited, setInherited] = useState(false);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);

  const { data: resolvedPolicy, isLoading } = useRefundPolicyResolveQuery();
  const createMutation = useCreateRefundPolicyMutation();
  const updateMutation = useUpdateRefundPolicyMutation();
  const deleteMutation = useDeleteRefundPolicyMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (resolvedPolicy) {
      const resolved = resolvedPolicy as ResolvedRefundPolicy;
      const mapped: RefundPolicy = {
        ...resolved,
        tiers: resolved.tiers?.length ? resolved.tiers : DEFAULT_REFUND_TIERS,
      };
      setPolicy(mapped);
      setOriginalPolicy(mapped);
      setInherited(resolved.inherited ?? false);
      setInheritedFrom(resolved.inheritedFrom ?? null);
    }
  }, [resolvedPolicy]);

  const handleSave = async () => {
    try {
      if (!inherited && policy.id) {
        await updateMutation.mutateAsync({
          id: policy.id,
          data: {
            name: policy.name,
            description: policy.description,
            adminCancelRefundRate: policy.adminCancelRefundRate,
            minRefundAmount: policy.minRefundAmount,
            refundFee: policy.refundFee,
            isActive: policy.isActive,
            tiers: policy.tiers,
          },
        });
      } else {
        await createMutation.mutateAsync({
          ...policy,
          scopeLevel: 'COMPANY',
          isDefault: true,
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save refund policy:', error);
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleCustomize = () => {
    setIsEditing(true);
  };

  const handleRevert = async () => {
    if (!policy.id || !inherited) return;
    try {
      await deleteMutation.mutateAsync(policy.id);
    } catch (error) {
      console.error('Failed to revert policy:', error);
      toast.error('되돌리기에 실패했습니다.');
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
    if (rate >= 80) return 'bg-green-500/20 text-green-400';
    if (rate >= 50) return 'bg-yellow-500/20 text-yellow-400';
    if (rate > 0) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
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
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
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
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-white">환불율 구간 설정</h3>
              <p className="text-sm text-white/50">예약일 기준 취소 시점별 환불율</p>
            </div>
            <PolicyInheritanceBadge inherited={inherited} inheritedFrom={inheritedFrom} />
          </div>
          <div className="flex items-center gap-2">
            {policy.isActive ? (
              <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                활성
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white/60 rounded">
                비활성
              </span>
            )}
            {!isEditing && inherited && (
              <button
                onClick={handleCustomize}
                className="px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                독립 설정
              </button>
            )}
            {!isEditing && !inherited && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-white/5 rounded-lg transition-colors"
                >
                  수정
                </button>
                {policy.scopeLevel !== 'PLATFORM' && policy.id && (
                  <button
                    onClick={handleRevert}
                    className="px-3 py-1.5 text-sm font-medium text-orange-400 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    되돌리기
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left font-medium text-white/70">취소 시점</th>
                  <th className="px-4 py-3 text-left font-medium text-white/70">라벨</th>
                  <th className="px-4 py-3 text-center font-medium text-white/70">환불율</th>
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
                    <td className="px-4 py-3 text-white/60">
                      {isEditing ? (
                        <input
                          type="text"
                          value={tier.label || ''}
                          onChange={(e) => updateTier(index, 'label', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-white/15 rounded bg-white/5 text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      ) : (
                        tier.label || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={tier.refundRate}
                            onChange={(e) => updateTier(index, 'refundRate', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center border border-white/15 rounded bg-white/5 text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <span className="text-white/60">%</span>
                        </div>
                      ) : (
                        <span className={`px-3 py-1 text-sm font-medium rounded ${getRefundRateColor(tier.refundRate)}`}>
                          {tier.refundRate}%
                        </span>
                      )}
                    </td>
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
                  <div key={index} className="flex-1 flex flex-col items-center">
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
                  onChange={(e) => setPolicy({ ...policy, adminCancelRefundRate: Number(e.target.value) })}
                  className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                />
                <span className="text-white/60">%</span>
              </div>
            ) : (
              <span className="px-4 py-2 bg-green-500/20 text-green-400 font-medium rounded-lg">
                {policy.adminCancelRefundRate}%
              </span>
            )}
          </div>

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
                  onChange={(e) => setPolicy({ ...policy, minRefundAmount: Number(e.target.value) })}
                  className="w-28 px-3 py-2 text-right border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                />
                <span className="text-white/60">원</span>
              </div>
            ) : (
              <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                {policy.minRefundAmount.toLocaleString()}원
              </span>
            )}
          </div>

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
                  className="w-28 px-3 py-2 text-right border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                />
                <span className="text-white/60">원</span>
              </div>
            ) : (
              <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                {policy.refundFee.toLocaleString()}원
              </span>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="px-6 py-4 bg-white/5 border-t border-white/15 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-white/70 bg-white/10 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : inherited ? '독립 정책 생성' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefundPolicySettings;
