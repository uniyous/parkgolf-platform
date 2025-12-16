import React, { useState, useCallback } from 'react';
import { CourseComboSelector } from './CourseComboSelector';
import { TimeSlotWizardStep2 } from './TimeSlotWizardStep2';
import { TimeSlotWizardStep3 } from './TimeSlotWizardStep3';
import { TimeSlotPreview } from './TimeSlotPreview';
import type { CourseCombo, TimeSlotWizardData } from '../../types/courseCombo';

interface TimeSlotWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: TimeSlotWizardData) => Promise<void>;
  availableCombos: CourseCombo[];
}

export const TimeSlotWizard: React.FC<TimeSlotWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  availableCombos
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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

  const updateWizardData = useCallback((updates: Partial<TimeSlotWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(wizardData);
      onClose();
    } catch (error) {
      console.error('Failed to create time slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
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

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return '코스 조합 선택';
      case 2:
        return '일정 설정';
      case 3:
        return '가격 및 정책';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                타임슬롯 생성 마법사
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                단계별로 타임슬롯을 쉽게 생성해보세요
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 진행 단계 표시 */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  <div className={`ml-2 text-sm font-medium ${
                    step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step === 1 && '코스 선택'}
                    {step === 2 && '일정 설정'}
                    {step === 3 && '가격 정책'}
                  </div>
                  {step < 3 && (
                    <div className={`mx-4 w-16 h-0.5 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* 메인 컨텐츠 */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {getStepTitle()}
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>

            {currentStep === 1 && (
              <CourseComboSelector
                availableCombos={availableCombos}
                selectedCombo={wizardData.selectedCombo}
                onComboSelect={(combo) => updateWizardData({ selectedCombo: combo })}
              />
            )}

            {currentStep === 2 && (
              <TimeSlotWizardStep2
                data={wizardData}
                onUpdate={updateWizardData}
              />
            )}

            {currentStep === 3 && (
              <TimeSlotWizardStep3
                data={wizardData}
                onUpdate={updateWizardData}
              />
            )}
          </div>

          {/* 사이드바 미리보기 */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <TimeSlotPreview data={wizardData} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {currentStep}/3 단계
            </div>
            
            <div className="flex items-center space-x-3">
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={!canProceed() || isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isLoading ? (
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
      </div>
    </div>
  );
};