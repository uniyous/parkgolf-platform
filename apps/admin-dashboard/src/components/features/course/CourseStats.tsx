import React from 'react';
import type { Course } from '@/types/course';

interface CourseStatsProps {
  courses: Course[];
}

export const CourseStats: React.FC<CourseStatsProps> = ({ courses }) => {
  // Calculate statistics
  const totalCourses = courses.length;
  const activeCourses = courses.filter(c => c.status === 'ACTIVE').length;
  const inactiveCourses = courses.filter(c => c.status === 'INACTIVE').length;
  const maintenanceCourses = courses.filter(c => c.status === 'MAINTENANCE').length;

  const totalHoles = courses.reduce((sum, c) => sum + c.holeCount, 0);
  const averagePar = totalCourses > 0 ? courses.reduce((sum, c) => sum + c.par, 0) / totalCourses : 0;
  const totalRevenue = courses.reduce((sum, c) => sum + c.totalRevenue, 0);
  const averageRevenue = totalCourses > 0 ? totalRevenue / totalCourses : 0;

  // Find top performer
  const topPerformer = courses.reduce((prev, current) => 
    prev && prev.totalRevenue > current.totalRevenue ? prev : current
  , courses[0]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const stats = [
    {
      title: '전체 코스',
      value: totalCourses.toLocaleString(),
      subtitle: `활성 ${activeCourses}개`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      percentage: totalCourses > 0 ? (activeCourses / totalCourses) * 100 : 0
    },
    {
      title: '총 홀 수',
      value: totalHoles.toLocaleString(),
      subtitle: `평균 ${totalCourses > 0 ? (totalHoles / totalCourses).toFixed(1) : 0}홀`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      percentage: 75 // Mock percentage for holes utilization
    },
    {
      title: '총 매출',
      value: formatCurrency(totalRevenue),
      subtitle: `평균 ${formatCurrency(averageRevenue)}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      percentage: 88 // Mock performance percentage
    },
    {
      title: '평균 파',
      value: averagePar.toFixed(1),
      subtitle: topPerformer ? `최고 ${topPerformer.name}` : '데이터 없음',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      percentage: 82 // Mock difficulty rating
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.lightColor}`}>
                <div className={`${stat.textColor}`}>
                  {stat.icon}
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${stat.textColor}`}>
                  {stat.percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">성과 지표</div>
              </div>
            </div>

            {/* Content */}
            <div>
              <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>진행률</span>
                <span>{stat.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${stat.color}`}
                  style={{ width: `${stat.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
};