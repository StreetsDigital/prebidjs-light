import { create } from 'zustand';
import { POLLING } from '../constants/polling';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Auto-remove after duration
    const duration = toast.duration ?? POLLING.TOAST_DURATION;
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    const newToast: Toast = {
      id,
      duration,
      ...toast,
      timeoutId,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
  },

  removeToast: (id) => {
    set((state) => {
      // Find the toast and clear its timeout
      const toast = state.toasts.find((t) => t.id === id);
      if (toast?.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
      return {
        toasts: state.toasts.filter((t) => t.id !== id),
      };
    });
  },

  clearToasts: () => {
    set((state) => {
      // Clear all timeouts before clearing toasts
      state.toasts.forEach((toast) => {
        if (toast.timeoutId) {
          clearTimeout(toast.timeoutId);
        }
      });
      return { toasts: [] };
    });
  },
}));
