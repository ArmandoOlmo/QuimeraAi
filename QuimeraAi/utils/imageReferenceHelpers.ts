/**
 * Normalize an image reference for multimodal generation.
 * Data URLs pass through. HTTP(S) URLs are rasterized to PNG data URLs when possible
 * so the proxy always receives inline base64 (avoids OpenRouter / model ignoring remote URLs).
 */
export async function normalizeReferenceImageForGeneration(urlOrDataUrl: string): Promise<string> {
    if (!urlOrDataUrl) return urlOrDataUrl;
    if (urlOrDataUrl.startsWith('data:image/')) return urlOrDataUrl;

    if (!urlOrDataUrl.startsWith('http')) {
        // Raw base64 without prefix — treat as jpeg data URL (legacy)
        if (/^[A-Za-z0-9+/=]+$/.test(urlOrDataUrl.slice(0, 80))) {
            return `data:image/jpeg;base64,${urlOrDataUrl}`;
        }
        return urlOrDataUrl;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(urlOrDataUrl);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch {
                resolve(urlOrDataUrl);
            }
        };
        img.onerror = () => resolve(urlOrDataUrl);
        img.src = urlOrDataUrl;
    });
}

export async function normalizeReferenceImagesForGeneration(urls: string[]): Promise<string[]> {
    return Promise.all(urls.map((u) => normalizeReferenceImageForGeneration(u)));
}
