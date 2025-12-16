import { useState, useCallback } from 'react';

export interface ConfirmationConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface UseConfirmationReturn {
  isOpen: boolean;
  isVisible: boolean; // Alias for isOpen
  config: ConfirmationConfig | null;
  title?: string;
  message?: string;
  confirm: (config: ConfirmationConfig) => Promise<boolean>;
  show: (config: ConfirmationConfig) => Promise<boolean>; // Alias for confirm
  showConfirmation: (config: ConfirmationConfig) => Promise<boolean>; // Additional alias
  close: () => void;
  hide: () => void; // Alias for close
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
}

export function useConfirmation(): UseConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmationConfig | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((confirmConfig: ConfirmationConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(confirmConfig);
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleConfirm = useCallback(async () => {
    if (config?.onConfirm) {
      try {
        await config.onConfirm();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      }
    }
    
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
    
    setIsOpen(false);
    setConfig(null);
  }, [config, resolvePromise]);

  const handleCancel = useCallback(() => {
    if (config?.onCancel) {
      config.onCancel();
    }
    
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
    
    setIsOpen(false);
    setConfig(null);
  }, [config, resolvePromise]);

  return {
    isOpen,
    isVisible: isOpen, // Alias
    config,
    title: config?.title,
    message: config?.message,
    confirm,
    show: confirm, // Alias
    showConfirmation: confirm, // Additional alias
    close,
    hide: close, // Alias
    handleConfirm,
    handleCancel,
  };
}

// 특정 작업에 대한 확인 훅들
export function useDeleteConfirmation() {
  const confirmation = useConfirmation();

  const confirmDelete = useCallback((
    itemName: string,
    onDelete: () => void | Promise<void>
  ) => {
    return confirmation.confirm({
      title: '삭제 확인',
      message: `정말로 "${itemName}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
      onConfirm: onDelete,
    });
  }, [confirmation]);

  return {
    ...confirmation,
    confirmDelete,
  };
}

export function useLeaveConfirmation() {
  const confirmation = useConfirmation();

  const confirmLeave = useCallback((onLeave?: () => void) => {
    return confirmation.confirm({
      title: '페이지 나가기',
      message: '변경사항이 저장되지 않았습니다.\n정말로 페이지를 나가시겠습니까?',
      confirmText: '나가기',
      cancelText: '취소',
      type: 'warning',
      onConfirm: onLeave,
    });
  }, [confirmation]);

  return {
    ...confirmation,
    confirmLeave,
  };
}

export function useActionConfirmation() {
  const confirmation = useConfirmation();

  const confirmAction = useCallback((
    actionName: string,
    description: string,
    onAction: () => void | Promise<void>,
    type: ConfirmationConfig['type'] = 'info'
  ) => {
    return confirmation.confirm({
      title: `${actionName} 확인`,
      message: description,
      confirmText: actionName,
      cancelText: '취소',
      type,
      onConfirm: onAction,
    });
  }, [confirmation]);

  return {
    ...confirmation,
    confirmAction,
  };
}