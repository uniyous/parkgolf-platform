import { useState, useCallback, useEffect } from 'react';

export interface UseModalOptions {
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  preventBodyScroll?: boolean;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  
  // 모달 props
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
  };
  
  // 트리거 props
  triggerProps: {
    onClick: () => void;
  };
}

export function useModal(
  initialOpen: boolean = false,
  options: UseModalOptions = {}
): UseModalReturn {
  const {
    closeOnEscape = true,
    preventBodyScroll = true,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, close]);

  // body 스크롤 방지
  useEffect(() => {
    if (!preventBodyScroll) return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, preventBodyScroll]);

  const modalProps = {
    isOpen,
    onClose: close,
  };

  const triggerProps = {
    onClick: open,
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    modalProps,
    triggerProps,
  };
}

// 여러 모달을 관리하는 훅
export function useModalManager() {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const openModal = useCallback((modalId: string) => {
    setOpenModals(prev => new Set(prev).add(modalId));
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  }, []);

  const toggleModal = useCallback((modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modalId)) {
        newSet.delete(modalId);
      } else {
        newSet.add(modalId);
      }
      return newSet;
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  const isModalOpen = useCallback((modalId: string) => {
    return openModals.has(modalId);
  }, [openModals]);

  const hasOpenModals = openModals.size > 0;

  return {
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    isModalOpen,
    hasOpenModals,
    openModalIds: Array.from(openModals),
  };
}