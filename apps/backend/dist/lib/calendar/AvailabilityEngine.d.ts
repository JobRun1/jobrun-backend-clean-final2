export interface AvailabilityRange {
    weekday: number;
    startTime: string;
    endTime: string;
}
export declare class AvailabilityEngine {
    static getAvailableRanges(clientId: string, weekday: number): Promise<AvailabilityRange[]>;
    static isTimeAllowed(clientId: string, date: Date, startTime: string, endTime: string): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    static hasAvailability(clientId: string, weekday: number): Promise<boolean>;
    private static timeToMinutes;
    static formatTime(date: Date): string;
    static createAvailability(clientId: string, weekday: number, startTime: string, endTime: string): Promise<{
        id: string;
        clientId: string;
        startTime: string;
        endTime: string;
        weekday: number;
    }>;
    static deleteAvailability(id: string): Promise<{
        id: string;
        clientId: string;
        startTime: string;
        endTime: string;
        weekday: number;
    }>;
    static getAllAvailability(clientId: string): Promise<{
        id: string;
        clientId: string;
        startTime: string;
        endTime: string;
        weekday: number;
    }[]>;
}
//# sourceMappingURL=AvailabilityEngine.d.ts.map