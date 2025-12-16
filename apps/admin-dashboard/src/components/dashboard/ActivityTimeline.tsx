import React from 'react';

interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  icon: string;
  color: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getActivityColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'red':
        return 'bg-red-100 text-red-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">활동 내역</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            모두 보기 →
          </button>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {/* Timeline Line */}
              {index < activities.length - 1 && (
                <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-200"></div>
              )}
              
              {/* Activity Item */}
              <div className="flex space-x-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getActivityColor(activity.color)}`}>
                  <span className="text-lg">{activity.icon}</span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">by {activity.user}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <button className="mt-6 w-full py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          더 보기
        </button>
      </div>
    </div>
  );
};