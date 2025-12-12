import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    auth,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    signOut,
    sendPasswordResetEmail,
    signInWithPopup,
} from '../firebase';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Zap, Layout, Palette, CheckCircle, Image as ImageIcon, MessageSquare, BarChart3 } from 'lucide-react';
import LanguageSelector from './ui/LanguageSelector';

// --- Brand Assets ---
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface ModernAuthProps {
    onVerificationEmailSent: (email: string) => void;
    initialMode?: 'login' | 'register';
    onNavigateToLanding?: () => void;
}

type AuthMode = 'login' | 'register' | 'forgotPassword';

const ModernAuth: React.FC<ModernAuthProps> = ({ onVerificationEmailSent, initialMode = 'login', onNavigateToLanding }) => {
    const { t } = useTranslation();
    const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

    // Auth Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetEmailSentTo(email);
        } catch (err: any) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
                setError(t('auth.errors.userNotFound'));
            } else {
                setError(t('auth.errors.resetFailed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        const provider = new GoogleAuthProvider();

        provider.setCustomParameters({
            prompt: 'select_account',
            display: 'popup'
        });

        try {
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            if (err.code === 'auth/unauthorized-domain') {
                setError(t('auth.errors.unauthorizedDomain'));
            } else if (err.code === 'auth/popup-blocked') {
                setError(t('auth.errors.popupBlocked'));
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError(t('auth.errors.loginCancelled'));
            } else {
                setError(t('auth.errors.googleSignInFailed') + ' (' + err.code + ')');
            }
            setIsLoading(false);
        }
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (authMode === 'login') {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await userCredential.user.reload();
                if (!userCredential.user.emailVerified) {
                    await sendEmailVerification(userCredential.user);
                    await signOut(auth);
                    onVerificationEmailSent(email);
                    setIsLoading(false);
                    return;
                }
            } catch (err: any) {
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    setError(t('auth.errors.incorrectCredentials'));
                } else {
                    setError(t('auth.errors.unknownError'));
                }
            } finally {
                setIsLoading(false);
            }
        } else if (authMode === 'register') {
            if (password !== repeatPassword) {
                setError(t('auth.errors.passwordMismatch'));
                setIsLoading(false);
                return;
            }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await updateProfile(user, {
                    displayName: name,
                    photoURL: '',
                });

                await sendEmailVerification(user);
                await signOut(auth);

                onVerificationEmailSent(email);
            } catch (err: any) {
                if (err.code === 'auth/email-already-in-use') {
                    setError(t('auth.errors.emailInUse'));
                } else {
                    setError(t('auth.errors.createAccountFailed'));
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Features to display on the right side - Only 6 cards
    const features = [
        {
            icon: <Zap className="w-6 h-6" />,
            titleKey: "auth.feature1Title",
            descKey: "auth.feature1Desc"
        },
        {
            icon: <ImageIcon className="w-6 h-6" />,
            titleKey: "auth.feature2Title",
            descKey: "auth.feature2Desc"
        },
        {
            icon: <Layout className="w-6 h-6" />,
            titleKey: "auth.feature3Title",
            descKey: "auth.feature3Desc"
        },
        {
            icon: <Palette className="w-6 h-6" />,
            titleKey: "auth.feature4Title",
            descKey: "auth.feature4Desc"
        },
        {
            icon: <MessageSquare className="w-6 h-6" />,
            titleKey: "auth.feature5Title",
            descKey: "auth.feature5Desc"
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            titleKey: "auth.feature6Title",
            descKey: "auth.feature6Desc"
        }
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col bg-[#0A0A0A] relative">
                {/* Back to Landing Button - Top Left */}
                {onNavigateToLanding && (
                    <button
                        onClick={onNavigateToLanding}
                        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">{t('common.back')}</span>
                    </button>
                )}

                {/* Language Selector - Top Right */}
                <div className="absolute top-6 right-6 z-10">
                    <LanguageSelector variant="minimal" />
                </div>

                {/* Form Container */}
                <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-16">
                    <div className="w-full max-w-md">
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-12 animate-fade-in-up">
                            <div className="relative w-32 h-32 mb-6">
                                <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping"></div>
                                <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse"></div>
                                <img
                                    src={QUIMERA_LOGO}
                                    alt="Quimera AI"
                                    className="relative w-full h-full object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]"
                                />
                            </div>
                            <h1 className="text-3xl font-bold text-white">
                                Quimera<span className="text-yellow-400">.ai</span>
                            </h1>
                        </div>

                        {/* Form Title */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {authMode === 'login' ? t('auth.welcomeBack') : authMode === 'register' ? t('auth.startCreating') : t('auth.resetPassword')}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {authMode === 'login' ? t('auth.loginSubtitle') : authMode === 'register' ? t('auth.registerSubtitle') : t('auth.resetSubtitle')}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 flex items-start animate-fade-in-up">
                                <span className="mr-2">⚠️</span> {error}
                            </div>
                        )}

                        {/* Reset Email Sent Success */}
                        {authMode === 'forgotPassword' && resetEmailSentTo ? (
                            <div className="text-center animate-fade-in-up">
                                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <p className="text-white mb-6">
                                    {t('auth.resetLinkSent')} <strong className="text-yellow-400">{resetEmailSentTo}</strong>.
                                </p>
                                <button
                                    onClick={() => setAuthMode('login')}
                                    className="text-sm text-gray-400 hover:text-white underline"
                                >
                                    {t('auth.backToLogin')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={authMode === 'forgotPassword' ? handlePasswordReset : handleAuthAction} className="space-y-4">
                                {/* Register Fields */}
                                {authMode === 'register' && (
                                    <div className="animate-fade-in-up">
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                            {t('auth.username')}
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="w-full bg-white/5 text-white p-3.5 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
                                            placeholder={t('auth.yourNamePlaceholder')}
                                        />
                                    </div>
                                )}

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                        {t('auth.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-white/5 text-white p-3.5 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
                                        placeholder={t('auth.emailPlaceholder')}
                                    />
                                </div>

                                {/* Password */}
                                {authMode !== 'forgotPassword' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase">
                                                {t('auth.password')}
                                            </label>
                                            {authMode === 'login' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAuthMode('forgotPassword')}
                                                    className="text-xs text-yellow-500 hover:text-yellow-400 hover:underline"
                                                >
                                                    {t('auth.forgot')}
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="w-full bg-white/5 text-white p-3.5 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all pr-12"
                                                placeholder={t('auth.passwordPlaceholder')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Repeat Password */}
                                {authMode === 'register' && (
                                    <div className="animate-fade-in-up">
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                            {t('auth.repeatPassword')}
                                        </label>
                                        <input
                                            type="password"
                                            value={repeatPassword}
                                            onChange={(e) => setRepeatPassword(e.target.value)}
                                            required
                                            className="w-full bg-white/5 text-white p-3.5 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
                                            placeholder={t('auth.passwordPlaceholder')}
                                        />
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-yellow-500 text-black font-bold py-3.5 px-4 rounded-lg shadow-lg hover:bg-yellow-400 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6 group"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            {authMode === 'login' ? t('auth.signIn') : authMode === 'register' ? t('auth.createAccount') : t('auth.sendResetLink')}
                                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                {/* Google Sign In */}
                                {authMode !== 'forgotPassword' && (
                                    <>
                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/10"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs">
                                                <span className="bg-[#0A0A0A] px-3 text-gray-500">
                                                    {t('auth.orContinueWith')}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGoogleSignIn}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center bg-white text-gray-900 font-bold py-3.5 px-4 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 border border-white/10"
                                        >
                                            <img
                                                src="https://storage.googleapis.com/quimera_assets/google.svg"
                                                alt="Google"
                                                className="w-5 h-5 mr-3"
                                            />
                                            {t('auth.google')}
                                        </button>
                                    </>
                                )}
                            </form>
                        )}

                        {/* Toggle Auth Mode */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-400">
                                {authMode === 'login' ? t('auth.newHere') : authMode === 'forgotPassword' ? t('auth.alreadyHaveAccount') : t('auth.alreadyHaveAccount')}
                                <button
                                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                                    className="ml-2 font-bold text-yellow-400 hover:text-yellow-300 hover:underline transition-colors"
                                >
                                    {authMode === 'login' ? t('auth.createAccount') : t('auth.signIn')}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Features (Dark Theme purple background) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: 'hsl(272, 45%, 14%)' }}>
                {/* Background Decor - Purple glows for depth */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px]"></div>

                {/* Action Button - Top Right */}
                <div className="absolute top-6 right-6 z-20">
                    <button
                        onClick={() => window.open('https://quimera.ai', '_blank')}
                        className="bg-yellow-500 text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-yellow-400 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 group"
                    >
                        {t('auth.exploreDemo')}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
                    <div className="mb-10">
                        <h2 className="text-4xl xl:text-5xl font-bold mb-4 text-white">
                            {t('auth.featuresTitle')}
                        </h2>
                        <p className="text-lg xl:text-xl text-white/70">
                            {t('auth.featuresSubtitle')}
                        </p>
                    </div>

                    {/* Features Grid - 6 cards in 2x3 */}
                    <div className="grid grid-cols-2 gap-5">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group"
                                style={{
                                    animationDelay: `${index * 0.1}s`,
                                    animation: 'fade-in-up 0.6s ease-out forwards'
                                }}
                            >
                                <div className="w-11 h-11 bg-yellow-500 rounded-xl flex items-center justify-center mb-3 group-hover:bg-yellow-400 transition-colors text-black">
                                    {feature.icon}
                                </div>
                                <h3 className="font-bold text-base mb-1.5 text-white">
                                    {t(feature.titleKey)}
                                </h3>
                                <p className="text-sm text-white/60 leading-relaxed">
                                    {t(feature.descKey)}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Bottom tagline */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-sm text-white/50 font-medium">
                            {t('auth.joinCreators')}
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default ModernAuth;

