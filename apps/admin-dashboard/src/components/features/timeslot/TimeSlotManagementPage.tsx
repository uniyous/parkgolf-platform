import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '@/lib/api/courseApi';
import { PageLayout } from '@/components/layout';
import { useBreadcrumb } from '@/stores';
import { CourseComboSelector } from './CourseComboSelector';
import { TimeSlotWizardStep2 } from './TimeSlotWizardStep2';
import { TimeSlotWizardStep3 } from './TimeSlotWizardStep3';
import { TimeSlotPreview } from './TimeSlotPreview';
import { TimeSlotList } from './TimeSlotList';
import { TimeSlotForm } from './TimeSlotForm';
import type { Course, TimeSlot, CreateTimeSlotDto, UpdateTimeSlotDto } from '@/types';
import type { CourseCombo, TimeSlotWizardData } from '@/types/courseCombo';

export const TimeSlotManagementPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { setItems } = useBreadcrumb();
  
  // 코스 및 기본 상태
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 타임슬롯 관련 상태
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  
  // 뷰 및 마법사 상태
  const [activeView, setActiveView] = useState<'wizard' | 'list' | 'dashboard'>('dashboard');
  const [wizardStep, setWizardStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 마법사 관련 데이터
  const [availableCombos, setAvailableCombos] = useState<CourseCombo[]>([]);
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

  // 코스 정보 조회
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        setError('유효하지 않은 코스 ID입니다.');
        setLoading(false);
        return;
      }

      try {
        const courseData = await courseApi.getCourseById(parseInt(courseId));
        
        if (!courseData) {
          throw new Error('코스 데이터를 찾을 수 없습니다.');
        }
        
        setCourse(courseData);
        
        // breadcrumb 설정
        if (courseData.name) {
          setItems([
            { label: '코스 관리', path: '/course-management', icon: '⛳' },
            { label: courseData.name, icon: '🏌️' },
            { label: '타임슬롯 관리', icon: '⏰' }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch course:', error);
        setError('코스 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, setItems]);

  // 타임슬롯 조회
  const fetchTimeSlots = async () => {
    if (!course?.id) return;
    
    setTimeSlotsLoading(true);
    try {
      const response = await courseApi.getTimeSlots(course.id, { page: 1, limit: 100 });
      setTimeSlots(response.timeSlots || []);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  // 코스 조합 로드
  const loadAvailableCombos = async () => {
    if (!course) return;

    try {
      if (course.companyId) {
        const allCourses = await courseApi.getCoursesByCompany(course.companyId);
        
        if (allCourses && allCourses.length > 0) {
          const combos = generateCombosFromCourses(allCourses);
          setAvailableCombos(combos);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
    
    // 기본 조합 생성
    const defaultCombo: CourseCombo = {
      id: `single-${course.id}`,
      name: `${course.name} 기본`,
      description: '기본 코스 설정',
      frontCourse: course,
      backCourse: course,
      totalPar: course.par || 72,
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

  useEffect(() => {
    if (course) {
      fetchTimeSlots();
      loadAvailableCombos();
    }
  }, [course]);

  // 마법사 데이터 업데이트
  const updateWizardData = (updates: Partial<TimeSlotWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  // 단계별 검증
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
    if (!wizardData.selectedCombo || !course) {
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
      
      await courseApi.createBulkTimeSlots(course.id, bulkTimeSlots);
      
      setSuccessMessage(`${bulkTimeSlots.length}개의 타임슬롯이 성공적으로 생성되었습니다!`);
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveView('list');
        setWizardStep(1);
        fetchTimeSlots();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to create time slots:', error);
      setError('타임슬롯 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 타임슬롯 수정
  const handleUpdateTimeSlot = async (timeSlotData: UpdateTimeSlotDto) => {
    if (!selectedTimeSlot || !course) return false;
    
    try {
      const updatedTimeSlot = await courseApi.updateTimeSlot(course.id, selectedTimeSlot.id, timeSlotData);
      setTimeSlots(prev => prev.map(ts => ts.id === selectedTimeSlot.id ? updatedTimeSlot : ts));
      setShowEditModal(false);
      setSelectedTimeSlot(null);
      setSuccessMessage('타임슬롯이 수정되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return true;
    } catch (error) {
      console.error('Failed to update time slot:', error);
      setError('타임슬롯 수정에 실패했습니다.');
      return false;
    }
  };

  // 타임슬롯 삭제
  const handleDeleteTimeSlot = async () => {
    if (!selectedTimeSlot || !course) return;
    
    try {
      await courseApi.deleteTimeSlot(course.id, selectedTimeSlot.id);
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

  // 통계 계산
  const stats = {
    total: timeSlots.length,
    active: timeSlots.filter(ts => ts.status === 'ACTIVE').length,
    booked: timeSlots.reduce((sum, ts) => sum + (ts.bookedSlots || 0), 0),
    revenue: timeSlots.reduce((sum, ts) => sum + (ts.price * (ts.bookedSlots || 0)), 0)
  };

  if (loading) {
    return (
      <PageLayout>
        <PageLayout.Content>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">코스 정보를 불러오는 중...</p>
            </div>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  if (error && !course) {
    return (
      <PageLayout>
        <PageLayout.Content>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/course-management')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                코스 목록으로 돌아가기
              </button>
            </div>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Content>
        <div className="space-y-6">
          {/* 메인 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">타임슬롯 관리 센터</h1>
                <p className="text-blue-100 text-lg">{course?.name}</p>
                <p className="text-blue-200 text-sm mt-1">효율적인 타임슬롯 생성 및 관리</p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-blue-100 text-sm">총 타임슬롯</div>
                </div>
              </div>
            </div>
          </div>

          {/* 통계 대시보드 */}
          {activeView === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-gray-600 text-sm">총 타임슬롯</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
                    <div className="text-gray-600 text-sm">활성 타임슬롯</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.booked}</div>
                    <div className="text-gray-600 text-sm">총 예약수</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">₩{new Intl.NumberFormat('ko-KR').format(stats.revenue)}</div>
                    <div className="text-gray-600 text-sm">총 매출</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>대시보드</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveView('wizard');
                  setWizardStep(1);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeView === 'wizard'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>새 타임슬롯 생성</span>
                </div>
              </button>

              <button
                onClick={() => setActiveView('list')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeView === 'list'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {activeView === 'wizard' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
              {/* 마법사 헤더 */}
              <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">타임슬롯 생성 마법사</h2>
                <p className="text-gray-600">3단계로 쉽게 타임슬롯을 생성하세요</p>
                
                {/* 진행 단계 */}
                <div className="mt-6 flex items-center justify-between">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex-1 flex items-center">
                      <button
                        onClick={() => step <= wizardStep && setWizardStep(step)}
                        className={`flex items-center ${step <= wizardStep ? 'cursor-pointer' : 'cursor-default'}`}
                        disabled={step > wizardStep}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                          step === wizardStep
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg'
                            : step < wizardStep
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {step < wizardStep ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            step
                          )}
                        </div>
                        <div className={`ml-4 text-left ${
                          step <= wizardStep ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          <div className="font-medium">
                            {step === 1 && '코스 선택'}
                            {step === 2 && '일정 설정'}
                            {step === 3 && '가격 정책'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {step === 1 && '플레이할 코스 조합을 선택하세요'}
                            {step === 2 && '날짜와 시간을 설정하세요'}
                            {step === 3 && '가격과 정책을 설정하세요'}
                          </div>
                        </div>
                      </button>
                      {step < 3 && (
                        <div className={`flex-1 mx-6 h-1 rounded ${
                          step < wizardStep ? 'bg-green-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 마법사 컨텐츠 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200">
                <div className="lg:col-span-2 p-8">
                  {wizardStep === 1 && (
                    <div>
                      <CourseComboSelector
                        availableCombos={availableCombos}
                        selectedCombo={wizardData.selectedCombo}
                        onComboSelect={(combo) => updateWizardData({ selectedCombo: combo })}
                      />
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div>
                      <TimeSlotWizardStep2
                        data={wizardData}
                        onUpdate={updateWizardData}
                      />
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div>
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
                      className={`px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${
                        wizardStep === 1 ? 'invisible' : ''
                      }`}
                    >
                      이전 단계
                    </button>
                    
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setActiveView('dashboard')}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        취소
                      </button>
                      {wizardStep < 3 ? (
                        <button
                          onClick={() => setWizardStep(wizardStep + 1)}
                          disabled={!canProceedToNextStep()}
                          className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          다음 단계
                        </button>
                      ) : (
                        <button
                          onClick={handleCreateTimeSlots}
                          disabled={!canProceedToNextStep() || isCreating}
                          className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center font-medium"
                        >
                          {isCreating ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
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

                {/* 실시간 미리보기 */}
                <div className="p-6 bg-gray-50">
                  <TimeSlotPreview data={wizardData} />
                </div>
              </div>
            </div>
          )}

          {activeView === 'list' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">타임슬롯 목록</h2>
                <p className="text-gray-600 mt-1">기존 타임슬롯을 확인하고 관리하세요</p>
              </div>
              <div className="p-6">
                {timeSlotsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
      </PageLayout.Content>
    </PageLayout>
  );
};