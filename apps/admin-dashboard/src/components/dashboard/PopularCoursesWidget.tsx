import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PopularCourse {
  id: number;
  name: string;
  companyName: string;
  bookings: number;
  revenue: number;
  growth: number;
}

interface PopularCoursesWidgetProps {
  courses: PopularCourse[];
}

export const PopularCoursesWidget: React.FC<PopularCoursesWidgetProps> = ({ courses }) => {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatGrowth = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">인기 코스 TOP 5</h3>
            <p className="text-sm text-gray-500 mt-1">
              이번 주 가장 많이 예약된 코스
            </p>
          </div>
          
          <button
            onClick={() => navigate('/course-management')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            전체 보기 →
          </button>
        </div>

        {/* Course List */}
        <div className="space-y-4">
          {courses.map((course, index) => (
            <div 
              key={course.id}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              <div className="flex items-center space-x-4">
                {/* Rank */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-600' :
                  'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                
                {/* Course Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{course.name}</h4>
                  <p className="text-xs text-gray-500">{course.companyName}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-6">
                {/* Bookings */}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{course.bookings}건</p>
                  <p className="text-xs text-gray-500">예약</p>
                </div>
                
                {/* Revenue */}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(course.revenue)}</p>
                  <p className="text-xs text-gray-500">매출</p>
                </div>
                
                {/* Growth */}
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    course.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatGrowth(course.growth)}
                  </p>
                  <p className="text-xs text-gray-500">성장률</p>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">상위 5개 코스 총 예약</p>
              <p className="text-lg font-semibold text-gray-900">
                {courses.reduce((sum, c) => sum + c.bookings, 0).toLocaleString()}건
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">상위 5개 코스 총 매출</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(courses.reduce((sum, c) => sum + c.revenue, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};