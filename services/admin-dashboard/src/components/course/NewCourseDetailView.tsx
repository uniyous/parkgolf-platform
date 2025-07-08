import React, { useState } from 'react';
import type { Course, CourseStatus, Hole, BookingTrend } from '../../types/course';

interface NewCourseDetailViewProps {
  course: Course;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: CourseStatus) => void;
}

// Mock data for holes and analytics
const mockHoles: Hole[] = [
  { id: 1, courseId: 1, holeNumber: 1, par: 4, yardage: 420, handicap: 10, description: '스트레이트 홀', tips: '티샷은 페어웨이 중앙을 노리세요', createdAt: new Date(), updatedAt: new Date() },
  { id: 2, courseId: 1, holeNumber: 2, par: 3, yardage: 165, handicap: 18, description: '쇼트 홀', tips: '핀 위치를 정확히 확인하세요', createdAt: new Date(), updatedAt: new Date() },
  { id: 3, courseId: 1, holeNumber: 3, par: 5, yardage: 520, handicap: 2, description: '롱 홀', tips: '2타로 그린온을 노릴 수 있습니다', createdAt: new Date(), updatedAt: new Date() },
  { id: 4, courseId: 1, holeNumber: 4, par: 4, yardage: 385, handicap: 14, description: '도그레그 홀', tips: '왼쪽 도그레그를 조심하세요', createdAt: new Date(), updatedAt: new Date() },
  { id: 5, courseId: 1, holeNumber: 5, par: 4, yardage: 445, handicap: 6, description: '업힐 홀', tips: '업힐이므로 클럽 선택에 주의', createdAt: new Date(), updatedAt: new Date() },
  { id: 6, courseId: 1, holeNumber: 6, par: 3, yardage: 185, handicap: 16, description: '아일랜드 그린', tips: '물 해저드 주의', createdAt: new Date(), updatedAt: new Date() },
  { id: 7, courseId: 1, holeNumber: 7, par: 4, yardage: 410, handicap: 8, description: '벙커가 많은 홀', tips: '벙커를 피해 안전하게', createdAt: new Date(), updatedAt: new Date() },
  { id: 8, courseId: 1, holeNumber: 8, par: 5, yardage: 565, handicap: 4, description: '시그니처 홀', tips: '코스의 대표 홀입니다', createdAt: new Date(), updatedAt: new Date() },
  { id: 9, courseId: 1, holeNumber: 9, par: 4, yardage: 395, handicap: 12, description: '클럽하우스 뷰', tips: '마지막 홀, 좋은 스코어로 마무리', createdAt: new Date(), updatedAt: new Date() }
];

const mockBookingTrends: BookingTrend[] = [
  { month: '1월', bookings: 145, revenue: 18500000, averageRating: 4.7 },
  { month: '2월', bookings: 132, revenue: 16800000, averageRating: 4.6 },
  { month: '3월', bookings: 178, revenue: 22700000, averageRating: 4.8 },
  { month: '4월', bookings: 189, revenue: 24100000, averageRating: 4.9 },
  { month: '5월', bookings: 203, revenue: 25900000, averageRating: 4.8 },
  { month: '6월', bookings: 195, revenue: 24900000, averageRating: 4.7 }
];

export const NewCourseDetailView: React.FC<NewCourseDetailViewProps> = ({
  course,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'holes' | 'analytics' | 'settings'>('overview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '활성', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'INACTIVE':
        return { label: '비활성', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'MAINTENANCE':
        return { label: '점검', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'PENDING':
        return { label: '대기', color: 'bg-gray-100 text-gray-800 border-gray-200' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getDifficultyBadge = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return { label: '초급', color: 'bg-blue-100 text-blue-800' };
      case 'INTERMEDIATE':
        return { label: '중급', color: 'bg-yellow-100 text-yellow-800' };
      case 'ADVANCED':
        return { label: '고급', color: 'bg-orange-100 text-orange-800' };
      case 'PROFESSIONAL':
        return { label: '프로', color: 'bg-red-100 text-red-800' };
      default:
        return { label: level, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CHAMPIONSHIP':
        return '🏆';
      case 'PRACTICE':
        return '🎯';
      case 'EXECUTIVE':
        return '💼';
      case 'RESORT':
        return '🏖️';
      default:
        return '⛳';
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

  const statusBadge = getStatusBadge(course.status);
  const difficultyBadge = getDifficultyBadge(course.difficultyLevel);

  const tabs = [
    { id: 'overview', label: '개요', icon: '📊' },
    { id: 'holes', label: '홀 정보', icon: '⛳' },
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
              {/* Course Image */}
              <div className="w-32 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                {course.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.name}
                    className="w-32 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-4xl">
                    {getTypeIcon(course.courseType)}
                  </span>
                )}
              </div>

              {/* Course Info */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${difficultyBadge.color}`}>
                    {difficultyBadge.label}
                  </span>
                  {course.website && (
                    <a
                      href={course.website}
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
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div><span className="font-medium">골프장:</span> {course.companyName}</div>
                  <div><span className="font-medium">연락처:</span> {course.phoneNumber}</div>
                  <div><span className="font-medium">이메일:</span> {course.email}</div>
                  <div><span className="font-medium">영업시간:</span> {course.openTime} - {course.closeTime}</div>
                </div>
                
                {course.address && (
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">주소:</span> {course.address}
                  </div>
                )}
                
                {course.description && (
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">설명:</span> {course.description}
                  </div>
                )}

                <div className="flex items-center space-x-1">
                  {getRatingStars(Math.round(course.averageRating))}
                  <span className="text-sm text-gray-600 ml-2">
                    {course.averageRating.toFixed(1)} ({course.reviewCount}개 리뷰)
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
                {course.status !== 'ACTIVE' && (
                  <button
                    onClick={() => onUpdateStatus('ACTIVE')}
                    className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    활성화
                  </button>
                )}
                {course.status === 'ACTIVE' && (
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
          <div className="grid grid-cols-6 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{course.holeCount}</div>
              <div className="text-sm text-gray-500">홀</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{course.par}</div>
              <div className="text-sm text-gray-500">파</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{course.yardage.toLocaleString()}</div>
              <div className="text-sm text-gray-500">야드</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(course.weekdayPrice)}</div>
              <div className="text-sm text-gray-500">평일 가격</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{course.totalBookings}</div>
              <div className="text-sm text-gray-500">총 예약</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(course.totalRevenue)}</div>
              <div className="text-sm text-gray-500">총 매출</div>
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
                {/* Course Specifications */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">코스 정보</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">코스 레이팅</span>
                      <span className="font-medium">{course.courseRating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">슬로프 레이팅</span>
                      <span className="font-medium">{course.slopeRating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">코스 타입</span>
                      <span className="font-medium">{course.courseType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">휴무일</span>
                      <span className="font-medium">
                        {course.restDays.length > 0 ? course.restDays.join(', ') : '없음'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">가격 정보</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">평일 그린피</span>
                      <span className="font-medium">{formatCurrency(course.weekdayPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">주말 그린피</span>
                      <span className="font-medium">{formatCurrency(course.weekendPrice)}</span>
                    </div>
                    {course.memberPrice && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">회원 가격</span>
                        <span className="font-medium">{formatCurrency(course.memberPrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">카트피</span>
                      <span className="font-medium">{formatCurrency(course.cartFee || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">캐디피</span>
                      <span className="font-medium">{formatCurrency(course.caddyFee || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facilities and Amenities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">시설</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.facilities.map((facility, index) => (
                      <span key={index} className="inline-flex px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">편의시설</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.amenities.map((amenity, index) => (
                      <span key={index} className="inline-flex px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {course.dressCode && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">드레스 코드</h3>
                  <p className="text-gray-600 bg-yellow-50 p-3 rounded-lg">{course.dressCode}</p>
                </div>
              )}
            </div>
          )}

          {/* Holes Tab */}
          {activeTab === 'holes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">홀 정보</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  홀 정보 수정
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockHoles.map((hole) => (
                  <div key={hole.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-900">홀 {hole.holeNumber}</h4>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        파 {hole.par}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>거리</span>
                        <span className="font-medium">{hole.yardage}야드</span>
                      </div>
                      <div className="flex justify-between">
                        <span>핸디캡</span>
                        <span className="font-medium">{hole.handicap}</span>
                      </div>
                    </div>

                    {hole.description && (
                      <div className="mt-3 text-sm text-gray-700">
                        <span className="font-medium">설명:</span> {hole.description}
                      </div>
                    )}

                    {hole.tips && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                        <span className="font-medium">팁:</span> {hole.tips}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Hole Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">홀 요약</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {mockHoles.filter(h => h.par === 3).length}
                    </div>
                    <div className="text-sm text-gray-500">파 3</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {mockHoles.filter(h => h.par === 4).length}
                    </div>
                    <div className="text-sm text-gray-500">파 4</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {mockHoles.filter(h => h.par === 5).length}
                    </div>
                    <div className="text-sm text-gray-500">파 5</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {mockHoles.reduce((sum, h) => sum + h.yardage, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">총 야디지</div>
                  </div>
                </div>
              </div>
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
                          <span>평점: {trend.averageRating.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(trend.bookings / 250) * 100}%` }}
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
                      <p className="text-2xl font-bold text-green-900">+15.2%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-blue-600">평균 라운드 가격</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(course.totalRevenue / course.totalBookings)}</p>
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
                      <p className="text-2xl font-bold text-purple-900">{course.averageRating.toFixed(1)}/5.0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">코스 설정</h3>
              
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
                        disabled={course.status === 'ACTIVE'}
                        className="w-full px-4 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        활성화
                      </button>
                      <button
                        onClick={() => onUpdateStatus('MAINTENANCE')}
                        disabled={course.status === 'MAINTENANCE'}
                        className="w-full px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        점검 모드
                      </button>
                      <button
                        onClick={() => onUpdateStatus('INACTIVE')}
                        disabled={course.status === 'INACTIVE'}
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
                      코스 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};