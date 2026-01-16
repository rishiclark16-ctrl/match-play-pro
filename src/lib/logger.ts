import { captureException, captureMessage, addBreadcrumb } from './sentry';

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEBUG = import.meta.env.VITE_DEBUG === 'true';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Additional context data */
  data?: Record<string, unknown>;
  /** Send to Sentry in production */
  report?: boolean;
}

/**
 * Production-safe logger
 *
 * In development: Logs to console
 * In production: Silent unless reporting to Sentry
 *
 * Usage:
 *   logger.info('User signed in', { userId: '123' });
 *   logger.error('Failed to save', { error: err, report: true });
 */
class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (IS_DEBUG) return true;
    if (IS_PRODUCTION) return false;
    return true;
  }

  debug(message: string, options?: LogOptions) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, options?.data || '');
    }
    if (options?.data) {
      addBreadcrumb('debug', message, options.data);
    }
  }

  info(message: string, options?: LogOptions) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, options?.data || '');
    }
    if (options?.report && IS_PRODUCTION) {
      captureMessage(message, 'info');
    }
    if (options?.data) {
      addBreadcrumb('info', message, options.data);
    }
  }

  warn(message: string, options?: LogOptions) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, options?.data || '');
    }
    if (options?.report && IS_PRODUCTION) {
      captureMessage(message, 'warning');
    }
    addBreadcrumb('warning', message, options?.data);
  }

  error(message: string, error?: Error | unknown, options?: LogOptions) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, options?.data || '');
    }

    // Always report errors to Sentry in production (unless explicitly disabled)
    if (IS_PRODUCTION && options?.report !== false) {
      if (error instanceof Error) {
        captureException(error, { message, ...options?.data });
      } else {
        captureMessage(message, 'error');
      }
    }

    addBreadcrumb('error', message, {
      error: error instanceof Error ? error.message : String(error),
      ...options?.data
    });
  }

  /**
   * Log and track a user action
   */
  action(action: string, data?: Record<string, unknown>) {
    if (this.shouldLog('info')) {
      console.info(`[ACTION] ${action}`, data || '');
    }
    addBreadcrumb('user', action, data);
  }

  /**
   * Log API request/response
   */
  api(method: string, endpoint: string, status?: number, data?: Record<string, unknown>) {
    const message = `${method} ${endpoint} ${status || ''}`;
    if (this.shouldLog('debug')) {
      console.debug(`[API] ${message}`, data || '');
    }
    addBreadcrumb('http', message, { method, endpoint, status, ...data });
  }
}

export const logger = new Logger();

// Default export for convenience
export default logger;
