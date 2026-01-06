import React, { useState } from 'react';
import { toast } from 'sonner';
import { useUpdateGameMutation, useClubsQuery, useCoursesByClubQuery } from '@/hooks/queries';
import type { Game, UpdateGameDto } from '@/lib/api/gamesApi';

interface GameBasicInfoTabProps {
  game: Game;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'ACTIVE', label: '운영중' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'MAINTENANCE', label: '정비중' },
];

export const GameBasicInfoTab: React.FC<GameBasicInfoTabProps> = ({ game, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateGameDto>({
    name: game.name,
    description: game.description || '',
    maxPlayers: game.maxPlayers,
    duration: game.duration,
    price: game.price,
    status: game.status,
    courseIds: game.courseIds,
  });

  const updateGameMutation = useUpdateGameMutation();
  const { data: clubsData } = useClubsQuery();
  const { data: courses } = useCoursesByClubQuery(game.clubId);

  const clubs = clubsData?.data || [];
  const clubName = clubs.find((c) => c.id === game.clubId)?.name || `Club ${game.clubId}`;

  const handleInputChange = (field: keyof UpdateGameDto, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateGameMutation.mutateAsync({ id: game.id, data: formData });
      setIsEditing(false);
      onUpdate();
      toast.success('라운드 정보가 수정되었습니다.');
    } catch (error) {
      console.error('Failed to update game:', error);
      toast.error('라운드 정보 수정에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: game.name,
      description: game.description || '',
      maxPlayers: game.maxPlayers,
      duration: game.duration,
      price: game.price,
      status: game.status,
      courseIds: game.courseIds,
    });
    setIsEditing(false);
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            수정하기
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={updateGameMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateGameMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 라운드 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            라운드 이름
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{game.name}</p>
          )}
        </div>

        {/* 골프장 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            골프장
          </label>
          <p className="text-gray-900">{clubName}</p>
          <p className="text-xs text-gray-500 mt-1">골프장은 변경할 수 없습니다</p>
        </div>

        {/* 설명 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{game.description || '-'}</p>
          )}
        </div>

        {/* 최대 인원 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최대 인원
          </label>
          {isEditing ? (
            <input
              type="number"
              value={formData.maxPlayers}
              onChange={(e) => handleInputChange('maxPlayers', Number(e.target.value))}
              min={1}
              max={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{game.maxPlayers}명</p>
          )}
        </div>

        {/* 소요 시간 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            예상 소요 시간
          </label>
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', Number(e.target.value))}
                min={60}
                max={360}
                step={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">분</span>
            </div>
          ) : (
            <p className="text-gray-900">{game.duration}분 ({Math.floor(game.duration / 60)}시간 {game.duration % 60}분)</p>
          )}
        </div>

        {/* 가격 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            기본 가격
          </label>
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">₩</span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', Number(e.target.value))}
                min={0}
                step={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <p className="text-gray-900 font-medium">₩{game.price.toLocaleString()}</p>
          )}
        </div>

        {/* 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상태
          </label>
          {isEditing ? (
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              game.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : game.status === 'MAINTENANCE'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {statusOptions.find((o) => o.value === game.status)?.label || game.status}
            </span>
          )}
        </div>

        {/* 코스 정보 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            코스 조합
          </label>
          <div className="flex flex-wrap gap-2">
            {courses && courses.length > 0 ? (
              (game.courseIds || []).map((courseId) => {
                const course = courses.find((c) => c.id === courseId);
                return (
                  <span
                    key={courseId}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {course ? `${course.code} - ${course.name}` : `Course ${courseId}`}
                  </span>
                );
              })
            ) : (
              (game.courseIds || []).map((courseId) => (
                <span
                  key={courseId}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                >
                  Course {courseId}
                </span>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            코스 조합을 변경하려면 새 라운드를 생성해주세요
          </p>
        </div>

        {/* 등록 정보 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            등록일
          </label>
          <p className="text-gray-900">
            {new Date(game.createdAt).toLocaleDateString('ko-KR')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최종 수정일
          </label>
          <p className="text-gray-900">
            {new Date(game.updatedAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameBasicInfoTab;
