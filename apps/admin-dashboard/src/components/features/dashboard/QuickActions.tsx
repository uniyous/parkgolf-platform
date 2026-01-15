import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Flag, BarChart3 } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: '새 예약 추가',
      description: '신규 예약을 등록합니다',
      icon: <Plus className="w-6 h-6" />,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      onClick: () => navigate('/bookings?action=new')
    },
    {
      title: '사용자 관리',
      description: '사용자 정보를 관리합니다',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      onClick: () => navigate('/user-management')
    },
    {
      title: '코스 관리',
      description: '골프장 코스를 관리합니다',
      icon: <Flag className="w-6 h-6" />,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      onClick: () => navigate('/course-management')
    },
    {
      title: '보고서 생성',
      description: '통계 보고서를 생성합니다',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      onClick: () => navigate('/reports')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`p-4 rounded-lg text-white ${action.color} ${action.hoverColor} transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {action.icon}
            </div>
            <div className="text-left">
              <h3 className="font-medium">{action.title}</h3>
              <p className="text-sm opacity-90">{action.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};