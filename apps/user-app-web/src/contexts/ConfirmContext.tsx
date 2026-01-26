import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
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

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        ...options,
        open: true,
        loading: false,
        showCancel: options.showCancel !== false,
      });
    });
  }, []);

  const alert = useCallback((options: Omit<ConfirmOptions, 'showCancel'>): Promise<boolean> => {
    return confirm({ ...options, showCancel: false });
  }, [confirm]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resolveRef.current?.(false);
      resolveRef.current = null;
      setState(initialState);
    }
  }, []);

  const handleOk = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(initialState);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(initialState);
  }, []);

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
