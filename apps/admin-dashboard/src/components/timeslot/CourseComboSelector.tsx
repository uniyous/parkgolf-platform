import React from 'react';
import type { CourseCombo, CourseComboSelectorProps } from '../../types/courseCombo';

export const CourseComboSelector: React.FC<CourseComboSelectorProps> = ({
  availableCombos,
  selectedCombo,
  onComboSelect,
  loading = false
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-orange-100 text-orange-800';
      case 'PROFESSIONAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return '초급';
      case 'MEDIUM':
        return '중급';
      case 'HARD':
        return '고급';
      case 'PROFESSIONAL':
        return '프로';
      default:
        return difficulty;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">코스 조합을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (availableCombos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">사용 가능한 코스 조합이 없습니다</h3>
        <p className="text-gray-500">코스를 먼저 생성해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          코스 조합 선택
        </h3>
        <span className="text-sm text-gray-500">
          {availableCombos.length}개 조합 사용 가능
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableCombos.map((combo) => (
          <div
            key={combo.id}
            onClick={() => onComboSelect(combo)}
            className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedCombo?.id === combo.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* 인기 배지 및 권장 배지 */}
            <div className="absolute -top-2 -right-2 flex flex-col space-y-1">
              {combo.isPopular && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  인기
                </span>
              )}
              {combo.isRecommended && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  권장
                </span>
              )}
            </div>

            {/* 헤더 */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                {combo.name}
              </h4>
              {combo.description && (
                <p className="text-sm text-gray-600">{combo.description}</p>
              )}
            </div>

            {/* 코스 구성 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="text-xs text-blue-600 font-medium mb-1">전반 9홀</div>
                    <div className="font-semibold text-blue-900">{combo.frontCourse.name}</div>
                    <div className="text-xs text-blue-700">
                      Par {combo.frontCourse.par || Math.floor(combo.totalPar / 2)}
                    </div>
                  </div>
                </div>
                
                <div className="mx-3 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                
                <div className="flex-1">
                  <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div className="text-xs text-green-600 font-medium mb-1">후반 9홀</div>
                    <div className="font-semibold text-green-900">{combo.backCourse.name}</div>
                    <div className="text-xs text-green-700">
                      Par {combo.backCourse.par || Math.ceil(combo.totalPar / 2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 상세 정보 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">총 Par:</span>
                <span className="font-medium">{combo.totalPar}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">총 거리:</span>
                <span className="font-medium">{combo.totalDistance.toLocaleString()}m</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">예상 소요:</span>
                <span className="font-medium">{formatDuration(combo.estimatedDuration)}</span>
              </div>
            </div>

            {/* 난이도 및 특징 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">난이도:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(combo.difficulty)}`}>
                  {getDifficultyLabel(combo.difficulty)}
                </span>
              </div>
              
              {combo.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {combo.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                  {combo.features.length > 3 && (
                    <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      +{combo.features.length - 3}개
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 분배 비중 */}
            {combo.distributionWeight && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">타임슬롯 분배 비중:</span>
                  <span className="text-sm font-medium text-blue-600">{combo.distributionWeight}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(combo.distributionWeight, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  전체 타임슬롯 중 {combo.distributionWeight}%가 이 조합에 할당됩니다
                </div>
              </div>
            )}

            {/* 가격 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">기본 가격:</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    ₩{combo.basePrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    1팀 기준
                  </div>
                </div>
              </div>
            </div>

            {/* 선택 표시 */}
            {selectedCombo?.id === combo.id && (
              <div className="absolute bottom-4 right-4">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 커스텀 조합 생성 */}
      <div className="mt-6">
        <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">새 코스 조합 만들기</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">원하는 코스 조합이 없다면 새로 만들어보세요</p>
        </button>
      </div>
    </div>
  );
};