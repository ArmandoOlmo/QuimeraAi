/**
 * Cloud Functions for Quimera AI
 * 
 * Export all cloud functions here.
 */

import { getWidgetConfig, submitWidgetLead, trackWidgetAnalytics } from './widgetApi';

// Export widget API functions
export const widget = {
    getConfig: getWidgetConfig,
    submitLead: submitWidgetLead,
    trackAnalytics: trackWidgetAnalytics
};

// Alternative flat exports for easier routing
export { getWidgetConfig, submitWidgetLead, trackWidgetAnalytics };

