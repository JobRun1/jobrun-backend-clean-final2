"use strict";
/**
 * SafetyFilter - Sensitive Content Detection
 * Detects harmful, illegal, or inappropriate content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyFilter = void 0;
class SafetyFilter {
    /**
     * Check message for sensitive or harmful content
     */
    static check(message) {
        const normalized = message.toLowerCase().trim();
        // Self-harm detection
        if (this.isSelfHarm(normalized)) {
            return { safe: false, type: 'self-harm' };
        }
        // Abuse/threats detection
        if (this.isAbusive(normalized)) {
            return { safe: false, type: 'abuse' };
        }
        // Illegal activity detection
        if (this.isIllegal(normalized)) {
            return { safe: false, type: 'illegal' };
        }
        // Medical/diagnostic requests
        if (this.isMedical(normalized)) {
            return { safe: false, type: 'medical' };
        }
        // Sexual content detection
        if (this.isSexual(normalized)) {
            return { safe: false, type: 'sexual' };
        }
        return { safe: true };
    }
    /**
     * Detect self-harm indicators
     */
    static isSelfHarm(message) {
        const selfHarmPatterns = [
            'kill myself',
            'end my life',
            'want to die',
            'suicide',
            'suicidal',
            'hurt myself',
            'self harm',
            'cutting myself',
            'end it all',
            "don't want to live",
            'better off dead',
        ];
        return selfHarmPatterns.some((pattern) => message.includes(pattern));
    }
    /**
     * Detect abusive/threatening content
     */
    static isAbusive(message) {
        const abusePatterns = [
            'kill you',
            'hurt you',
            'bomb',
            'shoot',
            'murder',
            'attack you',
            'find you',
            'get you',
            'destroy you',
        ];
        // Check for extreme aggression (multiple threats/aggressive words)
        const aggressiveWords = ['fuck', 'fucking', 'shit', 'bitch', 'damn', 'asshole'];
        const aggressionCount = aggressiveWords.filter((word) => message.includes(word)).length;
        if (aggressionCount >= 3) {
            return true;
        }
        return abusePatterns.some((pattern) => message.includes(pattern));
    }
    /**
     * Detect illegal activity requests
     */
    static isIllegal(message) {
        const illegalPatterns = [
            'buy drugs',
            'sell drugs',
            'cocaine',
            'heroin',
            'meth',
            'weapons',
            'illegal',
            'stolen',
            'fake id',
            'counterfeit',
        ];
        return illegalPatterns.some((pattern) => message.includes(pattern));
    }
    /**
     * Detect medical/diagnostic requests
     */
    static isMedical(message) {
        const medicalPatterns = [
            'diagnose',
            'what do i have',
            'medical advice',
            'prescription',
            'medicine for',
            'treatment for',
            'cure for',
            'symptoms of',
        ];
        return medicalPatterns.some((pattern) => message.includes(pattern));
    }
    /**
     * Detect sexual content
     */
    static isSexual(message) {
        const sexualPatterns = [
            'sex',
            'sexual',
            'porn',
            'naked',
            'nude',
            'erotic',
            'escort',
            'prostitute',
        ];
        return sexualPatterns.some((pattern) => message.includes(pattern));
    }
    /**
     * Get standard deflection message for unsafe content
     */
    static getDeflectionMessage(type) {
        switch (type) {
            case 'self-harm':
                return "I'm really sorry you're feeling this way — I'm not able to help. Please contact local emergency services or someone you trust.";
            case 'abuse':
                return 'I can help with appointments — what date works best?';
            case 'illegal':
                return 'I can only help with scheduling appointments.';
            case 'medical':
                return 'I can only help with scheduling appointments.';
            case 'sexual':
                return "I'm here to assist with scheduling only.";
            default:
                return 'I can only help with scheduling appointments.';
        }
    }
}
exports.SafetyFilter = SafetyFilter;
//# sourceMappingURL=SafetyFilter.js.map