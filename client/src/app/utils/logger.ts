/**
 * Centralized logging utility
 * 
 * Features:
 * - Environment-based logging (disabled in production)
 * - Log levels (debug, info, warn, error)
 * - Performance-friendly (no-op in production)
 * - Easy to enable/disable globally
 */

import { environment } from '../../environments/environment';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Current log level configuration
 * Set to NONE to disable all logging in production
 */
const CURRENT_LOG_LEVEL = environment.production 
  ? LogLevel.ERROR  // Only show errors in production
  : LogLevel.DEBUG; // Show all logs in development

/**
 * Check if logging is enabled for a given level
 */
const shouldLog = (level: LogLevel): boolean => {
  return level >= CURRENT_LOG_LEVEL;
};

/**
 * Logger class with different log levels
 */
export class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  /**
   * Debug logs - detailed information for debugging
   * Only shown in development
   */
  debug(...args: any[]): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] [${this.context}]`, ...args);
    }
  }

  /**
   * Info logs - general information
   * Shown in development, hidden in production
   */
  info(...args: any[]): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] [${this.context}]`, ...args);
    }
  }

  /**
   * Warning logs - potential issues
   * Shown in both development and production
   */
  warn(...args: any[]): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] [${this.context}]`, ...args);
    }
  }

  /**
   * Error logs - errors that need attention
   * Always shown (even in production)
   */
  error(...args: any[]): void {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] [${this.context}]`, ...args);
    }
  }

  /**
   * Create a child logger with a sub-context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('App');

/**
 * Create a logger for a specific context
 * Usage: const log = createLogger('LoginComponent');
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

/**
 * Quick logging functions (for backward compatibility during migration)
 * These will be removed once all console.log are replaced
 */
export const log = {
  debug: (...args: any[]) => logger.debug(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
};


