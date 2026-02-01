/**
 * Production-Ready Logger
 * 
 * Centralized logging system that:
 * - Suppresses debug/info logs in production
 * - Always logs errors and warnings
 * - Integrates with monitoring service
 * - Provides structured logging
 */

import { logError, logMessage, addBreadcrumb } from './monitoring';

// Determine environment
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

/**
 * Logger class with environment-aware logging
 */
class Logger {
  private context: string;
  private enabled: boolean;

  constructor(context: string = 'App') {
    this.context = context;
    this.enabled = true;
  }

  /**
   * Create a new logger with a specific context
   */
  static create(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Format log entry
   */
  private formatEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context: this.context,
    };
  }

  /**
   * Debug log - only in development
   */
  debug(message: string, data?: any): void {
    if (!this.enabled || isProduction) return;
    
    const entry = this.formatEntry('debug', message, data);
    console.debug(`[${this.context}]`, message, data ?? '');
  }

  /**
   * Info log - only in development
   */
  info(message: string, data?: any): void {
    if (!this.enabled || isProduction) return;
    
    const entry = this.formatEntry('info', message, data);
    console.info(`[${this.context}]`, message, data ?? '');
  }

  /**
   * Warning log - always shown
   */
  warn(message: string, data?: any): void {
    if (!this.enabled) return;
    
    const entry = this.formatEntry('warn', message, data);
    console.warn(`[${this.context}]`, message, data ?? '');
    
    // Send to monitoring in production
    if (isProduction) {
      logMessage(`[${this.context}] ${message}`, 'warning', data);
    }
  }

  /**
   * Error log - always shown and sent to monitoring
   */
  error(message: string, error?: Error | any, data?: any): void {
    if (!this.enabled) return;
    
    const entry = this.formatEntry('error', message, { error, ...data });
    console.error(`[${this.context}]`, message, error ?? '', data ?? '');
    
    // Always send errors to monitoring
    if (error instanceof Error) {
      logError(error, { context: this.context, message, ...data });
    } else {
      logMessage(`[${this.context}] ${message}`, 'error', { error, ...data });
    }
  }

  /**
   * Log API call - only in development
   */
  api(method: string, url: string, data?: any): void {
    if (!this.enabled || isProduction) return;
    
    console.debug(`🌐 [API] ${method} ${url}`, data ?? '');
  }

  /**
   * Log Firebase operation - only in development
   */
  firebase(operation: string, collection: string, data?: any): void {
    if (!this.enabled || isProduction) return;
    
    console.debug(`🔥 [Firebase] ${operation} ${collection}`, data ?? '');
  }

  /**
   * Log user action for breadcrumbs
   */
  action(action: string, data?: any): void {
    addBreadcrumb(action, 'user-action', data);
    
    if (isDevelopment) {
      console.debug(`👤 [Action] ${action}`, data ?? '');
    }
  }

  /**
   * Performance log - only in development
   */
  perf(label: string, durationMs: number): void {
    if (!this.enabled || isProduction) return;
    
    console.debug(`⏱️ [Perf] ${label}: ${durationMs.toFixed(2)}ms`);
  }

  /**
   * Disable logging (useful for tests)
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable logging
   */
  enable(): void {
    this.enabled = true;
  }
}

// Default logger instance
export const logger = new Logger('App');

// Export class for custom loggers
export { Logger };

// Convenience exports for common use cases
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: Error | any, data?: any) => logger.error(message, error, data),
  api: (method: string, url: string, data?: any) => logger.api(method, url, data),
  firebase: (operation: string, collection: string, data?: any) => logger.firebase(operation, collection, data),
  action: (action: string, data?: any) => logger.action(action, data),
  perf: (label: string, durationMs: number) => logger.perf(label, durationMs),
};

/**
 * Create specialized loggers for different modules
 */
export const createLogger = (context: string) => Logger.create(context);

// Pre-configured loggers for common modules
export const loggers = {
  auth: Logger.create('Auth'),
  api: Logger.create('API'),
  firebase: Logger.create('Firebase'),
  editor: Logger.create('Editor'),
  ai: Logger.create('AI'),
  chat: Logger.create('Chat'),
  cms: Logger.create('CMS'),
  leads: Logger.create('Leads'),
  deployment: Logger.create('Deployment'),
};
















