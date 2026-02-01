/**
 * Cloud Function to generate consolidated reports
 * Can be triggered via HTTP or scheduled
 */
import * as functions from 'firebase-functions';
/**
 * HTTP callable function to generate report
 */
export declare const generateConsolidatedReport: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Get saved report by ID
 */
export declare const getSavedReport: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Delete saved report
 */
export declare const deleteSavedReport: functions.HttpsFunction & functions.Runnable<any>;
