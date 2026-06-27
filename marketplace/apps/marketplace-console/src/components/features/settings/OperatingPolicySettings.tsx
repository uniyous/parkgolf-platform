import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useOperatingPolicyResolveQuery,
  useCreateOperatingPolicyMutation,
  useUpdateOperatingPolicyMutation,
} from '@/hooks/queries';
import type { OperatingPolicy } from '@/types/settings';

const defaultPolicy: OperatingPolicy = {
  openTime: '06:00',
  closeTime: '18:00',
  lastTeeTime: '16:00',
  defaultMaxPlayers: 4,
  defaultDuration: 120,
  defaultBreakDuration: 10,
  defaultSlotInterval: 10,
  peakSeasonStart: '07-01',
  peakSeasonEnd: '08-31',
  peakPriceRate: 130,
  weekendPriceRate: 120,
  isActive: true,
};

export const OperatingPolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<OperatingPolicy>(defaultPolicy);
  const [originalPolicy, setOriginalPolicy] = useState<OperatingPolicy>(defaultPolicy);
  const [isEditing, setIsEditing] = useState(false);

  const { data: apiPolicy, isLoading } = useOperatingPolicyResolveQuery();
  const createMutation = useCreateOperatingPolicyMutation();
  const updateMutation = useUpdateOperatingPolicyMutation();

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
          scopeLevel: 'PLATFORM',
        });
      }
      setIsEditing(false);
    } catch {
      toast.error('저장에 실패했습니다.');
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
      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-xl">
            ⚙️
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">운영 정책 안내</h3>
            <p className="text-sm text-white/60 mt-1">
              골프장 운영 시간, 라운드 기본값, 가격 배율을 설정합니다.
              이 설정은 플랫폼 기본값이며, 가맹점/골프장 단위로 오버라이드할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 운영 시간 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">운영 시간</h3>
            <p className="text-sm text-white/50">기본 운영 시간 설정</p>
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

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="font-medium text-white block mb-2">오픈 시간</label>
              {isEditing ? (
                <input
                  type="time"
                  value={policy.openTime}
                  onChange={(e) => setPolicy({ ...policy, openTime: e.target.value })}
                  className="w-full px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">
                  {policy.openTime}
                </span>
              )}
            </div>
            <div>
              <label className="font-medium text-white block mb-2">마감 시간</label>
              {isEditing ? (
                <input
                  type="time"
                  value={policy.closeTime}
                  onChange={(e) => setPolicy({ ...policy, closeTime: e.target.value })}
                  className="w-full px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">
                  {policy.closeTime}
                </span>
              )}
            </div>
            <div>
              <label className="font-medium text-white block mb-2">마지막 티타임</label>
              {isEditing ? (
                <input
                  type="time"
                  value={policy.lastTeeTime || ''}
                  onChange={(e) => setPolicy({ ...policy, lastTeeTime: e.target.value || null })}
                  className="w-full px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg inline-block">
                  {policy.lastTeeTime || '-'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 라운드 기본값 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">라운드 기본값</h3>
          <p className="text-sm text-white/50">게임/타임슬롯 생성 시 기본 적용값</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">최대 플레이어 수</label>
                <p className="text-sm text-white/50">조당 최대 인원</p>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={policy.defaultMaxPlayers}
                  onChange={(e) => setPolicy({ ...policy, defaultMaxPlayers: Number(e.target.value) })}
                  className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.defaultMaxPlayers}명
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">라운드 시간</label>
                <p className="text-sm text-white/50">기본 라운드 소요 시간</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step={10}
                    value={policy.defaultDuration}
                    onChange={(e) => setPolicy({ ...policy, defaultDuration: Number(e.target.value) })}
                    className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-white/60">분</span>
                </div>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.defaultDuration}분
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">휴식 시간</label>
                <p className="text-sm text-white/50">라운드 간 기본 휴식 시간</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={5}
                    value={policy.defaultBreakDuration}
                    onChange={(e) => setPolicy({ ...policy, defaultBreakDuration: Number(e.target.value) })}
                    className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-white/60">분</span>
                </div>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.defaultBreakDuration}분
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">슬롯 간격</label>
                <p className="text-sm text-white/50">티타임 슬롯 간격</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <select
                    value={policy.defaultSlotInterval}
                    onChange={(e) => setPolicy({ ...policy, defaultSlotInterval: Number(e.target.value) })}
                    className="px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value={7}>7분</option>
                    <option value={8}>8분</option>
                    <option value={10}>10분</option>
                    <option value={12}>12분</option>
                    <option value={15}>15분</option>
                  </select>
                </div>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.defaultSlotInterval}분
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 가격 배율 */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="font-semibold text-white">가격 배율 설정</h3>
          <p className="text-sm text-white/50">성수기/주말 가격 배율 (기본가 대비 %)</p>
        </div>

        <div className="p-6 space-y-6">
          {/* 성수기 기간 */}
          <div>
            <label className="font-medium text-white block mb-2">성수기 기간</label>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={policy.peakSeasonStart || ''}
                    onChange={(e) => setPolicy({ ...policy, peakSeasonStart: e.target.value || null })}
                    placeholder="MM-DD"
                    className="w-28 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-white/60">~</span>
                  <input
                    type="text"
                    value={policy.peakSeasonEnd || ''}
                    onChange={(e) => setPolicy({ ...policy, peakSeasonEnd: e.target.value || null })}
                    placeholder="MM-DD"
                    className="w-28 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.peakSeasonStart && policy.peakSeasonEnd
                    ? `${policy.peakSeasonStart} ~ ${policy.peakSeasonEnd}`
                    : '미설정'}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">성수기 가격 배율</label>
                <p className="text-sm text-white/50">성수기 기간 중 가격 배율</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={100}
                    max={300}
                    value={policy.peakPriceRate}
                    onChange={(e) => setPolicy({ ...policy, peakPriceRate: Number(e.target.value) })}
                    className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-white/60">%</span>
                </div>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.peakPriceRate}%
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-white">주말 가격 배율</label>
                <p className="text-sm text-white/50">주말/공휴일 가격 배율</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={100}
                    max={300}
                    value={policy.weekendPriceRate}
                    onChange={(e) => setPolicy({ ...policy, weekendPriceRate: Number(e.target.value) })}
                    className="w-20 px-3 py-2 text-center border border-white/15 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-white/60">%</span>
                </div>
              ) : (
                <span className="px-4 py-2 bg-white/10 text-white/70 font-medium rounded-lg">
                  {policy.weekendPriceRate}%
                </span>
              )}
            </div>
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
    </div>
  );
};

export default OperatingPolicySettings;
