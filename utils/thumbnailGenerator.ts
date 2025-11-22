import html2canvas from 'html2canvas';

interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor?: string;
}

/**
 * Generates a thumbnail from a DOM element
 * @param element - The DOM element to capture
 * @param options - Thumbnail generation options
 * @returns Promise<string> - Base64 encoded image data URL
 */
export const generateThumbnail = async (
  element: HTMLElement,
  options: ThumbnailOptions = {}
): Promise<string> => {
  const {
    width = 300,
    height = 200,
    quality = 0.8,
    backgroundColor = '#ffffff',
  } = options;

  try {
    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale: 1, // Use 1 for better performance
      logging: false,
      useCORS: true, // Allow cross-origin images
      allowTaint: false,
    });

    // Create a new canvas with desired dimensions
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = width;
    thumbnailCanvas.height = height;

    const ctx = thumbnailCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Calculate scaling to maintain aspect ratio
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const ratio = Math.min(width / originalWidth, height / originalHeight);

    const scaledWidth = originalWidth * ratio;
    const scaledHeight = originalHeight * ratio;

    // Center the image
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw scaled image
    ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);

    // Convert to data URL
    return thumbnailCanvas.toDataURL('image/png', quality);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

/**
 * Generates a thumbnail from a component preview
 * @param componentId - ID of the component
 * @param options - Thumbnail generation options
 * @returns Promise<string | null> - Base64 encoded image or null if element not found
 */
export const generateComponentThumbnail = async (
  componentId: string,
  options: ThumbnailOptions = {}
): Promise<string | null> => {
  // Try to find the component preview element
  const previewElement = document.querySelector(
    `[data-component-preview="${componentId}"]`
  ) as HTMLElement;

  if (!previewElement) {
    console.warn(`Preview element not found for component: ${componentId}`);
    return null;
  }

  try {
    return await generateThumbnail(previewElement, options);
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${componentId}:`, error);
    return null;
  }
};

/**
 * Uploads thumbnail to Firebase Storage (if needed)
 * For now, we'll store thumbnails as base64 in Firestore
 * In production, you might want to upload to Storage for better performance
 */
export const uploadThumbnailToStorage = async (
  thumbnail: string,
  componentId: string
): Promise<string> => {
  // TODO: Implement Firebase Storage upload if needed
  // For now, just return the base64 string
  return thumbnail;
};

/**
 * Creates a placeholder thumbnail with component name
 * Used as fallback when capture fails
 */
export const createPlaceholderThumbnail = (
  componentName: string,
  baseComponent: string
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 200;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 300, 200);
  gradient.addColorStop(0, '#8B5CF6'); // purple-600
  gradient.addColorStop(1, '#6366F1'); // indigo-600
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 300, 200);

  // Component name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(componentName, 150, 85);

  // Base component info
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#E9D5FF'; // purple-200
  ctx.fillText(`Based on: ${baseComponent}`, 150, 115);

  return canvas.toDataURL('image/png');
};

/**
 * Batch generate thumbnails for multiple components
 */
export const batchGenerateThumbnails = async (
  componentIds: string[],
  options: ThumbnailOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<Record<string, string | null>> => {
  const results: Record<string, string | null> = {};
  
  for (let i = 0; i < componentIds.length; i++) {
    const componentId = componentIds[i];
    results[componentId] = await generateComponentThumbnail(componentId, options);
    
    if (onProgress) {
      onProgress(i + 1, componentIds.length);
    }
    
    // Small delay between captures to avoid performance issues
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

