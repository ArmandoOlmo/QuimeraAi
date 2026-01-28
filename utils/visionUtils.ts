// Use html2canvas-pro instead of html2canvas - it supports oklch() colors
import html2canvas from 'html2canvas-pro';

/**
 * Captures the current DOM as a base64 encoded JPEG image.
 * Excludes the AI Assistant UI to prevent infinite visual recursion.
 * 
 * Uses html2canvas-pro which supports modern CSS color functions like oklch().
 */
export const captureCurrentView = async (): Promise<string | null> => {
    try {
        const element = document.body;
        if (!element) return null;

        console.log('[Vision] Starting screen capture...');

        // PRE-PROCESSING: Manually sync input values to DOM attributes
        // html2canvas sometimes misses current values of inputs/textareas if they haven't been 'set' in the DOM attribute
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach((input: any) => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                if (input.checked) {
                    input.setAttribute('checked', 'checked');
                } else {
                    input.removeAttribute('checked');
                }
            } else if (input.tagName === 'SELECT') {
                const options = input.querySelectorAll('option');
                options.forEach((option: any) => {
                    if (option.selected) {
                        option.setAttribute('selected', 'selected');
                    } else {
                        option.removeAttribute('selected');
                    }
                });
            } else {
                // For text, password, email, textarea, etc.
                input.setAttribute('value', input.value);
            }
        });

        // Use html2canvas-pro to capture the screen (supports oklch colors natively)
        // Configured for "deep" capture: accurate current state including simple dynamic elements
        const canvas = await html2canvas(element, {
            ignoreElements: (elt) => {
                // Ignore the AI Assistant container and its children
                if (elt.id === 'global-ai-assistant-drawer' ||
                    elt.classList.contains('ai-assistant-drawer') ||
                    elt.id === 'global-ai-assistant-footer') {
                    return true;
                }
                return false;
            },
            useCORS: true,
            logging: false, // Disable logging for production
            scale: 0.5, // Downscale to 50% for performance and token efficiency
            allowTaint: true,
            backgroundColor: null, // Transparent background if body is transparent
            // Ensure we capture what's visible plus some context
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
            // Try to force rendering of foreign objects if needed (often risky, keeping false for now unless requested)
            foreignObjectRendering: false
        });

        console.log('[Vision] Canvas captured successfully');

        // Convert to base64 JPEG with quality 0.6
        // The Gemini API expects base64 without the data URI prefix for some endpoints
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        // Remove the prefix "data:image/jpeg;base64,"
        const base64 = dataUrl.split(',')[1];

        console.log(`[Vision] Image encoded, size: ${Math.round(base64.length / 1024)}KB`);

        return base64;
    } catch (error: any) {
        console.warn('[Vision] Capture failed:', error?.message || error?.toString() || 'Unknown error');
        console.warn('[Vision] Error stack:', error?.stack);
        return null;
    }
};
