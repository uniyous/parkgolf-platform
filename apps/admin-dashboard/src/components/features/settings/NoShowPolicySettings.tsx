import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useNoShowPolicyResolveQuery,
  useCreateNoShowPolicyMutation,
  useUpdateNoShowPolicyMutation,
  useDeleteNoShowPolicyMutation,
} from '@/hooks/queries';
import type { NoShowPolicy, NoShowPenalty, NoShowPenaltyType, ResolvedNoShowPolicy } from '@/types/settings';
import { DEFAULT_NOSHOW_PENALTIES } from '@/types/settings';
import { PolicyInheritanceBadge } from './PolicyInheritanceBadge';

const defaultPolicy: NoShowPolicy = {
  name: '기본 노쇼 정책',
  code: 'DEFAULT_NOSHOW',
  description: '기본 노쇼 정책입니다.',
  allowRefundOnNoShow: false,
  noShowGraceMinutes: 30,
  penalties: DEFAULT_NOSHOW_PENALTIES,
  countResetDays: 180,
  isDefault: true,
  isActive: true,
};

const penaltyTypeLabels: Record<NoShowPenaltyType, { label: string; color: string; icon: string }> = {
  WARNING: { label: '경고', color: 'bg-yellow-500/20 text-yellow-400', icon: '⚠️' },
  RESTRICTION: { label: '예약 제한', color: 'bg-orange-500/20 text-orange-400', icon: '🚫' },
  BLACKLIST: { label: '블랙리스트', color: 'bg-red-500/20 text-red-400', icon: '🔒' },
  FEE: { label: '위약금', color: 'bg-purple-500/20 text-purple-400', icon: '💸' },
};

export const NoShowPolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<NoShowPolicy>(defaultPolicy);
  const [originalPolicy, setOriginalPolicy] = useState<NoShowPolicy>(defaultPolicy);
  const [isEditing, setIsEditing] = useState(false);
  const [inherited, setInherited] = useState(false);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);

  const { data: resolvedPolicy, isLoading } = useNoShowPolicyResolveQuery();
  const createMutation = useCreateNoShowPolicyMutation();
  const updateMutation = useUpdateNoShowPolicyMutation();
  const deleteMutation = useDeleteNoShowPolicyMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (resolvedPolicy) {
      const resolved = resolvedPolicy as ResolvedNoShowPolicy;
      const mapped: NoShowPolicy = {
        ...resolved,
        penalties: resolved.penalties?.length ? resolved.penalties : DEFAULT_NOSHOW_PENALTIES,
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
            allowRefundOnNoShow: policy.allowRefundOnNoShow,
            noShowGraceMinutes: policy.noShowGraceMinutes,
            countResetDays: policy.countResetDays,
            isActive: policy.isActive,
            penalties: policy.penalties,
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
      console.error('Failed to save no-show policy:', error);
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

  const updatePenalty = (index: number, field: keyof NoShowPenalty, value: unknown) => {
    const newPenalties = [...policy.penalties];
    newPenalties[index] = { ...newPenalties[index], [field]: value };
    setPolicy({ ...policy, penalties: newPenalties });
  };

  const addPenalty = () => {
    const newPenalty: NoShowPenalty = {
      minCount: 1,
      penaltyType: 'WARNING',
      label: '새 페널티',
      message: '',
    };
    setPolicy({ ...policy, penalties: [...policy.penalties, newPenalty] });
  };

  const removePenalty = (index: number) => {
    const newPenalties = policy.penalties.filter((_, i) => i !== index);
    setPolicy({ ...policy, penalties: newPenalties });
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
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">
            ⚠️
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">노쇼 정책 안내</h3>
            <p className="text-sm text-white/60 mt-1">
              예약 시간에 방문하지 않은 고객(노쇼)에 대한 페널티 정책을 설정합니다.
              노쇼 횟수에 따라 경고, 예약 제한, 블랙리스트 등의 제재를 적용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 기본 설정 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-white">노쇼 기본 설정</h3>
              <p className="text-sm text-white/50">노쇼 판정 기준 및 기본 규칙</p>
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

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-white">노쇼 판정 유예 시간</label>
              <p className="text-sm text-white/50">예약 시간 경과 후 몇 분까지 도착 대기</p>
            </div>
            {isEditing ? (
              <select
                value={policy.noShowGraceMinutes}
                onChange={(e) => setPolicy({ ...policy, noShowGraceMinutes: Number(e.target.value) })}
                className="px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
              >
                <option value={10}>10분</option>
                <option value={15}>15분</option>
                <option value={20}>20분</option>
                <option value={30}>30분</option>
                <option value={45}>45분</option>
                <option value={60}>60분</option>
              </select>
            ) : (
              <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                {policy.noShowGraceMinutes}분
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-white">노쇼 시 환불 허용</label>
              <p className="text-sm text-white/50">노쇼 처리된 예약에 대해 환불을 허용합니다</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.allowRefundOnNoShow}
                onChange={(e) => isEditing && setPolicy({ ...policy, allowRefundOnNoShow: e.target.checked })}
                disabled={!isEditing}
                className="sr-only peer"
              />
              <div className={`
                w-11 h-6 rounded-full peer
                peer-focus:ring-4 peer-focus:ring-green-100
                peer-checked:after:translate-x-full
                after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                ${policy.allowRefundOnNoShow ? 'bg-green-500' : 'bg-white/30'}
                ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
              `} />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-white">노쇼 카운트 리셋 기간</label>
              <p className="text-sm text-white/50">이 기간이 지나면 노쇼 횟수가 초기화됩니다</p>
            </div>
            {isEditing ? (
              <select
                value={policy.countResetDays}
                onChange={(e) => setPolicy({ ...policy, countResetDays: Number(e.target.value) })}
                className="px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
              >
                <option value={30}>30일</option>
                <option value={60}>60일</option>
                <option value={90}>90일</option>
                <option value={180}>180일 (6개월)</option>
                <option value={365}>365일 (1년)</option>
              </select>
            ) : (
              <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                {policy.countResetDays}일
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 페널티 설정 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">페널티 단계 설정</h3>
            <p className="text-sm text-white/50">노쇼 횟수에 따른 제재 단계</p>
          </div>
          {isEditing && (
            <button
              onClick={addPenalty}
              className="px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              + 페널티 추가
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {policy.penalties.map((penalty, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-white/10 border-white/15 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${penaltyTypeLabels[penalty.penaltyType]?.color || 'bg-white/10'}`}>
                      {penaltyTypeLabels[penalty.penaltyType]?.icon || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-3">
                          <select
                            value={penalty.penaltyType}
                            onChange={(e) => updatePenalty(index, 'penaltyType', e.target.value as NoShowPenaltyType)}
                            className="px-3 py-1.5 text-sm border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                          >
                            <option value="WARNING">경고</option>
                            <option value="RESTRICTION">예약 제한</option>
                            <option value="BLACKLIST">블랙리스트</option>
                            <option value="FEE">위약금</option>
                          </select>

                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-white/60">노쇼</span>
                            <input
                              type="number"
                              min={1}
                              value={penalty.minCount}
                              onChange={(e) => updatePenalty(index, 'minCount', Number(e.target.value))}
                              className="w-12 px-2 py-1 text-center border border-white/15 rounded bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-white/60">회 이상</span>
                          </div>

                          {penalty.penaltyType === 'RESTRICTION' && (
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="number"
                                min={1}
                                value={penalty.restrictionDays || 7}
                                onChange={(e) => updatePenalty(index, 'restrictionDays', Number(e.target.value))}
                                className="w-16 px-2 py-1 text-center border border-white/15 rounded bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-white/60">일간 예약 제한</span>
                            </div>
                          )}
                          {penalty.penaltyType === 'FEE' && (
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={penalty.feeAmount || 10000}
                                onChange={(e) => updatePenalty(index, 'feeAmount', Number(e.target.value))}
                                className="w-24 px-2 py-1 text-right border border-white/15 rounded bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-white/60">원 위약금</span>
                            </div>
                          )}

                          <input
                            type="text"
                            value={penalty.label || ''}
                            onChange={(e) => updatePenalty(index, 'label', e.target.value)}
                            placeholder="페널티 라벨"
                            className="w-full px-3 py-1.5 text-sm border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${penaltyTypeLabels[penalty.penaltyType]?.color || ''}`}>
                              {penaltyTypeLabels[penalty.penaltyType]?.label || penalty.penaltyType}
                            </span>
                            <span className="text-sm text-white/50">
                              노쇼 {penalty.minCount}회{penalty.maxCount ? `~${penalty.maxCount}회` : ' 이상'}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 mt-1">{penalty.label || penalty.message}</p>
                          {penalty.penaltyType === 'RESTRICTION' && penalty.restrictionDays && (
                            <p className="text-xs text-white/50 mt-1">→ {penalty.restrictionDays}일간 예약 제한</p>
                          )}
                          {penalty.penaltyType === 'FEE' && penalty.feeAmount && (
                            <p className="text-xs text-white/50 mt-1">→ {penalty.feeAmount.toLocaleString()}원 위약금</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <button
                      onClick={() => removePenalty(index)}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
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

      {/* 노쇼 처리 플로우 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">노쇼 처리 흐름</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { step: 1, label: '예약 시간 경과', icon: '⏰', desc: '예약 시간이 지남' },
              { step: 2, label: '유예 시간 대기', icon: '⏳', desc: `${policy.noShowGraceMinutes}분 대기` },
              { step: 3, label: '노쇼 판정', icon: '❌', desc: '미방문 확인' },
              { step: 4, label: '페널티 적용', icon: '⚠️', desc: '정책에 따른 제재' },
            ].map((item, index) => (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-white/50">{item.desc}</div>
                </div>
                {index < 3 && <div className="flex-1 h-0.5 bg-amber-500/30 mx-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoShowPolicySettings;
