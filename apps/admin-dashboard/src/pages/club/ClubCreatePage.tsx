import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateClubMutation } from '@/hooks/queries';
import { useActiveCompanyId } from '@/hooks/useActiveCompany';
import { PageLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KakaoMap } from '@/components/common/KakaoMap';
import type { CreateClubDto, ClubStatus, ClubType } from '@/types/club';

const statusOptions: { value: ClubStatus; label: string }[] = [
  { value: 'ACTIVE', label: '운영중' },
  { value: 'MAINTENANCE', label: '정비중' },
  { value: 'SEASONAL_CLOSED', label: '휴장' },
  { value: 'INACTIVE', label: '비활성' },
];

const clubTypeOptions: { value: ClubType; label: string }[] = [
  { value: 'PAID', label: '유료' },
  { value: 'FREE', label: '무료' },
];

const availableFacilities = [
  '카트도로', '연습장', '클럽하우스', '레스토랑', '프로샵',
  '라커룸', '샤워실', '주차장', '캐디서비스', '렌탈클럽',
];

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

const inputClass = 'w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-white/30';

const InfoRow: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="flex items-start py-2.5 border-b border-white/5 last:border-b-0">
    <span className="text-sm text-white/50 w-20 shrink-0">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </span>
    <div className="text-sm text-white flex-1 min-w-0">{children}</div>
  </div>
);

export const ClubCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const companyId = useActiveCompanyId();
  const createClubMutation = useCreateClubMutation();

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    status: 'ACTIVE' as ClubStatus,
    clubType: 'PAID' as ClubType,
    operatingHours: { open: '06:00', close: '18:00' },
    facilities: [] as string[],
  });

  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const breadcrumbs = useMemo(() => [
    { label: '골프장', path: '/clubs' },
    { label: '골프장 추가' },
  ], []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFacilityToggle = (facility: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  const handleGeocode = useCallback(() => {
    const address = formData.address.trim();
    if (!address) {
      toast.error('주소를 먼저 입력해 주세요.');
      return;
    }

    if (!window.kakao?.maps) {
      toast.error('카카오맵을 로드할 수 없습니다.');
      return;
    }

    setIsGeocoding(true);

    window.kakao.maps.load(() => {
      if (!window.kakao.maps.services) {
        setIsGeocoding(false);
        toast.error('카카오맵 서비스를 로드할 수 없습니다.');
        return;
      }

      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (result, status) => {
        setIsGeocoding(false);
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const { y, x } = result[0];
          setCoordinates({
            latitude: parseFloat(y),
            longitude: parseFloat(x),
          });
          toast.success('주소 확인 완료');
        } else {
          setCoordinates(null);
          toast.error('주소를 찾을 수 없습니다. 정확한 주소를 입력해 주세요.');
        }
      });
    });
  }, [formData.address]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('골프장명을 입력해 주세요.');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('지역을 입력해 주세요.');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('주소를 입력해 주세요.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('연락처를 입력해 주세요.');
      return;
    }
    if (!companyId) {
      toast.error('회사 정보를 확인할 수 없습니다.');
      return;
    }

    const dto: CreateClubDto = {
      name: formData.name.trim(),
      companyId,
      location: formData.location.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      website: formData.website.trim() || undefined,
      status: formData.status,
      clubType: formData.clubType,
      operatingHours: formData.operatingHours,
      facilities: formData.facilities.length > 0 ? formData.facilities : undefined,
    };

    try {
      const club = await createClubMutation.mutateAsync(dto);
      navigate(`/clubs/${club.id}`);
    } catch {
      // Error handled by mutation meta.errorMessage
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/clubs')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">골프장 추가</h1>
                <p className="text-white/50 mt-1">새 골프장 정보를 입력하세요</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/clubs')}
                className="px-4 py-2 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={createClubMutation.isPending}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {createClubMutation.isPending && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                <span>골프장 생성</span>
              </button>
            </div>
          </div>
        </div>

        {/* 기본 정보 + 운영 정보 */}
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
                <InfoRow label="골프장명" required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="골프장 이름을 입력하세요"
                    className={inputClass}
                  />
                </InfoRow>
                <InfoRow label="지역" required>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="예: 경기도 용인시"
                    className={inputClass}
                  />
                </InfoRow>
                <InfoRow label="주소" required>
                  <div className="space-y-2">
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="정확한 도로명 또는 지번 주소를 입력하세요"
                      rows={2}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={isGeocoding || !formData.address.trim()}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-emerald-600/80 text-white rounded-md hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isGeocoding ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5" />
                          확인 중...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          주소 확인
                        </>
                      )}
                    </button>
                  </div>
                </InfoRow>
                <InfoRow label="연락처" required>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="예: 031-123-4567"
                    className={inputClass}
                  />
                </InfoRow>
                <InfoRow label="이메일">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="example@golf.com"
                    className={inputClass}
                  />
                </InfoRow>
                <InfoRow label="웹사이트">
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://"
                    className={inputClass}
                  />
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
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className={inputClass}
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white/50">유형</span>
                    <div className="mt-1">
                      <select
                        value={formData.clubType}
                        onChange={(e) => handleChange('clubType', e.target.value)}
                        className={inputClass}
                      >
                        {clubTypeOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <InfoRow label="운영시간">
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={formData.operatingHours.open}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        operatingHours: { ...prev.operatingHours, open: e.target.value },
                      }))}
                      className={inputClass}
                    />
                    <span className="text-white/30">~</span>
                    <input
                      type="time"
                      value={formData.operatingHours.close}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        operatingHours: { ...prev.operatingHours, close: e.target.value },
                      }))}
                      className={inputClass}
                    />
                  </div>
                </InfoRow>

                {/* 부대시설 */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/70 mb-3">부대시설</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableFacilities.map((facility) => (
                      <label key={facility} className="flex items-center space-x-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={formData.facilities.includes(facility)}
                          onChange={() => handleFacilityToggle(facility)}
                          className="rounded border-white/15 text-emerald-500 focus:ring-emerald-500 bg-white/5"
                        />
                        <span className="text-sm text-white/70">
                          {facilityIcons[facility] || ''} {facility}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 위치 정보 카드 */}
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
            {coordinates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KakaoMap
                  latitude={coordinates.latitude}
                  longitude={coordinates.longitude}
                  clubName={formData.name || '새 골프장'}
                  height="280px"
                />
                <div>
                  <InfoRow label="주소">{formData.address}</InfoRow>
                  <InfoRow label="위도">{coordinates.latitude.toFixed(6)}</InfoRow>
                  <InfoRow label="경도">{coordinates.longitude.toFixed(6)}</InfoRow>
                  <div className="mt-4">
                    <a
                      href={`https://map.kakao.com/link/map/${encodeURIComponent(formData.name || '새 골프장')},${coordinates.latitude},${coordinates.longitude}`}
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
                  주소를 입력하고 [주소 확인] 버튼을 눌러주세요.
                </p>
                <p className="text-xs text-white/30 mt-1">
                  입력한 주소의 위치가 지도에 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 하단 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => navigate('/clubs')}
            className="px-6 py-2.5 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={createClubMutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {createClubMutation.isPending && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            <span>골프장 생성</span>
          </button>
        </div>
      </div>
    </PageLayout>
  );
};
