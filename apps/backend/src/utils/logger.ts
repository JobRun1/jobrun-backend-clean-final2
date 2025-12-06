/**
 * Simple logging utility for JobRun
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  [key: string]: any;
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = this.getTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  info(message: string, data?: LogData): void {
    console.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: LogData): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, error?: Error | LogData): void {
    if (error instanceof Error) {
      console.error(this.formatMessage('error', message), error);
    } else {
      console.error(this.formatMessage('error', message, error));
    }
  }

  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();
