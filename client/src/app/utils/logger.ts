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
   * Disabled to prevent connection leaks
   */
  debug(...args: any[]): void {
    // No-op: Console logging disabled to prevent connection leaks
  }

  /**
   * Info logs - general information
   * Disabled to prevent connection leaks
   */
  info(...args: any[]): void {
    // No-op: Console logging disabled to prevent connection leaks
  }

  /**
   * Warning logs - potential issues
   * Disabled to prevent connection leaks
   */
  warn(...args: any[]): void {
    // No-op: Console logging disabled to prevent connection leaks
  }

  /**
   * Error logs - errors that need attention
   * Disabled to prevent connection leaks
   */
  error(...args: any[]): void {
    // No-op: Console logging disabled to prevent connection leaks
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




