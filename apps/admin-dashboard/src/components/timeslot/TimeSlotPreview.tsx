import React, { useMemo } from 'react';
import type { TimeSlotWizardData } from '../../types/courseCombo';

interface TimeSlotPreviewProps {
  data: TimeSlotWizardData;
}

export const TimeSlotPreview: React.FC<TimeSlotPreviewProps> = ({ data }) => {
  const previewData = useMemo(() => {
    if (!data.selectedCombo || !data.dateRange.startDate || !data.dateRange.endDate) {
      return null;
    }

    // 날짜 범위 계산
    const startDate = new Date(data.dateRange.startDate);
    const endDate = new Date(data.dateRange.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 타임슬롯 개수 계산
    let slotsPerDay = 0;
    if (data.timePattern.type !== 'CUSTOM') {
      const startTime = new Date(`2000-01-01T${data.timePattern.startTime}:00`);
      const endTime = new Date(`2000-01-01T${data.timePattern.endTime}:00`);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      slotsPerDay = Math.floor(duration / data.timePattern.interval);
    } else {
      slotsPerDay = Math.floor(8 * 60 / data.timePattern.interval); // 기본 8시간 가정
    }

    // 분배 비중을 고려한 실제 생성될 슬롯 수 계산
    const totalPossibleSlots = daysDiff * slotsPerDay;
    const distributionWeight = data.selectedCombo.distributionWeight || 100;
    const actualSlots = Math.round(totalPossibleSlots * (distributionWeight / 100));
    const totalRevenue = actualSlots * data.pricing.basePrice;

    // 요일별 타임슬롯 미리보기 (오늘부터 3일간)
    const previewDays = [];
    for (let i = 0; i < Math.min(3, daysDiff); i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const daySlots = [];
      const startHour = parseInt(data.timePattern.startTime.split(':')[0]);
      const startMinute = parseInt(data.timePattern.startTime.split(':')[1]);
      
      for (let j = 0; j < Math.min(6, slotsPerDay); j++) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(startHour, startMinute + (j * data.timePattern.interval), 0, 0);
        
        daySlots.push({
          time: slotTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
          price: currentDate.getDay() === 0 || currentDate.getDay() === 6 
            ? data.pricing.basePrice + (data.pricing.basePrice * data.pricing.weekendSurcharge / 100)
            : data.pricing.basePrice
        });
      }
      
      previewDays.push({
        date: currentDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }),
        slots: daySlots
      });
    }

    return {
      daysDiff,
      slotsPerDay,
      totalPossibleSlots,
      actualSlots,
      totalRevenue,
      previewDays,
      distributionWeight
    };
  }, [data]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (!previewData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">👁️</div>
          <h4 className="font-medium text-gray-900 mb-2">미리보기</h4>
          <p className="text-sm">설정을 완료하면 미리보기가 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">실시간 미리보기</h4>
        <p className="text-sm text-gray-600">설정에 따른 타임슬롯 생성 결과입니다.</p>
      </div>

      {/* 요약 통계 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h5 className="font-medium text-gray-900 mb-3">생성 예정 통계</h5>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">총 기간:</span>
            <span className="font-medium">{previewData.daysDiff}일</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">일일 최대 슬롯:</span>
            <span className="font-medium">{previewData.slotsPerDay}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">전체 가능 슬롯:</span>
            <span className="font-medium text-gray-500">{previewData.totalPossibleSlots}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">분배 비중:</span>
            <span className="font-medium text-blue-600">{previewData.distributionWeight}%</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="text-sm text-gray-600">실제 생성 슬롯:</span>
            <span className="font-bold text-blue-600">{previewData.actualSlots}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">예상 매출:</span>
            <span className="font-bold text-green-600">₩{formatPrice(previewData.totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* 코스 정보 */}
      {data.selectedCombo && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h5 className="font-medium text-gray-900 mb-3">선택된 코스</h5>
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">{data.selectedCombo.name}</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">전반:</span>
              <span>{data.selectedCombo.frontCourse.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">후반:</span>
              <span>{data.selectedCombo.backCourse.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">기본 가격:</span>
              <span className="font-medium">₩{formatPrice(data.selectedCombo.basePrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 날짜별 미리보기 */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3">타임슬롯 미리보기</h5>
          <div className="space-y-4">
            {previewData.previewDays.map((day, dayIndex) => (
              <div key={dayIndex} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                <div className="text-sm font-medium text-gray-900 mb-2">{day.date}</div>
                <div className="space-y-1">
                  {day.slots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className={`flex items-center justify-between p-2 rounded text-xs ${
                        slot.isWeekend ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <span className="font-medium">{slot.time}</span>
                      <span className={`font-bold ${slot.isWeekend ? 'text-blue-600' : 'text-gray-900'}`}>
                        ₩{formatPrice(slot.price)}
                      </span>
                    </div>
                  ))}
                  {previewData.slotsPerDay > 6 && (
                    <div className="text-center py-1 text-xs text-gray-500">
                      ... 외 {previewData.slotsPerDay - 6}개 더
                    </div>
                  )}
                </div>
              </div>
            ))}
            {previewData.daysDiff > 3 && (
              <div className="text-center py-2 text-sm text-gray-500">
                ... 외 {previewData.daysDiff - 3}일 더
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 경고 및 알림 */}
      <div className="mt-4 space-y-2">
        {data.timePattern.excludeHolidays && (
          <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
            ⚠️ 공휴일은 자동으로 제외됩니다.
          </div>
        )}
        {previewData.actualSlots > 1000 && (
          <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
            ⚠️ 생성될 타임슬롯이 많습니다. 처리 시간이 오래 걸릴 수 있습니다.
          </div>
        )}
        {data.policies.maxTeams > 6 && (
          <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
            💡 팀 수가 많습니다. 코스 혼잡도를 고려해주세요.
          </div>
        )}
        {previewData.distributionWeight < 100 && (
          <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
            📊 이 조합은 전체 타임슬롯의 {previewData.distributionWeight}%만 할당됩니다. 다른 코스들과 공평하게 분배됩니다.
          </div>
        )}
        {previewData.actualSlots !== previewData.totalPossibleSlots && (
          <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded p-2">
            ✅ 분배 비중에 따라 {previewData.totalPossibleSlots}개 중 {previewData.actualSlots}개가 생성됩니다.
          </div>
        )}
      </div>
    </div>
  );
};