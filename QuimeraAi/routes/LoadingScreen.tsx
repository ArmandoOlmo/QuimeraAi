/**
 * LoadingScreen Component
 * Pantalla de carga con animación elegante.
 * Shows tenant/agency branding when available from context.
 * NOTE: No Firestore fetch — this is a transient loader for fast rendering.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSafeTenant } from '../contexts/tenant/TenantContext';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const LoadingScreen: React.FC = () => {
  const tenantContext = useSafeTenant();
  const branding = tenantContext?.currentTenant?.branding;
  const hasAgencyBranding = !!(branding?.companyName || branding?.logoUrl);
  const accentColor = (branding as any)?.primaryColor || undefined;
  const haloColor = hasAgencyBranding && accentColor ? accentColor : undefined;

  const renderLogo = () => {
    if (branding?.logoUrl) {
      return (
        <img src={branding.logoUrl} alt="Loading..."
          className="w-14 h-14 object-contain animate-pulse rounded-full"
          style={{ animationDuration: '1.5s' }}
          width={56} height={56} loading="eager" decoding="sync" fetchPriority="high" />
      );
    }
    if (branding?.companyName) {
      return <Sparkles className="w-8 h-8 text-white animate-pulse" style={{ animationDuration: '1.5s' }} />;
    }
    return (
      <img src={QUIMERA_LOGO} alt="Loading..."
        className="w-14 h-14 object-contain animate-pulse"
        style={{ animationDuration: '1.5s' }}
        width={56} height={56} loading="eager" decoding="sync" fetchPriority="high" />
    );
  };

  const circleStyle: React.CSSProperties = {};
  if (hasAgencyBranding && !branding?.logoUrl && accentColor) {
    circleStyle.backgroundColor = accentColor;
    circleStyle.borderColor = `${accentColor}80`;
  } else if (haloColor) {
    circleStyle.borderColor = `${haloColor}4D`;
  } else {
    circleStyle.borderColor = 'rgba(250, 204, 21, 0.3)';
  }

  return (
    <div className="min-h-screen bg-editor-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full animate-ping"
            style={{ animationDuration: '2s', backgroundColor: haloColor ? `${haloColor}33` : 'rgba(250, 204, 21, 0.2)' }} />
          <div className="absolute w-24 h-24 rounded-full animate-ping"
            style={{ animationDuration: '1.5s', animationDelay: '0.2s', backgroundColor: haloColor ? `${haloColor}4D` : 'rgba(250, 204, 21, 0.3)' }} />
          <div className="absolute w-40 h-40 rounded-full animate-ping"
            style={{ animationDuration: '2.5s', animationDelay: '0.4s', backgroundColor: haloColor ? `${haloColor}1A` : 'rgba(250, 204, 21, 0.1)' }} />

          <div className="relative z-10 w-20 h-20 rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center border-2"
            style={circleStyle}>
            {renderLogo()}
          </div>
        </div>
      </div>

      <div className="absolute bottom-1/3 text-center">
        <p className="text-editor-text-secondary text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
