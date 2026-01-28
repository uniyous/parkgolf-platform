/**
 * 날짜/시간 및 가격 포맷팅 유틸리티
 */

/**
 * 날짜를 한국어 형식으로 포맷팅 (YYYY년 M월 D일 (요일))
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

/**
 * 날짜를 한국어 긴 형식으로 포맷팅 (YYYY년 MM월 DD일)
 * toLocaleDateString 사용
 */
export function formatDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 가격을 한국어 형식으로 포맷팅 (1,000)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price);
}

/**
 * 가격을 원화 통화 형식으로 포맷팅 (₩1,000)
 */
export function formatCurrency(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price);
}

/**
 * 시간을 HH:MM 형식으로 포맷팅
 */
export function formatTime(timeString: string): string {
  // HH:MM:SS 또는 HH:MM 형식 처리
  const parts = timeString.split(':');
  return `${parts[0]}:${parts[1]}`;
}
