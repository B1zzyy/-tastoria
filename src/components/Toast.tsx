'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info, X as CloseIcon } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastIcons = {
  success: Check,
  error: X,
  warning: AlertCircle,
  info: Info,
};

const toastStyles = {
  success: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-border',
    icon: 'text-foreground',
    title: 'text-card-foreground',
    description: 'text-muted-foreground',
  },
  error: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-border',
    icon: 'text-foreground',
    title: 'text-card-foreground',
    description: 'text-muted-foreground',
  },
  warning: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-border',
    icon: 'text-foreground',
    title: 'text-card-foreground',
    description: 'text-muted-foreground',
  },
  info: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-border',
    icon: 'text-foreground',
    title: 'text-card-foreground',
    description: 'text-muted-foreground',
  },
};

export default function Toast({ toast, onRemove }: ToastProps) {
  const Icon = toastIcons[toast.type];
  const styles = toastStyles[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -300, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -300, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.3 
      }}
      className={`
        relative max-w-sm w-full ${styles.bg} ${styles.border} 
        border rounded-lg shadow-lg backdrop-blur-sm
        pointer-events-auto
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${styles.title}`}>
              {toast.title}
            </p>
            {toast.description && (
              <p className={`text-xs mt-1 ${styles.description}`}>
                {toast.description}
              </p>
            )}
          </div>
          
          <button
            onClick={() => onRemove(toast.id)}
            className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
