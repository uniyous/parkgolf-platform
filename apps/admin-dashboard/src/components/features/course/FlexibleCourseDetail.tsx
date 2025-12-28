import React, { useState, useEffect } from 'react';
import type { Course, Hole } from '@/types';
import { courseApi } from '@/lib/api/courseApi';

// 표시 모드 타입
export type CourseDetailMode = 
  | 'full'        // 전체 정보
  | 'compact'     // 요약 정보
  | 'card'        // 카드 형태
  | 'widget'      // 위젯 형태
  | 'readonly'    // 읽기 전용
  | 'preview';    // 미리보기

// 컨텍스트 타입
export type CourseDetailContext = 
  | 'management'  // 관리 화면
  | 'booking'     // 예약 화면
  | 'dashboard'   // 대시보드
  | 'report'      // 리포트
  | 'public';     // 공개 페이지

// 표시할 섹션 설정
export interface CourseDetailSections {
  basicInfo?: boolean;
  holes?: boolean;
  facilities?: boolean;
  pricing?: boolean;
  schedule?: boolean;
  statistics?: boolean;
  actions?: boolean;
}

// 메인 Props
export interface FlexibleCourseDetailProps {
  course: Course;
  mode?: CourseDetailMode;
  context?: CourseDetailContext;
  sections?: CourseDetailSections;
  className?: string;
  onEdit?: (course: Course) => void;
  onDelete?: (course: Course) => void;
  onBooking?: (course: Course) => void;
  onViewHoles?: (course: Course) => void;
  showActions?: boolean;
  compact?: boolean;
}

// 기본 섹션 설정
const defaultSections: Record<CourseDetailMode, CourseDetailSections> = {
  full: { basicInfo: true, holes: true, facilities: true, pricing: true, schedule: true, statistics: true, actions: true },
  compact: { basicInfo: true, pricing: true, actions: true },
  card: { basicInfo: true, facilities: true, pricing: true },
  widget: { basicInfo: true, statistics: true },
  readonly: { basicInfo: true, holes: true, facilities: true, pricing: true, schedule: true },
  preview: { basicInfo: true, facilities: true }
};

export const FlexibleCourseDetail: React.FC<FlexibleCourseDetailProps> = ({
  course,
  mode = 'full',
  context = 'management',
  sections: customSections,
  className = '',
  onEdit,
  onDelete,
  onBooking,
  onViewHoles,
  showActions = true,
  compact = false
}) => {
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holesLoading, setHolesLoading] = useState(false);
  
  // 안전한 처리를 위한 검증
  if (!course) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-gray-500">코스 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }
  
  // 섹션 설정 결정
  const sections = customSections || defaultSections[mode];
  
  // 홀 데이터 가져오기
  useEffect(() => {
    if (sections.holes && course.id) {
      setHolesLoading(true);
      courseApi.getHolesByCourse(course.id)
        .then(setHoles)
        .catch(console.error)
        .finally(() => setHolesLoading(false));
    }
  }, [course.id, sections.holes]);

  // 스타일 클래스 결정
  const getContainerClass = () => {
    const baseClass = 'bg-white rounded-lg shadow';
    const modeClasses = {
      full: 'p-6 space-y-6',
      compact: 'p-4 space-y-4',
      card: 'p-4 max-w-md',
      widget: 'p-3 text-sm',
      readonly: 'p-6 space-y-6',
      preview: 'p-4 space-y-3'
    };
    return `${baseClass} ${modeClasses[mode]} ${className}`;
  };

  // 상태 배지 컴포넌트
  const StatusBadge = () => {
    const statusConfig = {
      ACTIVE: { label: '운영중', color: 'bg-green-100 text-green-800' },
      MAINTENANCE: { label: '점검중', color: 'bg-yellow-100 text-yellow-800' },
      INACTIVE: { label: '비활성', color: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[course.status] || { label: course.status || '알 수 없음', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // 기본 정보 섹션
  const BasicInfoSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={mode === 'widget' ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
          {course.name}
        </h3>
        <StatusBadge />
      </div>
      
      {mode !== 'widget' && (
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="space-y-1">
            <div><span className="font-medium">홀 수:</span> {course.holes || 0}홀</div>
            <div><span className="font-medium">파:</span> {course.par || 0}</div>
            {course.distance && (
              <div><span className="font-medium">거리:</span> {course.distance.toLocaleString()}야드</div>
            )}
          </div>
          <div className="space-y-1">
            <div><span className="font-medium">코스 타입:</span> {course.courseType || 'N/A'}</div>
            <div><span className="font-medium">잔디 타입:</span> {course.grassType || 'N/A'}</div>
          </div>
        </div>
      )}
      
      {course.description && mode !== 'compact' && mode !== 'widget' && (
        <p className="text-sm text-gray-600">{course.description}</p>
      )}
    </div>
  );

  // 홀 정보 섹션
  const HolesSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">홀 정보</h4>
        {onViewHoles && (
          <button
            onClick={() => onViewHoles(course)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            상세보기
          </button>
        )}
      </div>
      
      {holesLoading ? (
        <div className="text-sm text-gray-500">홀 정보를 불러오는 중...</div>
      ) : holes.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {holes.slice(0, mode === 'compact' ? 6 : holes.length).map((hole) => (
            <div key={hole.id} className="bg-gray-50 p-2 rounded">
              <div className="font-medium">홀 {hole.holeNumber}</div>
              <div className="text-gray-600">파 {hole.par}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">홀 정보가 없습니다.</div>
      )}
    </div>
  );

  // 시설 정보 섹션
  const FacilitiesSection = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">시설 정보</h4>
      <div className="flex flex-wrap gap-2">
        {course.facilities && course.facilities.length > 0 ? (
          course.facilities.map((facility, index) => (
            <span
              key={index}
              className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {facility}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-500">시설 정보가 없습니다.</span>
        )}
      </div>
    </div>
  );

  // 가격 정보 섹션
  const PricingSection = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">요금 정보</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">평일:</span>
          <span className="ml-2 font-medium">
            {course.weekdayPrice ? 
              new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(course.weekdayPrice) : 
              'N/A'
            }
          </span>
        </div>
        <div>
          <span className="text-gray-600">주말:</span>
          <span className="ml-2 font-medium">
            {course.weekendPrice ? 
              new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(course.weekendPrice) : 
              'N/A'
            }
          </span>
        </div>
        {course.cartFee && (
          <div className="col-span-2">
            <span className="text-gray-600">카트비:</span>
            <span className="ml-2 font-medium">
              {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(course.cartFee)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // 운영 시간 섹션
  const ScheduleSection = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">운영 시간</h4>
      <div className="text-sm text-gray-600">
        <div>오픈: {course.openTime || 'N/A'}</div>
        <div>마감: {course.closeTime || 'N/A'}</div>
        <div>최대 예약 수: {course.maxBookingsPerDay || 0}팀/일</div>
      </div>
    </div>
  );

  // 통계 섹션 (가상 데이터)
  const StatisticsSection = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">통계</h4>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-lg font-bold text-blue-600">85%</div>
          <div className="text-xs text-gray-600">예약률</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-lg font-bold text-green-600">4.5</div>
          <div className="text-xs text-gray-600">평점</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-lg font-bold text-purple-600">120</div>
          <div className="text-xs text-gray-600">월 예약</div>
        </div>
      </div>
    </div>
  );

  // 액션 버튼 섹션
  const ActionsSection = () => {
    if (!showActions) return null;

    const buttonClass = mode === 'compact' || mode === 'widget' 
      ? 'px-2 py-1 text-xs' 
      : 'px-3 py-2 text-sm';

    return (
      <div className="flex space-x-2 pt-3 border-t border-gray-200">
        {context === 'booking' && onBooking && (
          <button
            onClick={() => onBooking(course)}
            className={`${buttonClass} bg-blue-600 text-white rounded hover:bg-blue-700`}
          >
            예약하기
          </button>
        )}
        
        {context === 'management' && (
          <>
            {onEdit && (
              <button
                onClick={() => onEdit(course)}
                className={`${buttonClass} bg-gray-100 text-gray-700 rounded hover:bg-gray-200`}
              >
                수정
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(course)}
                className={`${buttonClass} bg-red-100 text-red-700 rounded hover:bg-red-200`}
              >
                삭제
              </button>
            )}
          </>
        )}
        
        {onViewHoles && (
          <button
            onClick={() => onViewHoles(course)}
            className={`${buttonClass} bg-green-100 text-green-700 rounded hover:bg-green-200`}
          >
            홀 정보
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={getContainerClass()}>
      {sections.basicInfo && <BasicInfoSection />}
      {sections.facilities && <FacilitiesSection />}
      {sections.pricing && <PricingSection />}
      {sections.schedule && <ScheduleSection />}
      {sections.holes && <HolesSection />}
      {sections.statistics && <StatisticsSection />}
      {sections.actions && <ActionsSection />}
    </div>
  );
};

// 편의 컴포넌트들
export const CourseCard: React.FC<Omit<FlexibleCourseDetailProps, 'mode'>> = (props) => (
  <FlexibleCourseDetail {...props} mode="card" />
);

export const CourseWidget: React.FC<Omit<FlexibleCourseDetailProps, 'mode'>> = (props) => (
  <FlexibleCourseDetail {...props} mode="widget" />
);

export const CoursePreview: React.FC<Omit<FlexibleCourseDetailProps, 'mode'>> = (props) => (
  <FlexibleCourseDetail {...props} mode="preview" />
);

export const CompactCourseDetail: React.FC<Omit<FlexibleCourseDetailProps, 'mode'>> = (props) => (
  <FlexibleCourseDetail {...props} mode="compact" />
);