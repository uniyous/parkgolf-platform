import React, { useState } from 'react';
import { toast } from 'sonner';
import type { Club, UpdateClubDto } from '@/types/club';
import { useClub } from '@/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KakaoMap } from '@/components/common/KakaoMap';

interface BasicInfoTabProps {
  club: Club;
  onUpdate: (updatedClub: Club) => void;
  initialEditMode?: boolean;
}

const statusMap: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '운영중', className: 'bg-green-500/20 text-green-400' },
  MAINTENANCE: { label: '정비중', className: 'bg-yellow-500/20 text-yellow-400' },
  SEASONAL_CLOSED: { label: '휴장', className: 'bg-orange-500/20 text-orange-400' },
  INACTIVE: { label: '비활성', className: 'bg-red-500/20 text-red-400' },
};

const clubTypeMap: Record<string, { label: string; className: string }> = {
  PAID: { label: '유료', className: 'bg-emerald-500/20 text-emerald-400' },
  FREE: { label: '무료', className: 'bg-sky-500/20 text-sky-400' },
};

const bookingModeMap: Record<string, { label: string; className: string }> = {
  PLATFORM: { label: '플랫폼', className: 'bg-blue-500/20 text-blue-400' },
  PARTNER:  { label: '파트너 연동', className: 'bg-amber-500/20 text-amber-400' },
};

const facilityIcons: Record<string, string> = {
  '카트도로': '🛣️',
  '연습장': '🏌️',
  '클럽하우스': '🏠',
  '레스토랑': '🍽️',
  '프로샵': '🛍️',
  '라커룸': '🔐',
  '샤워실': '🚿',
  '주차장': '🅿️',
  '캐디서비스': '🧑‍💼',
  '렌탈클럽': '🏑',
};

const availableFacilities = [
  '카트도로', '연습장', '클럽하우스', '레스토랑', '프로샵',
  '라커룸', '샤워실', '주차장', '캐디서비스', '렌탈클럽',
];

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start py-2.5 border-b border-white/5 last:border-b-0">
    <span className="text-sm text-white/50 w-20 shrink-0">{label}</span>
    <div className="text-sm text-white flex-1 min-w-0">{children}</div>
  </div>
);

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
      close: club.operatingHours?.close || '18:00',
    },
    facilities: club.facilities || [],
    status: club.status,
    clubType: club.clubType || 'PAID',
    bookingMode: club.bookingMode || 'PLATFORM',
  });

  const handleSave = async () => {
    try {
      const result = await updateExistingClub(club.id, formData);
      if (result) {
        onUpdate(result as Club);
        setIsEditing(false);
      } else {
        console.error('Update failed: no result received');
        toast.error('골프장 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update golf club:', error);
      toast.error('골프장 정보 수정에 실패했습니다.');
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
        close: club.operatingHours?.close || '18:00',
      },
      facilities: club.facilities || [],
      status: club.status,
      clubType: club.clubType || 'PAID',
      bookingMode: club.bookingMode || 'PLATFORM',
    });
    setIsEditing(false);
  };

  const handleFacilityToggle = (facility: string) => {
    const currentFacilities = formData.facilities || [];
    const newFacilities = currentFacilities.includes(facility)
      ? currentFacilities.filter(f => f !== facility)
      : [...currentFacilities, facility];
    setFormData(prev => ({ ...prev, facilities: newFacilities }));
  };

  const statusInfo = statusMap[club.status] || statusMap.INACTIVE;
  const clubTypeInfo = clubTypeMap[club.clubType || 'PAID'] || clubTypeMap.PAID;
  const bookingModeInfo = bookingModeMap[club.bookingMode || 'PLATFORM'] || bookingModeMap.PLATFORM;

  const inputClass = 'w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

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
              disabled={loading.update}
              className="px-4 py-2 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={loading.update}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading.update && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>저장</span>
            </button>
          </div>
        )}
      </div>

      {/* 기본 정보 + 운영 정보 (2 column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <InfoRow label="골프장명">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <span className="font-medium">{club.name}</span>
                )}
              </InfoRow>
              <InfoRow label="지역">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  club.location
                )}
              </InfoRow>
              <InfoRow label="주소">
                {isEditing ? (
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className={inputClass}
                  />
                ) : (
                  club.address
                )}
              </InfoRow>
              <InfoRow label="연락처">
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  club.phone
                )}
              </InfoRow>
              <InfoRow label="이메일">
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  club.email || <span className="text-white/30">없음</span>
                )}
              </InfoRow>
              <InfoRow label="웹사이트">
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className={inputClass}
                  />
                ) : club.website ? (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    {club.website}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-white/30">없음</span>
                )}
              </InfoRow>
            </div>
          </CardContent>
        </Card>

        {/* 운영 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        value={formData.status || 'ACTIVE'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Club['status'] }))}
                        className={inputClass}
                      >
                        <option value="ACTIVE">운영중</option>
                        <option value="MAINTENANCE">정비중</option>
                        <option value="SEASONAL_CLOSED">휴장</option>
                        <option value="INACTIVE">비활성</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm text-white/50">유형</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <select
                        value={formData.clubType || 'PAID'}
                        onChange={(e) => setFormData(prev => ({ ...prev, clubType: e.target.value as Club['clubType'] }))}
                        className={inputClass}
                      >
                        <option value="PAID">유료</option>
                        <option value="FREE">무료</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${clubTypeInfo.className}`}>
                        {clubTypeInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 py-2.5 border-b border-white/5">
                <div className="flex-1">
                  <span className="text-sm text-white/50">운영 방식</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <select
                        value={formData.bookingMode || 'PLATFORM'}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingMode: e.target.value as 'PLATFORM' | 'PARTNER' }))}
                        className={inputClass}
                      >
                        <option value="PLATFORM">플랫폼 (직접 사용)</option>
                        <option value="PARTNER">파트너 연동 (외부 ERP)</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bookingModeInfo.className}`}>
                        {bookingModeInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <InfoRow label="운영시간">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={formData.operatingHours?.open || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        operatingHours: { ...prev.operatingHours!, open: e.target.value },
                      }))}
                      className={inputClass}
                    />
                    <span className="text-white/30">~</span>
                    <input
                      type="time"
                      value={formData.operatingHours?.close || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        operatingHours: { ...prev.operatingHours!, close: e.target.value },
                      }))}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <span>
                    {club.operatingHours?.open || '06:00'} ~ {club.operatingHours?.close || '18:00'}
                  </span>
                )}
              </InfoRow>
              <InfoRow label="등록일">
                {new Date(club.createdAt).toLocaleDateString('ko-KR')}
              </InfoRow>
              <InfoRow label="최종수정">
                {new Date(club.updatedAt).toLocaleDateString('ko-KR')}
              </InfoRow>
            </div>

            {/* 부대시설 */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-white/70 mb-3">부대시설</h4>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableFacilities.map((facility) => (
                    <label key={facility} className="flex items-center space-x-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={(formData.facilities || []).includes(facility)}
                        onChange={() => handleFacilityToggle(facility)}
                        className="rounded border-white/15 text-emerald-500 focus:ring-emerald-500 bg-white/5"
                      />
                      <span className="text-sm text-white/70">
                        {facilityIcons[facility] || ''} {facility}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {club.facilities && club.facilities.length > 0 ? (
                    club.facilities.map((facility, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/5 text-white/70 border border-white/10"
                      >
                        <span>{facilityIcons[facility] || '🏷️'}</span>
                        {facility}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-white/30">등록된 부대시설이 없습니다.</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 위치 정보 카드 (full-width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <svg className="w-5 h-5 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            위치 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          {club.latitude && club.longitude ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <KakaoMap
                latitude={club.latitude}
                longitude={club.longitude}
                clubName={club.name}
                height="280px"
              />
              <div>
                <InfoRow label="주소">{club.address}</InfoRow>
                <InfoRow label="위도">{club.latitude.toFixed(6)}</InfoRow>
                <InfoRow label="경도">{club.longitude.toFixed(6)}</InfoRow>
                <div className="mt-4">
                  <a
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(club.name)},${club.latitude},${club.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    카카오맵에서 보기
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-12 h-12 text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-white/40">
                좌표가 아직 설정되지 않았습니다.
              </p>
              <p className="text-xs text-white/30 mt-1">
                주소를 저장하면 자동으로 계산됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
