import React from 'react';

interface StudioShellProps {
    children: React.ReactNode;
    onBackdropClick?: () => void;
    className?: string;
    containerClassName?: string;
}

export const StudioShell: React.FC<StudioShellProps> = ({
    children,
    onBackdropClick,
    className = '',
    containerClassName = '',
}) => (
    <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(9,4,17,0.72)] p-0 backdrop-blur-sm lg:p-4 ${className}`}
        style={{ animation: 'aws-fadeIn 0.25s ease' }}
    >
        <div className="absolute inset-0 hidden lg:block" onClick={onBackdropClick} />
        <div
            className={`relative z-10 flex h-full w-full flex-col overflow-hidden bg-q-bg shadow-none lg:h-[90vh] lg:max-h-[860px] lg:max-w-6xl lg:rounded-lg lg:border lg:border-q-border lg:shadow-2xl ${containerClassName}`}
            style={{ animation: 'aws-slideUp 0.3s ease' }}
        >
            {children}
        </div>
    </div>
);

export default StudioShell;
