import React from 'react';
import type { TimeSlotWizardData } from '../../types/courseCombo';

interface TimeSlotWizardStep3Props {
  data: TimeSlotWizardData;
  onUpdate: (updates: Partial<TimeSlotWizardData>) => void;
}

export const TimeSlotWizardStep3: React.FC<TimeSlotWizardStep3Props> = ({
  data,
  onUpdate
}) => {
  const handlePricingChange = (updates: Partial<typeof data.pricing>) => {
    onUpdate({
      pricing: {
        ...data.pricing,
        ...updates
      }
    });
  };

  const handlePoliciesChange = (updates: Partial<typeof data.policies>) => {
    onUpdate({
      policies: {
        ...data.policies,
        ...updates
      }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const calculateWeekendPrice = () => {
    return data.pricing.basePrice + (data.pricing.basePrice * data.pricing.weekendSurcharge / 100);
  };

  const calculateHolidayPrice = () => {
    return data.pricing.basePrice + (data.pricing.basePrice * data.pricing.holidaySurcharge / 100);
  };

  const calculateEarlyBookingPrice = () => {
    return data.pricing.basePrice - (data.pricing.basePrice * data.pricing.earlyBookingDiscount / 100);
  };

  const pricingPresets = [
    {
      name: '표준 요금제',
      description: '일반적인 골프장 요금',
      basePrice: 180000,
      weekendSurcharge: 20,
      holidaySurcharge: 30,
      earlyBookingDiscount: 10
    },
    {
      name: '프리미엄 요금제',
      description: '고급 코스 요금',
      basePrice: 250000,
      weekendSurcharge: 25,
      holidaySurcharge: 35,
      earlyBookingDiscount: 15
    },
    {
      name: '이코노미 요금제',
      description: '합리적인 요금',
      basePrice: 120000,
      weekendSurcharge: 15,
      holidaySurcharge: 20,
      earlyBookingDiscount: 5
    }
  ];

  const cancellationPolicies = [
    '24시간 전까지 무료 취소',
    '48시간 전까지 무료 취소',
    '72시간 전까지 무료 취소',
    '1주일 전까지 무료 취소'
  ];

  return (
    <div className="space-y-8">
      {/* 가격 설정 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">💰 가격 설정</h4>
        
        {/* 요금제 프리셋 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            요금제 프리셋
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingPresets.map((preset, index) => (
              <div
                key={index}
                onClick={() => handlePricingChange(preset)}
                className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h5 className="font-semibold text-gray-900 mb-1">{preset.name}</h5>
                <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                <div className="text-sm text-blue-600 font-medium">
                  기본: ₩{formatPrice(preset.basePrice)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 기본 가격 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기본 가격 (1팀 기준)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₩</span>
              <input
                type="number"
                value={data.pricing.basePrice}
                onChange={(e) => handlePricingChange({ basePrice: Number(e.target.value) })}
                min="0"
                step="10000"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="180000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              조기예약 할인율 (%)
            </label>
            <input
              type="number"
              value={data.pricing.earlyBookingDiscount}
              onChange={(e) => handlePricingChange({ earlyBookingDiscount: Number(e.target.value) })}
              min="0"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10"
            />
          </div>
        </div>

        {/* 추가 요금 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주말 추가요금 (%)
            </label>
            <input
              type="number"
              value={data.pricing.weekendSurcharge}
              onChange={(e) => handlePricingChange({ weekendSurcharge: Number(e.target.value) })}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              공휴일 추가요금 (%)
            </label>
            <input
              type="number"
              value={data.pricing.holidaySurcharge}
              onChange={(e) => handlePricingChange({ holidaySurcharge: Number(e.target.value) })}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30"
            />
          </div>
        </div>

        {/* 가격 미리보기 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-3">가격 미리보기</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">₩{formatPrice(data.pricing.basePrice)}</div>
              <div className="text-gray-600">평일</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">₩{formatPrice(calculateWeekendPrice())}</div>
              <div className="text-gray-600">주말</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">₩{formatPrice(calculateHolidayPrice())}</div>
              <div className="text-gray-600">공휴일</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">₩{formatPrice(calculateEarlyBookingPrice())}</div>
              <div className="text-gray-600">조기예약</div>
            </div>
          </div>
        </div>
      </div>

      {/* 예약 정책 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">📋 예약 정책</h4>
        
        <div className="space-y-6">
          {/* 최대 팀 수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              타임슬롯당 최대 팀 수
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="8"
                value={data.policies.maxTeams}
                onChange={(e) => handlePoliciesChange({ maxTeams: Number(e.target.value) })}
                className="flex-1"
              />
              <div className="w-16 text-center">
                <span className="text-2xl font-bold text-blue-600">{data.policies.maxTeams}</span>
                <div className="text-xs text-gray-500">팀</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              한 타임슬롯에 동시에 플레이할 수 있는 최대 팀 수입니다.
            </div>
          </div>

          {/* 취소 정책 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              취소 정책
            </label>
            <div className="space-y-2">
              {cancellationPolicies.map((policy) => (
                <label key={policy} className="flex items-center">
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value={policy}
                    checked={data.policies.cancellationPolicy === policy}
                    onChange={(e) => handlePoliciesChange({ cancellationPolicy: e.target.value })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{policy}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 예약 마감 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              예약 마감 시간 (플레이 시간 전)
            </label>
            <select
              value={data.policies.bookingDeadline}
              onChange={(e) => handlePoliciesChange({ bookingDeadline: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1시간 전</option>
              <option value={2}>2시간 전</option>
              <option value={4}>4시간 전</option>
              <option value={12}>12시간 전</option>
              <option value={24}>24시간 전</option>
              <option value={48}>48시간 전</option>
            </select>
            <div className="mt-2 text-sm text-gray-500">
              이 시간 이후에는 온라인 예약이 불가능합니다.
            </div>
          </div>
        </div>
      </div>

      {/* 요약 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">📊 설정 요약</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">가격 정보</h5>
            <div className="space-y-1 text-sm text-gray-700">
              <div>기본 가격: ₩{formatPrice(data.pricing.basePrice)}</div>
              <div>주말 가격: ₩{formatPrice(calculateWeekendPrice())}</div>
              <div>공휴일 가격: ₩{formatPrice(calculateHolidayPrice())}</div>
              <div>조기예약 가격: ₩{formatPrice(calculateEarlyBookingPrice())}</div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-900 mb-2">정책 정보</h5>
            <div className="space-y-1 text-sm text-gray-700">
              <div>최대 팀 수: {data.policies.maxTeams}팀</div>
              <div>취소 정책: {data.policies.cancellationPolicy}</div>
              <div>예약 마감: {data.policies.bookingDeadline}시간 전</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};