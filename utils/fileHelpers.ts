/**
 * File Utilities - Shared helper functions for file operations
 */

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: { type?: string; name?: string }): boolean => {
    if (file.type) return file.type.startsWith('image/');
    if (file.name) {
        const ext = getFileExtension(file.name).toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
    }
    return false;
};

/**
 * Check if file is a document
 */
export const isDocumentFile = (file: { type?: string; name?: string }): boolean => {
    if (file.type) return file.type.startsWith('text/') || file.type.includes('pdf') || file.type.includes('document');
    if (file.name) {
        const ext = getFileExtension(file.name).toLowerCase();
        return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext);
    }
    return false;
};

/**
 * Validate file size (max in MB)
 */
export const validateFileSize = (file: File, maxSizeMB: number): { valid: boolean; error?: string } => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
    }
    return { valid: true };
};

/**
 * Validate file type
 */
export const validateFileType = (file: File, allowedTypes: string[]): { valid: boolean; error?: string } => {
    const fileType = file.type;
    const isAllowed = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
            return fileType.startsWith(type.replace('/*', '/'));
        }
        return fileType === type;
    });
    
    if (!isAllowed) {
        return { valid: false, error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` };
    }
    return { valid: true };
};

/**
 * Format date from Firestore timestamp
 */
export const formatFileDate = (timestamp: { seconds?: number } | null | undefined): string => {
    if (!timestamp || !timestamp.seconds) return 'Just now';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: { seconds?: number } | null | undefined): string => {
    if (!timestamp || !timestamp.seconds) return 'Just now';
    
    const now = Date.now();
    const then = timestamp.seconds * 1000;
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
    if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    if (diffWeek > 0) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
};

/**
 * Generate unique filename to avoid collisions
 */
export const generateUniqueFilename = (originalName: string): string => {
    const timestamp = Date.now();
    const extension = getFileExtension(originalName);
    const nameWithoutExt = originalName.slice(0, originalName.lastIndexOf('.'));
    return `${nameWithoutExt}_${timestamp}.${extension}`;
};

/**
 * Sort files by various criteria
 */
export type SortOption = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export const sortFiles = <T extends { name: string; size: number; type: string; createdAt?: { seconds?: number } }>(
    files: T[],
    sortBy: SortOption,
    order: SortOrder = 'asc'
): T[] => {
    const sorted = [...files].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'date':
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                comparison = aTime - bTime;
                break;
        }
        
        return order === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
};

/**
 * Filter files by type
 */
export type FileTypeFilter = 'all' | 'image' | 'document' | 'other';

export const filterFilesByType = <T extends { type: string }>(
    files: T[],
    filterType: FileTypeFilter
): T[] => {
    if (filterType === 'all') return files;
    
    return files.filter(file => {
        switch (filterType) {
            case 'image':
                return isImageFile(file);
            case 'document':
                return isDocumentFile(file);
            case 'other':
                return !isImageFile(file) && !isDocumentFile(file);
            default:
                return true;
        }
    });
};

/**
 * Search files by query (name, notes, tags)
 */
export const searchFiles = <T extends { name: string; notes?: string; tags?: string[] }>(
    files: T[],
    query: string
): T[] => {
    if (!query.trim()) return files;
    
    const lowerQuery = query.toLowerCase();
    
    return files.filter(file => {
        const matchesName = file.name.toLowerCase().includes(lowerQuery);
        const matchesNotes = file.notes?.toLowerCase().includes(lowerQuery) || false;
        const matchesTags = file.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) || false;
        
        return matchesName || matchesNotes || matchesTags;
    });
};

