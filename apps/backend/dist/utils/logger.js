"use strict";
/**
 * Simple logging utility for JobRun
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    getTimestamp() {
        return new Date().toISOString();
    }
    formatMessage(level, message, data) {
        const timestamp = this.getTimestamp();
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
    }
    info(message, data) {
        console.log(this.formatMessage('info', message, data));
    }
    warn(message, data) {
        console.warn(this.formatMessage('warn', message, data));
    }
    error(message, error) {
        if (error instanceof Error) {
            console.error(this.formatMessage('error', message), error);
        }
        else {
            console.error(this.formatMessage('error', message, error));
        }
    }
    debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.formatMessage('debug', message, data));
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map