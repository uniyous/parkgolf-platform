import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useGenerateTimeSlotsMutation, useGameWeeklySchedulesQuery } from '@/hooks/queries';
import type { GameWeeklySchedule } from '@/lib/api/gamesApi';

interface TimeSlotWizardProps {
  gameId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'dates' | 'preview' | 'generating';

const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

const rangePresets = [
  { id: '1week', label: '1주일', days: 7, icon: '📅' },
  { id: '2weeks', label: '2주일', days: 14, icon: '📆' },
  { id: '1month', label: '1개월', days: 30, icon: '🗓️' },
  { id: 'custom', label: '직접 선택', days: 0, icon: '✏️' },
];

export const TimeSlotWizard: React.FC<TimeSlotWizardProps> = ({
  gameId,
  open,
  onClose,
  onSuccess,
}) => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [step, setStep] = useState<WizardStep>('dates');
  const [selectedPreset, setSelectedPreset] = useState<string>('1month');
  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const { data: weeklySchedules = [] } = useGameWeeklySchedulesQuery(gameId);
  const generateMutation = useGenerateTimeSlotsMutation();

  // 주간 스케줄이 있는 요일들
  const scheduledDays = useMemo(() => {
    const days = new Set<number>();
    weeklySchedules.forEach((schedule: GameWeeklySchedule) => {
      if (schedule.isActive) {
        days.add(schedule.dayOfWeek);
      }
    });
    return days;
  }, [weeklySchedules]);

  // 프리셋 변경 핸들러
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId !== 'custom') {
      const preset = rangePresets.find(p => p.id === presetId);
      if (preset) {
        setEndDate(formatDate(new Date(new Date(startDate).getTime() + preset.days * 24 * 60 * 60 * 1000)));
      }
    }
  };

  // 생성될 날짜 목록 계산
  const generationDates = useMemo(() => {
    const dates: { date: string; dayOfWeek: number; hasSchedule: boolean }[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      dates.push({
        date: formatDate(d),
        dayOfWeek,
        hasSchedule: scheduledDays.has(dayOfWeek),
      });
    }
    return dates;
  }, [startDate, endDate, scheduledDays]);

  // 생성될 타임슬롯이 있는 날짜 수
  const daysWithSlots = generationDates.filter(d => d.hasSchedule).length;
  const totalDays = generationDates.length;

  // 타임슬롯 생성
  const handleGenerate = async () => {
    setStep('generating');
    setIsGenerating(true);
    setProgress(0);

    // 시뮬레이션된 진행률 (API가 단일 요청이므로)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await generateMutation.mutateAsync({
        gameId,
        startDate,
        endDate,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult({ success: true, count: daysWithSlots });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error: any) {
      clearInterval(progressInterval);
      setResult({
        success: false,
        error: error?.message || '타임슬롯 생성에 실패했습니다.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setStep('dates');
    setSelectedPreset('1month');
    setStartDate(formatDate(today));
    setEndDate(formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)));
    setProgress(0);
    setResult(null);
    onClose();
  };

  const canProceedToPreview = startDate && endDate && startDate <= endDate && scheduledDays.size > 0;

  // 캘린더 미리보기를 위한 주 단위 그룹화
  const calendarWeeks = useMemo(() => {
    const weeks: { date: string; dayOfWeek: number; hasSchedule: boolean }[][] = [];
    let currentWeek: { date: string; dayOfWeek: number; hasSchedule: boolean }[] = [];

    // 첫 주의 빈 칸 채우기
    if (generationDates.length > 0) {
      const firstDayOfWeek = generationDates[0].dayOfWeek;
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: '', dayOfWeek: i, hasSchedule: false });
      }
    }

    generationDates.forEach((d) => {
      currentWeek.push(d);
      if (d.dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // 마지막 주 남은 날 처리
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', dayOfWeek: currentWeek.length, hasSchedule: false });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [generationDates]);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl max-h-[90vh] overflow-hidden focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">타임슬롯 일괄 생성</Dialog.Title>

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">타임슬롯 생성</h2>
                  <p className="text-emerald-100 text-sm mt-0.5">
                    {step === 'dates' && '1단계: 기간 선택'}
                    {step === 'preview' && '2단계: 미리보기 및 확인'}
                    {step === 'generating' && '3단계: 생성 중'}
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
              {['dates', 'preview', 'generating'].map((s, i) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step === s
                        ? 'bg-white/10 text-emerald-600'
                        : ['dates', 'preview', 'generating'].indexOf(step) > i
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-1 rounded ${
                        ['dates', 'preview', 'generating'].indexOf(step) > i
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
            {/* Step 1: Date Range Selection */}
            {step === 'dates' && (
              <div className="space-y-6">
                {/* 주간 스케줄 경고 */}
                {scheduledDays.size === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start">
                    <svg className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-400">주간 스케줄이 없습니다</p>
                      <p className="text-sm text-yellow-400/70 mt-1">
                        먼저 주간 스케줄 탭에서 운영 요일을 설정해주세요.
                      </p>
                    </div>
                  </div>
                )}

                {/* 프리셋 선택 */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-3">빠른 선택</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {rangePresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetChange(preset.id)}
                        className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                          selectedPreset === preset.id
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-white/15 hover:border-white/25'
                        }`}
                      >
                        <span className="text-xl mr-3">{preset.icon}</span>
                        <span className={`text-sm font-medium ${
                          selectedPreset === preset.id ? 'text-emerald-300' : 'text-white/70'
                        }`}>
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 날짜 선택 */}
                <div className="bg-white/5 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-white/70 mb-4">기간 설정</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">시작일</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        className="w-full px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">종료일</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        className="w-full px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 운영 요일 표시 */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-3">운영 요일 (주간 스케줄 기준)</h3>
                  <div className="flex gap-2">
                    {dayLabels.map((label, index) => {
                      const hasSchedule = scheduledDays.has(index);
                      return (
                        <div
                          key={index}
                          className={`flex-1 py-3 rounded-lg border-2 text-center ${
                            hasSchedule
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-white/15 bg-white/5'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            hasSchedule
                              ? 'text-emerald-300'
                              : 'text-white/40'
                          }`}>
                            {label}
                          </span>
                          {hasSchedule && (
                            <div className="mt-1">
                              <svg className="w-4 h-4 text-emerald-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 요약 정보 */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">선택 기간</span>
                    <span className="text-sm font-medium text-white">{totalDays}일</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-white/60">생성 예정일</span>
                    <span className="text-sm font-medium text-emerald-400">{daysWithSlots}일</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && (
              <div className="space-y-6">
                {/* 요약 카드 */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl p-5 border border-emerald-500/20">
                  <h3 className="text-sm font-medium text-emerald-300 mb-4">생성 요약</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-white/60">기간</span>
                      <span className="text-sm font-medium text-white">
                        {startDate} ~ {endDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white/60">총 일수</span>
                      <span className="text-sm font-medium text-white">{totalDays}일</span>
                    </div>
                    <div className="pt-3 border-t border-emerald-500/20">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-emerald-400">타임슬롯 생성 예정일</span>
                        <span className="text-lg font-bold text-emerald-400">{daysWithSlots}일</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 캘린더 미리보기 */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-3">미리보기</h3>
                  <div className="border border-white/15 rounded-lg overflow-hidden">
                    {/* 요일 헤더 */}
                    <div className="grid grid-cols-7 bg-white/5 border-b border-white/15">
                      {dayLabels.map((label, i) => (
                        <div
                          key={i}
                          className={`py-2 text-center text-xs font-medium ${
                            i === 0 ? 'text-red-400' : i === 6 ? 'text-emerald-400' : 'text-white/60'
                          }`}
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* 캘린더 그리드 */}
                    <div className="max-h-64 overflow-y-auto">
                      {calendarWeeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 border-b border-white/10 last:border-b-0">
                          {week.map((day, dayIndex) => (
                            <div
                              key={dayIndex}
                              className={`p-2 text-center min-h-[48px] flex flex-col items-center justify-center ${
                                !day.date
                                  ? 'bg-white/5'
                                  : day.hasSchedule
                                  ? 'bg-emerald-500/10'
                                  : 'bg-white/10'
                              }`}
                            >
                              {day.date && (
                                <>
                                  <span className={`text-sm ${
                                    day.dayOfWeek === 0
                                      ? 'text-red-400'
                                      : day.dayOfWeek === 6
                                      ? 'text-emerald-400'
                                      : 'text-white'
                                  }`}>
                                    {new Date(day.date).getDate()}
                                  </span>
                                  {day.hasSchedule && (
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1"></span>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-2 space-x-4 text-xs text-white/50">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-emerald-500/10 border border-emerald-500/20 rounded mr-1.5"></span>
                      생성 예정
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-white/10 border border-white/15 rounded mr-1.5"></span>
                      운영 안함
                    </div>
                  </div>
                </div>

                {/* 안내 메시지 */}
                <div className="bg-emerald-500/10 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-emerald-400">
                    주간 스케줄에 설정된 운영 시간을 기준으로 타임슬롯이 생성됩니다.
                    이미 존재하는 타임슬롯은 건너뜁니다.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && (
              <div className="space-y-6">
                {result ? (
                  result.success ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">생성 완료!</h3>
                      <p className="text-white/60">
                        타임슬롯이 성공적으로 생성되었습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">생성 실패</h3>
                      <p className="text-white/60">{result.error}</p>
                      <button
                        onClick={() => {
                          setStep('preview');
                          setResult(null);
                          setProgress(0);
                        }}
                        className="mt-4 px-4 py-2 text-emerald-400 hover:text-emerald-300"
                      >
                        다시 시도
                      </button>
                    </div>
                  )
                ) : (
                  <div className="py-8">
                    {/* 프로그레스 바 */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white/70">타임슬롯 생성 중...</span>
                        <span className="text-sm font-bold text-emerald-400">{progress}%</span>
                      </div>
                      <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 생성 정보 */}
                    <div className="text-center text-sm text-white/50 space-y-2">
                      <p>
                        {startDate} ~ {endDate}
                      </p>
                      <p>총 {daysWithSlots}일의 타임슬롯을 생성하고 있습니다...</p>
                      <p className="text-xs text-white/40 mt-4">
                        잠시만 기다려 주세요
                      </p>
                    </div>

                    {/* 로딩 애니메이션 */}
                    <div className="flex justify-center mt-6">
                      <div className="flex space-x-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'generating' && (
            <div className="px-6 py-4 bg-white/5 border-t border-white/15 flex items-center justify-between">
              <button
                onClick={() => {
                  if (step === 'preview') setStep('dates');
                  else handleClose();
                }}
                className="px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                {step === 'dates' ? '취소' : '이전'}
              </button>

              <div className="flex gap-2">
                {step === 'dates' && (
                  <button
                    onClick={() => setStep('preview')}
                    disabled={!canProceedToPreview}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    다음
                  </button>
                )}
                {step === 'preview' && (
                  <button
                    onClick={handleGenerate}
                    disabled={daysWithSlots === 0}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    타임슬롯 생성
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

export default TimeSlotWizard;
