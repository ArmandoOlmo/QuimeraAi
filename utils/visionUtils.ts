import html2canvas from 'html2canvas';

/**
 * Captures the current DOM as a base64 encoded JPEG image.
 * Excludes the AI Assistant UI to prevent infinite visual recursion.
 */
export const captureCurrentView = async (): Promise<string | null> => {
    try {
        const element = document.body;
        if (!element) return null;

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

        // Use html2canvas to capture the screen
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

        // Convert to base64 JPEG with quality 0.6
        // The Gemini API expects base64 without the data URI prefix for some endpoints
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        // Remove the prefix "data:image/jpeg;base64,"
        return dataUrl.split(',')[1];
    } catch (error) {
        console.warn('Vision capture failed:', error);
        return null;
    }
};
