import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmModal, type ConfirmModalType } from '@/components/ui/ConfirmModal';

export interface ConfirmOptions {
  type?: ConfirmModalType;
  title: string;
  description?: string;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  loading: boolean;
  resolve?: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmOptions, 'showCancel'>) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const initialState: ConfirmState = {
  open: false,
  loading: false,
  title: '',
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState>(initialState);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        open: true,
        loading: false,
        showCancel: options.showCancel !== false,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: Omit<ConfirmOptions, 'showCancel'>): Promise<boolean> => {
    return confirm({ ...options, showCancel: false });
  }, [confirm]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      state.resolve?.(false);
      setState(initialState);
    }
  }, [state]);

  const handleOk = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    state.resolve?.(true);
    setState(initialState);
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(initialState);
  }, [state]);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        open={state.open}
        onOpenChange={handleOpenChange}
        type={state.type}
        title={state.title}
        description={state.description}
        content={state.content}
        okText={state.okText}
        cancelText={state.cancelText}
        showCancel={state.showCancel}
        loading={state.loading}
        onOk={handleOk}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextValue => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
