import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export type TimeSlotPattern = 'AM_PM' | 'INTERVAL_10' | 'INTERVAL_15' | 'INTERVAL_30' | 'INTERVAL_60' | 'CUSTOM';

interface TimeSlotPatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: TimeSlotGenerationConfig) => void;
}

export interface TimeSlotGenerationConfig {
  pattern: TimeSlotPattern;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  price: number;
  // 패턴별 추가 설정
  customInterval?: number; // 커스텀 간격 (분 단위)
  amStartTime?: string;
  amEndTime?: string;
  pmStartTime?: string;
  pmEndTime?: string;
}

const patternOptions = [
  { value: 'AM_PM', label: '오전/오후 구분' },
  { value: 'INTERVAL_10', label: '10분 단위' },
  { value: 'INTERVAL_15', label: '15분 단위' },
  { value: 'INTERVAL_30', label: '30분 단위' },
  { value: 'INTERVAL_60', label: '60분 단위' },
  { value: 'CUSTOM', label: '사용자 정의' },
];

export const TimeSlotPatternModal: React.FC<TimeSlotPatternModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [config, setConfig] = useState<TimeSlotGenerationConfig>({
    pattern: 'INTERVAL_30',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30일 후
    startTime: '09:00',
    endTime: '18:00',
    maxPlayers: 4,
    price: 10000,
    customInterval: 30,
    amStartTime: '09:00',
    amEndTime: '12:00',
    pmStartTime: '13:00',
    pmEndTime: '18:00',
  });

  const handlePatternChange = (pattern: TimeSlotPattern) => {
    setConfig(prev => ({ ...prev, pattern }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(config);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="패턴 기반 타임슬롯 생성">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기간 설정 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-900">기간 설정</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <Input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일
              </label>
              <Input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                min={config.startDate}
                required
              />
            </div>
          </div>
        </div>

        {/* 패턴 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            생성 패턴
          </label>
          <select
            value={config.pattern}
            onChange={(e) => handlePatternChange(e.target.value as TimeSlotPattern)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {patternOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 패턴별 설정 */}
        {config.pattern === 'AM_PM' && (
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-blue-900">오전/오후 시간 설정</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  오전 시작
                </label>
                <Input
                  type="time"
                  value={config.amStartTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, amStartTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  오전 종료
                </label>
                <Input
                  type="time"
                  value={config.amEndTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, amEndTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  오후 시작
                </label>
                <Input
                  type="time"
                  value={config.pmStartTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, pmStartTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  오후 종료
                </label>
                <Input
                  type="time"
                  value={config.pmEndTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, pmEndTime: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {config.pattern !== 'AM_PM' && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">운영 시간</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 시간
                </label>
                <Input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료 시간
                </label>
                <Input
                  type="time"
                  value={config.endTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            {config.pattern === 'CUSTOM' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시간 간격 (분)
                </label>
                <Input
                  type="number"
                  value={config.customInterval}
                  onChange={(e) => setConfig(prev => ({ ...prev, customInterval: parseInt(e.target.value) }))}
                  min="5"
                  max="120"
                  step="5"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* 공통 설정 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">기본 설정</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최대 인원
              </label>
              <Input
                type="number"
                value={config.maxPlayers}
                onChange={(e) => setConfig(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                min="1"
                max="8"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가격
              </label>
              <Input
                type="number"
                value={config.price}
                onChange={(e) => setConfig(prev => ({ ...prev, price: parseInt(e.target.value) }))}
                min="0"
                step="1000"
                required
              />
            </div>
          </div>
        </div>

        {/* 예상 생성 개수 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>주의:</strong> 선택한 기간과 패턴에 따라 많은 수의 타임슬롯이 생성될 수 있습니다.
            {getEstimatedCount(config) > 0 && (
              <span className="block mt-1">
                예상 생성 개수: 약 <strong>{getEstimatedCount(config)}개</strong>
              </span>
            )}
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">
            타임슬롯 생성
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// 예상 생성 개수 계산
function getEstimatedCount(config: TimeSlotGenerationConfig): number {
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  switch (config.pattern) {
    case 'AM_PM':
      return days * 2; // 하루에 오전/오후 2개

    case 'INTERVAL_10':
    case 'INTERVAL_15':
    case 'INTERVAL_30':
    case 'INTERVAL_60':
    case 'CUSTOM': {
      const interval = config.pattern === 'CUSTOM' 
        ? (config.customInterval || 30)
        : parseInt(config.pattern.split('_')[1]);
      
      const [startHour, startMin] = config.startTime.split(':').map(Number);
      const [endHour, endMin] = config.endTime.split(':').map(Number);
      const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const slotsPerDay = Math.floor(totalMinutes / interval);
      
      return days * slotsPerDay;
    }

    default:
      return 0;
  }
}