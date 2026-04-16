import { useDialogStore } from '../components/dialog/dialogStore';
import { useToastStore, type ToastVariant } from '../components/dialog/toastStore';

interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  variant?: ToastVariant;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ToastVariant;
}

interface ToastOptions {
  title: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export function useDialog() {
  const openAlert = useDialogStore((state) => state.openAlert);
  const openConfirm = useDialogStore((state) => state.openConfirm);
  const addToast = useToastStore((state) => state.addToast);

  return {
    /**
     * Hiển thị dialog thông báo (thay thế alert)
     * @returns Promise<boolean> - luôn trả về true khi đóng
     */
    alert: (options: AlertOptions): Promise<boolean> => {
      return openAlert({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Đồng ý',
        variant: options.variant || 'info',
      });
    },

    /**
     * Hiển thị dialog xác nhận (thay thế confirm)
     * @returns Promise<boolean> - true nếu user nhấn xác nhận, false nếu hủy
     */
    confirm: (options: ConfirmOptions): Promise<boolean> => {
      return openConfirm({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy',
        variant: options.variant || 'info',
      });
    },

    /**
     * Hiển thị toast notification
     */
    toast: (options: ToastOptions): void => {
      addToast({
        title: options.title,
        message: options.message,
        variant: options.variant || 'info',
        duration: options.duration || 5000,
      });
    },

    /**
     * Hiển thị toast thành công
     */
    success: (title: string, message?: string): void => {
      addToast({
        title,
        message: message || 'Thao tác hoàn tất thành công',
        variant: 'success',
        duration: 5000,
      });
    },

    /**
     * Hiển thị toast lỗi
     */
    error: (title: string, message?: string): void => {
      addToast({
        title,
        message: message || 'Đã xảy ra lỗi, vui lòng thử lại',
        variant: 'error',
        duration: 5000,
      });
    },

    /**
     * Hiển thị toast cảnh báo
     */
    warning: (title: string, message?: string): void => {
      addToast({
        title,
        message: message || 'Vui lòng lưu ý',
        variant: 'warning',
        duration: 5000,
      });
    },

    /**
     * Hiển thị toast thông tin
     */
    info: (title: string, message?: string): void => {
      addToast({
        title,
        message: message || 'Thông tin cập nhật',
        variant: 'info',
        duration: 5000,
      });
    },
  };
}
