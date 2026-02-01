/**
 * StoreAuthModal
 * Modal de autenticación para usuarios de tienda
 * Incluye: Login, Registro y Recuperación de contraseña
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    Loader2,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
} from 'lucide-react';
import { useStoreAuth } from '../context';

type AuthMode = 'login' | 'register' | 'forgot-password';

interface StoreAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: AuthMode;
    primaryColor?: string;
    storeName?: string;
    logoUrl?: string;
}

const StoreAuthModal: React.FC<StoreAuthModalProps> = ({
    isOpen,
    onClose,
    initialMode = 'login',
    primaryColor = '#6366f1',
    storeName = 'Tienda',
    logoUrl,
}) => {
    const { t } = useTranslation();
    const { login, register, resetPassword, isLoading, error } = useStoreAuth();

    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens/closes or mode changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setDisplayName('');
            setLocalError(null);
            setSuccessMessage(null);
        }
    }, [isOpen, initialMode]);

    useEffect(() => {
        setLocalError(null);
        setSuccessMessage(null);
    }, [mode]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                await login(email, password);
                onClose();
            } else if (mode === 'register') {
                if (password !== confirmPassword) {
                    setLocalError(t('storeAuth.errors.passwordMismatch'));
                    setIsSubmitting(false);
                    return;
                }
                if (password.length < 6) {
                    setLocalError(t('storeAuth.errors.passwordTooShort'));
                    setIsSubmitting(false);
                    return;
                }
                if (!displayName.trim()) {
                    setLocalError(t('storeAuth.errors.nameRequired'));
                    setIsSubmitting(false);
                    return;
                }
                await register(email, password, displayName.trim());
                onClose();
            } else if (mode === 'forgot-password') {
                await resetPassword(email);
                setSuccessMessage(t('storeAuth.passwordResetSent'));
            }
        } catch (err: any) {
            setLocalError(err.message || t('storeAuth.errors.generic'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const displayError = localError || error;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="relative px-6 py-8 text-center"
                        style={{ backgroundColor: `${primaryColor}10` }}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={storeName}
                                className="h-12 mx-auto mb-3 object-contain"
                            />
                        ) : (
                            <div
                                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {storeName.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {mode === 'login' && t('storeAuth.loginTitle')}
                            {mode === 'register' && t('storeAuth.registerTitle')}
                            {mode === 'forgot-password' && t('storeAuth.forgotPasswordTitle')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {mode === 'login' && t('storeAuth.loginSubtitle', { storeName })}
                            {mode === 'register' && t('storeAuth.registerSubtitle', { storeName })}
                            {mode === 'forgot-password' && t('storeAuth.forgotPasswordSubtitle')}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Back button for forgot password */}
                        {mode === 'forgot-password' && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
                            >
                                <ArrowLeft size={16} />
                                {t('storeAuth.backToLogin')}
                            </button>
                        )}

                        {/* Error message */}
                        {displayError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{displayError}</span>
                            </div>
                        )}

                        {/* Success message */}
                        {successMessage && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                                <CheckCircle size={16} className="flex-shrink-0" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* Name field (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('storeAuth.name')}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                        placeholder={t('storeAuth.namePlaceholder')}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('storeAuth.email')}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={t('storeAuth.emailPlaceholder')}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password field (login and register) */}
                        {mode !== 'forgot-password' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('storeAuth.password')}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder={t('storeAuth.passwordPlaceholder')}
                                        className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Confirm password field (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('storeAuth.confirmPassword')}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder={t('storeAuth.confirmPasswordPlaceholder')}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Forgot password link (login only) */}
                        {mode === 'login' && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-password')}
                                    className="text-sm hover:underline"
                                    style={{ color: primaryColor }}
                                >
                                    {t('storeAuth.forgotPassword')}
                                </button>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoading}
                            className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {(isSubmitting || isLoading) && <Loader2 className="animate-spin" size={18} />}
                            {mode === 'login' && t('storeAuth.loginButton')}
                            {mode === 'register' && t('storeAuth.registerButton')}
                            {mode === 'forgot-password' && t('storeAuth.resetButton')}
                        </button>

                        {/* Toggle mode */}
                        {mode !== 'forgot-password' && (
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                {mode === 'login' ? (
                                    <>
                                        {t('storeAuth.noAccount')}{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('register')}
                                            className="font-medium hover:underline"
                                            style={{ color: primaryColor }}
                                        >
                                            {t('storeAuth.createAccount')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {t('storeAuth.hasAccount')}{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('login')}
                                            className="font-medium hover:underline"
                                            style={{ color: primaryColor }}
                                        >
                                            {t('storeAuth.loginLink')}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
};

export default StoreAuthModal;











