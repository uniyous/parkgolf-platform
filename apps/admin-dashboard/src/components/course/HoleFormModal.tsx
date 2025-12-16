import React, { useState, useEffect } from 'react';
import type { Hole } from '../../types';

interface HoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (holeData: Partial<Hole>) => Promise<boolean>;
  hole?: Hole | null;
  courseId: number;
  mode: 'create' | 'edit';
  loading?: boolean;
}

export const HoleFormModal: React.FC<HoleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  hole,
  courseId,
  mode,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    holeNumber: '',
    par: '',
    distance: '',
    description: '',
    imageUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 데이터 초기화
  useEffect(() => {
    if (mode === 'edit' && hole) {
      setFormData({
        holeNumber: hole.holeNumber?.toString() || '',
        par: hole.par?.toString() || '',
        distance: hole.distance?.toString() || '',
        description: hole.description || '',
        imageUrl: hole.imageUrl || '',
      });
    } else {
      setFormData({
        holeNumber: '',
        par: '4',
        distance: '',
        description: '',
        imageUrl: '',
      });
    }
    setErrors({});
  }, [mode, hole, isOpen]);

  // 폼 검증
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.holeNumber) {
      newErrors.holeNumber = '홀 번호는 필수입니다';
    } else if (isNaN(Number(formData.holeNumber)) || Number(formData.holeNumber) < 1) {
      newErrors.holeNumber = '유효한 홀 번호를 입력하세요';
    }

    if (!formData.par) {
      newErrors.par = '파는 필수입니다';
    } else if (![3, 4, 5].includes(Number(formData.par))) {
      newErrors.par = '파는 3, 4, 5 중 하나여야 합니다';
    }

    if (formData.distance && (isNaN(Number(formData.distance)) || Number(formData.distance) < 0)) {
      newErrors.distance = '유효한 거리를 입력하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const holeData = {
        holeNumber: Number(formData.holeNumber),
        par: Number(formData.par),
        distance: formData.distance ? Number(formData.distance) : undefined,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        courseId,
      };

      const success = await onSubmit(holeData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit hole:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 입력 변경 핸들러
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? '새 홀 추가' : '홀 수정'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* 홀 번호 */}
        <div>
          <label htmlFor="holeNumber" className="block text-sm font-medium text-gray-700 mb-1">
            홀 번호 *
          </label>
          <input
            type="number"
            id="holeNumber"
            min="1"
            value={formData.holeNumber}
            onChange={(e) => handleInputChange('holeNumber', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.holeNumber ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="홀 번호를 입력하세요"
            disabled={isSubmitting || loading}
          />
          {errors.holeNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.holeNumber}</p>
          )}
        </div>

        {/* 파 */}
        <div>
          <label htmlFor="par" className="block text-sm font-medium text-gray-700 mb-1">
            파 *
          </label>
          <select
            id="par"
            value={formData.par}
            onChange={(e) => handleInputChange('par', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.par ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isSubmitting || loading}
          >
            <option value="">파를 선택하세요</option>
            <option value="3">Par 3</option>
            <option value="4">Par 4</option>
            <option value="5">Par 5</option>
          </select>
          {errors.par && (
            <p className="mt-1 text-sm text-red-600">{errors.par}</p>
          )}
        </div>

        {/* 거리 */}
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-1">
            거리 (미터)
          </label>
          <input
            type="number"
            id="distance"
            min="0"
            value={formData.distance}
            onChange={(e) => handleInputChange('distance', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.distance ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="거리를 입력하세요 (옵션)"
            disabled={isSubmitting || loading}
          />
          {errors.distance && (
            <p className="mt-1 text-sm text-red-600">{errors.distance}</p>
          )}
        </div>

        {/* 설명 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="홀에 대한 설명을 입력하세요 (옵션)"
            disabled={isSubmitting || loading}
          />
        </div>

        {/* 홀 이미지 관리 섹션 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            홀 이미지
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 이미지 미리보기 */}
            <div>
              <div className="aspect-video rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                {formData.imageUrl ? (
                  <img 
                    src={formData.imageUrl} 
                    alt="홀 이미지 미리보기"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center text-gray-400 ${formData.imageUrl ? 'hidden' : 'flex'}`}
                >
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">홀 이미지 미리보기</p>
                  <p className="text-xs text-center mt-1">URL을 입력하면<br/>미리보기가 표시됩니다</p>
                </div>
              </div>
              
              {/* 이미지 관리 버튼 */}
              <div className="mt-3 flex space-x-2">
                <button 
                  type="button"
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  disabled
                >
                  파일 업로드
                </button>
                {formData.imageUrl && (
                  <button 
                    type="button"
                    onClick={() => handleInputChange('imageUrl', '')}
                    className="px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                  >
                    제거
                  </button>
                )}
              </div>
            </div>
            
            {/* 이미지 URL 입력 */}
            <div className="space-y-3">
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/hole-image.jpg"
                  disabled={isSubmitting || loading}
                />
                {formData.imageUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    ✓ 이미지 URL이 설정되었습니다
                  </p>
                )}
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">홀 이미지 가이드라인:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                  <li>홀 전체 전경 또는 특징적인 뷰</li>
                  <li>권장 비율: 16:9</li>
                  <li>최대 파일 크기: 5MB</li>
                  <li>지원 형식: JPG, PNG, WebP</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px]"
          >
            {isSubmitting || loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                처리중...
              </div>
            ) : (
              mode === 'create' ? '추가' : '수정'
            )}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};