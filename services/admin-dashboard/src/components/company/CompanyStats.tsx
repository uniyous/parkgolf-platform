import React from 'react';
import type { Company } from '../../types/company';

interface CompanyStatsProps {
  companies: Company[];
}

export const CompanyStats: React.FC<CompanyStatsProps> = ({ companies }) => {
  // Calculate statistics
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'ACTIVE').length;
  const inactiveCompanies = companies.filter(c => c.status === 'INACTIVE').length;
  const maintenanceCompanies = companies.filter(c => c.status === 'MAINTENANCE').length;

  const totalCourses = companies.reduce((sum, c) => sum + c.coursesCount, 0);
  const totalRevenue = companies.reduce((sum, c) => sum + c.totalRevenue, 0);
  const averageRevenue = totalCompanies > 0 ? totalRevenue / totalCompanies : 0;

  // Find top performer
  const topPerformer = companies.reduce((prev, current) => 
    prev && prev.totalRevenue > current.totalRevenue ? prev : current
  , companies[0]);

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
      title: '전체 회사',
      value: totalCompanies.toLocaleString(),
      subtitle: `활성 ${activeCompanies}개`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      percentage: totalCompanies > 0 ? (activeCompanies / totalCompanies) * 100 : 0
    },
    {
      title: '운영 코스',
      value: totalCourses.toLocaleString(),
      subtitle: `평균 ${totalCompanies > 0 ? (totalCourses / totalCompanies).toFixed(1) : 0}개`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      percentage: 85 // Mock percentage for active courses
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
      percentage: 92 // Mock performance percentage
    },
    {
      title: '월 평균 예약',
      value: Math.round(companies.reduce((sum, c) => sum + c.totalBookings, 0) / totalCompanies || 0).toLocaleString(),
      subtitle: topPerformer ? `최고 ${topPerformer.name}` : '데이터 없음',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      percentage: 78 // Mock booking rate
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