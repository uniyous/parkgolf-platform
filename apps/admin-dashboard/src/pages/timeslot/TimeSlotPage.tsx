import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClub } from '@/hooks';
import type { TimeSlot, CreateTimeSlotDto, UpdateTimeSlotDto, Course } from '../../types';
import { TimeSlotForm } from '../../components/timeslot/TimeSlotForm';
import { TimeSlotList } from '../../components/timeslot/TimeSlotList';
import { CourseComboSelector } from '../../components/timeslot/CourseComboSelector';
import { TimeSlotWizardStep2 } from '../../components/timeslot/TimeSlotWizardStep2';
import { TimeSlotWizardStep3 } from '../../components/timeslot/TimeSlotWizardStep3';
import { TimeSlotPreview } from '../../components/timeslot/TimeSlotPreview';
import type { CourseCombo, TimeSlotWizardData } from '../../types/courseCombo';

export const TimeSlotPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { selectedClub, loadClubById } = useClub();

  // 타임슬롯 관련 상태
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 마법사 관련 상태
  const [availableCombos, setAvailableCombos] = useState<CourseCombo[]>([]);
  const [activeView, setActiveView] = useState<'wizard' | 'list'>('wizard');
  const [wizardStep, setWizardStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // 마법사 데이터
  const [wizardData, setWizardData] = useState<TimeSlotWizardData>({
    dateRange: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    timePattern: {
      type: 'STANDARD',
      startTime: '09:00',
      endTime: '17:00',
      interval: 30,
      excludeHolidays: true
    },
    pricing: {
      basePrice: 180000,
      weekendSurcharge: 20,
      holidaySurcharge: 30,
      earlyBookingDiscount: 10
    },
    policies: {
      maxTeams: 4,
      cancellationPolicy: '24시간 전까지 무료 취소',
      bookingDeadline: 2
    }
  });

  // 필터 상태
  const [filter, setFilter] = useState<any>({
    page: 1,
    limit: 20
  });

  // 골프장 정보 로드
  useEffect(() => {
    if (clubId) {
      loadClubById(Number(clubId));
    }
  }, [clubId, loadClubById]);

  // 타임슬롯 조회
  const fetchTimeSlots = async () => {
    if (!selectedClub?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // courseApi를 사용하여 타임슬롯 조회 (실제 API 구현에 따라 수정 필요)
      // const response = await courseApi.getTimeSlots(selectedClub.id, filter);
      // setTimeSlots(response.timeSlots || []);
      
      // 임시로 빈 배열 설정
      setTimeSlots([]);
    } catch (error) {
      setError('타임슬롯 정보를 불러오는데 실패했습니다.');
      console.error('Failed to fetch time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClub) {
      fetchTimeSlots();
    }
  }, [selectedClub?.id, filter]);

  // 코스 조합 로드
  useEffect(() => {
    if (selectedClub) {
      loadAvailableCombos();
    }
  }, [selectedClub?.id]);

  const loadAvailableCombos = async () => {
    if (!selectedClub) return;

    try {
      // selectedClub.courses가 이미 로드되어 있다면 사용
      if (selectedClub.courses && selectedClub.courses.length > 0) {
        const combos = generateCombosFromCourses(selectedClub.courses);
        setAvailableCombos(combos);
        return;
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
    
    // 기본 조합 생성
    const defaultCombo: CourseCombo = {
      id: `single-${selectedClub.id}`,
      name: `${selectedClub.name} 기본`,
      description: '기본 코스 설정',
      frontCourse: {
        id: selectedClub.id,
        name: selectedClub.name,
        par: selectedClub.totalHoles > 0 ? Math.floor(selectedClub.totalHoles * 4 / 9) : 36,
        companyId: selectedClub.companyId
      } as Course,
      backCourse: {
        id: selectedClub.id,
        name: selectedClub.name,
        par: selectedClub.totalHoles > 0 ? Math.floor(selectedClub.totalHoles * 4 / 9) : 36,
        companyId: selectedClub.companyId
      } as Course,
      totalPar: selectedClub.totalHoles > 0 ? Math.floor(selectedClub.totalHoles * 4 / 9) * 2 : 72,
      totalDistance: 6500,
      basePrice: 180000,
      difficulty: 'MEDIUM',
      estimatedDuration: 300,
      features: ['기본 설정'],
      distributionWeight: 100
    };
    setAvailableCombos([defaultCombo]);
  };

  const generateCombosFromCourses = (courses: Course[]): CourseCombo[] => {
    const distributionWeight = Math.round(100 / courses.length);
    const combos: CourseCombo[] = [];
    
    // 각 코스별 단독 조합
    courses.forEach((c) => {
      combos.push({
        id: `single-${c.id}`,
        name: `${c.name} (단독)`,
        description: `${c.name} 단독 이용`,
        frontCourse: c,
        backCourse: c,
        totalPar: c.par || 36,
        totalDistance: 3500,
        basePrice: 120000,
        difficulty: 'EASY',
        estimatedDuration: 180,
        features: ['단독 코스', '빠른 플레이'],
        distributionWeight,
        isRecommended: courses.length > 1
      });
    });

    // 2개 코스 조합
    if (courses.length >= 2) {
      for (let i = 0; i < courses.length; i++) {
        for (let j = i + 1; j < courses.length; j++) {
          combos.push({
            id: `combo-${courses[i].id}-${courses[j].id}`,
            name: `${courses[i].name} + ${courses[j].name}`,
            description: `전반 ${courses[i].name}, 후반 ${courses[j].name}`,
            frontCourse: courses[i],
            backCourse: courses[j],
            totalPar: (courses[i].par || 36) + (courses[j].par || 36),
            totalDistance: 6500,
            basePrice: 180000,
            isPopular: i === 0 && j === 1,
            difficulty: 'MEDIUM',
            estimatedDuration: 300,
            features: ['풀 라운드', '다양한 코스 경험'],
            distributionWeight: distributionWeight * 2,
            isRecommended: true
          });
        }
      }
    }

    return combos;
  };

  // 마법사 데이터 업데이트
  const updateWizardData = (updates: Partial<TimeSlotWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  // 마법사 단계 검증
  const canProceedToNextStep = () => {
    switch (wizardStep) {
      case 1:
        return !!wizardData.selectedCombo;
      case 2:
        return !!wizardData.dateRange.startDate && !!wizardData.dateRange.endDate;
      case 3:
        return wizardData.pricing.basePrice > 0 && wizardData.policies.maxTeams > 0;
      default:
        return false;
    }
  };

  // 타임슬롯 생성
  const handleCreateTimeSlots = async () => {
    if (!wizardData.selectedCombo || !selectedClub) {
      setError('코스 조합을 선택해주세요.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const bulkTimeSlots: CreateTimeSlotDto[] = [];
      const startDate = new Date(wizardData.dateRange.startDate);
      const endDate = new Date(wizardData.dateRange.endDate);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        
        // 공휴일 제외
        if (wizardData.timePattern.excludeHolidays && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue;
        }

        const dateStr = date.toISOString().split('T')[0];
        const startTimeMinutes = parseInt(wizardData.timePattern.startTime.split(':')[0]) * 60 + 
                                parseInt(wizardData.timePattern.startTime.split(':')[1]);
        const endTimeMinutes = parseInt(wizardData.timePattern.endTime.split(':')[0]) * 60 + 
                              parseInt(wizardData.timePattern.endTime.split(':')[1]);
        
        for (let minutes = startTimeMinutes; minutes < endTimeMinutes; minutes += wizardData.timePattern.interval) {
          const slotEndMinutes = minutes + wizardData.timePattern.interval;
          
          if (slotEndMinutes <= endTimeMinutes) {
            const startTime = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
            const endTime = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;
            
            let price = wizardData.pricing.basePrice;
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              price += Math.round(price * wizardData.pricing.weekendSurcharge / 100);
            }
            
            bulkTimeSlots.push({
              date: dateStr,
              startTime,
              endTime,
              maxPlayers: wizardData.policies.maxTeams,
              price,
              isActive: true
            });
          }
        }
      }
      
      if (bulkTimeSlots.length === 0) {
        setError('생성할 수 있는 타임슬롯이 없습니다.');
        return;
      }
      
      // const newTimeSlots = await courseApi.createBulkTimeSlots(selectedClub.id, bulkTimeSlots);
      // setTimeSlots(prev => [...prev, ...newTimeSlots]);
      
      setSuccessMessage(`${bulkTimeSlots.length}개의 타임슬롯이 성공적으로 생성되었습니다!`);
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveView('list');
        setWizardStep(1);
      }, 2000);
      
      fetchTimeSlots();
      
    } catch (error) {
      console.error('Failed to create time slots:', error);
      setError('타임슬롯 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 타임슬롯 수정
  const handleUpdateTimeSlot = async (timeSlotData: UpdateTimeSlotDto) => {
    if (!selectedTimeSlot || !selectedClub) return false;
    
    try {
      // const updatedTimeSlot = await courseApi.updateTimeSlot(selectedClub.id, selectedTimeSlot.id, timeSlotData);
      // setTimeSlots(prev => prev.map(ts => ts.id === selectedTimeSlot.id ? updatedTimeSlot : ts));
      setShowEditModal(false);
      setSelectedTimeSlot(null);
      return true;
    } catch (error) {
      console.error('Failed to update time slot:', error);
      setError('타임슬롯 수정에 실패했습니다.');
      return false;
    }
  };

  // 타임슬롯 삭제
  const handleDeleteTimeSlot = async () => {
    if (!selectedTimeSlot || !selectedClub) return;
    
    try {
      // await courseApi.deleteTimeSlot(selectedClub.id, selectedTimeSlot.id);
      setTimeSlots(prev => prev.filter(ts => ts.id !== selectedTimeSlot.id));
      setShowDeleteConfirm(false);
      setSelectedTimeSlot(null);
      setSuccessMessage('타임슬롯이 삭제되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      setError('타임슬롯 삭제에 실패했습니다.');
    }
  };

  // 뒤로가기
  const handleGoBack = () => {
    navigate(`/club/clubs/${clubId}`);
  };

  if (!selectedClub) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoBack}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">타임슬롯 관리</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedClub.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">총 {timeSlots.length}개 타임슬롯</span>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => setActiveView('wizard')}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeView === 'wizard'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>새 타임슬롯 생성</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeView === 'list'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>타임슬롯 목록</span>
            </div>
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* 컨텐츠 영역 */}
      {activeView === 'wizard' ? (
        // 마법사 뷰
        <div className="bg-white rounded-lg border border-gray-200">
          {/* 진행 단계 */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex-1 flex items-center">
                  <button
                    onClick={() => step < wizardStep && setWizardStep(step)}
                    className={`flex items-center ${step <= wizardStep ? 'cursor-pointer' : 'cursor-default'}`}
                    disabled={step > wizardStep}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      step === wizardStep
                        ? 'bg-green-600 text-white ring-4 ring-green-100'
                        : step < wizardStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step < wizardStep ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        step
                      )}
                    </div>
                    <div className={`ml-3 text-sm font-medium ${
                      step <= wizardStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step === 1 && '코스 선택'}
                      {step === 2 && '일정 설정'}
                      {step === 3 && '가격 정책'}
                    </div>
                  </button>
                  {step < 3 && (
                    <div className={`flex-1 mx-4 h-0.5 ${
                      step < wizardStep ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 마법사 컨텐츠 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200">
            <div className="lg:col-span-2 p-6">
              {wizardStep === 1 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">코스 조합 선택</h3>
                  <CourseComboSelector
                    availableCombos={availableCombos}
                    selectedCombo={wizardData.selectedCombo}
                    onComboSelect={(combo) => updateWizardData({ selectedCombo: combo })}
                  />
                </div>
              )}

              {wizardStep === 2 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">일정 및 시간 설정</h3>
                  <TimeSlotWizardStep2
                    data={wizardData}
                    onUpdate={updateWizardData}
                  />
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">가격 및 정책 설정</h3>
                  <TimeSlotWizardStep3
                    data={wizardData}
                    onUpdate={updateWizardData}
                  />
                </div>
              )}

              {/* 네비게이션 버튼 */}
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => wizardStep > 1 && setWizardStep(wizardStep - 1)}
                  className={`px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${
                    wizardStep === 1 ? 'invisible' : ''
                  }`}
                >
                  이전
                </button>
                
                <div className="flex items-center space-x-3">
                  {wizardStep < 3 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep + 1)}
                      disabled={!canProceedToNextStep()}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      다음
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateTimeSlots}
                      disabled={!canProceedToNextStep() || isCreating}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          생성 중...
                        </>
                      ) : (
                        '타임슬롯 생성'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 미리보기 */}
            <div className="p-6 bg-gray-50">
              <TimeSlotPreview data={wizardData} />
            </div>
          </div>
        </div>
      ) : (
        // 목록 뷰
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">타임슬롯을 불러오는 중...</p>
              </div>
            ) : (
              <TimeSlotList
                timeSlots={timeSlots}
                onEdit={(ts) => {
                  setSelectedTimeSlot(ts);
                  setShowEditModal(true);
                }}
                onDelete={(ts) => {
                  setSelectedTimeSlot(ts);
                  setShowDeleteConfirm(true);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && selectedTimeSlot && (
        <TimeSlotForm
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTimeSlot(null);
          }}
          onSubmit={handleUpdateTimeSlot}
          timeSlot={selectedTimeSlot}
          mode="edit"
          title="타임슬롯 수정"
        />
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">타임슬롯 삭제</h3>
            <p className="text-gray-600 mb-6">
              정말로 이 타임슬롯을 삭제하시겠습니까?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTimeSlot(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                취소
              </button>
              <button
                onClick={handleDeleteTimeSlot}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};