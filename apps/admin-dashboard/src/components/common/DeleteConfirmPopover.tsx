import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

interface DeleteConfirmPopoverProps {
  /** 삭제 버튼 트리거 (children) */
  children: React.ReactNode;
  /** 삭제 대상 이름 */
  targetName?: string;
  /** 삭제 확인 메시지 */
  message?: string;
  /** 삭제 실행 중 상태 */
  isDeleting?: boolean;
  /** 삭제 확인 시 호출되는 함수 */
  onConfirm: () => void | Promise<void>;
  /** 팝오버 정렬 위치 */
  align?: 'start' | 'center' | 'end';
  /** 팝오버 방향 */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const DeleteConfirmPopover: React.FC<DeleteConfirmPopoverProps> = ({
  children,
  targetName,
  message,
  isDeleting = false,
  onConfirm,
  align = 'center',
  side = 'top',
}) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  const displayMessage = message || (targetName
    ? `"${targetName}"을(를) 삭제하시겠습니까?`
    : '삭제하시겠습니까?');

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg animate-in fade-in-0 zoom-in-95"
          align={align}
          side={side}
          sideOffset={8}
        >
          {/* 경고 아이콘 */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">삭제 확인</h3>
              <p className="mt-1 text-sm text-gray-500">{displayMessage}</p>
              <p className="mt-1 text-xs text-red-500">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="mt-4 flex justify-end space-x-2">
            <Popover.Close asChild>
              <button
                type="button"
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                취소
              </button>
            </Popover.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center space-x-1"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>삭제 중...</span>
                </>
              ) : (
                <span>삭제</span>
              )}
            </button>
          </div>

          {/* 화살표 */}
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default DeleteConfirmPopover;
