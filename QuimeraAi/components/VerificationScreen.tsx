import React, { useState } from 'react';
import { supabase } from '../supabase';
import { QUIMERA_FULL_LOGO } from '../hooks/useAppLogo';
import { CheckCircle, AlertCircle } from 'lucide-react';

const Logo: React.FC = () => (
    <div className="flex justify-center mb-8">
      <img 
        src={QUIMERA_FULL_LOGO} 
        alt="Quimera Logo" 
        className="h-10 object-contain" 
      />
    </div>
);

interface VerificationScreenProps {
  email: string;
  onGoToLogin: () => void;
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({ email, onGoToLogin }) => {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleResend = async () => {
    setIsResending(true);
    setResendStatus('idle');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      setResendStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend email');
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-q-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-q-surface p-8 rounded-lg shadow-2xl border border-q-border text-center relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <Logo />
          <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
          <p className="text-q-text-secondary mb-6 text-sm">
            We've sent a verification email to <strong className="text-yellow-400">{email}</strong>. Please check your inbox and click the link to continue.
          </p>

          {resendStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg mb-6 flex items-start text-left">
              <CheckCircle className="mr-2 flex-shrink-0" size={18} /> 
              <span>A new verification link has been sent to your email.</span>
            </div>
          )}

          {resendStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 flex items-start text-left">
              <AlertCircle className="mr-2 flex-shrink-0" size={18} /> 
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={handleResend}
              disabled={isResending}
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isResending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Resend Email"
              )}
            </button>

            <button 
              onClick={onGoToLogin}
              className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:bg-yellow-400 hover:scale-[1.02] transition-all"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationScreen;
