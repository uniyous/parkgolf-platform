import React from 'react';

interface SystemHealth {
  apiStatus: 'operational' | 'degraded' | 'down';
  databaseStatus: 'operational' | 'degraded' | 'down';
  cacheStatus: 'operational' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  errorRate: number;
}

interface SystemHealthWidgetProps {
  health: SystemHealth;
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({ health }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'operational':
        return '정상';
      case 'degraded':
        return '성능 저하';
      case 'down':
        return '중단';
      default:
        return '알 수 없음';
    }
  };

  const getResponseTimeStatus = (time: number) => {
    if (time < 200) return { label: '빠름', color: 'text-green-600' };
    if (time < 500) return { label: '보통', color: 'text-yellow-600' };
    return { label: '느림', color: 'text-red-600' };
  };

  const responseStatus = getResponseTimeStatus(health.responseTime);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">시스템 상태</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              health.apiStatus === 'operational' && 
              health.databaseStatus === 'operational' && 
              health.cacheStatus === 'operational'
                ? 'bg-green-500'
                : 'bg-yellow-500'
            } animate-pulse`}></div>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
        </div>

        {/* Service Status */}
        <div className="space-y-3">
          {/* API Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health.apiStatus)}`}></div>
              <span className="text-sm font-medium text-gray-700">API 서버</span>
            </div>
            <span className="text-sm text-gray-500">{getStatusLabel(health.apiStatus)}</span>
          </div>

          {/* Database Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health.databaseStatus)}`}></div>
              <span className="text-sm font-medium text-gray-700">데이터베이스</span>
            </div>
            <span className="text-sm text-gray-500">{getStatusLabel(health.databaseStatus)}</span>
          </div>

          {/* Cache Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health.cacheStatus)}`}></div>
              <span className="text-sm font-medium text-gray-700">캐시 서버</span>
            </div>
            <span className="text-sm text-gray-500">{getStatusLabel(health.cacheStatus)}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Response Time */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">응답 시간</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${responseStatus.color}`}>
                {health.responseTime}ms
              </span>
              <span className="text-xs text-gray-500">({responseStatus.label})</span>
            </div>
          </div>

          {/* Uptime */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">가동률</span>
            <span className="text-sm font-medium text-green-600">{health.uptime}%</span>
          </div>

          {/* Error Rate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">에러율</span>
            <span className={`text-sm font-medium ${
              health.errorRate < 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {health.errorRate}%
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          시스템 상세 보기
        </button>
      </div>
    </div>
  );
};