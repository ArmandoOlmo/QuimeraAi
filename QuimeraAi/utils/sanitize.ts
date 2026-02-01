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
    
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    
    // Blockquote and code
    'blockquote', 'pre', 'code',
    
    // Horizontal rule
    'hr',
    
    // Figures
    'figure', 'figcaption',
]);

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
    '*': new Set(['class', 'id', 'style', 'title']),
    'a': new Set(['href', 'target', 'rel']),
    'img': new Set(['src', 'alt', 'width', 'height', 'loading']),
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
    
    // Remove iframe, embed, object, etc.
    const dangerous = content.querySelectorAll('iframe, embed, object, applet, form, input, button, textarea, select');
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











