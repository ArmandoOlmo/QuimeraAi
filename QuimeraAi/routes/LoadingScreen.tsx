/**
 * LoadingScreen Component
 * Pantalla de carga con animación elegante.
 * Shows tenant/agency branding when available.
 * On /preview/ routes, detects tenant branding from URL userId via Firestore.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useSafeTenant } from '../contexts/tenant/TenantContext';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const LoadingScreen: React.FC = () => {
  const tenantContext = useSafeTenant();
  const branding = tenantContext?.currentTenant?.branding;

  // URL-based branding detection for /preview/ routes
  const [previewBranding, setPreviewBranding] = useState<{ logoUrl?: string; companyName?: string; primaryColor?: string } | null>(null);
  useEffect(() => {
    if (branding) return;
    const path = window.location.pathname;
    const match = path.match(/\/preview\/([^/]+)\//);
    if (!match) return;
    const userId = match[1];
    const fetchBranding = async () => {
      try {
        const { db, doc, getDoc } = await import('../firebase');
        const snap = await getDoc(doc(db, 'tenants', `tenant_${userId}`));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.branding?.companyName || data?.branding?.logoUrl) {
            setPreviewBranding({
              logoUrl: data.branding.logoUrl,
              companyName: data.branding.companyName,
              primaryColor: data.branding.primaryColor,
            });
          }
        }
      } catch (e) { /* ignore */ }
    };
    fetchBranding();
  }, [branding]);

  const effectiveBranding = branding || previewBranding;
  const hasAgencyBranding = !!(effectiveBranding?.companyName || effectiveBranding?.logoUrl);
  const accentColor = (effectiveBranding as any)?.primaryColor || undefined;
  const haloColor = hasAgencyBranding && accentColor ? accentColor : undefined;

  const renderLogo = () => {
    if (effectiveBranding?.logoUrl) {
      return (
        <img
          src={effectiveBranding.logoUrl}
          alt="Loading..."
          className="w-14 h-14 object-contain animate-pulse rounded-full"
          style={{ animationDuration: '1.5s' }}
          width={56} height={56} loading="eager" decoding="sync" fetchPriority="high"
        />
      );
    }
    if (effectiveBranding?.companyName) {
      return <Sparkles className="w-8 h-8 text-white animate-pulse" style={{ animationDuration: '1.5s' }} />;
    }
    return (
      <img
        src={QUIMERA_LOGO}
        alt="Loading..."
        className="w-14 h-14 object-contain animate-pulse"
        style={{ animationDuration: '1.5s' }}
        width={56} height={56} loading="eager" decoding="sync" fetchPriority="high"
      />
    );
  };

  const circleStyle: React.CSSProperties = {};
  if (hasAgencyBranding && !effectiveBranding?.logoUrl && accentColor) {
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

          {/* Logo container — always a circle */}
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
