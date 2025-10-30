
import React, { useEffect, useState } from 'react';
import type { ToastInfo } from '../types';

interface ToastProps {
  toast: ToastInfo | null;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade-out animation before dismissing
        setTimeout(onDismiss, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  const baseClasses = "fixed bottom-5 right-5 flex items-center p-4 pr-6 max-w-sm rounded-lg shadow-2xl text-white transition-all duration-300 transform";
  const visibilityClasses = visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0";

  const typeClasses = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    error: 'bg-izakaya-red',
  };

  return (
    <div className={`${baseClasses} ${visibilityClasses} ${typeClasses[toast.type]}`}>
      <i data-lucide={toast.icon} className="w-6 h-6 mr-3"></i>
      <span>{toast.message}</span>
    </div>
  );
};

export default Toast;
