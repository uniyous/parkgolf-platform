import React, { useState, useEffect } from 'react';
import type { CreateCourseDto, UpdateCourseDto, Course } from '../../types';

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCourseDto | UpdateCourseDto) => Promise<boolean>;
  course?: Course | null;
  companyId: number;
  mode: 'create' | 'edit';
  loading?: boolean;
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  course,
  companyId,
  mode,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    holeCount: 18,
    par: 72,
    courseRating: 0,
    slopeRating: 0,
    location: '',
    imageUrl: '',
    contactInfo: '',
    status: 'ACTIVE' as const,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 데이터 초기화
  useEffect(() => {
    if (mode === 'edit' && course) {
      setFormData({
        name: course.name,
        description: course.description || '',
        holeCount: course.holeCount,
        par: course.par || 72,
        courseRating: course.courseRating || 0,
        slopeRating: course.slopeRating || 0,
        location: course.location || '',
        imageUrl: course.imageUrl || '',
        contactInfo: course.contactInfo || '',
        status: course.status,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        holeCount: 18,
        par: 72,
        courseRating: 0,
        slopeRating: 0,
        location: '',
        imageUrl: '',
        contactInfo: '',
        status: 'ACTIVE',
      });
    }
    setErrors({});
  }, [mode, course, isOpen]);

  // 폼 검증
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '코스명은 필수입니다';
    }
    
    if (formData.holeCount < 1 || formData.holeCount > 36) {
      newErrors.holeCount = '홀 수는 1-36 사이여야 합니다';
    }
    
    if (formData.par && formData.par < 1) {
      newErrors.par = '파는 1 이상이어야 합니다';
    }
    
    if (formData.courseRating && (formData.courseRating < 0 || formData.courseRating > 80)) {
      newErrors.courseRating = '코스 레이팅은 0-80 사이여야 합니다';
    }
    
    if (formData.slopeRating && (formData.slopeRating < 55 || formData.slopeRating > 155)) {
      newErrors.slopeRating = '슬로프 레이팅은 55-155 사이여야 합니다';
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
      // companyId가 없으면 에러 (생성 모드일 때만)
      if (mode === 'create' && !companyId) {
        throw new Error('회사 ID가 필요합니다');
      }
      
      // null 값들을 undefined로 변환
      const cleanData = {
        ...formData,
        description: formData.description || undefined,
        location: formData.location || undefined,
        imageUrl: formData.imageUrl || undefined,
        contactInfo: formData.contactInfo || undefined,
        ...(mode === 'create' ? { companyId } : {}),
      };
      
      const success = await onSubmit(cleanData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit course:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 해당 필드의 에러 제거
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? '새 코스 추가' : '코스 편집'}
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
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              코스명 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="코스명을 입력하세요"
              disabled={isSubmitting || loading}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="코스 설명을 입력하세요"
              disabled={isSubmitting || loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="holeCount" className="block text-sm font-medium text-gray-700 mb-1">
                홀 수 *
              </label>
              <input
                type="number"
                id="holeCount"
                name="holeCount"
                value={formData.holeCount}
                onChange={handleInputChange}
                min="1"
                max="36"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.holeCount ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || loading}
              />
              {errors.holeCount && (
                <p className="text-red-500 text-sm mt-1">{errors.holeCount}</p>
              )}
            </div>

            <div>
              <label htmlFor="par" className="block text-sm font-medium text-gray-700 mb-1">
                파 *
              </label>
              <input
                type="number"
                id="par"
                name="par"
                value={formData.par}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.par ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || loading}
              />
              {errors.par && (
                <p className="text-red-500 text-sm mt-1">{errors.par}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="courseRating" className="block text-sm font-medium text-gray-700 mb-1">
                코스 레이팅
              </label>
              <input
                type="number"
                id="courseRating"
                name="courseRating"
                value={formData.courseRating}
                onChange={handleInputChange}
                min="0"
                max="80"
                step="0.1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.courseRating ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || loading}
              />
              {errors.courseRating && (
                <p className="text-red-500 text-sm mt-1">{errors.courseRating}</p>
              )}
            </div>

            <div>
              <label htmlFor="slopeRating" className="block text-sm font-medium text-gray-700 mb-1">
                슬로프 레이팅
              </label>
              <input
                type="number"
                id="slopeRating"
                name="slopeRating"
                value={formData.slopeRating}
                onChange={handleInputChange}
                min="55"
                max="155"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.slopeRating ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || loading}
              />
              {errors.slopeRating && (
                <p className="text-red-500 text-sm mt-1">{errors.slopeRating}</p>
              )}
            </div>
          </div>

          {/* 추가 필드들 */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              위치
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="코스 위치를 입력하세요"
              disabled={isSubmitting || loading}
            />
          </div>

          {/* 이미지 관리 섹션 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              코스 이미지
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 이미지 미리보기 */}
              <div>
                <div className="aspect-video rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                  {formData.imageUrl ? (
                    <img 
                      src={formData.imageUrl} 
                      alt="코스 이미지 미리보기"
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
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium">이미지 미리보기</p>
                    <p className="text-xs text-center mt-1">URL을 입력하면<br/>미리보기가 표시됩니다</p>
                  </div>
                </div>
                
                {/* 이미지 관리 버튼 (향후 구현) */}
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
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
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
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/course-image.jpg"
                    disabled={isSubmitting || loading}
                  />
                  {formData.imageUrl && (
                    <p className="text-xs text-gray-500 mt-1">
                      ✓ 이미지 URL이 설정되었습니다
                    </p>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-medium">이미지 가이드라인:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                    <li>권장 비율: 16:9 (1920x1080px)</li>
                    <li>최대 파일 크기: 5MB</li>
                    <li>지원 형식: JPG, PNG, WebP</li>
                    <li>고화질 이미지 권장</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">
              연락처 정보
            </label>
            <textarea
              id="contactInfo"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="전화번호, 이메일 등 연락처 정보를 입력하세요"
              disabled={isSubmitting || loading}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting || loading}
            >
              <option value="ACTIVE">활성</option>
              <option value="CLOSED">폐쇄</option>
              <option value="MAINTENANCE">보수중</option>
              <option value="PENDING">대기중</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isSubmitting || loading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {(isSubmitting || loading) ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  저장 중...
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