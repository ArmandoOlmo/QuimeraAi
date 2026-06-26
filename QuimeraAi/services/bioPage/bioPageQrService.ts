import QRCode from 'qrcode';
import { supabase } from '../../supabase';
import { recordBioPageEvent } from './bioPageAnalyticsService';
import { sanitizeBioMediaUrl } from './bioPageEngineService';
import { buildBioPageTrackedUrl } from './bioPagePublicService';
import type { BioPageData } from './bioPageTypes';

type SupabaseClient = typeof supabase;
const BIO_PAGE_QR_LOGO_TIMEOUT_MS = 1800;

function getBioPageQrLogoUrl(input: { logoUrl?: string; page: BioPageData }): string {
    const settingsLogo = typeof input.page.settings?.qrLogoUrl === 'string' ? input.page.settings.qrLogoUrl : '';
    return sanitizeBioMediaUrl(input.logoUrl || settingsLogo || input.page.profile.logoUrl || input.page.profile.avatarUrl || '');
}

function loadQrImage(src: string, timeoutMs = BIO_PAGE_QR_LOGO_TIMEOUT_MS): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const finish = (callback: () => void) => {
            if (timeoutId) clearTimeout(timeoutId);
            image.onload = null;
            image.onerror = null;
            callback();
        };
        image.crossOrigin = 'anonymous';
        image.onload = () => finish(() => resolve(image));
        image.onerror = () => finish(() => reject(new Error('QR image asset could not be loaded.')));
        timeoutId = setTimeout(() => {
            finish(() => reject(new Error('QR image asset load timed out.')));
        }, timeoutMs);
        image.src = src;
    });
}

function drawRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): void {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
}

async function addLogoToBioPageQrDataUrl(input: {
    dataUrl: string;
    logoUrl: string;
    backgroundColor: string;
    logoLoadTimeoutMs?: number;
}): Promise<{ dataUrl: string; logoEmbedded: boolean }> {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
        return { dataUrl: input.dataUrl, logoEmbedded: false };
    }

    try {
        const [qrImage, logoImage] = await Promise.all([
            loadQrImage(input.dataUrl, input.logoLoadTimeoutMs),
            loadQrImage(input.logoUrl, input.logoLoadTimeoutMs),
        ]);
        const size = Math.max(qrImage.naturalWidth || qrImage.width, qrImage.naturalHeight || qrImage.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return { dataUrl: input.dataUrl, logoEmbedded: false };

        context.drawImage(qrImage, 0, 0, size, size);
        const logoSize = Math.round(size * 0.18);
        const logoPadding = Math.round(logoSize * 0.18);
        const logoBoxSize = logoSize + logoPadding * 2;
        const logoBoxX = Math.round((size - logoBoxSize) / 2);
        const logoBoxY = Math.round((size - logoBoxSize) / 2);
        const radius = Math.round(logoBoxSize * 0.18);

        context.save();
        context.fillStyle = input.backgroundColor || '#ffffff';
        drawRoundedRect(context, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, radius);
        context.fill();
        context.clip();
        context.drawImage(logoImage, logoBoxX + logoPadding, logoBoxY + logoPadding, logoSize, logoSize);
        context.restore();

        return { dataUrl: canvas.toDataURL('image/png'), logoEmbedded: true };
    } catch (error) {
        console.warn('[BioPageQR] QR logo was not embedded:', error instanceof Error ? error.message : error);
        return { dataUrl: input.dataUrl, logoEmbedded: false };
    }
}

export async function generateBioPageQrCode(input: {
    page: BioPageData;
    origin?: string;
    color?: string;
    backgroundColor?: string;
    logoUrl?: string;
    logoLoadTimeoutMs?: number;
    margin?: number;
    width?: number;
}, client: SupabaseClient = supabase): Promise<{ url: string; dataUrl: string }> {
    const url = buildBioPageTrackedUrl({ page: input.page, origin: input.origin, channel: 'qr' });
    const color = input.color || input.page.settings?.qrColor as string || input.page.theme.buttonColor || '#111827';
    const backgroundColor = input.backgroundColor || input.page.settings?.qrBackgroundColor as string || '#ffffff';
    const logoUrl = getBioPageQrLogoUrl(input);
    const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: input.margin ?? 2,
        width: input.width ?? 768,
        color: {
            dark: color,
            light: backgroundColor,
        },
    });
    const qrImage = logoUrl
        ? await addLogoToBioPageQrDataUrl({
            dataUrl,
            logoUrl,
            backgroundColor,
            logoLoadTimeoutMs: input.logoLoadTimeoutMs,
        })
        : { dataUrl, logoEmbedded: false };

    const { error } = await client.from('bio_page_qr_codes').upsert({
        tenant_id: input.page.tenantId || null,
        project_id: input.page.projectId,
        bio_page_id: input.page.id,
        url,
        color,
        background_color: backgroundColor,
        logo_url: logoUrl || null,
        metadata: {
            generatedBy: 'bio-page-engine',
            logoEmbedded: qrImage.logoEmbedded,
        },
        updated_at: new Date().toISOString(),
    }, { onConflict: 'bio_page_id' });

    if (error) {
        console.warn('[BioPageQR] QR metadata not stored:', error.message);
    }

    return { url, dataUrl: qrImage.dataUrl };
}

export async function trackBioPageQrScan(page: BioPageData, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({
        page,
        eventType: 'bio_qr_scanned',
        source: 'qr',
        metadata: { slug: page.slug },
    }, client);
}
