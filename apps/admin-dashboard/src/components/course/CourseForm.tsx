import React, { useState, useEffect } from 'react';
import type { Course, CourseStatus, DifficultyLevel, CourseType, CreateCourseDto } from '../../types/course';
import { COURSE_FACILITIES, COURSE_AMENITIES, WEEK_DAYS } from '../../types/course';

interface CourseFormProps {
  course?: Course | null;
  onSuccess: (courseData: Partial<Course>) => void;
  onCancel: () => void;
  isLoading: boolean;
  companies: Array<{ id: number; name: string; }>;
}

interface FormData {
  name: string;
  companyId: number;
  description: string;
  address: string;
  phoneNumber: string;
  email: string;
  website: string;
  imageUrl: string;
  holeCount: number;
  par: number;
  yardage: number;
  courseRating: number;
  slopeRating: number;
  difficultyLevel: DifficultyLevel;
  courseType: CourseType;
  facilities: string[];
  amenities: string[];
  dressCode: string;
  weekdayPrice: number;
  weekendPrice: number;
  memberPrice: number;
  cartFee: number;
  caddyFee: number;
  status: CourseStatus;
  openTime: string;
  closeTime: string;
  restDays: string[];
  establishedDate: string;
}

interface FormErrors {
  name?: string;
  companyId?: string;
  holeCount?: string;
  par?: string;
  yardage?: string;
  courseRating?: string;
  slopeRating?: string;
  weekdayPrice?: string;
  weekendPrice?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  openTime?: string;
  closeTime?: string;
}

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  onSuccess,
  onCancel,
  isLoading,
  companies
}) => {
  const isEdit = !!course;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    companyId: 0,
    description: '',
    address: '',
    phoneNumber: '',
    email: '',
    website: '',
    imageUrl: '',
    holeCount: 18,
    par: 72,
    yardage: 6500,
    courseRating: 72.0,
    slopeRating: 125,
    difficultyLevel: 'INTERMEDIATE',
    courseType: 'CHAMPIONSHIP',
    facilities: [],
    amenities: [],
    dressCode: '',
    weekdayPrice: 100000,
    weekendPrice: 150000,
    memberPrice: 80000,
    cartFee: 30000,
    caddyFee: 50000,
    status: 'ACTIVE',
    openTime: '06:00',
    closeTime: '18:00',
    restDays: [],
    establishedDate: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        companyId: course.companyId,
        description: course.description || '',
        address: course.address || '',
        phoneNumber: course.phoneNumber || '',
        email: course.email || '',
        website: course.website || '',
        imageUrl: course.imageUrl || '',
        holeCount: course.holeCount,
        par: course.par,
        yardage: course.yardage,
        courseRating: course.courseRating,
        slopeRating: course.slopeRating,
        difficultyLevel: course.difficultyLevel,
        courseType: course.courseType,
        facilities: course.facilities,
        amenities: course.amenities,
        dressCode: course.dressCode || '',
        weekdayPrice: course.weekdayPrice,
        weekendPrice: course.weekendPrice,
        memberPrice: course.memberPrice || 0,
        cartFee: course.cartFee || 0,
        caddyFee: course.caddyFee || 0,
        status: course.status,
        openTime: course.openTime,
        closeTime: course.closeTime,
        restDays: course.restDays,
        establishedDate: course.establishedDate ? course.establishedDate.toISOString().split('T')[0] : ''
      });
    }
  }, [course]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = '코스명은 필수입니다.';
    }

    if (!formData.companyId) {
      newErrors.companyId = '골프장을 선택해주세요.';
    }

    if (formData.holeCount < 1 || formData.holeCount > 27) {
      newErrors.holeCount = '홀 수는 1~27 사이여야 합니다.';
    }

    if (formData.par < 30 || formData.par > 90) {
      newErrors.par = '파는 30~90 사이여야 합니다.';
    }

    if (formData.yardage < 1000 || formData.yardage > 10000) {
      newErrors.yardage = '야디지는 1000~10000 사이여야 합니다.';
    }

    if (formData.courseRating < 60 || formData.courseRating > 80) {
      newErrors.courseRating = '코스 레이팅은 60~80 사이여야 합니다.';
    }

    if (formData.slopeRating < 55 || formData.slopeRating > 155) {
      newErrors.slopeRating = '슬로프 레이팅은 55~155 사이여야 합니다.';
    }

    if (formData.weekdayPrice < 10000) {
      newErrors.weekdayPrice = '평일 가격은 10,000원 이상이어야 합니다.';
    }

    if (formData.weekendPrice < 10000) {
      newErrors.weekendPrice = '주말 가격은 10,000원 이상이어야 합니다.';
    }

    if (formData.phoneNumber && !/^0\d{1,2}-\d{3,4}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '연락처 형식이 올바르지 않습니다. (예: 02-1234-5678)';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '이메일 형식이 올바르지 않습니다.';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = '웹사이트 URL 형식이 올바르지 않습니다.';
    }

    if (formData.openTime >= formData.closeTime) {
      newErrors.openTime = '개장시간은 폐장시간보다 빨라야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (field: 'facilities' | 'amenities' | 'restDays', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const submitData: Partial<Course> = {
        ...formData,
        establishedDate: formData.establishedDate ? new Date(formData.establishedDate) : new Date()
      };
      
      onSuccess(submitData);
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEdit ? '코스 정보 수정' : '새 코스 등록'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit ? '코스의 기본 정보를 수정합니다.' : '새로운 골프 코스를 등록합니다.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  코스명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 그린밸리 챔피언십 코스"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Company */}
              <div>
                <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
                  골프장 <span className="text-red-500">*</span>
                </label>
                <select
                  id="companyId"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.companyId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">골프장을 선택하세요</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.companyId && <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  연락처
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="02-1234-5678"
                />
                {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="info@course.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Course Specifications */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">코스 사양</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hole Count */}
              <div>
                <label htmlFor="holeCount" className="block text-sm font-medium text-gray-700 mb-1">
                  홀 수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="holeCount"
                  name="holeCount"
                  value={formData.holeCount}
                  onChange={handleNumberChange}
                  min="1"
                  max="27"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.holeCount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.holeCount && <p className="mt-1 text-sm text-red-600">{errors.holeCount}</p>}
              </div>

              {/* Par */}
              <div>
                <label htmlFor="par" className="block text-sm font-medium text-gray-700 mb-1">
                  파 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="par"
                  name="par"
                  value={formData.par}
                  onChange={handleNumberChange}
                  min="30"
                  max="90"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.par ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.par && <p className="mt-1 text-sm text-red-600">{errors.par}</p>}
              </div>

              {/* Yardage */}
              <div>
                <label htmlFor="yardage" className="block text-sm font-medium text-gray-700 mb-1">
                  야디지 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="yardage"
                  name="yardage"
                  value={formData.yardage}
                  onChange={handleNumberChange}
                  min="1000"
                  max="10000"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.yardage ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.yardage && <p className="mt-1 text-sm text-red-600">{errors.yardage}</p>}
              </div>

              {/* Course Rating */}
              <div>
                <label htmlFor="courseRating" className="block text-sm font-medium text-gray-700 mb-1">
                  코스 레이팅 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="courseRating"
                  name="courseRating"
                  value={formData.courseRating}
                  onChange={handleNumberChange}
                  min="60"
                  max="80"
                  step="0.1"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.courseRating ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.courseRating && <p className="mt-1 text-sm text-red-600">{errors.courseRating}</p>}
              </div>

              {/* Slope Rating */}
              <div>
                <label htmlFor="slopeRating" className="block text-sm font-medium text-gray-700 mb-1">
                  슬로프 레이팅 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="slopeRating"
                  name="slopeRating"
                  value={formData.slopeRating}
                  onChange={handleNumberChange}
                  min="55"
                  max="155"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.slopeRating ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.slopeRating && <p className="mt-1 text-sm text-red-600">{errors.slopeRating}</p>}
              </div>

              {/* Difficulty Level */}
              <div>
                <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  난이도
                </label>
                <select
                  id="difficultyLevel"
                  name="difficultyLevel"
                  value={formData.difficultyLevel}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="BEGINNER">초급</option>
                  <option value="INTERMEDIATE">중급</option>
                  <option value="ADVANCED">고급</option>
                  <option value="PROFESSIONAL">프로</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">가격 정보</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="weekdayPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  평일 가격 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="weekdayPrice"
                  name="weekdayPrice"
                  value={formData.weekdayPrice}
                  onChange={handleNumberChange}
                  min="10000"
                  step="1000"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.weekdayPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.weekdayPrice && <p className="mt-1 text-sm text-red-600">{errors.weekdayPrice}</p>}
              </div>

              <div>
                <label htmlFor="weekendPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  주말 가격 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="weekendPrice"
                  name="weekendPrice"
                  value={formData.weekendPrice}
                  onChange={handleNumberChange}
                  min="10000"
                  step="1000"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.weekendPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.weekendPrice && <p className="mt-1 text-sm text-red-600">{errors.weekendPrice}</p>}
              </div>

              <div>
                <label htmlFor="memberPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  회원 가격
                </label>
                <input
                  type="number"
                  id="memberPrice"
                  name="memberPrice"
                  value={formData.memberPrice}
                  onChange={handleNumberChange}
                  min="0"
                  step="1000"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              코스 설명
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="코스에 대한 간단한 설명을 입력하세요..."
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                운영 상태
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ACTIVE">활성</option>
                <option value="MAINTENANCE">점검 중</option>
                <option value="INACTIVE">비활성</option>
                <option value="PENDING">대기 중</option>
              </select>
            </div>

            <div>
              <label htmlFor="courseType" className="block text-sm font-medium text-gray-700 mb-1">
                코스 타입
              </label>
              <select
                id="courseType"
                name="courseType"
                value={formData.courseType}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CHAMPIONSHIP">챔피언십</option>
                <option value="PRACTICE">연습용</option>
                <option value="EXECUTIVE">이그제큐티브</option>
                <option value="RESORT">리조트</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isLoading || isSubmitting) && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isEdit ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
};