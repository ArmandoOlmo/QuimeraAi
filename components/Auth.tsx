
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    auth, 
    storage, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile, 
    sendEmailVerification, 
    signOut, 
    sendPasswordResetEmail, 
    signInWithPopup,
    ref,
    uploadBytes,
    getDownloadURL
} from '../firebase';
import { Eye, EyeOff, ArrowRight, Zap, Layout, Image as ImageIcon, Sparkles, CheckCircle, X, PlayCircle, Hexagon, ChevronDown, HelpCircle } from 'lucide-react';
import LanguageSelector from './ui/LanguageSelector';

// --- Brand Assets ---
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

// --- Components ---

const Logo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => (
    <div className={`flex items-center ${size === 'lg' ? 'space-x-2 sm:space-x-3' : 'space-x-2'} justify-center`}>
      <img 
        src={LOGO_URL} 
        alt="Quimera Logo" 
        className={`${size === 'lg' ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-8 h-8'} object-contain`} 
      />
      <span className={`${size === 'lg' ? 'text-xl sm:text-2xl' : 'text-xl'} font-bold text-white tracking-tight`}>
        Quimera<span className="text-yellow-400">.ai</span>
      </span>
    </div>
);

// --- FAQ Component ---
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex justify-between items-center py-6 text-left focus:outline-none group"
            >
                <span className={`text-lg font-medium transition-colors ${isOpen ? 'text-yellow-400' : 'text-white group-hover:text-yellow-200'}`}>
                    {question}
                </span>
                <ChevronDown 
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-yellow-400' : ''}`} 
                />
            </button>
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}
            >
                <p className="text-gray-400 leading-relaxed pr-4">
                    {answer}
                </p>
            </div>
        </div>
    );
};

interface AuthProps {
    onVerificationEmailSent: (email: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgotPassword';

const Auth: React.FC<AuthProps> = ({ onVerificationEmailSent }) => {
    const { t } = useTranslation();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('register');
    
    // Auth Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null);

    // Scroll effect for navbar
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const openAuth = (mode: AuthMode) => {
        setAuthMode(mode);
        setIsAuthModalOpen(true);
        setError('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProfilePhoto(e.target.files[0]);
        }
    };

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
        
        // Configuraciones personalizadas para mejorar la experiencia
        provider.setCustomParameters({
            prompt: 'select_account', // Siempre mostrar selector de cuenta
            display: 'popup' // Asegurar que se use popup
        });
        
        try {
            console.log('🔐 Intentando login con Google...');
            const result = await signInWithPopup(auth, provider);
            console.log('✅ Login exitoso:', result.user.email);
        } catch (err: any) {
            console.error('❌ Error en Google Sign In:', err);
            console.error('Código de error:', err.code);
            console.error('Mensaje:', err.message);
            
            // Manejo de errores específicos
            if (err.code === 'auth/unauthorized-domain') {
                setError('Dominio no autorizado. Por favor contacta al administrador.');
            } else if (err.code === 'auth/popup-blocked') {
                setError('El popup fue bloqueado. Por favor permite popups en tu navegador.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError('Login cancelado. Por favor intenta de nuevo.');
            } else if (err.code === 'auth/cancelled-popup-request') {
                setError('Popup cancelado. Por favor intenta de nuevo.');
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

                let photoURL = '';
                if (profilePhoto) {
                    const storageRef = ref(storage, `profile-pictures/${user.uid}`);
                    const snapshot = await uploadBytes(storageRef, profilePhoto);
                    photoURL = await getDownloadURL(snapshot.ref);
                }

                await updateProfile(user, {
                    displayName: name,
                    photoURL: photoURL || '',
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

    const renderAuthForm = () => (
        <div className="bg-[#1A0D26] w-full max-w-md p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex justify-end">
                    <button onClick={() => setIsAuthModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="text-center mb-6 sm:mb-8">
                    <Logo size="lg" />
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 sm:mt-6 mb-2">
                        {authMode === 'login' ? t('auth.welcomeBack') : authMode === 'register' ? t('auth.startCreating') : t('auth.resetPassword')}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm">
                        {authMode === 'login' ? t('auth.loginSubtitle') : authMode === 'register' ? t('auth.registerSubtitle') : t('auth.resetSubtitle')}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 flex items-start">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                {authMode === 'forgotPassword' && resetEmailSentTo ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <p className="text-white mb-6">{t('auth.resetLinkSent')} <strong className="text-yellow-400">{resetEmailSentTo}</strong>.</p>
                        <button onClick={() => setAuthMode('login')} className="text-sm text-gray-400 hover:text-white underline">{t('auth.backToLogin')}</button>
                    </div>
                ) : (
                    <form onSubmit={handleAuthAction} className="space-y-3 sm:space-y-4">
                        {authMode === 'register' && (
                            <div className="space-y-3 sm:space-y-4 animate-fade-in-up">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.username')}</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-black/40 text-white p-2.5 sm:p-3 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-sm" placeholder="DesignGuru"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.profilePhotoOptional')}</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"/>
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.email')}</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-black/40 text-white p-2.5 sm:p-3 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-sm" placeholder="you@example.com"/>
                        </div>

                        {authMode !== 'forgotPassword' && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">{t('auth.password')}</label>
                                    {authMode === 'login' && (
                                        <button type="button" onClick={() => setAuthMode('forgotPassword')} className="text-xs text-yellow-500 hover:text-yellow-400 hover:underline">{t('auth.forgot')}</button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-black/40 text-white p-2.5 sm:p-3 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all pr-10 text-sm" placeholder="••••••••"/>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {authMode === 'register' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.repeatPassword')}</label>
                                <input type="password" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} required className="w-full bg-black/40 text-white p-2.5 sm:p-3 rounded-lg border border-white/10 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-sm" placeholder="••••••••"/>
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:bg-yellow-400 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6">
                            {isLoading && <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2"></div>}
                            {isLoading ? t('auth.processing') : authMode === 'login' ? t('auth.signIn') : authMode === 'register' ? t('auth.createAccount') : t('auth.sendResetLink')}
                        </button>

                        {authMode !== 'forgotPassword' && (
                            <>
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                                    <div className="relative flex justify-center text-xs"><span className="bg-[#1A0D26] px-2 text-gray-500">{t('auth.orContinueWith')}</span></div>
                                </div>
                                <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center bg-white text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
                                    <img src="https://storage.googleapis.com/quimera_assets/google.svg" alt="Google" className="w-5 h-5 mr-3"/>
                                    Google
                                </button>
                            </>
                        )}
                    </form>
                )}

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">
                        {authMode === 'login' ? t('auth.newHere') : t('auth.alreadyHaveAccount')}
                        <button 
                            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                            className="ml-1 font-bold text-yellow-400 hover:underline"
                        >
                            {authMode === 'login' ? t('auth.createAccount') : t('auth.signIn')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30 selection:text-yellow-200">
            {/* --- Auth Modal Overlay --- */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
                    {renderAuthForm()}
                </div>
            )}

            {/* --- Navbar --- */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-lg border-b border-white/5 py-3' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <Logo />
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-300">
                        <a href="#features" className="hover:text-white transition-colors">{t('auth.navFeatures')}</a>
                        <a href="#showcase" className="hover:text-white transition-colors">{t('auth.navShowcase')}</a>
                        <a href="#faq" className="hover:text-white transition-colors">{t('auth.navFAQ')}</a>
                    </div>
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <LanguageSelector variant="minimal" />
                        <button onClick={() => openAuth('login')} className="text-sm font-bold text-white hover:text-yellow-400 transition-colors">
                            {t('auth.login')}
                        </button>
                        <button onClick={() => openAuth('register')} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-sm font-bold transition-all">
                            {t('auth.signUp')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] -z-10"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[100px] -z-10"></div>

                <div className="container mx-auto px-6 text-center relative z-10">
                    {/* Large Logo Only - No Text */}
                    <div className="flex items-center justify-center mb-10 animate-fade-in-up">
                        <img 
                            src={LOGO_URL} 
                            alt="Quimera Logo" 
                            className="w-[180px] h-[180px] sm:w-[250px] sm:h-[250px] object-contain drop-shadow-[0_0_35px_rgba(250,204,21,0.6)]" 
                        />
                    </div>
                    
                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        {t('auth.heroTitle1')} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{t('auth.heroTitle2')}</span>
                    </h1>
                    
                    <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        {t('auth.heroSubtitle')}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <button 
                            onClick={() => openAuth('register')}
                            className="group bg-yellow-500 text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-yellow-400 hover:scale-105 transition-all shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center"
                        >
                            {t('auth.startForFree')} <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-4 rounded-full text-lg font-bold text-white border border-white/20 hover:bg-white/10 transition-all flex items-center">
                            <PlayCircle size={20} className="mr-2" /> {t('auth.watchDemo')}
                        </button>
                    </div>

                    {/* Abstract UI Preview */}
                    <div className="mt-20 relative max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-purple-600 rounded-2xl blur opacity-30"></div>
                        <div className="relative bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl aspect-video">
                             <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                                 <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                 <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                 <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                             </div>
                             <div className="p-0 h-full bg-cover bg-center opacity-80" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')` }}>
                                 <div className="h-full w-full bg-black/50 flex items-center justify-center">
                                     <div className="text-center">
                                         <h3 className="text-4xl font-bold text-white mb-2">Luxury Redefined</h3>
                                         <button className="px-6 py-2 bg-white text-black rounded-full text-sm font-bold">Explore Collection</button>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- Partners / Social Proof --- */}
            <div className="py-12 border-y border-white/5 bg-white/[0.02]">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8">Trusted by 10,000+ Creators</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale">
                         {/* Mock Logos */}
                         <div className="flex items-center gap-2"><Hexagon fill="currentColor" size={24}/> <span className="font-bold text-xl">AcmeCorp</span></div>
                         <div className="flex items-center gap-2"><Layout fill="currentColor" size={24}/> <span className="font-bold text-xl">Starlight</span></div>
                         <div className="flex items-center gap-2"><Zap fill="currentColor" size={24}/> <span className="font-bold text-xl">BoltShift</span></div>
                         <div className="flex items-center gap-2"><ImageIcon fill="currentColor" size={24}/> <span className="font-bold text-xl">PixelPerfect</span></div>
                    </div>
                </div>
            </div>

            {/* --- Features Section --- */}
            <section id="features" className="py-24 bg-[#050505] relative">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Why Quimera is Different</h2>
                        <p className="text-gray-400 text-lg">We don't just give you a blank canvas. We give you a superpowered engine that builds alongside you.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: "Instant Creation", desc: "Describe your business, and get a full multi-page site in 30 seconds.", icon: <Zap className="text-yellow-400" size={32} /> },
                            { title: "AI Writer Built-in", desc: "No lorem ipsum. Our AI writes persuasive copy tailored to your brand tone.", icon: <Layout className="text-purple-400" size={32} /> },
                            { title: "Global Design System", desc: "Change fonts, colors, and styles across your entire site with one click.", icon: <Sparkles className="text-blue-400" size={32} /> }
                        ].map((feature, i) => (
                            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="mb-6 p-4 bg-black/30 rounded-2xl inline-block group-hover:scale-110 transition-transform border border-white/5">{feature.icon}</div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Image Generator Showcase (Nano Banana Pro) --- */}
            <section id="showcase" className="py-24 bg-[#0A0A0A] relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                 
                 <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
                     <div className="lg:w-1/2">
                         <div className="inline-block px-4 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
                             Powered by Nano Banana Pro
                         </div>
                         <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Visuals that Look <br/>Impossible.</h2>
                         <p className="text-gray-400 text-lg mb-8">
                             Need a cyberpunk cityscape? A minimalist coffee shop? A 3D render of your product? 
                             Our integrated AI image generator creates royalty-free, professional assets instantly.
                         </p>
                         <ul className="space-y-4 mb-8">
                             {['Photorealistic Quality', 'Style Transfer', 'Instant Variations'].map(item => (
                                 <li key={item} className="flex items-center text-gray-300">
                                     <CheckCircle size={20} className="text-green-500 mr-3" /> {item}
                                 </li>
                             ))}
                         </ul>
                         <button onClick={() => openAuth('register')} className="text-white border-b border-yellow-400 pb-1 hover:text-yellow-400 transition-colors">Try it yourself &rarr;</button>
                     </div>
                     
                     <div className="lg:w-1/2 grid grid-cols-2 gap-4">
                         <img src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full translate-y-8 shadow-2xl border border-white/10" alt="AI Art 1"/>
                         <img src="https://images.unsplash.com/photo-1633218388467-539651dcf74a?q=80&w=1000&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full shadow-2xl border border-white/10" alt="AI Art 2"/>
                         <img src="https://images.unsplash.com/photo-1558655146-d09347e0b708?q=80&w=1000&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full translate-y-8 shadow-2xl border border-white/10" alt="AI Art 3"/>
                         <img src="https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1000&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full shadow-2xl border border-white/10" alt="AI Art 4"/>
                     </div>
                 </div>
            </section>

            {/* --- FAQ Section --- */}
            <section id="faq" className="py-24 bg-[#050505] relative border-t border-white/5">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row gap-16">
                        <div className="md:w-1/3">
                             <div className="inline-flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-widest mb-4">
                                 <HelpCircle size={18} /> FAQ
                             </div>
                             <h2 className="text-4xl font-bold text-white mb-6">Common Questions</h2>
                             <p className="text-gray-400 text-lg mb-8">
                                 Everything you need to know about creating your dream website with Quimera.ai.
                             </p>
                             <button onClick={() => openAuth('register')} className="bg-white text-black font-bold py-3 px-6 rounded-full hover:bg-gray-200 transition-colors">
                                 Start Building Now
                             </button>
                        </div>
                        <div className="md:w-2/3">
                             <div className="space-y-2">
                                <FAQItem 
                                    question="How is Quimera different from other builders?" 
                                    answer="Quimera isn't just a drag-and-drop tool; it's an AI co-pilot. You describe your vision, and our engine generates the layout, writes the copy, and creates custom images instantly. It handles the heavy lifting so you can focus on your brand."
                                />
                                <FAQItem 
                                    question="Do I need any coding skills?" 
                                    answer="Absolutely not. Quimera is designed for everyone. You can build complex, professional-grade websites using simple natural language commands or our intuitive visual editor."
                                />
                                <FAQItem 
                                    question="Can I export my website?" 
                                    answer="Yes! You own your content. On our Pro plans, you can export your site's HTML/CSS code to host anywhere, or publish directly with our ultra-fast global hosting."
                                />
                                <FAQItem 
                                    question="Is there a free trial?" 
                                    answer="Yes, you can start building for free. You get access to our core features and AI tools to design your site. You only need to upgrade when you're ready to publish to a custom domain."
                                />
                                <FAQItem 
                                    question="How does the AI image generation work?" 
                                    answer="We integrate Nano Banana Pro, a state-of-the-art image model. You simply type a prompt like 'a modern coffee shop in Tokyo', and it generates unique, royalty-free high-resolution images in seconds."
                                />
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Footer --- */}
            <footer className="py-12 border-t border-white/10 bg-black text-sm">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Logo size="sm" />
                        <span className="text-gray-500">© 2024 Quimera Inc.</span>
                    </div>
                    <div className="flex space-x-8 text-gray-500">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="hover:text-white transition-colors">Instagram</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Auth;
