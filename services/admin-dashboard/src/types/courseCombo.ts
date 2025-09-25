import type { Course } from './course';

export interface CourseCombo {
  id: string;
  name: string;
  description?: string;
  frontCourse: Course;
  backCourse: Course;
  totalPar: number;
  totalDistance: number;
  basePrice: number;
  isPopular?: boolean;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'PROFESSIONAL';
  estimatedDuration: number; // 분 단위
  features: string[];
  distributionWeight?: number; // 타임슬롯 분배 비중 (%)
  isRecommended?: boolean; // 권장 조합 여부
}

export interface CourseComboSelectorProps {
  availableCombos: CourseCombo[];
  selectedCombo?: CourseCombo;
  onComboSelect: (combo: CourseCombo) => void;
  loading?: boolean;
}

export interface TimeSlotWizardData {
  selectedCombo?: CourseCombo;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  timePattern: {
    type: 'STANDARD' | 'WEEKEND' | 'CUSTOM';
    startTime: string;
    endTime: string;
    interval: number; // 분 단위
    excludeHolidays: boolean;
    customDays?: string[]; // ['monday', 'tuesday', ...]
  };
  pricing: {
    basePrice: number;
    weekendSurcharge: number; // 퍼센트
    holidaySurcharge: number; // 퍼센트
    earlyBookingDiscount: number; // 퍼센트
  };
  policies: {
    maxTeams: number;
    cancellationPolicy: string;
    bookingDeadline: number; // 시간 단위
  };
}