import React, { useState } from 'react';
import type { Club, UpdateClubDto } from '@/types/club';
import { useClub } from '@/hooks';

interface BasicInfoTabProps {
  club: Club;
  onUpdate: (updatedClub: Club) => void;
  initialEditMode?: boolean;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ club, onUpdate, initialEditMode = false }) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const { updateExistingClub, loading } = useClub();
  const [formData, setFormData] = useState<UpdateClubDto>({
    name: club.name,
    location: club.location,
    address: club.address,
    phone: club.phone,
    email: club.email || '',
    website: club.website || '',
    operatingHours: {
      open: club.operatingHours?.open || '06:00',
      close: club.operatingHours?.close || '18:00'
    },
    facilities: club.facilities || [],
    status: club.status
  });

  const handleSave = async () => {
    try {
      const result = await updateExistingClub(club.id, formData);
      if (result) {
        onUpdate(result as Club);
        setIsEditing(false);
      } else {
        console.error('Update failed: no result received');
        alert('골프장 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update golf club:', error);
      alert('골프장 정보 수정에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: club.name,
      location: club.location,
      address: club.address,
      phone: club.phone,
      email: club.email || '',
      website: club.website || '',
      operatingHours: {
        open: club.operatingHours?.open || '06:00',
        close: club.operatingHours?.close || '18:00'
      },
      facilities: club.facilities || [],
      status: club.status
    });
    setIsEditing(false);
  };

  const handleFacilityToggle = (facility: string) => {
    const currentFacilities = formData.facilities || [];
    const newFacilities = currentFacilities.includes(facility)
      ? currentFacilities.filter(f => f !== facility)
      : [...currentFacilities, facility];
    
    setFormData(prev => ({
      ...prev,
      facilities: newFacilities
    }));
  };

  const availableFacilities = [
    '카트도로', '연습장', '클럽하우스', '레스토랑', '프로샵',
    '라커룸', '샤워실', '주차장', '캐디서비스', '렌탈클럽'
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
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
              disabled={loading.update}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={loading.update}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading.update && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>저장</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            기본 정보
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">골프장명</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{club.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{club.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
              {isEditing ? (
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{club.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{club.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{club.email || '없음'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">웹사이트</label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">
                  {club.website ? (
                    <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {club.website}
                    </a>
                  ) : (
                    '없음'
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 운영 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            운영 정보
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">운영 상태</label>
              {isEditing ? (
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">운영중</option>
                  <option value="MAINTENANCE">정비중</option>
                  <option value="SEASONAL_CLOSED">휴장</option>
                  <option value="INACTIVE">비활성</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  club.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : club.status === 'MAINTENANCE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {club.status === 'ACTIVE' ? '운영중' : 
                   club.status === 'MAINTENANCE' ? '정비중' : 
                   club.status === 'SEASONAL_CLOSED' ? '휴장' : '비활성'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">운영 시작</label>
                {isEditing ? (
                  <input
                    type="time"
                    value={formData.operatingHours?.open || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      operatingHours: {
                        ...prev.operatingHours!,
                        open: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{club.operatingHours?.open || '06:00'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">운영 종료</label>
                {isEditing ? (
                  <input
                    type="time"
                    value={formData.operatingHours?.close || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      operatingHours: {
                        ...prev.operatingHours!,
                        close: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{club.operatingHours?.close || '18:00'}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">코스 현황</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">⛳ {club.totalHoles}</p>
                  <p className="text-xs text-gray-500">총 홀</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">🎯 {club.totalCourses}</p>
                  <p className="text-xs text-gray-500">코스 수</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 부대시설 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          부대시설
        </h3>

        {isEditing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableFacilities.map((facility) => (
              <label key={facility} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData.facilities || []).includes(facility)}
                  onChange={() => handleFacilityToggle(facility)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{facility}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {club.facilities && club.facilities.length > 0 ? (
              club.facilities.map((facility, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {facility}
                </span>
              ))
            ) : (
              <span className="text-gray-500">등록된 부대시설이 없습니다.</span>
            )}
          </div>
        )}
      </div>

      {/* 등록 정보 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">등록 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">등록일:</span>
            <span className="ml-2 text-gray-900">{new Date(club.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-gray-500">최종 수정:</span>
            <span className="ml-2 text-gray-900">{new Date(club.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};