import { describe, expect, it } from 'vitest';
import { normalizeChatAppearanceConfig, resolveChatAppearanceConfig } from '../../utils/chatThemes';

describe('normalizeChatAppearanceConfig', () => {
    it('fills missing nested appearance sections for legacy configs', () => {
        const appearance = normalizeChatAppearanceConfig({});

        expect(appearance.branding.logoType).toBe('emoji');
        expect(appearance.colors.backgroundColor).toBeTruthy();
        expect(appearance.behavior.position).toBe('bottom-right');
        expect(appearance.messages.quickReplies).toEqual([]);
        expect(appearance.button.buttonIcon).toBe('chat');
    });

    it('preserves provided nested values while filling defaults', () => {
        const appearance = normalizeChatAppearanceConfig({
            branding: {
                logoType: 'image',
                logoUrl: 'https://example.com/logo.png',
            } as any,
            messages: {
                welcomeMessage: 'Hola',
            } as any,
        });

        expect(appearance.branding.logoType).toBe('image');
        expect(appearance.branding.logoUrl).toBe('https://example.com/logo.png');
        expect(appearance.branding.showBotAvatar).toBe(true);
        expect(appearance.messages.welcomeMessage).toBe('Hola');
        expect(appearance.messages.quickReplies).toEqual([]);
    });
});

describe('resolveChatAppearanceConfig', () => {
    it('uses project colors when stored colors are missing or still default', () => {
        const appearance = resolveChatAppearanceConfig({}, {
            primary: '#7f1d1d',
            secondary: '#f59e0b',
            accent: '#166534',
            background: '#fff7ed',
            surface: '#fffbeb',
            text: '#1c1917',
            heading: '#111827',
            border: '#fed7aa',
            textMuted: '#78716c',
            success: '#16a34a',
            error: '#dc2626',
        });

        expect(appearance.colors.primaryColor).toBe('#7f1d1d');
        expect(appearance.colors.headerBackground).toBe('#7f1d1d');
        expect(appearance.colors.botBubbleColor).toBe('#fffbeb');
        expect(appearance.colors.botTextColor).toBe('#1c1917');
    });

    it('preserves explicit chat color overrides over project colors', () => {
        const appearance = resolveChatAppearanceConfig({
            colors: {
                primaryColor: '#111111',
                userBubbleColor: '#222222',
            } as any,
        }, {
            primary: '#7f1d1d',
            secondary: '#f59e0b',
            accent: '#166534',
            background: '#fff7ed',
            surface: '#fffbeb',
            text: '#1c1917',
            heading: '#111827',
            border: '#fed7aa',
            textMuted: '#78716c',
            success: '#16a34a',
            error: '#dc2626',
        });

        expect(appearance.colors.primaryColor).toBe('#111111');
        expect(appearance.colors.userBubbleColor).toBe('#222222');
        expect(appearance.colors.headerBackground).toBe('#7f1d1d');
    });
});
