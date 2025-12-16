import React from 'react';
import type { User } from '../../types';

interface UserStatsProps {
  users: User[];
}

export const UserStats: React.FC<UserStatsProps> = ({ users }) => {
  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'ACTIVE').length;
  const inactiveUsers = users.filter(user => user.status === 'INACTIVE').length;
  const suspendedUsers = users.filter(user => user.status === 'SUSPENDED').length;
  
  const adminUsers = users.filter(user => user.role === 'ADMIN').length;
  const managerUsers = users.filter(user => user.role === 'MANAGER').length;
  const regularUsers = users.filter(user => user.role === 'USER').length;

  // Recent logins (within last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentLogins = users.filter(user => 
    user.lastLoginAt && user.lastLoginAt > oneWeekAgo
  ).length;

  // Recent registrations (within last 30 days)
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const recentRegistrations = users.filter(user => 
    user.createdAt > oneMonthAgo
  ).length;

  // Calculate percentages
  const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const recentLoginPercentage = totalUsers > 0 ? Math.round((recentLogins / totalUsers) * 100) : 0;

  const stats = [
    {
      title: '전체 사용자',
      value: totalUsers.toLocaleString(),
      subtitle: '등록된 사용자',
      color: 'bg-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: '활성 사용자',
      value: activeUsers.toLocaleString(),
      subtitle: `전체의 ${activePercentage}%`,
      color: 'bg-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: '최근 로그인',
      value: recentLogins.toLocaleString(),
      subtitle: `지난 7일 (${recentLoginPercentage}%)`,
      color: 'bg-purple-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      )
    },
    {
      title: '신규 가입',
      value: recentRegistrations.toLocaleString(),
      subtitle: '지난 30일',
      color: 'bg-orange-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${stat.color} text-white`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {stat.subtitle}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">상태별 분포</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">활성</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{activeUsers}</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${activePercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{activePercentage}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">비활성</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{inactiveUsers}</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-500 h-2 rounded-full" 
                    style={{ width: `${totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {totalUsers > 0 ? Math.round((inactiveUsers / totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">정지</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{suspendedUsers}</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${totalUsers > 0 ? (suspendedUsers / totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {totalUsers > 0 ? Math.round((suspendedUsers / totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Role Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">역할별 분포</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">관리자</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{adminUsers}</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${totalUsers > 0 ? (adminUsers / totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {totalUsers > 0 ? Math.round((adminUsers / totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">매니저</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{managerUsers}</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${totalUsers > 0 ? (managerUsers / totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {totalUsers > 0 ? Math.round((managerUsers / totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">사용자</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{regularUsers}</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${totalUsers > 0 ? (regularUsers / totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {totalUsers > 0 ? Math.round((regularUsers / totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">활동 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activePercentage}%</div>
            <div className="text-sm text-gray-500">활성화율</div>
            <div className="text-xs text-gray-400 mt-1">
              {activeUsers}/{totalUsers} 활성 사용자
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{recentLoginPercentage}%</div>
            <div className="text-sm text-gray-500">최근 활동률</div>
            <div className="text-xs text-gray-400 mt-1">
              지난 7일 내 로그인
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {totalUsers > 0 ? Math.round((recentRegistrations / totalUsers) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">신규 가입률</div>
            <div className="text-xs text-gray-400 mt-1">
              지난 30일 가입
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};