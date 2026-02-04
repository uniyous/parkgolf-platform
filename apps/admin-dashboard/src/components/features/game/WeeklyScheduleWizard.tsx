import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCreateWeeklyScheduleMutation } from '@/hooks/queries';
import type { CreateGameWeeklyScheduleDto, GameWeeklySchedule, SlotMode } from '@/lib/api/gamesApi';

interface WeeklyScheduleWizardProps {
  gameId: number;
  slotMode?: SlotMode;
  existingSchedules: GameWeeklySchedule[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'days' | 'time' | 'preview';
type DayStatus = 'pending' | 'creating' | 'completed' | 'skipped' | 'error';

const dayOptions = [
  { value: 0, label: '일요일', short: '일', color: 'text-red-600' },
  { value: 1, label: '월요일', short: '월', color: 'text-gray-900' },
  { value: 2, label: '화요일', short: '화', color: 'text-gray-900' },
  { value: 3, label: '수요일', short: '수', color: 'text-gray-900' },
  { value: 4, label: '목요일', short: '목', color: 'text-gray-900' },
  { value: 5, label: '금요일', short: '금', color: 'text-gray-900' },
  { value: 6, label: '토요일', short: '토', color: 'text-blue-600' },
];

const presetOptions = [
  { id: 'all', label: '전체 요일', days: [0, 1, 2, 3, 4, 5, 6], icon: '📅' },
  { id: 'weekdays', label: '평일만', days: [1, 2, 3, 4, 5], icon: '🏢' },
  { id: 'weekends', label: '주말만', days: [0, 6], icon: '🌴' },
  { id: 'custom', label: '직접 선택', days: [], icon: '✏️' },
];

const teeTimePresets = [
  { id: 'early', label: '새벽/오전', startTime: '05:00', endTime: '12:00', icon: '🌅' },
  { id: 'morning', label: '오전/오후', startTime: '06:00', endTime: '18:00', icon: '☀️' },
  { id: 'afternoon', label: '오후/저녁', startTime: '12:00', endTime: '20:00', icon: '🌇' },
  { id: 'fullday', label: '종일', startTime: '05:00', endTime: '20:00', icon: '🕐' },
  { id: 'custom', label: '직접 설정', startTime: '', endTime: '', icon: '✏️' },
];

const sessionPresets = [
  { id: 'dawn', label: '새벽', startTime: '05:00', endTime: '08:00', icon: '🌅' },
  { id: 'morning', label: '오전', startTime: '06:00', endTime: '12:00', icon: '☀️' },
  { id: 'afternoon', label: '오후', startTime: '12:00', endTime: '18:00', icon: '🌇' },
  { id: 'fullday', label: '전일', startTime: '06:00', endTime: '18:00', icon: '🕐' },
  { id: 'custom', label: '직접 설정', startTime: '', endTime: '', icon: '✏️' },
];

const intervalOptions = [
  { value: 7, label: '7분', desc: '빠른 회전' },
  { value: 8, label: '8분', desc: '일반' },
  { value: 10, label: '10분', desc: '표준' },
  { value: 15, label: '15분', desc: '여유' },
  { value: 20, label: '20분', desc: '충분한 간격' },
];

export const WeeklyScheduleWizard: React.FC<WeeklyScheduleWizardProps> = ({
  gameId,
  slotMode = 'TEE_TIME',
  existingSchedules,
  open,
  onClose,
  onSuccess,
}) => {
  const isSession = slotMode === 'SESSION';
  const timePresets = isSession ? sessionPresets : teeTimePresets;
  const [step, setStep] = useState<WizardStep>('days');
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [timePreset, setTimePreset] = useState<string>('morning');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('18:00');
  const [interval, setInterval] = useState(8);
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState<{ created: number; skipped: number } | null>(null);
  const [dayStatuses, setDayStatuses] = useState<Record<number, DayStatus>>({});
  const [currentProgress, setCurrentProgress] = useState(0);

  const createMutation = useCreateWeeklyScheduleMutation();

  // 이미 존재하는 요일 확인
  const existingDays = new Set(existingSchedules.map(s => s.dayOfWeek));

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presetOptions.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setSelectedDays(preset.days);
    }
  };

  const handleDayToggle = (day: number) => {
    setSelectedPreset('custom');
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleTimePresetChange = (presetId: string) => {
    setTimePreset(presetId);
    const preset = timePresets.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    let created = 0;
    let skipped = 0;

    // 처리할 요일 목록 (이미 존재하는 요일 제외)
    const daysToProcess = selectedDays.filter(d => !existingDays.has(d));
    const totalDays = daysToProcess.length;

    // 초기 상태 설정
    const initialStatuses: Record<number, DayStatus> = {};
    selectedDays.forEach(day => {
      if (existingDays.has(day)) {
        initialStatuses[day] = 'skipped';
        skipped++;
      } else {
        initialStatuses[day] = 'pending';
      }
    });
    setDayStatuses(initialStatuses);
    setCurrentProgress(0);

    try {
      for (let i = 0; i < daysToProcess.length; i++) {
        const day = daysToProcess[i];

        // 현재 요일 생성 중 표시
        setDayStatuses(prev => ({ ...prev, [day]: 'creating' }));

        const dto: CreateGameWeeklyScheduleDto = {
          dayOfWeek: day,
          startTime,
          endTime,
          interval: isSession ? 0 : interval,
          isActive: true,
        };

        try {
          await createMutation.mutateAsync({ gameId, data: dto });
          setDayStatuses(prev => ({ ...prev, [day]: 'completed' }));
          created++;
        } catch (err) {
          console.error(`Failed to create schedule for day ${day}:`, err);
          setDayStatuses(prev => ({ ...prev, [day]: 'error' }));
        }

        // 진행률 업데이트
        setCurrentProgress(Math.round(((i + 1) / totalDays) * 100));
      }

      setCreationResult({ created, skipped });

      if (created > 0) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to create schedules:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep('days');
    setSelectedPreset('all');
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setTimePreset('morning');
    setStartTime('06:00');
    setEndTime('18:00');
    setInterval(8);
    setCreationResult(null);
    setDayStatuses({});
    setCurrentProgress(0);
    onClose();
  };

  const canProceedToTime = selectedDays.length > 0;
  const canProceedToPreview = startTime && endTime && startTime < endTime;
  const newDaysCount = selectedDays.filter(d => !existingDays.has(d)).length;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">주간 스케줄 일괄 생성</Dialog.Title>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">주간 스케줄 생성</h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    {step === 'days' && '1단계: 요일 선택'}
                    {step === 'time' && '2단계: 운영 시간 설정'}
                    {step === 'preview' && '3단계: 확인 및 생성'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center mt-4 space-x-2">
              {['days', 'time', 'preview'].map((s, i) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step === s
                        ? 'bg-white text-blue-600'
                        : ['days', 'time', 'preview'].indexOf(step) > i
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-1 rounded ${
                        ['days', 'time', 'preview'].indexOf(step) > i
                          ? 'bg-white/30'
                          : 'bg-white/10'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
            {/* Step 1: Days Selection */}
            {step === 'days' && (
              <div className="space-y-6">
                {/* Presets */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">빠른 선택</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {presetOptions.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetChange(preset.id)}
                        className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                          selectedPreset === preset.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl mr-3">{preset.icon}</span>
                        <span className={`text-sm font-medium ${
                          selectedPreset === preset.id ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Checkboxes */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">요일 선택</h3>
                  <div className="flex gap-2">
                    {dayOptions.map(day => {
                      const isExisting = existingDays.has(day.value);
                      const isSelected = selectedDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          onClick={() => handleDayToggle(day.value)}
                          disabled={isExisting}
                          className={`flex-1 py-3 rounded-lg border-2 transition-all relative ${
                            isExisting
                              ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            isExisting ? 'text-gray-400' : isSelected ? 'text-blue-700' : day.color
                          }`}>
                            {day.short}
                          </span>
                          {isExisting && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {existingDays.size > 0 && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-1.5"></span>
                      이미 설정된 요일 ({existingDays.size}개)
                    </p>
                  )}
                </div>

                {/* Selected Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">선택된 요일</span>
                    <span className="text-sm font-medium text-blue-600">
                      {selectedDays.length}개 선택 ({newDaysCount}개 신규)
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedDays.map(d => {
                      const day = dayOptions.find(opt => opt.value === d);
                      const isExisting = existingDays.has(d);
                      return (
                        <span
                          key={d}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            isExisting
                              ? 'bg-gray-200 text-gray-500 line-through'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {day?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Time Settings */}
            {step === 'time' && (
              <div className="space-y-6">
                {/* Time Presets */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">운영 시간 프리셋</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {timePresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handleTimePresetChange(preset.id)}
                        className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                          timePreset === preset.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl mr-3">{preset.icon}</span>
                        <div className="text-left">
                          <span className={`text-sm font-medium block ${
                            timePreset === preset.id ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {preset.label}
                          </span>
                          {preset.startTime && (
                            <span className="text-xs text-gray-500">
                              {preset.startTime} ~ {preset.endTime}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Time */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">상세 시간 설정</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">시작 시간</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          setTimePreset('custom');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">종료 시간</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setTimePreset('custom');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Interval - TEE_TIME 모드에서만 표시 */}
                {!isSession && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">타임슬롯 간격</h3>
                    <div className="flex gap-2">
                      {intervalOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setInterval(opt.value)}
                          className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                            interval === opt.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-sm font-medium block ${
                            interval === opt.value ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {opt.label}
                          </span>
                          <span className="text-xs text-gray-500">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isSession && (
                  <div className="bg-emerald-50 rounded-lg p-4 flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-emerald-800">
                      SESSION 모드: 스케줄 1건당 슬롯 1개가 생성됩니다. 타임슬롯 간격은 사용되지 않습니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <div className="space-y-6">
                {creationResult ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">생성 완료!</h3>
                    <p className="text-gray-600">
                      {creationResult.created}개의 스케줄이 생성되었습니다.
                      {creationResult.skipped > 0 && ` (${creationResult.skipped}개 건너뜀)`}
                    </p>
                  </div>
                ) : isCreating ? (
                  /* 생성 진행 중 UI */
                  <div className="space-y-6">
                    {/* 프로그레스 바 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">스케줄 생성 중...</span>
                        <span className="text-sm font-bold text-blue-600">{currentProgress}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${currentProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* 요일별 상태 그리드 */}
                    <div className="grid grid-cols-7 gap-2">
                      {dayOptions.map(day => {
                        const status = dayStatuses[day.value];
                        const isSelected = selectedDays.includes(day.value);

                        if (!isSelected) {
                          return (
                            <div key={day.value} className="p-3 rounded-lg border bg-gray-50 border-gray-200 text-center">
                              <div className={`text-xs font-medium mb-1 ${day.color}`}>{day.short}</div>
                              <div className="text-[10px] text-gray-400">-</div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={day.value}
                            className={`p-3 rounded-lg border text-center transition-all duration-300 ${
                              status === 'completed'
                                ? 'bg-green-50 border-green-300'
                                : status === 'creating'
                                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 ring-offset-1'
                                : status === 'skipped'
                                ? 'bg-gray-100 border-gray-300'
                                : status === 'error'
                                ? 'bg-red-50 border-red-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className={`text-xs font-medium mb-1 ${day.color}`}>{day.short}</div>
                            <div className="h-5 flex items-center justify-center">
                              {status === 'creating' && (
                                <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              )}
                              {status === 'completed' && (
                                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {status === 'skipped' && (
                                <span className="text-[10px] text-gray-500">건너뜀</span>
                              )}
                              {status === 'error' && (
                                <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              {status === 'pending' && (
                                <span className="text-[10px] text-gray-400">대기</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 진행 상태 텍스트 */}
                    <div className="text-center text-sm text-gray-500">
                      잠시만 기다려 주세요...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                      <h3 className="text-sm font-medium text-blue-900 mb-4">생성 요약</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">선택 요일</span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedDays.map(d => dayOptions.find(o => o.value === d)?.short).join(', ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">운영 시간</span>
                          <span className="text-sm font-medium text-gray-900">{startTime} ~ {endTime}</span>
                        </div>
                        {!isSession && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">타임슬롯 간격</span>
                            <span className="text-sm font-medium text-gray-900">{interval}분</span>
                          </div>
                        )}
                        {isSession && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">슬롯 모드</span>
                            <span className="text-sm font-medium text-emerald-700">SESSION (시간대별 1슬롯)</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-blue-200">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-blue-700">생성될 스케줄</span>
                            <span className="text-lg font-bold text-blue-700">{newDaysCount}개</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview Grid */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">미리보기</h3>
                      <div className="grid grid-cols-7 gap-2">
                        {dayOptions.map(day => {
                          const isSelected = selectedDays.includes(day.value);
                          const isExisting = existingDays.has(day.value);
                          const isNew = isSelected && !isExisting;

                          return (
                            <div
                              key={day.value}
                              className={`p-3 rounded-lg border text-center ${
                                isNew
                                  ? 'bg-blue-50 border-blue-200'
                                  : isExisting
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className={`text-xs font-medium mb-1 ${day.color}`}>
                                {day.short}
                              </div>
                              {isNew && (
                                <>
                                  <div className="text-[10px] text-blue-600">{startTime}</div>
                                  <div className="text-[10px] text-gray-400">~</div>
                                  <div className="text-[10px] text-blue-600">{endTime}</div>
                                </>
                              )}
                              {isExisting && (
                                <div className="text-[10px] text-green-600">설정됨</div>
                              )}
                              {!isSelected && !isExisting && (
                                <div className="text-[10px] text-gray-400">-</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {newDaysCount === 0 && (
                      <div className="bg-yellow-50 rounded-lg p-4 flex items-start">
                        <svg className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-yellow-800">
                          선택한 모든 요일에 이미 스케줄이 설정되어 있습니다. 새로 생성할 스케줄이 없습니다.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!creationResult && !isCreating && (
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <button
                onClick={() => {
                  if (step === 'time') setStep('days');
                  else if (step === 'preview') setStep('time');
                  else handleClose();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {step === 'days' ? '취소' : '이전'}
              </button>

              <div className="flex gap-2">
                {step === 'days' && (
                  <button
                    onClick={() => setStep('time')}
                    disabled={!canProceedToTime}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    다음
                  </button>
                )}
                {step === 'time' && (
                  <button
                    onClick={() => setStep('preview')}
                    disabled={!canProceedToPreview}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    다음
                  </button>
                )}
                {step === 'preview' && (
                  <button
                    onClick={handleCreate}
                    disabled={newDaysCount === 0}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {newDaysCount}개 스케줄 생성
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default WeeklyScheduleWizard;
