/**
 * Scheduled Reports Cloud Functions
 * Automatically generate and send reports on schedule
 */
import * as functions from 'firebase-functions';
/**
 * Scheduled function that runs monthly to send reports
 * Runs on the 1st of each month at 9:00 AM UTC
 */
export declare const sendMonthlyReports: functions.CloudFunction<unknown>;
/**
 * Weekly scheduled reports
 * Runs every Monday at 9:00 AM UTC
 */
export declare const sendWeeklyReports: functions.CloudFunction<unknown>;
/**
 * Manual trigger to send report immediately (for testing)
 */
export declare const triggerManualReport: functions.HttpsFunction & functions.Runnable<any>;
