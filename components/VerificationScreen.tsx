
import React, { useState } from 'react';

const Logo: React.FC = () => (
    <div className="flex items-center space-x-3 mb-8 justify-center">
      <img 
        src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
        alt="Quimera Logo" 
        className="w-12 h-12 object-contain" 
      />
      <span className="text-2xl font-bold text-editor-text-primary">Quimera<span className="text-yellow-400">.ai</span></span>
    </div>
);

interface VerificationScreenProps {
  email: string;
  onGoToLogin: () => void;
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({ email, onGoToLogin }) => {
  return (
    <div className="min-h-screen bg-editor-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-editor-panel-bg p-8 rounded-lg shadow-2xl border border-editor-border text-center">
        <Logo />
        <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
        <p className="text-editor-text-secondary mb-6">
          We've sent a verification email to <strong className="text-editor-text-primary">{email}</strong>. Please check your inbox and click the link to continue.
        </p>
        <button 
          onClick={onGoToLogin}
          className="w-full bg-editor-accent text-editor-bg font-bold py-3 px-4 rounded-lg shadow-md hover:bg-editor-accent-hover transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default VerificationScreen;
