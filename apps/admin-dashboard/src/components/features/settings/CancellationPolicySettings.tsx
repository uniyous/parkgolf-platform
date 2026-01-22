import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useCancellationPolicyDefaultQuery,
  useCreateCancellationPolicyMutation,
  useUpdateCancellationPolicyMutation,
} from '@/hooks/queries';
import type { CancellationPolicy } from '@/types/settings';

// 기본 취소 정책 설정 (폴백용)
const defaultPolicy: CancellationPolicy = {
  name: '기본 취소 정책',
  code: 'DEFAULT_CANCEL',
  description: '모든 골프장에 적용되는 기본 취소 정책입니다.',
  allowUserCancel: true,
  userCancelDeadlineHours: 72, // 3일 전
  allowSameDayCancel: false,
  isDefault: true,
  isActive: true,
};

export const CancellationPolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<CancellationPolicy>(defaultPolicy);
  const [originalPolicy, setOriginalPolicy] = useState<CancellationPolicy>(defaultPolicy);
  const [isEditing, setIsEditing] = useState(false);

  // React Query 훅 사용
  const { data: apiPolicy, isLoading } = useCancellationPolicyDefaultQuery();
  const createMutation = useCreateCancellationPolicyMutation();
  const updateMutation = useUpdateCancellationPolicyMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // API 응답으로 상태 설정
  useEffect(() => {
    if (apiPolicy) {
      setPolicy(apiPolicy);
      setOriginalPolicy(apiPolicy);
    }
  }, [apiPolicy]);

  const handleSave = async () => {
    try {
      if (policy.id) {
        // 기존 정책 업데이트
        await updateMutation.mutateAsync({
          id: policy.id,
          data: {
            name: policy.name,
            description: policy.description,
            allowUserCancel: policy.allowUserCancel,
            userCancelDeadlineHours: policy.userCancelDeadlineHours,
            allowSameDayCancel: policy.allowSameDayCancel,
            isActive: policy.isActive,
          },
        });
      } else {
        // 새 정책 생성
        await createMutation.mutateAsync({
          ...policy,
          isDefault: true,
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save cancellation policy:', error);
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setPolicy(originalPolicy);
    setIsEditing(false);
  };

  const hoursToDisplay = (hours: number): string => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `${days}일`;
      }
      return `${days}일 ${remainingHours}시간`;
    }
    return `${hours}시간`;
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
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-xl">
            🚫
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">취소 정책 안내</h3>
            <p className="text-sm text-gray-600 mt-1">
              고객이 예약을 취소할 수 있는 조건과 시한을 설정합니다.
              설정된 시한 이후에는 고객이 직접 취소할 수 없으며, 관리자만 취소 처리가 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 현재 설정 카드 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{policy.name}</h3>
            <p className="text-sm text-gray-500">{policy.description}</p>
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
          {/* 고객 취소 허용 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">고객 취소 허용</label>
              <p className="text-sm text-gray-500">고객이 직접 예약을 취소할 수 있습니다</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.allowUserCancel}
                onChange={(e) =>
                  isEditing && setPolicy({ ...policy, allowUserCancel: e.target.checked })
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
                ${policy.allowUserCancel ? 'bg-green-500' : 'bg-gray-300'}
                ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
              `} />
            </label>
          </div>

          {/* 취소 마감 시한 */}
          <div>
            <label className="font-medium text-gray-900 block mb-2">취소 마감 시한</label>
            <p className="text-sm text-gray-500 mb-3">
              예약 시간 기준 몇 시간 전까지 취소가 가능한지 설정합니다
            </p>
            {isEditing ? (
              <div className="flex items-center gap-4">
                <select
                  value={policy.userCancelDeadlineHours}
                  onChange={(e) =>
                    setPolicy({ ...policy, userCancelDeadlineHours: Number(e.target.value) })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={12}>12시간 전</option>
                  <option value={24}>1일 전 (24시간)</option>
                  <option value={48}>2일 전 (48시간)</option>
                  <option value={72}>3일 전 (72시간)</option>
                  <option value={96}>4일 전 (96시간)</option>
                  <option value={120}>5일 전 (120시간)</option>
                  <option value={144}>6일 전 (144시간)</option>
                  <option value={168}>7일 전 (168시간)</option>
                </select>
                <span className="text-sm text-gray-600">까지 취소 가능</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-4 py-2 bg-gray-100 rounded-lg font-medium text-gray-900">
                  예약 시간 {hoursToDisplay(policy.userCancelDeadlineHours)} 전
                </span>
                <span className="text-sm text-gray-600">까지 취소 가능</span>
              </div>
            )}
          </div>

          {/* 당일 취소 허용 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">당일 취소 허용</label>
              <p className="text-sm text-gray-500">예약 당일에도 취소할 수 있습니다 (환불 정책 적용)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.allowSameDayCancel}
                onChange={(e) =>
                  isEditing && setPolicy({ ...policy, allowSameDayCancel: e.target.checked })
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
                ${policy.allowSameDayCancel ? 'bg-green-500' : 'bg-gray-300'}
                ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
              `} />
            </label>
          </div>

          {/* 활성화 상태 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <label className="font-medium text-gray-900">정책 활성화</label>
              <p className="text-sm text-gray-500">비활성화 시 기본 정책이 적용됩니다</p>
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
                ${policy.isActive ? 'bg-green-500' : 'bg-gray-300'}
                ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}
              `} />
            </label>
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

      {/* 취소 유형 안내 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">취소 유형 안내</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-700">취소 유형</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">요청자</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">시점</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">환불</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">고객 정상 취소</td>
                  <td className="px-4 py-3 text-gray-600">고객</td>
                  <td className="px-4 py-3 text-gray-600">3일 이전</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      정책 적용
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">고객 지연 취소</td>
                  <td className="px-4 py-3 text-gray-600">고객</td>
                  <td className="px-4 py-3 text-gray-600">1~3일 전</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                      부분 환불
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">고객 긴급 취소</td>
                  <td className="px-4 py-3 text-gray-600">고객</td>
                  <td className="px-4 py-3 text-gray-600">24시간 이내</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                      환불 불가
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">관리자 취소</td>
                  <td className="px-4 py-3 text-gray-600">관리자</td>
                  <td className="px-4 py-3 text-gray-600">제한 없음</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      전액 환불
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">시스템 취소</td>
                  <td className="px-4 py-3 text-gray-600">시스템</td>
                  <td className="px-4 py-3 text-gray-600">자동</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      전액 환불
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicySettings;
