// Dialog and Toast Icons
import type { ToastVariant } from './toastStore';

export const getVariantStyles = (variant: ToastVariant) => {
  const styles = {
    info: {
      bgColor: '#fae8ec',
      accentColor: '#AE1C40',
      darkColor: '#7A1230',
      shadowColor: '#AE1C4040',
    },
    success: {
      bgColor: '#d4edda',
      accentColor: '#28a745',
      darkColor: '#1e7e34',
      shadowColor: '#28a74540',
    },
    warning: {
      bgColor: '#fff3cd',
      accentColor: '#ffc107',
      darkColor: '#c69500',
      shadowColor: '#ffc10740',
    },
    error: {
      bgColor: '#f8d7da',
      accentColor: '#dc3545',
      darkColor: '#a71d2a',
      shadowColor: '#dc354540',
    },
  };
  return styles[variant];
};

// Dialog Icons (larger, more detailed)
export function DialogIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case 'success':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#28a745" strokeWidth="2.5" fill="none"/>
          <path
            d="M12 20L17 25L28 14"
            stroke="#28a745"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 6L4 34H36L20 6Z"
            stroke="#ffc107"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line x1="20" y1="16" x2="20" y2="24" stroke="#ffc107" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="20" cy="30" r="1.5" fill="#ffc107"/>
        </svg>
      );
    case 'error':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#dc3545" strokeWidth="2.5" fill="none"/>
          <line x1="14" y1="14" x2="26" y2="26" stroke="#dc3545" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="26" y1="14" x2="14" y2="26" stroke="#dc3545" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
    default: // info
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#AE1C40" strokeWidth="2.5" fill="none"/>
          <line x1="20" y1="12" x2="20" y2="14" stroke="#AE1C40" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="20" y1="19" x2="20" y2="28" stroke="#AE1C40" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
  }
}

// Toast Icons (smaller, simpler)
export function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case 'success':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 10L8 14L16 6"
            stroke="#28a745"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 4L3 16H17L10 4Z"
            stroke="#ffc107"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line x1="10" y1="9" x2="10" y2="11" stroke="#ffc107" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="10" cy="14" r="1" fill="#ffc107"/>
        </svg>
      );
    case 'error':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="6" y1="6" x2="14" y2="14" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
          <line x1="14" y1="6" x2="6" y2="14" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    default: // info
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="6" r="1" fill="#AE1C40"/>
          <line x1="10" y1="9" x2="10" y2="14" stroke="#AE1C40" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
  }
}
