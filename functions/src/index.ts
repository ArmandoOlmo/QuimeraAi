/**
 * Cloud Functions for Quimera AI
 * 
 * Export all cloud functions here.
 */

import { getWidgetConfig, submitWidgetLead, trackWidgetAnalytics } from './widgetApi';
import { generateContent, streamContent, getUsageStats, generateImage } from './geminiProxy';

// Export widget API functions
export const widget = {
    getConfig: getWidgetConfig,
    submitLead: submitWidgetLead,
    trackAnalytics: trackWidgetAnalytics
};

// Export Gemini proxy functions
export const gemini = {
    generate: generateContent,
    stream: streamContent,
    usage: getUsageStats,
    image: generateImage
};

// Alternative flat exports for easier routing
export { 
    getWidgetConfig, 
    submitWidgetLead, 
    trackWidgetAnalytics,
    generateContent,
    streamContent,
    getUsageStats,
    generateImage
};

