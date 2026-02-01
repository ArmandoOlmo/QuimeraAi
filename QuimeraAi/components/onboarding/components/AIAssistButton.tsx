/**
 * AIAssistButton
 * Button component for AI-assisted content generation
 */

import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AIAssistButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    label?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const AIAssistButton: React.FC<AIAssistButtonProps> = ({
    onClick,
    isLoading = false,
    disabled = false,
    label,
    variant = 'primary',
    size = 'md',
    className = '',
}) => {
    const { t } = useTranslation();

    const buttonLabel = label || t('onboarding.aiAssist', 'Generate with AI');

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs gap-1.5',
        md: 'px-4 py-2 text-sm gap-2',
        lg: 'px-6 py-3 text-base gap-2.5',
    };

    const variantClasses = {
        primary: `
            bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400
            hover:from-purple-600 hover:via-pink-600 hover:to-orange-500
            text-white shadow-lg shadow-purple-500/25
            hover:shadow-purple-500/40 hover:scale-105
        `,
        secondary: `
            bg-muted hover:bg-accent
            text-foreground border border-border
            hover:border-primary/50
        `,
        ghost: `
            bg-transparent hover:bg-primary/10
            text-primary hover:text-primary/80
        `,
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`
                inline-flex items-center justify-center font-medium rounded-xl
                transition-all duration-300 
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${className}
            `}
        >
            {isLoading ? (
                <>
                    <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin" />
                    <span>{t('onboarding.generating', 'Generating...')}</span>
                </>
            ) : (
                <>
                    <Sparkles size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-pulse" />
                    <span>{buttonLabel}</span>
                </>
            )}
        </button>
    );
};

export default AIAssistButton;
















