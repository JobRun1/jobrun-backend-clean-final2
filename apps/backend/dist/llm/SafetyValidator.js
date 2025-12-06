"use strict";
/**
 * SafetyValidator - Pre-validates prompts and post-validates outputs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyValidator = void 0;
class SafetyValidator {
    /**
     * Validate prompt before sending to LLM
     */
    validatePrompt(systemPrompt, userPrompt, context) {
        const issues = [];
        const warnings = [];
        // Check prompt length
        const totalLength = systemPrompt.length + userPrompt.length;
        if (totalLength > 100000) {
            issues.push('Combined prompt length exceeds safe limit (100k chars)');
        }
        else if (totalLength > 50000) {
            warnings.push('Prompt is very long, may incur high costs');
        }
        // Check for sensitive data exposure
        if (this.containsSensitiveData(systemPrompt + userPrompt)) {
            warnings.push('Prompt may contain sensitive data (SSN, credit card, etc.)');
        }
        // Check for injection attempts
        if (this.detectInjection(context.input.message || '')) {
            issues.push('Possible prompt injection detected in user input');
        }
        // Check for system prompts in user input
        if (context.input.message &&
            this.containsSystemInstructions(context.input.message)) {
            warnings.push('User input contains instruction-like content');
        }
        return {
            safe: issues.length === 0,
            issues,
            warnings,
        };
    }
    /**
     * Validate LLM output before parsing
     */
    validateOutput(llmOutput) {
        const issues = [];
        const warnings = [];
        // Check output length
        if (llmOutput.length > 50000) {
            issues.push('LLM output suspiciously long');
        }
        // Check for obvious errors
        if (llmOutput.toLowerCase().includes('error') && llmOutput.length < 100) {
            issues.push('LLM returned error message');
        }
        // Check for refusal patterns
        if (this.isRefusal(llmOutput)) {
            warnings.push('LLM may have refused the request');
        }
        // Check for incomplete JSON
        if (llmOutput.includes('{') && !llmOutput.includes('}')) {
            issues.push('Output contains incomplete JSON');
        }
        return {
            safe: issues.length === 0,
            issues,
            warnings,
        };
    }
    /**
     * Detect sensitive data patterns
     */
    containsSensitiveData(text) {
        // SSN pattern
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
            return true;
        }
        // Credit card pattern
        if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text)) {
            return true;
        }
        // API key patterns
        if (/\b(sk|pk)_[a-zA-Z0-9]{32,}\b/.test(text)) {
            return true;
        }
        return false;
    }
    /**
     * Detect prompt injection attempts
     */
    detectInjection(userInput) {
        const injectionPatterns = [
            /ignore\s+(previous|above|all)\s+instructions?/i,
            /disregard\s+.+\s+(instructions?|prompts?)/i,
            /you\s+are\s+now/i,
            /system\s*:/i,
            /new\s+instructions?:/i,
            /<\|.*?\|>/,
            /\[INST\]/i,
        ];
        return injectionPatterns.some((pattern) => pattern.test(userInput));
    }
    /**
     * Detect system instructions in user input
     */
    containsSystemInstructions(userInput) {
        const instructionKeywords = [
            'you must',
            'you should',
            'always respond',
            'never respond',
            'your role is',
            'act as',
            'pretend to be',
        ];
        const lowerInput = userInput.toLowerCase();
        return instructionKeywords.some((keyword) => lowerInput.includes(keyword));
    }
    /**
     * Detect refusal patterns
     */
    isRefusal(output) {
        const refusalPatterns = [
            /i cannot/i,
            /i'm unable to/i,
            /i can't/i,
            /not appropriate/i,
            /against my guidelines/i,
            /i apologize.*cannot/i,
        ];
        return refusalPatterns.some((pattern) => pattern.test(output));
    }
    /**
     * Sanitize user input before including in prompts
     */
    sanitizeUserInput(input) {
        // Remove potential injection markers
        let sanitized = input
            .replace(/<\|.*?\|>/g, '')
            .replace(/\[INST\]/gi, '')
            .replace(/\[\/INST\]/gi, '');
        // Escape special characters
        sanitized = sanitized
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
        return sanitized;
    }
}
exports.SafetyValidator = SafetyValidator;
//# sourceMappingURL=SafetyValidator.js.map