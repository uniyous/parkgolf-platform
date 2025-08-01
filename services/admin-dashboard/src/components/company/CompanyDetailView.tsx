import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Company, CompanyStatus } from '../../types/company';
import { 
  CourseDetailContainer, 
  CourseFormModal,
  FlexibleCourseDetail, 
  CourseCard, 
  CourseWidget 
} from '../course';
import type { Course as CourseType, CreateCourseDto, UpdateCourseDto } from '../../types';
import { courseApi } from '../../api/courseApi';

interface CompanyDetailViewProps {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: CompanyStatus) => void;
}

interface BookingTrend {
  month: string;
  bookings: number;
  revenue: number;
}

const mockBookingTrends: BookingTrend[] = [
  { month: '1월', bookings: 180, revenue: 9500000 },
  { month: '2월', bookings: 165, revenue: 8800000 },
  { month: '3월', bookings: 220, revenue: 12000000 },
  { month: '4월', bookings: 245, revenue: 13500000 },
  { month: '5월', bookings: 280, revenue: 15200000 },
  { month: '6월', bookings: 310, revenue: 17800000 }
];

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({
  company,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'analytics' | 'settings'>('overview');
  const [selectedCourse, setSelectedCourse] = useState<CourseType | null>(null);
  const [courseModalMode, setCourseModalMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [courseFormModalOpen, setCourseFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseType | null>(null);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseViewMode, setCourseViewMode] = useState<'table' | 'cards' | 'list' | 'widgets'>('table');

  // 코스 데이터 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      if (activeTab === 'courses' && company.id) {
        setCoursesLoading(true);
        setCoursesError(null);
        try {
          const coursesData = await courseApi.getCoursesByCompany(company.id);
          console.log('Fetched courses data:', coursesData, 'Type:', typeof coursesData, 'Is array:', Array.isArray(coursesData));
          setCourses(Array.isArray(coursesData) ? coursesData : []);
        } catch (error: any) {
          console.error('Failed to fetch courses:', error);
          setCoursesError(error?.message || '코스 정보를 불러오는데 실패했습니다.');
        } finally {
          setCoursesLoading(false);
        }
      }
    };

    fetchCourses();
  }, [activeTab, company.id]);

  // 코스 상세보기 핸들러
  const handleCourseView = (course: CourseType) => {
    setSelectedCourse(course);
    setCourseModalMode('view');
  };

  // 코스 수정 핸들러
  const handleCourseEdit = (course: CourseType) => {
    setEditingCourse(course);
    setCourseFormModalOpen(true);
  };

  // 새 코스 추가 핸들러
  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseFormModalOpen(true);
  };

  // 코스 폼 제출 핸들러
  const handleCourseSubmit = async (data: CreateCourseDto | UpdateCourseDto): Promise<boolean> => {
    try {
      if (editingCourse) {
        // 수정
        await courseApi.updateCourse(editingCourse.id, data as UpdateCourseDto);
        alert('코스가 성공적으로 수정되었습니다.');
      } else {
        // 생성
        const createData = { ...data, companyId: company.id } as CreateCourseDto;
        await courseApi.createCourse(createData);
        alert('새 코스가 성공적으로 생성되었습니다.');
      }
      
      // 코스 목록 새로고침
      const updatedCourses = await courseApi.getCoursesByCompany(company.id);
      setCourses(Array.isArray(updatedCourses) ? updatedCourses : []);
      setCourseFormModalOpen(false);
      return true;
    } catch (error: any) {
      console.error('Course submit error:', error);
      alert(`코스 ${editingCourse ? '수정' : '생성'}에 실패했습니다: ${error.message}`);
      return false;
    }
  };

  // 코스 업데이트 핸들러 (상세보기용)
  const handleUpdateCourse = async (courseId: number, data: UpdateCourseDto): Promise<boolean> => {
    try {
      await courseApi.updateCourse(courseId, data);
      
      // 코스 목록 새로고침
      const updatedCourses = await courseApi.getCoursesByCompany(company.id);
      setCourses(Array.isArray(updatedCourses) ? updatedCourses : []);
      
      // 선택된 코스 정보도 업데이트
      if (selectedCourse?.id === courseId) {
        const updatedCourse = await courseApi.getCourseById(courseId);
        setSelectedCourse(updatedCourse);
      }
      
      alert('코스가 성공적으로 업데이트되었습니다.');
      return true;
    } catch (error: any) {
      console.error('Update course error:', error);
      alert(`코스 업데이트에 실패했습니다: ${error.message}`);
      return false;
    }
  };

  // 모달 닫기 핸들러
  const handleCloseCourseModal = () => {
    setSelectedCourse(null);
    setCourseModalMode(null);
  };

  // 코스 리스트로 돌아가기
  const handleBackToCourseList = () => {
    setSelectedCourse(null);
    setCourseModalMode(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return '정보없음';
      }
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.warn('Date formatting error:', error);
      return '정보없음';
    }
  };

  const getStatusBadge = (status: CompanyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '활성', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'INACTIVE':
        return { label: '비활성', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'MAINTENANCE':
        return { label: '점검', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getCourseStatusBadge = (status: CourseType['status']) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '운영중', color: 'bg-green-100 text-green-800' };
      case 'MAINTENANCE':
        return { label: '점검중', color: 'bg-yellow-100 text-yellow-800' };
      case 'INACTIVE':
        return { label: '비활성', color: 'bg-red-100 text-red-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return stars;
  };

  const statusBadge = getStatusBadge(company.status);

  const tabs = [
    { id: 'overview', label: '개요', icon: '📊' },
    { id: 'courses', label: '코스 관리', icon: '⛳' },
    { id: 'analytics', label: '분석', icon: '📈' },
    { id: 'settings', label: '설정', icon: '⚙️' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Company Logo */}
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-600">
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Company Info */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div><span className="font-medium">사업자번호:</span> {company.businessNumber}</div>
                  <div><span className="font-medium">연락처:</span> {company.phoneNumber}</div>
                  <div><span className="font-medium">이메일:</span> {company.email}</div>
                  <div><span className="font-medium">설립일:</span> {formatDate(company.establishedDate)}</div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">주소:</span> {company.address}
                </div>
                
                {company.description && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">설명:</span> {company.description}
                  </div>
                )}

                <div className="mt-3 flex items-center space-x-1">
                  {getRatingStars(Math.round(company.averageRating || 0))}
                  <span className="text-sm text-gray-600 ml-2">
                    {(company.averageRating || 0).toFixed(1)} (평균 평점)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              <button
                onClick={onEdit}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </button>
              
              <div className="flex space-x-2">
                {company.status !== 'ACTIVE' && (
                  <button
                    onClick={() => onUpdateStatus('ACTIVE')}
                    className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    활성화
                  </button>
                )}
                {company.status === 'ACTIVE' && (
                  <button
                    onClick={() => onUpdateStatus('MAINTENANCE')}
                    className="inline-flex items-center px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    점검모드
                  </button>
                )}
              </div>
              
              <button
                onClick={onDelete}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{company.coursesCount || 0}</div>
              <div className="text-sm text-gray-500">운영 코스</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(company.totalRevenue || 0)}</div>
              <div className="text-sm text-gray-500">총 매출</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{company.totalBookings || 0}</div>
              <div className="text-sm text-gray-500">총 예약</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(company.monthlyRevenue || 0)}</div>
              <div className="text-sm text-gray-500">월 평균 매출</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">등록일</span>
                      <span className="font-medium">{formatDate(company.createdAt || new Date())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">최근 수정</span>
                      <span className="font-medium">{formatDate(company.updatedAt || new Date())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">활성 상태</span>
                      <span className="font-medium">{company.isActive ? '활성' : '비활성'}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">성과 지표</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">평균 평점</span>
                      <div className="flex items-center">
                        {getRatingStars(Math.round(company.averageRating || 0))}
                        <span className="ml-1 font-medium">{(company.averageRating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">코스당 평균 예약</span>
                      <span className="font-medium">
                        {(company.coursesCount || 0) > 0 ? Math.round((company.totalBookings || 0) / (company.coursesCount || 1)) : 0}건
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">코스당 평균 매출</span>
                      <span className="font-medium">
                        {formatCurrency((company.coursesCount || 0) > 0 ? (company.totalRevenue || 0) / (company.coursesCount || 1) : 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              {/* Header with view mode toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">코스 관리</h3>
                <div className="flex items-center space-x-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">표시 방식:</span>
                    <select
                      value={courseViewMode}
                      onChange={(e) => setCourseViewMode(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="table">테이블형</option>
                      <option value="cards">카드형</option>
                      <option value="list">목록형</option>
                      <option value="widgets">위젯형</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={handleAddCourse}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    새 코스 추가
                  </button>
                </div>
              </div>

              {/* Loading state */}
              {coursesLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">코스 정보를 불러오는 중...</span>
                </div>
              )}

              {/* Error state */}
              {coursesError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {coursesError}
                  </div>
                </div>
              )}


              {/* Courses display */}
              {!coursesLoading && !coursesError && (
                <>
                  {!Array.isArray(courses) || courses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>등록된 코스가 없습니다.</p>
                      <button
                        onClick={handleAddCourse}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                      >
                        첫 번째 코스를 추가해보세요
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Table Mode */}
                      {courseViewMode === 'table' && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이미지</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">코스명</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주소</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {courses.map((course) => (
                                <tr 
                                  key={course.id} 
                                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                                  onClick={() => handleCourseView(course)}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                                      {course.imageUrl ? (
                                        <img 
                                          src={course.imageUrl} 
                                          alt={course.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const fallback = target.nextElementSibling as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div className={`w-full h-full flex items-center justify-center text-gray-400 text-xs ${course.imageUrl ? 'hidden' : 'flex'}`}>
                                        없음
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{course.name}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                      {course.description || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                      {course.address || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {course.phoneNumber || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      getCourseStatusBadge(course.status).color
                                    }`}>
                                      {getCourseStatusBadge(course.status).label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCourseEdit(course);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-900"
                                      >
                                        수정
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/courses/${course.id}/timeslots`);
                                        }}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        타임슬롯
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Cards Mode */}
                      {courseViewMode === 'cards' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Array.isArray(courses) && courses.map((course) => (
                            <CourseCard
                              key={course.id}
                              course={course}
                              context="management"
                              onEdit={handleCourseEdit}
                              onViewHoles={() => handleCourseView(course)}
                            />
                          ))}
                        </div>
                      )}

                      {/* List Mode */}
                      {courseViewMode === 'list' && (
                        <div className="space-y-4">
                          {Array.isArray(courses) && courses.map((course) => (
                            <FlexibleCourseDetail
                              key={course.id}
                              course={course}
                              mode="compact"
                              context="management"
                              className="border-l-4 border-blue-500"
                              onEdit={handleCourseEdit}
                              onViewHoles={() => handleCourseView(course)}
                            />
                          ))}
                        </div>
                      )}

                      {/* Widgets Mode */}
                      {courseViewMode === 'widgets' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {Array.isArray(courses) && courses.map((course) => (
                            <CourseWidget
                              key={course.id}
                              course={course}
                              context="management"
                              onEdit={handleCourseEdit}
                              onViewHoles={() => handleCourseView(course)}
                            />
                          ))}
                        </div>
                      )}

                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">예약 및 매출 분석</h3>
              
              {/* Monthly Trends */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">월별 트렌드</h4>
                <div className="space-y-4">
                  {mockBookingTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="w-16 text-sm text-gray-600">{trend.month}</div>
                      <div className="flex-1 mx-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>예약: {trend.bookings}건</span>
                          <span>매출: {formatCurrency(trend.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(trend.bookings / 350) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-green-600">전월 대비 예약 증가</p>
                      <p className="text-2xl font-bold text-green-900">+12.5%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-blue-600">평균 예약 금액</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency((company.totalBookings || 0) > 0 ? (company.totalRevenue || 0) / (company.totalBookings || 1) : 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-purple-600">고객 만족도</p>
                      <p className="text-2xl font-bold text-purple-900">{(company.averageRating || 0).toFixed(1)}/5.0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">회사 설정</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Management */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">상태 관리</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">현재 상태</span>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => onUpdateStatus('ACTIVE')}
                        disabled={company.status === 'ACTIVE'}
                        className="w-full px-4 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        활성화
                      </button>
                      <button
                        onClick={() => onUpdateStatus('MAINTENANCE')}
                        disabled={company.status === 'MAINTENANCE'}
                        className="w-full px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        점검 모드
                      </button>
                      <button
                        onClick={() => onUpdateStatus('INACTIVE')}
                        disabled={company.status === 'INACTIVE'}
                        className="w-full px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        비활성화
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h4 className="text-md font-medium text-red-900 mb-4">위험 영역</h4>
                  <div className="space-y-4">
                    <p className="text-sm text-red-700">
                      이 섹션의 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
                    </p>
                    
                    <button
                      onClick={onDelete}
                      className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      회사 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 코스 상세보기 모달 */}
      {courseModalMode === 'view' && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">코스 상세 정보</h2>
                <button
                  onClick={handleCloseCourseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <CourseDetailContainer
                course={selectedCourse}
                onBack={handleBackToCourseList}
                onUpdateCourse={handleUpdateCourse}
              />
            </div>
          </div>
        </div>
      )}

      {/* 코스 생성/수정 모달 */}
      {courseFormModalOpen && (
        <CourseFormModal
          course={editingCourse}
          isOpen={courseFormModalOpen}
          onClose={() => setCourseFormModalOpen(false)}
          onSubmit={handleCourseSubmit}
        />
      )}
    </div>
  );
};