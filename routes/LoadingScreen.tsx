/**
 * LoadingScreen Component
 * Pantalla de carga con animación elegante
 */

import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-editor-bg flex items-center justify-center relative overflow-hidden">
      {/* Pulsing halo effect */}
      <div className="absolute">
        <div className="relative flex items-center justify-center">
          {/* Multiple pulsing halos */}
          <div 
            className="absolute w-32 h-32 rounded-full bg-yellow-400/20 animate-ping" 
            style={{ animationDuration: '2s' }}
          />
          <div 
            className="absolute w-24 h-24 rounded-full bg-yellow-400/30 animate-ping" 
            style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}
          />
          <div 
            className="absolute w-40 h-40 rounded-full bg-yellow-400/10 animate-ping" 
            style={{ animationDuration: '2.5s', animationDelay: '0.4s' }}
          />
          
          {/* Logo container with glow */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center border-2 border-yellow-400/30">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
              alt="Quimera Logo" 
              className="w-14 h-14 object-contain animate-pulse"
              style={{ animationDuration: '1.5s' }}
              width={56}
              height={56}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
          </div>
        </div>
      </div>
      
      {/* Loading text */}
      <div className="absolute bottom-1/3 text-center">
        <p className="text-editor-text-secondary text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;









