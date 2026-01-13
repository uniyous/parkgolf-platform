import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { noShowPolicyApi } from '@/lib/api/policyApi';
import type { NoShowPolicy, NoShowPenalty, NoShowPenaltyType } from '@/types/settings';
import { DEFAULT_NOSHOW_PENALTIES } from '@/types/settings';

// 기본 노쇼 정책 설정 (폴백용)
const defaultPolicy: NoShowPolicy = {
  name: '기본 노쇼 정책',
  code: 'DEFAULT_NOSHOW',
  description: '모든 골프장에 적용되는 기본 노쇼 정책입니다.',
  allowRefundOnNoShow: false,
  noShowGraceMinutes: 30,
  penalties: DEFAULT_NOSHOW_PENALTIES,
  countResetDays: 180,
  isDefault: true,
  isActive: true,
};

const penaltyTypeLabels: Record<NoShowPenaltyType, { label: string; color: string; icon: string }> = {
  WARNING: { label: '경고', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' },
  RESTRICTION: { label: '예약 제한', color: 'bg-orange-100 text-orange-700', icon: '🚫' },
  BLACKLIST: { label: '블랙리스트', color: 'bg-red-100 text-red-700', icon: '🔒' },
  FEE: { label: '위약금', color: 'bg-purple-100 text-purple-700', icon: '💸' },
};

export const NoShowPolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<NoShowPolicy>(defaultPolicy);
  const [originalPolicy, setOriginalPolicy] = useState<NoShowPolicy>(defaultPolicy);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 기본 정책 로드
  useEffect(() => {
    loadDefaultPolicy();
  }, []);

  const loadDefaultPolicy = async () => {
    setIsLoading(true);
    try {
      const response = await noShowPolicyApi.getDefault();
      if (response.data?.success && response.data.data) {
        // API 응답의 penalties를 UI 형식으로 변환
        const apiPolicy = response.data.data;
        const convertedPolicy: NoShowPolicy = {
          ...apiPolicy,
          penalties: apiPolicy.penalties?.map((penalty: any) => ({
            id: penalty.id,
            type: penalty.penaltyType,
            triggerCount: penalty.minCount,
            withinDays: 30, // 기본값
            penaltyDays: penalty.restrictionDays,
            penaltyAmount: penalty.feeAmount,
            description: penalty.label || penalty.message || '',
            isActive: true,
          })) || DEFAULT_NOSHOW_PENALTIES,
        };
        setPolicy(convertedPolicy);
        setOriginalPolicy(convertedPolicy);
      }
    } catch (error) {
      console.error('Failed to load no-show policy:', error);
      // 기본값 사용
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // UI 형식을 API 형식으로 변환
      const apiPenalties = policy.penalties.filter(p => p.isActive).map((penalty) => ({
        minCount: penalty.triggerCount,
        maxCount: null,
        penaltyType: penalty.type,
        restrictionDays: penalty.penaltyDays,
        feeAmount: penalty.penaltyAmount,
        feeRate: null,
        label: penalty.description,
        message: penalty.description,
      }));

      if (policy.id) {
        // 기존 정책 업데이트
        const response = await noShowPolicyApi.update(policy.id, {
          name: policy.name,
          description: policy.description,
          allowRefundOnNoShow: policy.allowRefundOnNoShow,
          noShowGraceMinutes: policy.noShowGraceMinutes,
          countResetDays: policy.countResetDays,
          isActive: policy.isActive,
          penalties: apiPenalties,
        } as any);
        if (response.data?.success) {
          toast.success('노쇼 정책이 저장되었습니다.');
          await loadDefaultPolicy();
        }
      } else {
        // 새 정책 생성
        const response = await noShowPolicyApi.create({
          name: policy.name,
          code: policy.code,
          description: policy.description,
          allowRefundOnNoShow: policy.allowRefundOnNoShow,
          noShowGraceMinutes: policy.noShowGraceMinutes,
          countResetDays: policy.countResetDays,
          isDefault: true,
          isActive: policy.isActive,
          penalties: apiPenalties,
        } as any);
        if (response.data?.success) {
          toast.success('노쇼 정책이 생성되었습니다.');
          await loadDefaultPolicy();
        }
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save no-show policy:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
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

  const togglePenaltyActive = (index: number) => {
    if (!isEditing) return;
    const newPenalties = [...policy.penalties];
    newPenalties[index] = { ...newPenalties[index], isActive: !newPenalties[index].isActive };
    setPolicy({ ...policy, penalties: newPenalties });
  };

  const addPenalty = () => {
    const newPenalty: NoShowPenalty = {
      type: 'WARNING',
      triggerCount: 1,
      withinDays: 30,
      description: '새 페널티',
      isActive: false,
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
        <span className="ml-3 text-gray-600">정책을 불러오는 중...</span>
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
            <h3 className="font-semibold text-gray-900">노쇼 정책 안내</h3>
            <p className="text-sm text-gray-600 mt-1">
              예약 시간에 방문하지 않은 고객(노쇼)에 대한 페널티 정책을 설정합니다.
              노쇼 횟수에 따라 경고, 예약 제한, 블랙리스트 등의 제재를 적용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 기본 설정 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">노쇼 기본 설정</h3>
            <p className="text-sm text-gray-500">노쇼 판정 기준 및 기본 규칙</p>
          </div>
          <div className="flex items-center gap-2">
            {policy.isActive ? (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                활성
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                비활성
              </span>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                수정
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 노쇼 판정 시간 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">노쇼 판정 유예 시간</label>
              <p className="text-sm text-gray-500">예약 시간 경과 후 몇 분까지 도착 대기</p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <select
                  value={policy.noShowGraceMinutes}
                  onChange={(e) =>
                    setPolicy({ ...policy, noShowGraceMinutes: Number(e.target.value) })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={10}>10분</option>
                  <option value={15}>15분</option>
                  <option value={20}>20분</option>
                  <option value={30}>30분</option>
                  <option value={45}>45분</option>
                  <option value={60}>60분</option>
                </select>
              </div>
            ) : (
              <span className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg">
                {policy.noShowGraceMinutes}분
              </span>
            )}
          </div>

          {/* 노쇼 시 환불 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">노쇼 시 환불 허용</label>
              <p className="text-sm text-gray-500">노쇼 처리된 예약에 대해 환불을 허용합니다</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.allowRefundOnNoShow}
                onChange={(e) =>
                  isEditing && setPolicy({ ...policy, allowRefundOnNoShow: e.target.checked })
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
                ${policy.allowRefundOnNoShow ? 'bg-green-500' : 'bg-gray-300'}
                ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
              `} />
            </label>
          </div>

          {/* 노쇼 카운트 리셋 기간 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">노쇼 카운트 리셋 기간</label>
              <p className="text-sm text-gray-500">이 기간이 지나면 노쇼 횟수가 초기화됩니다</p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <select
                  value={policy.countResetDays}
                  onChange={(e) =>
                    setPolicy({ ...policy, countResetDays: Number(e.target.value) })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={30}>30일</option>
                  <option value={60}>60일</option>
                  <option value={90}>90일</option>
                  <option value={180}>180일 (6개월)</option>
                  <option value={365}>365일 (1년)</option>
                </select>
              </div>
            ) : (
              <span className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg">
                {policy.countResetDays}일
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 페널티 설정 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">페널티 단계 설정</h3>
            <p className="text-sm text-gray-500">노쇼 횟수에 따른 제재 단계</p>
          </div>
          {isEditing && (
            <button
              onClick={addPenalty}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
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
                className={`
                  p-4 rounded-lg border transition-all
                  ${penalty.isActive
                    ? 'bg-white border-gray-200 shadow-sm'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* 페널티 아이콘 및 유형 */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-lg
                      ${penaltyTypeLabels[penalty.type].color}
                    `}>
                      {penaltyTypeLabels[penalty.type].icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-3">
                          {/* 페널티 유형 선택 */}
                          <select
                            value={penalty.type}
                            onChange={(e) =>
                              updatePenalty(index, 'type', e.target.value as NoShowPenaltyType)
                            }
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="WARNING">경고</option>
                            <option value="RESTRICTION">예약 제한</option>
                            <option value="BLACKLIST">블랙리스트</option>
                            <option value="FEE">위약금</option>
                          </select>

                          {/* 발동 조건 */}
                          <div className="flex items-center gap-2 text-sm">
                            <input
                              type="number"
                              min={1}
                              value={penalty.withinDays}
                              onChange={(e) =>
                                updatePenalty(index, 'withinDays', Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <span className="text-gray-600">일 내</span>
                            <input
                              type="number"
                              min={1}
                              value={penalty.triggerCount}
                              onChange={(e) =>
                                updatePenalty(index, 'triggerCount', Number(e.target.value))
                              }
                              className="w-12 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <span className="text-gray-600">회 노쇼 시</span>
                          </div>

                          {/* 페널티 기간/금액 */}
                          {penalty.type === 'RESTRICTION' && (
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="number"
                                min={1}
                                value={penalty.penaltyDays || 7}
                                onChange={(e) =>
                                  updatePenalty(index, 'penaltyDays', Number(e.target.value))
                                }
                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                              <span className="text-gray-600">일간 예약 제한</span>
                            </div>
                          )}
                          {penalty.type === 'FEE' && (
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={penalty.penaltyAmount || 10000}
                                onChange={(e) =>
                                  updatePenalty(index, 'penaltyAmount', Number(e.target.value))
                                }
                                className="w-24 px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                              <span className="text-gray-600">원 위약금</span>
                            </div>
                          )}

                          {/* 설명 */}
                          <input
                            type="text"
                            value={penalty.description}
                            onChange={(e) => updatePenalty(index, 'description', e.target.value)}
                            placeholder="페널티 설명"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className={`
                              px-2 py-0.5 text-xs font-medium rounded
                              ${penaltyTypeLabels[penalty.type].color}
                            `}>
                              {penaltyTypeLabels[penalty.type].label}
                            </span>
                            <span className="text-sm text-gray-500">
                              {penalty.withinDays}일 내 {penalty.triggerCount}회 노쇼 시
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{penalty.description}</p>
                          {penalty.type === 'RESTRICTION' && penalty.penaltyDays && (
                            <p className="text-xs text-gray-500 mt-1">
                              → {penalty.penaltyDays}일간 예약 제한
                            </p>
                          )}
                          {penalty.type === 'FEE' && penalty.penaltyAmount && (
                            <p className="text-xs text-gray-500 mt-1">
                              → {penalty.penaltyAmount.toLocaleString()}원 위약금
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 활성화 토글 및 삭제 */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={penalty.isActive}
                        onChange={() => togglePenaltyActive(index)}
                        disabled={!isEditing}
                        className="sr-only peer"
                      />
                      <div className={`
                        w-9 h-5 rounded-full peer
                        peer-focus:ring-4 peer-focus:ring-green-100
                        peer-checked:after:translate-x-full
                        after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                        after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                        ${penalty.isActive ? 'bg-green-500' : 'bg-gray-300'}
                        ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
                      `} />
                    </label>
                    {isEditing && (
                      <button
                        onClick={() => removePenalty(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 저장/취소 버튼 */}
        {isEditing && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

      {/* 노쇼 처리 플로우 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">노쇼 처리 흐름</h3>
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
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
                {index < 3 && (
                  <div className="flex-1 h-0.5 bg-amber-200 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoShowPolicySettings;
