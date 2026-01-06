import React from 'react';
import { InlineLoading } from './GlobalLoading';
import { cn } from '@/utils';

interface DataContainerProps {
  /** 로딩 상태 */
  isLoading: boolean;
  /** 데이터가 비어있는지 여부 */
  isEmpty: boolean;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 빈 상태 설명 */
  emptyDescription?: string;
  /** 빈 상태 아이콘 (이모지 또는 SVG) */
  emptyIcon?: React.ReactNode;
  /** 빈 상태 액션 버튼 */
  emptyAction?: React.ReactNode;
  /** 로딩 메시지 */
  loadingMessage?: string;
  /** 컨테이너 className */
  className?: string;
  /** 자식 요소 */
  children: React.ReactNode;
}

/**
 * 데이터 목록을 위한 래퍼 컴포넌트
 * - 로딩 상태: InlineLoading 표시
 * - 빈 상태: emptyMessage 표시
 * - 데이터 있음: children 렌더링
 */
export const DataContainer: React.FC<DataContainerProps> = ({
  isLoading,
  isEmpty,
  emptyMessage = '데이터가 없습니다',
  emptyDescription,
  emptyIcon,
  emptyAction,
  loadingMessage,
  className,
  children,
}) => {
  // 로딩 중
  if (isLoading) {
    return (
      <div className={cn('py-12', className)}>
        <InlineLoading message={loadingMessage} />
      </div>
    );
  }

  // 데이터 없음
  if (isEmpty) {
    return (
      <div className={cn('text-center py-12', className)}>
        {emptyIcon && (
          <div className="flex justify-center mb-4">
            {typeof emptyIcon === 'string' ? (
              <span className="text-5xl">{emptyIcon}</span>
            ) : (
              emptyIcon
            )}
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
        {emptyDescription && (
          <p className="text-sm text-gray-500 mb-4">{emptyDescription}</p>
        )}
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  // 데이터 있음
  return <>{children}</>;
};

export default DataContainer;
