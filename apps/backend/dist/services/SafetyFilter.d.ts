/**
 * SafetyFilter - Sensitive Content Detection
 * Detects harmful, illegal, or inappropriate content
 */
export type SafetyCheckType = 'self-harm' | 'abuse' | 'illegal' | 'medical' | 'sexual';
export interface SafetyCheckResult {
    safe: boolean;
    type?: SafetyCheckType;
}
export declare class SafetyFilter {
    /**
     * Check message for sensitive or harmful content
     */
    static check(message: string): SafetyCheckResult;
    /**
     * Detect self-harm indicators
     */
    private static isSelfHarm;
    /**
     * Detect abusive/threatening content
     */
    private static isAbusive;
    /**
     * Detect illegal activity requests
     */
    private static isIllegal;
    /**
     * Detect medical/diagnostic requests
     */
    private static isMedical;
    /**
     * Detect sexual content
     */
    private static isSexual;
    /**
     * Get standard deflection message for unsafe content
     */
    static getDeflectionMessage(type: SafetyCheckType): string;
}
//# sourceMappingURL=SafetyFilter.d.ts.map