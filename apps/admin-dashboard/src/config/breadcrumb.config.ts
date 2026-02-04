import type { BreadcrumbItem } from '@/stores/breadcrumb.store';

export const BREADCRUMB_MAP: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ label: '대시보드' }],
  '/companies': [{ label: '회사', path: '/companies' }, { label: '회사 관리' }],
  '/admin-management': [{ label: '회사', path: '/companies' }, { label: '관리자 관리' }],
  '/roles': [{ label: '회사', path: '/companies' }, { label: '역할 및 권한' }],
  '/clubs': [{ label: '골프장', path: '/clubs' }, { label: '골프장 관리' }],
  '/games': [{ label: '골프장', path: '/clubs' }, { label: '라운드 관리' }],
  '/bookings': [{ label: '예약', path: '/bookings' }, { label: '예약 현황' }],
  '/bookings/cancellations': [{ label: '예약', path: '/bookings' }, { label: '환불 관리' }],
  '/user-management': [{ label: '회원', path: '/user-management' }, { label: '사용자 관리' }],
  '/system-settings': [{ label: '설정' }, { label: '시스템 설정' }],
};
