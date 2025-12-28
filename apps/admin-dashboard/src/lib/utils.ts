import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스를 조건부로 결합하고 충돌을 해결하는 유틸리티 함수
 *
 * @example
 * // 기본 사용
 * cn('px-2 py-1', 'bg-blue-500')
 * // => 'px-2 py-1 bg-blue-500'
 *
 * @example
 * // 조건부 클래스
 * cn('base-class', isActive && 'active-class', { 'error-class': hasError })
 * // => 조건에 따라 클래스 적용
 *
 * @example
 * // Tailwind 충돌 해결
 * cn('px-4', 'px-8')
 * // => 'px-8' (뒤의 값이 앞의 값을 override)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
