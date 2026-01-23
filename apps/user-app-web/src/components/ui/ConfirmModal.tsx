import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmModalType = 'info' | 'success' | 'warning' | 'danger';

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: ConfirmModalType;
  title: string;
  description?: string;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showCancel?: boolean;
}

const typeConfig: Record<ConfirmModalType, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  okButtonClass: string;
}> = {
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    okButtonClass: 'bg-blue-500 hover:bg-blue-600',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    okButtonClass: 'bg-green-500 hover:bg-green-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    okButtonClass: 'bg-amber-500 hover:bg-amber-600',
  },
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    okButtonClass: 'bg-red-500 hover:bg-red-600',
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onOpenChange,
  type = 'warning',
  title,
  description,
  content,
  okText = '확인',
  cancelText = '취소',
  onOk,
  onCancel,
  loading = false,
  disabled = false,
  showCancel = true,
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleOk = async () => {
    if (onOk) {
      await onOk();
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        {/* Overlay */}
        <AlertDialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Content */}
        <AlertDialog.Content
          className={cn(
            'fixed z-50 w-[calc(100%-2rem)] max-w-md',
            // 모바일: 하단 정렬, 데스크톱: 중앙 정렬
            'bottom-4 left-1/2 -translate-x-1/2',
            'sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2',
            // 스타일
            'glass-card p-6 rounded-2xl',
            // 애니메이션
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4',
            'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
            'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
            'duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('p-2 rounded-full', config.iconBg)}>
              <Icon className={cn('w-5 h-5', config.iconColor)} />
            </div>
            <AlertDialog.Title className="text-lg font-bold text-white">
              {title}
            </AlertDialog.Title>
          </div>

          {/* Description */}
          {description && (
            <AlertDialog.Description className="text-sm text-white/70 mb-4">
              {description}
            </AlertDialog.Description>
          )}

          {/* Custom Content */}
          {content && (
            <div className="mb-4">
              {content}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {showCancel && (
              <AlertDialog.Cancel asChild>
                <button
                  onClick={handleCancel}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium rounded-xl',
                    'bg-white/10 text-white/70',
                    'hover:bg-white/20 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-white/30'
                  )}
                >
                  {cancelText}
                </button>
              </AlertDialog.Cancel>
            )}
            <AlertDialog.Action asChild>
              <button
                onClick={handleOk}
                disabled={loading || disabled}
                className={cn(
                  'flex-1 py-3 text-sm font-medium rounded-xl',
                  'text-white transition-colors',
                  config.okButtonClass,
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loading ? '처리 중...' : okText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

export default ConfirmModal;
