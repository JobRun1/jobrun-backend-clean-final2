/**
 * Simple logging utility for JobRun
 */
interface LogData {
    [key: string]: any;
}
declare class Logger {
    private getTimestamp;
    private formatMessage;
    info(message: string, data?: LogData): void;
    warn(message: string, data?: LogData): void;
    error(message: string, error?: Error | LogData): void;
    debug(message: string, data?: LogData): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map