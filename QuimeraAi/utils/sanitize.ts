/**
 * HTML Sanitization Utilities
 * 
 * Provides XSS protection by sanitizing HTML content before rendering.
 * Uses a whitelist approach to only allow safe HTML tags and attributes.
 */

// Allowed HTML tags (safe for content rendering)
const ALLOWED_TAGS = new Set([
    // Text formatting
    'p', 'br', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
    'sub', 'sup', 'small', 'mark',
    
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    
    // Lists
    'ul', 'ol', 'li',
    
    // Links (href will be validated)
    'a',
    
    // Images (src will be validated)
    'img',
    
    // Video & audio embeds
    'video', 'source', 'iframe',
    
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    
    // Blockquote and code
    'blockquote', 'pre', 'code',
    
    // Horizontal rule
    'hr',
    
    // Figures
    'figure', 'figcaption',
]);

// Trusted embed domains for iframe sources (video embeds)
const TRUSTED_EMBED_DOMAINS = [
    'youtube.com',
    'www.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'vimeo.com',
    'www.loom.com',
    'loom.com',
    'fast.wistia.net',
    'www.dailymotion.com',
    'dailymotion.com',
    'drive.google.com',
    'firebasestorage.googleapis.com',
];

/**
 * Check if an iframe src is from a trusted embed domain
 */
function isTrustedEmbedSrc(src: string): boolean {
    try {
        const url = new URL(src);
        return TRUSTED_EMBED_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
}

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
    '*': new Set(['class', 'id', 'style', 'title']),
    'a': new Set(['href', 'target', 'rel']),
    'img': new Set(['src', 'alt', 'width', 'height', 'loading']),
    'video': new Set(['src', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload', 'poster', 'width', 'height']),
    'source': new Set(['src', 'type']),
    'iframe': new Set(['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'referrerpolicy', 'loading']),
    'td': new Set(['colspan', 'rowspan']),
    'th': new Set(['colspan', 'rowspan', 'scope']),
    'ol': new Set(['start', 'type']),
    'li': new Set(['value']),
};

// Dangerous CSS properties that could be used for attacks
const DANGEROUS_CSS_PROPERTIES = [
    'behavior',
    'binding',
    'expression',
    '-moz-binding',
    'javascript',
];

// Safe URL protocols
const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:', 'data:'];

/**
 * Check if a URL is safe (doesn't use javascript: or other dangerous protocols)
 */
function isSafeUrl(url: string): boolean {
    try {
        const trimmed = url.trim().toLowerCase();
        
        // Check for javascript: protocol (including obfuscated versions)
        if (trimmed.startsWith('javascript:') || 
            trimmed.includes('javascript:') ||
            trimmed.startsWith('vbscript:') ||
            trimmed.startsWith('data:text/html')) {
            return false;
        }
        
        // For data: URLs, only allow images
        if (trimmed.startsWith('data:')) {
            return trimmed.startsWith('data:image/');
        }
        
        // Parse URL and check protocol
        const parsed = new URL(url, 'https://placeholder.com');
        return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
    } catch {
        // If URL parsing fails, allow relative URLs
        return !url.toLowerCase().includes('javascript:');
    }
}

/**
 * Sanitize CSS style string
 */
function sanitizeStyle(style: string): string {
    // Remove dangerous CSS
    let sanitized = style;
    
    for (const dangerous of DANGEROUS_CSS_PROPERTIES) {
        const regex = new RegExp(dangerous, 'gi');
        sanitized = sanitized.replace(regex, '');
    }
    
    // Remove url() expressions that could be dangerous
    sanitized = sanitized.replace(/url\s*\([^)]*\)/gi, '');
    
    return sanitized;
}

/**
 * Sanitize an HTML element and its children
 */
function sanitizeElement(element: Element): void {
    const tagName = element.tagName.toLowerCase();
    
    // Special handling for iframes: only allow from trusted sources
    if (tagName === 'iframe') {
        const src = element.getAttribute('src') || '';
        if (!isTrustedEmbedSrc(src)) {
            element.parentNode?.removeChild(element);
            return;
        }
        // Wrap iframe in a responsive container for mobile
        if (!element.parentElement?.classList.contains('video-embed-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-embed-wrapper';
            wrapper.style.cssText = 'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1rem 0;border-radius:0.75rem;';
            (element as HTMLElement).style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:0.75rem;';
            element.parentNode?.insertBefore(wrapper, element);
            wrapper.appendChild(element);
        }
    }
    
    // Remove disallowed tags
    if (!ALLOWED_TAGS.has(tagName)) {
        // Replace with text content to preserve readable content
        const text = document.createTextNode(element.textContent || '');
        element.parentNode?.replaceChild(text, element);
        return;
    }
    
    // Get allowed attributes for this tag
    const globalAttrs = ALLOWED_ATTRIBUTES['*'] || new Set();
    const tagAttrs = ALLOWED_ATTRIBUTES[tagName] || new Set();
    const allowedAttrs = new Set([...globalAttrs, ...tagAttrs]);
    
    // Remove disallowed attributes
    const attrsToRemove: string[] = [];
    
    for (const attr of Array.from(element.attributes)) {
        const attrName = attr.name.toLowerCase();
        
        // Check if attribute is allowed
        if (!allowedAttrs.has(attrName)) {
            attrsToRemove.push(attr.name);
            continue;
        }
        
        // Validate specific attributes
        if (attrName === 'href' || attrName === 'src') {
            if (!isSafeUrl(attr.value)) {
                attrsToRemove.push(attr.name);
            }
        }
        
        // Sanitize style attribute
        if (attrName === 'style') {
            element.setAttribute('style', sanitizeStyle(attr.value));
        }
        
        // Event handlers should never be allowed (they start with "on")
        if (attrName.startsWith('on')) {
            attrsToRemove.push(attr.name);
        }
    }
    
    // Remove marked attributes
    for (const attr of attrsToRemove) {
        element.removeAttribute(attr);
    }
    
    // Add security attributes to links
    if (tagName === 'a') {
        element.setAttribute('rel', 'noopener noreferrer');
        if (element.getAttribute('target') === '_blank') {
            // Already has rel set
        }
    }
    
    // Recursively sanitize children
    const children = Array.from(element.children);
    for (const child of children) {
        sanitizeElement(child);
    }
}

/**
 * Sanitize HTML string to prevent XSS attacks
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    // Create a temporary container
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    
    const content = template.content;
    
    // Remove script tags completely
    const scripts = content.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove style tags (inline styles are allowed, but not <style> blocks)
    const styles = content.querySelectorAll('style');
    styles.forEach(style => style.remove());
    
    // Remove dangerous elements (but keep iframes — they are filtered by domain in sanitizeElement)
    const dangerous = content.querySelectorAll('embed, object, applet, form, input, button, textarea, select');
    dangerous.forEach(el => el.remove());
    
    // Sanitize all elements
    const elements = Array.from(content.querySelectorAll('*'));
    for (const element of elements) {
        sanitizeElement(element);
    }
    
    // Create a div to get the innerHTML
    const div = document.createElement('div');
    div.appendChild(content.cloneNode(true));
    
    return div.innerHTML;
}

/**
 * Escape HTML entities (for displaying text that should not be parsed as HTML)
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Strip all HTML tags and return plain text
 */
export function stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Check if a string contains potentially dangerous HTML
 */
export function containsDangerousHtml(html: string): boolean {
    const dangerous = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,  // onclick, onerror, etc.
        /<iframe/i,
        /<embed/i,
        /<object/i,
        /<form/i,
        /data:text\/html/i,
        /vbscript:/i,
    ];
    
    return dangerous.some(pattern => pattern.test(html));
}

export default sanitizeHtml;











