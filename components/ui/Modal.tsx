
import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  isOpen: boolean;
  maxWidth?: string;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, isOpen, maxWidth = 'max-w-3xl', className = '' }) => {
  const [themeClass, setThemeClass] = useState<string>('dark');

  // Sync theme with document root
  useEffect(() => {
    const updateTheme = () => {
      const root = document.documentElement;
      if (root.classList.contains('dark')) {
        setThemeClass('dark');
      } else if (root.classList.contains('black')) {
        setThemeClass('black');
      } else {
        setThemeClass('light');
      }
    };

    // Initial theme
    updateTheme();

    // Observe theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up ${themeClass}`}
      style={{ animationDuration: '0.3s' }}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className={`relative bg-editor-bg border border-editor-border rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col ${className}`}>
        {children}
      </div>
    </div>,
    document.getElementById('portal-root')!
  );
};

export default Modal;
