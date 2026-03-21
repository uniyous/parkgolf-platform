import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CheckCircle, XCircle, UserX, AlertTriangle, Loader2 } from 'lucide-react';

export type ActionType = 'complete' | 'cancel' | 'noshow' | 'warning' | 'danger';

interface ActionConfig {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  buttonColor: string;
  buttonHoverColor: string;
  buttonLabel: string;
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  complete: {
    title: '완료 처리',
    icon: <CheckCircle className="w-5 h-5 text-green-400" />,
    iconBgColor: 'bg-green-500/20',
    buttonColor: 'bg-green-600',
    buttonHoverColor: 'hover:bg-green-700',
    buttonLabel: '완료',
  },
  cancel: {
    title: '예약 취소',
    icon: <XCircle className="w-5 h-5 text-red-400" />,
    iconBgColor: 'bg-red-500/20',
    buttonColor: 'bg-red-600',
    buttonHoverColor: 'hover:bg-red-700',
    buttonLabel: '취소',
  },
  noshow: {
    title: '노쇼 처리',
    icon: <UserX className="w-5 h-5 text-white/60" />,
    iconBgColor: 'bg-white/10',
    buttonColor: 'bg-white/20',
    buttonHoverColor: 'hover:bg-white/30',
    buttonLabel: '노쇼 처리',
  },
  warning: {
    title: '확인',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    iconBgColor: 'bg-yellow-500/20',
    buttonColor: 'bg-yellow-600',
    buttonHoverColor: 'hover:bg-yellow-700',
    buttonLabel: '확인',
  },
  danger: {
    title: '삭제 확인',
    icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    iconBgColor: 'bg-red-500/20',
    buttonColor: 'bg-red-600',
    buttonHoverColor: 'hover:bg-red-700',
    buttonLabel: '삭제',
  },
};

interface ActionConfirmPopoverProps {
  /** 트리거 버튼 (children) */
  children: React.ReactNode;
  /** 액션 타입 */
  actionType: ActionType;
  /** 대상 이름 (예: 예약번호) */
  targetName?: string;
  /** 커스텀 메시지 */
  message?: string;
  /** 경고 메시지 (빨간색 작은 텍스트) */
  warningText?: string;
  /** 실행 중 상태 */
  isPending?: boolean;
  /** 확인 시 호출되는 함수 */
  onConfirm: () => void | Promise<void>;
  /** 팝오버 정렬 위치 */
  align?: 'start' | 'center' | 'end';
  /** 팝오버 방향 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 커스텀 타이틀 */
  title?: string;
  /** 커스텀 버튼 라벨 */
  confirmLabel?: string;
}

export const ActionConfirmPopover: React.FC<ActionConfirmPopoverProps> = ({
  children,
  actionType,
  targetName,
  message,
  warningText,
  isPending = false,
  onConfirm,
  align = 'center',
  side = 'top',
  title,
  confirmLabel,
}) => {
  const [open, setOpen] = useState(false);
  const config = ACTION_CONFIGS[actionType];

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  const getDefaultMessage = (): string => {
    switch (actionType) {
      case 'complete':
        return targetName ? `"${targetName}" 예약을 완료 처리하시겠습니까?` : '예약을 완료 처리하시겠습니까?';
      case 'cancel':
        return targetName ? `"${targetName}" 예약을 취소하시겠습니까?` : '예약을 취소하시겠습니까?';
      case 'noshow':
        return targetName ? `"${targetName}" 예약을 노쇼 처리하시겠습니까?` : '예약을 노쇼 처리하시겠습니까?';
      case 'warning':
        return '이 작업을 진행하시겠습니까?';
      case 'danger':
        return targetName ? `"${targetName}"을(를) 삭제하시겠습니까?` : '삭제하시겠습니까?';
      default:
        return '진행하시겠습니까?';
    }
  };

  const getDefaultWarning = (): string | undefined => {
    switch (actionType) {
      case 'cancel':
        return '취소된 예약은 환불 정책에 따라 처리됩니다.';
      case 'noshow':
        return '노쇼 처리 시 패널티가 적용될 수 있습니다.';
      case 'danger':
        return '이 작업은 되돌릴 수 없습니다.';
      default:
        return undefined;
    }
  };

  const displayTitle = title || config.title;
  const displayMessage = message || getDefaultMessage();
  const displayWarning = warningText ?? getDefaultWarning();
  const displayConfirmLabel = confirmLabel || config.buttonLabel;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-lg border border-white/15 bg-emerald-900/95 backdrop-blur-xl p-4 shadow-lg animate-in fade-in-0 zoom-in-95"
          align={align}
          side={side}
          sideOffset={8}
        >
          {/* 아이콘 및 메시지 */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full ${config.iconBgColor} flex items-center justify-center`}>
                {config.icon}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">{displayTitle}</h3>
              <p className="mt-1 text-sm text-white/50">{displayMessage}</p>
              {displayWarning && (
                <p className={`mt-1 text-xs ${actionType === 'complete' ? 'text-green-400' : 'text-red-400'}`}>
                  {displayWarning}
                </p>
              )}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="mt-4 flex justify-end space-x-2">
            <Popover.Close asChild>
              <button
                type="button"
                disabled={isPending}
                className="px-3 py-1.5 text-sm font-medium text-white/70 bg-white/10 border border-white/15 rounded-lg hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20 disabled:opacity-50"
              >
                닫기
              </button>
            </Popover.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className={`px-3 py-1.5 text-sm font-medium text-white ${config.buttonColor} ${config.buttonHoverColor} border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center space-x-1`}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>처리 중...</span>
                </>
              ) : (
                <span>{displayConfirmLabel}</span>
              )}
            </button>
          </div>

          {/* 화살표 */}
          <Popover.Arrow className="fill-emerald-900/95" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default ActionConfirmPopover;
