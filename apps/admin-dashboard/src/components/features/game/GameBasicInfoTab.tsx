import React, { useState } from 'react';
import { toast } from 'sonner';
import { useUpdateGameMutation, useClubQuery, useCoursesByClubQuery } from '@/hooks/queries';
import type { Game, UpdateGameDto } from '@/lib/api/gamesApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface GameBasicInfoTabProps {
  game: Game;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'ACTIVE', label: '운영중', className: 'bg-green-500/20 text-green-400' },
  { value: 'INACTIVE', label: '비활성', className: 'bg-white/10 text-white/70' },
  { value: 'MAINTENANCE', label: '정비중', className: 'bg-yellow-500/20 text-yellow-400' },
];

const slotModeMap: Record<string, { label: string; className: string }> = {
  TEE_TIME: { label: '티타임', className: 'bg-emerald-500/20 text-emerald-400' },
  SESSION: { label: '세션', className: 'bg-purple-500/20 text-purple-400' },
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start py-2.5 border-b border-white/5 last:border-b-0">
    <span className="text-sm text-white/50 w-24 shrink-0">{label}</span>
    <div className="text-sm text-white flex-1 min-w-0">{children}</div>
  </div>
);

const inputClass = 'w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

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
  const { data: clubData } = useClubQuery(game.clubId);
  const { data: courses } = useCoursesByClubQuery(game.clubId);

  const clubName = clubData?.name || `Club ${game.clubId}`;

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

  const statusInfo = statusOptions.find((o) => o.value === game.status) || statusOptions[1];
  const slotModeInfo = slotModeMap[game.slotMode] || { label: '-', className: 'bg-white/10 text-white/70' };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">기본 정보</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>수정</span>
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={updateGameMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {updateGameMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{updateGameMutation.isPending ? '저장 중...' : '저장'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 라운드 정보 + 운영 정보 (2 column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 라운드 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              라운드 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <InfoRow label="라운드명">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <span className="font-medium">{game.name}</span>
                )}
              </InfoRow>
              <InfoRow label="골프장">
                <span>{clubName}</span>
                <p className="text-xs text-white/30 mt-0.5">골프장은 변경할 수 없습니다</p>
              </InfoRow>
              <InfoRow label="설명">
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                ) : (
                  <span>{game.description || <span className="text-white/30">없음</span>}</span>
                )}
              </InfoRow>
              <InfoRow label="슬롯 모드">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${slotModeInfo.className}`}>
                  {slotModeInfo.label}
                </span>
                <p className="text-xs text-white/30 mt-0.5">슬롯 모드는 변경할 수 없습니다</p>
              </InfoRow>
            </div>
          </CardContent>
        </Card>

        {/* 운영 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              운영 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="flex items-start gap-4 py-2.5 border-b border-white/5">
                <div className="flex-1">
                  <span className="text-sm text-white/50">상태</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className={inputClass}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm text-white/50">기본 가격</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-white/50 text-sm">₩</span>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', Number(e.target.value))}
                          min={0}
                          step={1000}
                          className={inputClass}
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-emerald-400">₩{game.price.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <InfoRow label="최대 인원">
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxPlayers}
                    onChange={(e) => handleInputChange('maxPlayers', Number(e.target.value))}
                    min={1}
                    max={8}
                    className={inputClass}
                  />
                ) : (
                  <span>{game.maxPlayers}명</span>
                )}
              </InfoRow>
              <InfoRow label="소요 시간">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', Number(e.target.value))}
                      min={60}
                      max={360}
                      step={10}
                      className={inputClass}
                    />
                    <span className="text-white/50 text-sm shrink-0">분</span>
                  </div>
                ) : (
                  <span>{game.duration}분 ({Math.floor(game.duration / 60)}시간 {game.duration % 60 > 0 ? ` ${game.duration % 60}분` : ''})</span>
                )}
              </InfoRow>
              <InfoRow label="등록일">
                {new Date(game.createdAt).toLocaleDateString('ko-KR')}
              </InfoRow>
              <InfoRow label="최종수정">
                {new Date(game.updatedAt).toLocaleDateString('ko-KR')}
              </InfoRow>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 코스 조합 카드 (full-width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <svg className="w-5 h-5 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            코스 조합
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {courses && courses.length > 0 ? (
              (game.courseIds || []).map((courseId) => {
                const course = courses.find((c) => c.id === courseId);
                return (
                  <span
                    key={courseId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm border border-emerald-500/20"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    {course ? `${course.code} - ${course.name}` : `Course ${courseId}`}
                  </span>
                );
              })
            ) : (
              (game.courseIds || []).map((courseId) => (
                <span
                  key={courseId}
                  className="inline-flex items-center px-3 py-1.5 bg-white/5 text-white/70 rounded-full text-sm border border-white/10"
                >
                  Course {courseId}
                </span>
              ))
            )}
          </div>
          <p className="text-xs text-white/30 mt-3">
            코스 조합을 변경하려면 새 라운드를 생성해주세요
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameBasicInfoTab;
