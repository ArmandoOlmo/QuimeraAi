
import React, { ReactNode, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../../contexts/core/UIContext';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  isOpen: boolean;
  maxWidth?: string;
  className?: string;
  /** If true, modal takes full screen on mobile */
  fullScreenMobile?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
  children, 
  onClose, 
  isOpen, 
  maxWidth = 'max-w-3xl', 
  className = '',
  fullScreenMobile = false 
}) => {
  const { themeMode } = useUI();

  // Handle escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in ${themeMode}`}
      style={{ animationDuration: '0.2s' }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop - Click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        className={`
          relative bg-editor-bg border border-editor-border shadow-2xl w-full 
          flex flex-col overflow-hidden animate-slide-up
          ${fullScreenMobile 
            ? 'h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-xl' 
            : 'max-h-[85dvh] sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl'
          }
          ${maxWidth}
          ${className}
        `}
        style={{ animationDuration: '0.3s' }}
      >
        {/* Mobile drag indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-editor-border rounded-full" />
        </div>
        {children}
      </div>
    </div>,
    document.getElementById('portal-root')!
  );
};

export default Modal;
