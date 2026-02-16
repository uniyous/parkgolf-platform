import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useOperatingPolicyResolveQuery,
  useCreateOperatingPolicyMutation,
  useUpdateOperatingPolicyMutation,
  useDeleteOperatingPolicyMutation,
} from '@/hooks/queries';
import type { OperatingPolicy, ResolvedOperatingPolicy } from '@/types/settings';
import { PolicyInheritanceBadge } from './PolicyInheritanceBadge';

const defaultPolicy: OperatingPolicy = {
  openTime: '06:00',
  closeTime: '18:00',
  lastTeeTime: '16:00',
  defaultMaxPlayers: 4,
  defaultDuration: 180,
  defaultBreakDuration: 10,
  defaultSlotInterval: 10,
  peakSeasonStart: '04-01',
  peakSeasonEnd: '10-31',
  peakPriceRate: 100,
  weekendPriceRate: 100,
  isActive: true,
};

export const OperatingPolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<OperatingPolicy>(defaultPolicy);
  const [originalPolicy, setOriginalPolicy] = useState<OperatingPolicy>(defaultPolicy);
  const [isEditing, setIsEditing] = useState(false);
  const [inherited, setInherited] = useState(false);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);

  const { data: resolvedPolicy, isLoading } = useOperatingPolicyResolveQuery();
  const createMutation = useCreateOperatingPolicyMutation();
  const updateMutation = useUpdateOperatingPolicyMutation();
  const deleteMutation = useDeleteOperatingPolicyMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (resolvedPolicy) {
      const resolved = resolvedPolicy as ResolvedOperatingPolicy;
      setPolicy(resolved);
      setOriginalPolicy(resolved);
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
            openTime: policy.openTime,
            closeTime: policy.closeTime,
            lastTeeTime: policy.lastTeeTime ?? undefined,
            defaultMaxPlayers: policy.defaultMaxPlayers,
            defaultDuration: policy.defaultDuration,
            defaultBreakDuration: policy.defaultBreakDuration,
            defaultSlotInterval: policy.defaultSlotInterval,
            peakSeasonStart: policy.peakSeasonStart ?? undefined,
            peakSeasonEnd: policy.peakSeasonEnd ?? undefined,
            peakPriceRate: policy.peakPriceRate,
            weekendPriceRate: policy.weekendPriceRate,
            isActive: policy.isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          ...policy,
          scopeLevel: 'COMPANY',
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save operating policy:', error);
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-xl">
            ⚙️
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">운영 정책 안내</h3>
            <p className="text-sm text-white/60 mt-1">
              운영 시간, 기본 라운드 설정, 성수기/주말 가격 배율 등을 설정합니다.
              이 설정은 라운드 생성 시 기본값으로 적용됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 운영 시간 설정 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-white">운영 시간</h3>
              <p className="text-sm text-white/50">오픈/마감/마지막 티타임</p>
            </div>
            <PolicyInheritanceBadge inherited={inherited} inheritedFrom={inheritedFrom} />
          </div>
          <div className="flex items-center gap-2">
            {policy.isActive ? (
              <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">활성</span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white/60 rounded">비활성</span>
            )}
            {!isEditing && inherited && (
              <button onClick={handleCustomize} className="px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-white/5 rounded-lg transition-colors">
                독립 설정
              </button>
            )}
            {!isEditing && !inherited && (
              <>
                <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-white/5 rounded-lg transition-colors">
                  수정
                </button>
                {policy.scopeLevel !== 'PLATFORM' && policy.id && (
                  <button onClick={handleRevert} className="px-3 py-1.5 text-sm font-medium text-orange-400 hover:bg-white/5 rounded-lg transition-colors">
                    되돌리기
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 오픈/마감 시간 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="font-medium text-white block mb-2">오픈 시간</label>
              {isEditing ? (
                <input
                  type="time"
                  value={policy.openTime}
                  onChange={(e) => setPolicy({ ...policy, openTime: e.target.value })}
                  className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">{policy.openTime}</span>
              )}
            </div>
            <div>
              <label className="font-medium text-white block mb-2">마감 시간</label>
              {isEditing ? (
                <input
                  type="time"
                  value={policy.closeTime}
                  onChange={(e) => setPolicy({ ...policy, closeTime: e.target.value })}
                  className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">{policy.closeTime}</span>
              )}
            </div>
            <div>
              <label className="font-medium text-white block mb-2">마지막 티타임</label>
              {isEditing ? (
                <input
                  type="time"
                  value={policy.lastTeeTime || ''}
                  onChange={(e) => setPolicy({ ...policy, lastTeeTime: e.target.value || null })}
                  className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">{policy.lastTeeTime || '-'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 라운드 기본값 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">라운드 기본값</h3>
          <p className="text-sm text-white/50">라운드 생성 시 적용되는 기본 설정</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">최대 플레이어</label>
                <p className="text-sm text-white/50">조 당 최대 인원</p>
              </div>
              {isEditing ? (
                <select
                  value={policy.defaultMaxPlayers}
                  onChange={(e) => setPolicy({ ...policy, defaultMaxPlayers: Number(e.target.value) })}
                  className="px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}명</option>
                  ))}
                </select>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">{policy.defaultMaxPlayers}명</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">라운드 시간</label>
                <p className="text-sm text-white/50">기본 라운드 소요 시간</p>
              </div>
              {isEditing ? (
                <select
                  value={policy.defaultDuration}
                  onChange={(e) => setPolicy({ ...policy, defaultDuration: Number(e.target.value) })}
                  className="px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {[60, 90, 120, 150, 180, 210, 240, 270, 300, 360].map((n) => (
                    <option key={n} value={n}>{n}분 ({Math.floor(n / 60)}시간{n % 60 ? ` ${n % 60}분` : ''})</option>
                  ))}
                </select>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">{policy.defaultDuration}분</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">휴식 시간</label>
                <p className="text-sm text-white/50">라운드 간 휴식</p>
              </div>
              {isEditing ? (
                <select
                  value={policy.defaultBreakDuration}
                  onChange={(e) => setPolicy({ ...policy, defaultBreakDuration: Number(e.target.value) })}
                  className="px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {[0, 5, 10, 15, 20, 30].map((n) => (
                    <option key={n} value={n}>{n}분</option>
                  ))}
                </select>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">{policy.defaultBreakDuration}분</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">슬롯 간격</label>
                <p className="text-sm text-white/50">티타임 간격</p>
              </div>
              {isEditing ? (
                <select
                  value={policy.defaultSlotInterval}
                  onChange={(e) => setPolicy({ ...policy, defaultSlotInterval: Number(e.target.value) })}
                  className="px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {[5, 7, 8, 10, 12, 15, 20, 30].map((n) => (
                    <option key={n} value={n}>{n}분</option>
                  ))}
                </select>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">{policy.defaultSlotInterval}분</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 가격 배율 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">가격 배율 설정</h3>
          <p className="text-sm text-white/50">성수기/주말 가격 배율 (100% = 정상가)</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-medium text-white block mb-2">성수기 기간</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={policy.peakSeasonStart || ''}
                    onChange={(e) => setPolicy({ ...policy, peakSeasonStart: e.target.value || null })}
                    placeholder="MM-DD"
                    className="w-24 px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-white/60">~</span>
                  <input
                    type="text"
                    value={policy.peakSeasonEnd || ''}
                    onChange={(e) => setPolicy({ ...policy, peakSeasonEnd: e.target.value || null })}
                    placeholder="MM-DD"
                    className="w-24 px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">
                  {policy.peakSeasonStart && policy.peakSeasonEnd
                    ? `${policy.peakSeasonStart} ~ ${policy.peakSeasonEnd}`
                    : '미설정'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">성수기 가격 배율</label>
                <p className="text-sm text-white/50">100% = 정상가</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={100}
                    max={300}
                    value={policy.peakPriceRate}
                    onChange={(e) => setPolicy({ ...policy, peakPriceRate: Number(e.target.value) })}
                    className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-white/60">%</span>
                </div>
              ) : (
                <span className={`px-4 py-2 font-medium rounded-lg ${policy.peakPriceRate > 100 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-white/70'}`}>
                  {policy.peakPriceRate}%
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">주말 가격 배율</label>
                <p className="text-sm text-white/50">100% = 정상가</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={100}
                    max={300}
                    value={policy.weekendPriceRate}
                    onChange={(e) => setPolicy({ ...policy, weekendPriceRate: Number(e.target.value) })}
                    className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-white/60">%</span>
                </div>
              ) : (
                <span className={`px-4 py-2 font-medium rounded-lg ${policy.weekendPriceRate > 100 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-white/70'}`}>
                  {policy.weekendPriceRate}%
                </span>
              )}
            </div>
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

export default OperatingPolicySettings;
