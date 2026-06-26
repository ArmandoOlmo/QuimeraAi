import QRCode from 'qrcode';
import { supabase } from '../../supabase';
import { recordBioPageEvent } from './bioPageAnalyticsService';
import { buildBioPageTrackedUrl } from './bioPagePublicService';
import type { BioPageData } from './bioPageTypes';

type SupabaseClient = typeof supabase;

export async function generateBioPageQrCode(input: {
    page: BioPageData;
    origin?: string;
    color?: string;
    backgroundColor?: string;
    margin?: number;
    width?: number;
}, client: SupabaseClient = supabase): Promise<{ url: string; dataUrl: string }> {
    const url = buildBioPageTrackedUrl({ page: input.page, origin: input.origin, channel: 'qr' });
    const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: input.margin ?? 2,
        width: input.width ?? 768,
        color: {
            dark: input.color || input.page.settings?.qrColor as string || input.page.theme.buttonColor || '#111827',
            light: input.backgroundColor || input.page.settings?.qrBackgroundColor as string || '#ffffff',
        },
    });

    const { error } = await client.from('bio_page_qr_codes').upsert({
        tenant_id: input.page.tenantId || null,
        project_id: input.page.projectId,
        bio_page_id: input.page.id,
        url,
        color: input.color || input.page.settings?.qrColor || input.page.theme.buttonColor || '#111827',
        background_color: input.backgroundColor || input.page.settings?.qrBackgroundColor || '#ffffff',
        logo_url: input.page.settings?.qrLogoUrl || input.page.profile.logoUrl || input.page.profile.avatarUrl || null,
        metadata: { generatedBy: 'bio-page-engine' },
        updated_at: new Date().toISOString(),
    }, { onConflict: 'bio_page_id' });

    if (error) {
        console.warn('[BioPageQR] QR metadata not stored:', error.message);
    }

    return { url, dataUrl };
}

export async function trackBioPageQrScan(page: BioPageData, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({
        page,
        eventType: 'bio_qr_scanned',
        source: 'qr',
        metadata: { slug: page.slug },
    }, client);
}
