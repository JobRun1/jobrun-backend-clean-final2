import { BookingStatus } from "@prisma/client";
export interface OverlappingBooking {
    id: string;
    start: Date;
    end: Date;
    customerName?: string;
    status: BookingStatus;
}
export declare class OverlapEngine {
    static findOverlaps(clientId: string, start: Date, end: Date, excludeBookingId?: string): Promise<OverlappingBooking[]>;
    static hasOverlap(clientId: string, start: Date, end: Date, excludeBookingId?: string): Promise<boolean>;
}
//# sourceMappingURL=OverlapEngine.d.ts.map