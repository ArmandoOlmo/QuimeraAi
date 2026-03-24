import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SocialPlatform, SocialLink } from '../../types';
import {
  Twitter, Facebook, Instagram, Linkedin, Github, Youtube,
  Music, Pin, MessageCircle, Send, Ghost, Gamepad2, AtSign,
  Share2, Trash2, Plus, ChevronDown
} from 'lucide-react';

// Map platform → Lucide icon component  
const socialPlatformIcons: Record<SocialPlatform, React.ElementType> = {
  twitter: Twitter,
  x: Twitter,
  github: Github,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music,
  pinterest: Pin,
  whatsapp: MessageCircle,
  telegram: Send,
  snapchat: Ghost,
  discord: Gamepad2,
  threads: AtSign,
};

// Display labels for each platform
const socialPlatformLabels: Record<SocialPlatform, string> = {
  twitter: 'Twitter',
  x: 'X (Twitter)',
  github: 'GitHub',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  snapchat: 'Snapchat',
  discord: 'Discord',
  threads: 'Threads',
};

// URL placeholders for each platform
const socialPlatformPlaceholders: Record<SocialPlatform, string> = {
  twitter: 'https://twitter.com/username',
  x: 'https://x.com/username',
  github: 'https://github.com/username',
  facebook: 'https://facebook.com/page',
  instagram: 'https://instagram.com/username',
  linkedin: 'https://linkedin.com/in/username',
  youtube: 'https://youtube.com/@channel',
  tiktok: 'https://tiktok.com/@username',
  pinterest: 'https://pinterest.com/username',
  whatsapp: 'https://wa.me/1234567890',
  telegram: 'https://t.me/username',
  snapchat: 'https://snapchat.com/add/username',
  discord: 'https://discord.gg/invite-code',
  threads: 'https://threads.net/@username',
};

// All available platforms in display order
const allPlatforms: SocialPlatform[] = [
  'facebook', 'instagram', 'twitter', 'x', 'linkedin', 'youtube',
  'tiktok', 'pinterest', 'whatsapp', 'telegram', 'threads',
  'discord', 'snapchat', 'github',
];

interface SocialLinksEditorProps {
  socialLinks: SocialLink[] | undefined;
  onUpdate: (links: SocialLink[]) => void;
  onUpdateHref: (index: number, href: string) => void;
}

const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({
  socialLinks,
  onUpdate,
  onUpdateHref,
}) => {
  const { t } = useTranslation();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const links = Array.isArray(socialLinks) ? socialLinks : [];

  // Get platforms that haven't been added yet
  const usedPlatforms = new Set(links.map(l => l.platform));
  const availablePlatforms = allPlatforms.filter(p => !usedPlatforms.has(p));

  const handleAdd = (platform: SocialPlatform) => {
    const newLinks = [...links, { platform, href: '' }];
    onUpdate(newLinks);
    setShowAddMenu(false);
  };

  const handleRemove = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onUpdate(newLinks);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
          <Share2 size={14} className="text-editor-accent" />
          {t('editor.socialLinks')}
        </h4>
        <span className="text-[10px] text-editor-text-secondary">{links.length} links</span>
      </div>

      {/* Existing social links */}
      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link, index) => {
            const IconComponent = socialPlatformIcons[link.platform] || Share2;
            const label = socialPlatformLabels[link.platform] || link.platform;
            const placeholder = socialPlatformPlaceholders[link.platform] || 'https://...';

            return (
              <div
                key={`${link.platform}-${index}`}
                className="bg-editor-bg rounded-lg border border-editor-border p-2.5 group hover:border-editor-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {/* Platform icon + label */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-[100px]">
                    <IconComponent size={14} className="text-editor-accent" />
                    <span className="text-xs font-medium text-editor-text-primary truncate">{label}</span>
                  </div>

                  {/* URL input */}
                  <input
                    type="url"
                    value={link.href || ''}
                    onChange={(e) => onUpdateHref(index, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-editor-panel-bg border border-editor-border rounded-md px-2.5 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/40 min-w-0"
                  />

                  {/* Delete button */}
                  <button
                    onClick={() => handleRemove(index)}
                    className="text-editor-text-secondary hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10"
                    title={`Remove ${label}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-editor-bg/50 rounded-lg border border-dashed border-editor-border p-4 text-center">
          <Share2 size={20} className="mx-auto mb-2 text-editor-text-secondary/50" />
          <p className="text-xs text-editor-text-secondary">{t('editor.noSocialLinks')}</p>
          <p className="text-[10px] text-editor-text-secondary/60 mt-0.5">{t('editor.addSocialBelow')}</p>
        </div>
      )}

      {/* Add social link button / dropdown */}
      {availablePlatforms.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent/50 transition-all flex items-center justify-center gap-2 text-xs font-medium"
          >
            <Plus size={14} />
            {t('editor.addSocialLink')}
            <ChevronDown size={12} className={`transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
          </button>

          {showAddMenu && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl max-h-[240px] overflow-y-auto">
              {availablePlatforms.map(platform => {
                const IconComponent = socialPlatformIcons[platform];
                const label = socialPlatformLabels[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => handleAdd(platform)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-editor-text-primary hover:bg-editor-accent/10 hover:text-editor-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <IconComponent size={14} className="text-editor-text-secondary" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialLinksEditor;
