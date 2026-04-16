import { create } from 'zustand';

export type DialogType = 'alert' | 'confirm' | null;

export interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  resolve: ((value: boolean) => void) | null;
}

interface DialogStore {
  dialog: DialogState;
  openAlert: (options: {
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  }) => Promise<boolean>;
  openConfirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  }) => Promise<boolean>;
  closeDialog: (result: boolean) => void;
}

const initialState: DialogState = {
  isOpen: false,
  type: null,
  title: '',
  message: '',
  confirmText: 'Đồng ý',
  cancelText: 'Hủy',
  variant: 'info',
  resolve: null,
};

export const useDialogStore = create<DialogStore>((set, get) => ({
  dialog: initialState,

  openAlert: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          isOpen: true,
          type: 'alert',
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || 'Đồng ý',
          cancelText: '',
          variant: options.variant || 'info',
          resolve,
        },
      });
    });
  },

  openConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          isOpen: true,
          type: 'confirm',
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || 'Xác nhận',
          cancelText: options.cancelText || 'Hủy',
          variant: options.variant || 'info',
          resolve,
        },
      });
    });
  },

  closeDialog: (result: boolean) => {
    const { dialog } = get();
    if (dialog.resolve) {
      dialog.resolve(result);
    }
    set({ dialog: initialState });
  },
}));
