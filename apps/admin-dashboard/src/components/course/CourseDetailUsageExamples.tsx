import React from 'react';
import type { Course } from '../../types';
import { 
  FlexibleCourseDetail, 
  CourseCard, 
  CourseWidget, 
  CoursePreview, 
  CompactCourseDetail 
} from './FlexibleCourseDetail';

// 예시 코스 데이터
const sampleCourse: Course = {
  id: 1,
  companyId: 1,
  name: '파크골프 메인 코스',
  description: '아름다운 자연 경관과 함께하는 18홀 챔피언십 코스',
  holes: 18,
  par: 72,
  distance: 6800,
  courseType: 'CHAMPIONSHIP',
  grassType: '벤트그라스',
  facilities: ['클럽하우스', '프로샵', '연습장', '레스토랑', '라커룸'],
  weekdayPrice: 80000,
  weekendPrice: 120000,
  cartFee: 40000,
  maxBookingsPerDay: 100,
  openTime: '06:00',
  closeTime: '18:00',
  maintenanceDays: [],
  images: [],
  holesData: [],
  status: 'ACTIVE',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 코스 상세 정보 컴포넌트 사용 예시 모음
 * 다양한 컨텍스트와 모드에서 어떻게 사용할 수 있는지 보여줍니다.
 */
export const CourseDetailUsageExamples: React.FC = () => {
  const handleEdit = (course: Course) => {
    alert(`${course.name} 수정`);
  };

  const handleDelete = (course: Course) => {
    alert(`${course.name} 삭제`);
  };

  const handleBooking = (course: Course) => {
    alert(`${course.name} 예약하기`);
  };

  const handleViewHoles = (course: Course) => {
    alert(`${course.name} 홀 정보 보기`);
  };

  return (
    <div className="p-6 space-y-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          코스 상세 정보 컴포넌트 활용 예시
        </h1>

        {/* 1. 관리자 화면에서의 다양한 표시 모드 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">1. 관리자 화면 - 다양한 표시 모드</h2>
          
          {/* 카드형 */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">카드형 (Card Mode)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CourseCard
                course={sampleCourse}
                context="management"
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewHoles={handleViewHoles}
              />
              <CourseCard
                course={{ ...sampleCourse, id: 2, name: '이스트 코스', status: 'MAINTENANCE' }}
                context="management"
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewHoles={handleViewHoles}
              />
            </div>
          </div>

          {/* 위젯형 */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">위젯형 (Widget Mode)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <CourseWidget
                course={sampleCourse}
                context="management"
                onEdit={handleEdit}
                onViewHoles={handleViewHoles}
              />
              <CourseWidget
                course={{ ...sampleCourse, id: 2, name: '이스트 코스' }}
                context="management"
                onEdit={handleEdit}
                onViewHoles={handleViewHoles}
              />
              <CourseWidget
                course={{ ...sampleCourse, id: 3, name: '웨스트 코스' }}
                context="management"
                onEdit={handleEdit}
                onViewHoles={handleViewHoles}
              />
            </div>
          </div>

          {/* 컴팩트형 */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">컴팩트형 (Compact Mode)</h3>
            <div className="space-y-4">
              <CompactCourseDetail
                course={sampleCourse}
                context="management"
                className="border-l-4 border-blue-500"
                onEdit={handleEdit}
                onViewHoles={handleViewHoles}
              />
              <CompactCourseDetail
                course={{ ...sampleCourse, id: 2, name: '이스트 코스', status: 'MAINTENANCE' }}
                context="management"
                className="border-l-4 border-yellow-500"
                onEdit={handleEdit}
                onViewHoles={handleViewHoles}
              />
            </div>
          </div>
        </section>

        {/* 2. 예약 화면에서의 사용 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">2. 예약 화면 - 사용자 중심</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="card"
              context="booking"
              onBooking={handleBooking}
              onViewHoles={handleViewHoles}
              sections={{
                basicInfo: true,
                facilities: true,
                pricing: true,
                actions: true
              }}
            />
            <FlexibleCourseDetail
              course={{ ...sampleCourse, id: 2, name: '이스트 코스', weekdayPrice: 60000, weekendPrice: 90000 }}
              mode="card"
              context="booking"
              onBooking={handleBooking}
              onViewHoles={handleViewHoles}
              sections={{
                basicInfo: true,
                facilities: true,
                pricing: true,
                actions: true
              }}
            />
          </div>
        </section>

        {/* 3. 대시보드에서의 사용 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">3. 대시보드 - 통계 중심</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="widget"
              context="dashboard"
              sections={{
                basicInfo: true,
                statistics: true
              }}
            />
            <FlexibleCourseDetail
              course={{ ...sampleCourse, id: 2, name: '이스트 코스' }}
              mode="widget"
              context="dashboard"
              sections={{
                basicInfo: true,
                statistics: true
              }}
            />
            <FlexibleCourseDetail
              course={{ ...sampleCourse, id: 3, name: '웨스트 코스' }}
              mode="widget"
              context="dashboard"
              sections={{
                basicInfo: true,
                statistics: true
              }}
            />
          </div>
        </section>

        {/* 4. 미리보기 모드 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">4. 미리보기 모드</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CoursePreview course={sampleCourse} />
            <CoursePreview course={{ ...sampleCourse, id: 2, name: '이스트 코스' }} />
            <CoursePreview course={{ ...sampleCourse, id: 3, name: '웨스트 코스' }} />
            <CoursePreview course={{ ...sampleCourse, id: 4, name: '노스 코스' }} />
          </div>
        </section>

        {/* 5. 읽기 전용 모드 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">5. 읽기 전용 모드 (공개 페이지)</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="readonly"
              context="public"
              showActions={false}
              sections={{
                basicInfo: true,
                holes: true,
                facilities: true,
                pricing: true,
                schedule: true
              }}
            />
          </div>
        </section>

        {/* 6. 커스텀 섹션 조합 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">6. 커스텀 섹션 조합</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 기본 정보만 */}
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="card"
              context="management"
              sections={{ basicInfo: true, actions: true }}
              className="border-2 border-blue-200"
            />
            
            {/* 가격 정보 중심 */}
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="card"
              context="booking"
              sections={{ basicInfo: true, pricing: true, actions: true }}
              className="border-2 border-green-200"
            />
            
            {/* 통계 중심 */}
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="card"
              context="dashboard"
              sections={{ basicInfo: true, statistics: true }}
              className="border-2 border-purple-200"
            />
          </div>
        </section>

        {/* 7. 반응형 그리드 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">7. 반응형 그리드 레이아웃</h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <FlexibleCourseDetail
              course={sampleCourse}
              mode="full"
              context="management"
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewHoles={handleViewHoles}
            />
            <FlexibleCourseDetail
              course={{ ...sampleCourse, id: 2, name: '이스트 코스', status: 'MAINTENANCE' }}
              mode="full"
              context="management"
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewHoles={handleViewHoles}
            />
          </div>
        </section>
      </div>
    </div>
  );
};