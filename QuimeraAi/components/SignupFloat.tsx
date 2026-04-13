/**
 * SignupFloat Component
 * 
 * A floating sign-up overlay that renders on top of the page content.
 * Supports configurable position, image placement, form fields,
 * social media links, auto-show with delay, and minimize-on-close behavior.
 * 
 * When minimizeOnClose is enabled, closing the overlay minimizes it to a
 * small pill button on the opposite corner of the chatbot (bottom-left).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Instagram, Twitter, Facebook, Linkedin, Youtube, Github, MessageCircle, Send, Music2, Pin, PhoneCall, MessageSquare, Hash, Users, Mail } from 'lucide-react';
import type { SignupFloatData, SocialPlatform, BorderRadiusSize } from '../types/components';
import { useSafeEditor } from '../contexts/EditorContext';
import { useRouter } from '../hooks/useRouter';

// Map border radius tokens to CSS values
const borderRadiusMap: Record<BorderRadiusSize, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
};

// Map social platforms to their icon components
const socialIconMap: Record<SocialPlatform, React.ElementType> = {
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  whatsapp: PhoneCall,
  telegram: Send,
  tiktok: Music2,
  pinterest: Pin,
  snapchat: MessageCircle,
  discord: MessageSquare,
  threads: Hash,
};

interface SignupFloatProps extends SignupFloatData {
  /** Project ID for lead capture */
  projectId?: string;
  /** Whether this is preview mode in the editor */
  isPreviewMode?: boolean;
}

const SignupFloat: React.FC<SignupFloatProps> = ({
  headerText,
  descriptionText,
  imageUrl,
  imagePlacement = 'top',
  showNameField = true,
  showEmailField = true,
  showPhoneField = false,
  showMessageField = false,
  namePlaceholder = 'Your Name',
  emailPlaceholder = 'your@email.com',
  phonePlaceholder = '+1 (555) 000-0000',
  messagePlaceholder = 'Tell us about yourself...',
  buttonText = 'Sign Up',
  socialLinks = [],
  showSocialLinks = true,
  floatPosition = 'bottom-right',
  showOnLoad = true,
  showCloseButton = true,
  triggerDelay = 3,
  minimizeOnClose = true,
  minimizedLabel = '✉️ Sign Up',
  width = 400,
  borderRadius = 'xl',
  buttonBorderRadius = 'lg',
  imageHeight = 200,
  colors,
  headerFontSize = 'lg',
  descriptionFontSize = 'sm',
  projectId,
  isPreviewMode = false,
}) => {
  const { t } = useTranslation();
  const editorContext = useSafeEditor();
  const { isEditorRoute } = useRouter();
  const isInEditor = editorContext?.view === 'editor' || isEditorRoute;

  // 'hidden' = not yet shown / fully dismissed
  // 'open' = full overlay visible
  // 'minimized' = small pill button visible
  const [viewState, setViewState] = useState<'hidden' | 'open' | 'minimized'>('hidden');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Show component after delay
  useEffect(() => {
    if (viewState !== 'hidden') return;

    if (showOnLoad) {
      const delay = (triggerDelay || 0) * 1000;
      if (delay > 0) {
        const timer = setTimeout(() => setViewState('open'), delay);
        return () => clearTimeout(timer);
      } else {
        setViewState('open');
      }
    }
  }, [showOnLoad, triggerDelay, viewState]);

  // In preview mode, show immediately (but allow close/minimize to work)
  useEffect(() => {
    if (isPreviewMode && viewState === 'hidden') {
      setViewState('open');
    }
  }, [isPreviewMode]); // intentionally exclude viewState to avoid re-opening after close

  const handleClose = useCallback(() => {
    if (minimizeOnClose) {
      setViewState('minimized');
    } else {
      setViewState('hidden');
    }
  }, [minimizeOnClose]);

  const handleReopen = useCallback(() => {
    setViewState('open');
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with Leads system if projectId exists
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 3000);
  }, []);

  // Font size mapping
  const fontSizeMap = {
    sm: { header: '1.125rem', desc: '0.8125rem' },
    md: { header: '1.5rem', desc: '0.875rem' },
    lg: { header: '1.875rem', desc: '0.9375rem' },
    xl: { header: '2.25rem', desc: '1rem' },
  };

  const headerSize = fontSizeMap[headerFontSize || 'lg']?.header || '1.875rem';
  const descSize = fontSizeMap[descriptionFontSize || 'sm']?.desc || '0.9375rem';
  const radius = borderRadiusMap[borderRadius || 'xl'];
  const btnRadius = borderRadiusMap[buttonBorderRadius || 'lg'];

  // Position styles for the full overlay
  const positionStyles = useMemo((): React.CSSProperties => {
    switch (floatPosition) {
      case 'top-left':
        return { top: '1.5rem', left: '1.5rem' };
      case 'top-right':
        return { top: '1.5rem', right: '1.5rem' };
      case 'bottom-left':
        return { bottom: '1.5rem', left: '1.5rem' };
      case 'bottom-right':
        return { bottom: '1.5rem', right: '1.5rem' };
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      default:
        return { bottom: '1.5rem', right: '1.5rem' };
    }
  }, [floatPosition]);

  // Minimized pill position: opposite corner of the chatbot (chatbot = bottom-right)
  // So the minimized pill goes to bottom-left by default
  const minimizedPositionStyles = useMemo((): React.CSSProperties => {
    // Chatbot is always bottom-right, so minimized pill goes bottom-left
    return { bottom: '1.5rem', left: '1.5rem' };
  }, []);

  // Flex direction for image placement
  const flexDirection = useMemo((): React.CSSProperties['flexDirection'] => {
    switch (imagePlacement) {
      case 'top': return 'column';
      case 'bottom': return 'column-reverse';
      case 'left': return 'row';
      case 'right': return 'row-reverse';
      default: return 'column';
    }
  }, [imagePlacement]);

  const isHorizontalLayout = imagePlacement === 'left' || imagePlacement === 'right';

  // Determine position type: absolute in editor (to stay within preview), fixed on live sites
  const positionType = isInEditor ? 'absolute' as const : 'fixed' as const;

  // Helper: in editor, portal to preview overlay; on live site render inline (position:fixed works natively)
  const portalRender = (content: React.ReactNode) => {
    if (isInEditor) {
      const previewOverlay = document.getElementById('browser-preview-overlay');
      if (previewOverlay) {
        return ReactDOM.createPortal(content, previewOverlay);
      }
    }
    // Live site: render inline — position:fixed works without a portal
    return <>{content}</>;
  };

  // ========== MINIMIZED PILL ==========
  if (viewState === 'minimized') {
    return portalRender(
      <>
        <button
          onClick={handleReopen}
          style={{
            position: positionType,
            zIndex: 9999,
            pointerEvents: 'auto',
            ...minimizedPositionStyles,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: colors?.buttonBackground || '#4f46e5',
            color: colors?.buttonText || '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 10px -5px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: 'signupFloatMinimize 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(0, 0, 0, 0.4), 0 6px 12px -5px rgba(0, 0, 0, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 10px -5px rgba(0, 0, 0, 0.2)';
          }}
          aria-label="Open sign up form"
        >
          <Mail size={16} />
          {minimizedLabel || '✉️ Sign Up'}
        </button>

        <style>{`
          @keyframes signupFloatMinimize {
            from {
              opacity: 0;
              transform: scale(0.5) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
      </>,
    );
  }

  // ========== HIDDEN ==========
  if (viewState === 'hidden') return null;

  // ========== FULL OVERLAY (viewState === 'open') ==========
  return portalRender(
    <>
      {/* Overlay backdrop for center position — visual only, does NOT block scroll/click */}
      {floatPosition === 'center' && (
        <div
          style={{
            position: positionType,
            inset: 0,
            backgroundColor: colors?.overlayBackground || 'rgba(0,0,0,0.4)',
            zIndex: 9998,
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Floating Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: positionType,
          zIndex: 9999,
          pointerEvents: 'auto',
          width: isHorizontalLayout ? Math.min((width || 400) * 1.5, 720) : (width || 400),
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100vh - 3rem)',
          overflowY: 'auto',
          backgroundColor: colors?.background || '#1e293b',
          borderRadius: radius,
          boxShadow: colors?.cardShadow || '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          animation: 'signupFloatEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          ...positionStyles,
        }}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              zIndex: 10,
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(0,0,0,0.3)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        {/* Content wrapper with flex direction based on image placement */}
        <div style={{ display: 'flex', flexDirection, minHeight: 0 }}>
          {/* Image Section */}
          {imageUrl && (
            <div
              style={{
                flexShrink: 0,
                ...(isHorizontalLayout
                  ? { width: '40%', minHeight: imageHeight || 200 }
                  : { width: '100%', height: imageHeight || 200 }),
                overflow: 'hidden',
                borderRadius: imagePlacement === 'top'
                  ? `${radius} ${radius} 0 0`
                  : imagePlacement === 'bottom'
                    ? `0 0 ${radius} ${radius}`
                    : imagePlacement === 'left'
                      ? `${radius} 0 0 ${radius}`
                      : `0 ${radius} ${radius} 0`,
              }}
            >
              <img
                src={imageUrl}
                alt={headerText || 'Sign up'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}

          {/* Content Section */}
          <div
            style={{
              flex: 1,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Header */}
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: headerSize,
                  fontWeight: 700,
                  color: colors?.heading || '#F9FAFB',
                  lineHeight: 1.2,
                }}
              >
                {headerText}
              </h3>
              {descriptionText && (
                <p
                  style={{
                    margin: '0.5rem 0 0',
                    fontSize: descSize,
                    color: colors?.text || '#94a3b8',
                    lineHeight: 1.5,
                  }}
                >
                  {descriptionText}
                </p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {showNameField && (
                <input
                  type="text"
                  placeholder={namePlaceholder}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.875rem',
                    backgroundColor: colors?.inputBackground || '#0f172a',
                    color: colors?.inputText || '#F9FAFB',
                    border: `1px solid ${colors?.inputBorder || '#334155'}`,
                    borderRadius: btnRadius,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = colors?.accent || '#4f46e5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = colors?.inputBorder || '#334155'}
                />
              )}
              {showEmailField && (
                <input
                  type="email"
                  placeholder={emailPlaceholder}
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.875rem',
                    backgroundColor: colors?.inputBackground || '#0f172a',
                    color: colors?.inputText || '#F9FAFB',
                    border: `1px solid ${colors?.inputBorder || '#334155'}`,
                    borderRadius: btnRadius,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = colors?.accent || '#4f46e5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = colors?.inputBorder || '#334155'}
                />
              )}
              {showPhoneField && (
                <input
                  type="tel"
                  placeholder={phonePlaceholder}
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.875rem',
                    backgroundColor: colors?.inputBackground || '#0f172a',
                    color: colors?.inputText || '#F9FAFB',
                    border: `1px solid ${colors?.inputBorder || '#334155'}`,
                    borderRadius: btnRadius,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = colors?.accent || '#4f46e5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = colors?.inputBorder || '#334155'}
                />
              )}
              {showMessageField && (
                <textarea
                  placeholder={messagePlaceholder}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.875rem',
                    backgroundColor: colors?.inputBackground || '#0f172a',
                    color: colors?.inputText || '#F9FAFB',
                    border: `1px solid ${colors?.inputBorder || '#334155'}`,
                    borderRadius: btnRadius,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = colors?.accent || '#4f46e5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = colors?.inputBorder || '#334155'}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitted}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: isSubmitted ? '#22c55e' : (colors?.buttonBackground || '#4f46e5'),
                  color: colors?.buttonText || '#ffffff',
                  border: 'none',
                  borderRadius: btnRadius,
                  cursor: isSubmitted ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitted) {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isSubmitted ? '✓ ' + t('common.sent', 'Sent!') : buttonText}
              </button>
            </form>

            {/* Social Links */}
            {showSocialLinks && socialLinks?.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  paddingTop: '0.25rem',
                }}
              >
                {socialLinks.map((link, index) => {
                  const IconComponent = socialIconMap[link.platform] || Users;
                  return (
                    <a
                      key={`${link.platform}-${index}`}
                      href={link.href || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        color: colors?.socialIconColor || '#94a3b8',
                        transition: 'color 0.2s, transform 0.2s',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = colors?.accent || '#4f46e5';
                        e.currentTarget.style.transform = 'scale(1.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = colors?.socialIconColor || '#94a3b8';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <IconComponent size={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes signupFloatEntry {
          from {
            opacity: 0;
            transform: ${floatPosition === 'center' ? 'translate(-50%, -50%) scale(0.9)' : 'scale(0.9) translateY(10px)'};
          }
          to {
            opacity: 1;
            transform: ${floatPosition === 'center' ? 'translate(-50%, -50%) scale(1)' : 'scale(1) translateY(0)'};
          }
        }
        @keyframes signupFloatMinimize {
          from {
            opacity: 0;
            transform: scale(0.5) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        /* Placeholder color for inputs */
        .signup-float-input::placeholder {
          color: ${colors?.inputPlaceholder || '#6b7280'} !important;
        }
      `}</style>
    </>,
  );
};

export default SignupFloat;
