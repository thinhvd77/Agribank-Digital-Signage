import { useEffect, useRef } from 'react';
import { useDialogStore } from './dialogStore';
import { useToastStore, type ToastVariant } from './toastStore';
import { DialogIcon, ToastIcon, getVariantStyles } from './DialogIcons';

// Alert/Confirm Dialog Component
function ModalDialog() {
  const { dialog, closeDialog } = useDialogStore();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialog.isOpen) {
        closeDialog(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dialog.isOpen, closeDialog]);

  useEffect(() => {
    if (dialog.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [dialog.isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      closeDialog(false);
    }
  };

  if (!dialog.isOpen) return null;

  const styles = getVariantStyles(dialog.variant);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-enter"
      style={{
        background: 'rgba(60, 8, 20, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="relative w-full max-w-md animate-dialog-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top border */}
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
        />

        {/* Main card */}
        <div
          className="relative bg-agribank-cream rounded-2xl p-8 shadow-dialog border border-white/50"
          style={{
            background: 'linear-gradient(145deg, #FAF8F5 0%, #F5F2ED 100%)',
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${styles.bgColor}, ${styles.bgColor}80)`,
                boxShadow: `0 8px 32px ${styles.shadowColor}`,
              }}
            >
              <DialogIcon variant={dialog.variant} />
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-full animate-pulse-gold"
                style={{
                  border: `2px solid ${styles.accentColor}`,
                  opacity: 0.4,
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h2
            className="font-display text-2xl font-semibold text-center mb-3"
            style={{ color: '#2a0f18' }}
          >
            {dialog.title}
          </h2>

          {/* Message */}
          <p className="font-body text-base text-center mb-8 leading-relaxed" style={{ color: '#5a3a42' }}>
            {dialog.message}
          </p>

          {/* Buttons */}
          <div className={`flex gap-3 ${dialog.type === 'confirm' ? 'justify-between' : 'justify-center'}`}>
            {dialog.type === 'confirm' && (
              <button
                onClick={() => closeDialog(false)}
                className="flex-1 px-6 py-3 rounded-xl font-body font-medium text-base
                         transition-all duration-300 ease-out
                         hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'transparent',
                  border: '1.5px solid #c9d6cf',
                  color: '#4a5f52',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#AE1C40';
                  e.currentTarget.style.color = '#AE1C40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#c9d6cf';
                  e.currentTarget.style.color = '#4a5f52';
                }}
              >
                {dialog.cancelText}
              </button>
            )}

            <button
              onClick={() => closeDialog(true)}
              className="flex-1 px-6 py-3 rounded-xl font-body font-semibold text-base
                       text-white transition-all duration-300 ease-out
                       hover:scale-[1.02] hover:shadow-glow-gold active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${styles.accentColor} 0%, ${styles.darkColor} 100%)`,
                boxShadow: `0 4px 16px ${styles.shadowColor}`,
              }}
            >
              {dialog.confirmText}
            </button>
          </div>

          {/* Decorative elements */}
          <div
            className="absolute -bottom-2 left-4 right-4 h-4 rounded-full -z-10 opacity-60"
            style={{ background: 'linear-gradient(90deg, transparent, #AE1C4020, transparent)' }}
          />
        </div>
      </div>
    </div>
  );
}

// Toast Notification Component
function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: {
    id: string;
    title: string;
    message: string;
    variant: ToastVariant;
  };
  index: number;
  onClose: () => void;
}

function ToastItem({ toast, index, onClose }: ToastItemProps) {
  const styles = getVariantStyles(toast.variant);
  const isError = toast.variant === 'error';
  const isWarning = toast.variant === 'warning';

  return (
    <div
      className="animate-toast-enter relative overflow-hidden rounded-xl shadow-dialog
                border border-white/60 backdrop-blur-sm"
      style={{
        background: isError
          ? 'linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 100%)'
          : isWarning
            ? 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%)'
            : 'linear-gradient(135deg, #FAF8F5 0%, #F5F2ED 100%)',
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${styles.accentColor}, ${styles.darkColor})`,
          animation: 'shrink 5s linear forwards',
          width: '100%',
        }}
      />

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      <div className="flex items-start gap-4 p-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: styles.bgColor,
            boxShadow: `0 2px 8px ${styles.shadowColor}`,
          }}
        >
          <ToastIcon variant={toast.variant} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-base mb-0.5" style={{ color: '#2a0f18' }}>
            {toast.title}
          </h3>
          <p className="font-body text-sm leading-relaxed truncate" style={{ color: '#5a3a42' }}>
            {toast.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                   transition-all duration-200 hover:bg-black/5"
          style={{ color: '#8a6b70' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M13 1L1 13M1 1L13 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Main Provider
export function DialogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ModalDialog />
      <ToastContainer />
    </>
  );
}
