export interface BlockedRange {
    id: string;
    date: Date;
    start?: string;
    end?: string;
    reason?: string;
    isAllDay: boolean;
}
export declare class BlockedTimeEngine {
    static isBlocked(clientId: string, date: Date, startTime?: string, endTime?: string): Promise<{
        blocked: boolean;
        reason?: string;
    }>;
    static findBlockedRanges(clientId: string, startDate: Date, endDate: Date): Promise<BlockedRange[]>;
    static createBlockedTime(clientId: string, date: Date, start?: string, end?: string, reason?: string): Promise<{
        end: string | null;
        id: string;
        clientId: string;
        reason: string | null;
        start: string | null;
        date: Date;
    }>;
    static deleteBlockedTime(id: string): Promise<{
        end: string | null;
        id: string;
        clientId: string;
        reason: string | null;
        start: string | null;
        date: Date;
    }>;
    static getAllBlockedTimes(clientId: string): Promise<{
        end: string | null;
        id: string;
        clientId: string;
        reason: string | null;
        start: string | null;
        date: Date;
    }[]>;
    private static timeToMinutes;
}
//# sourceMappingURL=BlockedTimeEngine.d.ts.map