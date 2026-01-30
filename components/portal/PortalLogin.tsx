/**
 * PortalLogin
 * Login page for agency portal clients
 * Shows agency branding and provides multiple authentication options
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    Loader2, 
    Sparkles,
    AlertCircle,
    ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/core/AuthContext';
import { usePortal } from './PortalContext';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';

export function PortalLogin() {
    const { login, signInWithGoogle, sendMagicLink, isLoading: authLoading } = useAuth();
    const { branding, tenant } = usePortal();
    const { navigate, getQueryParam } = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'password' | 'magic'>('password');
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const redirect = getQueryParam('redirect');
    const primaryColor = branding?.primaryColor || '#4f46e5';

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login(email, password);
            navigate(redirect || ROUTES.PORTAL_DASHBOARD);
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (sendMagicLink) {
                await sendMagicLink(email, redirect || ROUTES.PORTAL_DASHBOARD);
                setMagicLinkSent(true);
            } else {
                setError('Magic Link no está disponible');
            }
        } catch (err: any) {
            setError(err.message || 'Error al enviar Magic Link');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);

        try {
            await signInWithGoogle();
            navigate(redirect || ROUTES.PORTAL_DASHBOARD);
        } catch (err: any) {
            setError(err.message || 'Error con Google');
        } finally {
            setIsLoading(false);
        }
    };

    // Magic link sent confirmation
    if (magicLinkSent) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <div
                        className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                    >
                        <Mail className="w-8 h-8" style={{ color: primaryColor }} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Revisa tu email
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Hemos enviado un enlace mágico a <strong>{email}</strong>. 
                        Haz clic en el enlace para iniciar sesión.
                    </p>
                    <button
                        onClick={() => {
                            setMagicLinkSent(false);
                            setEmail('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        Usar otro email
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header with branding */}
                    <div 
                        className="p-8 text-center"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}
                    >
                        {branding?.logoUrl ? (
                            <img
                                src={branding.logoUrl}
                                alt={branding.companyName || 'Logo'}
                                className="h-12 mx-auto mb-4"
                            />
                        ) : (
                            <div 
                                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {(branding?.companyName || tenant?.name)?.[0]?.toUpperCase() || 'P'}
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {branding?.companyName || tenant?.name || 'Portal'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Accede a tu cuenta
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        {/* Mode toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => setMode('password')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    mode === 'password'
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Contraseña
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('magic')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    mode === 'magic'
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Magic Link
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm"
                            >
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
                            {/* Email */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="tu@email.com"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                                        style={{ '--tw-ring-color': primaryColor } as any}
                                    />
                                </div>
                            </div>

                            {/* Password (only for password mode) */}
                            {mode === 'password' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Magic link description */}
                            {mode === 'magic' && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="w-5 h-5 mt-0.5" style={{ color: primaryColor }} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                Sin contraseña
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Te enviaremos un enlace seguro a tu email para iniciar sesión instantáneamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading || authLoading}
                                className="w-full py-3.5 text-white font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {mode === 'magic' ? 'Enviando...' : 'Iniciando sesión...'}
                                    </>
                                ) : (
                                    <>
                                        {mode === 'magic' ? 'Enviar Magic Link' : 'Iniciar Sesión'}
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">o</span>
                            </div>
                        </div>

                        {/* Google login */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continuar con Google
                        </button>

                        {/* Forgot password link */}
                        {mode === 'password' && (
                            <p className="text-center text-sm text-gray-500 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setMode('magic')}
                                    className="hover:underline"
                                    style={{ color: primaryColor }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-400 mt-6">
                    Powered by{' '}
                    <a href="https://quimera.ai" className="font-medium text-gray-500 hover:text-gray-700">
                        Quimera.ai
                    </a>
                </p>
            </motion.div>
        </div>
    );
}

export default PortalLogin;
