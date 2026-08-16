import { useCallback } from 'react';
import { useRequirements } from '@/context/RequirementsContext';
import type { ToastState } from '@/types';

/**
 * useToast：Toast/Snackbar 便捷 Hook
 * 用法：const toast = useToast(); toast.success('创建成功');
 */
export function useToast() {
  const { dispatch } = useRequirements();

  const show = useCallback(
    (message: string, severity: ToastState['severity'] = 'success') => {
      dispatch({ type: 'TOAST_SHOW', payload: { message, severity } });
    },
    [dispatch],
  );

  return {
    show,
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    info: (msg: string) => show(msg, 'info'),
    warning: (msg: string) => show(msg, 'warning'),
  };
}

export type ToastHelpers = ReturnType<typeof useToast>;
