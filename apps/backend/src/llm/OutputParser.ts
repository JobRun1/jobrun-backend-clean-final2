/**
 * OutputParser - Validates and parses LLM outputs into structured AgentOutput
 */

import type { AgentOutput } from '../agents/base/types';

export class OutputParser {
  /**
   * Parse LLM response into AgentOutput
   */
  parse(llmResponse: string): AgentOutput {
    try {
      // Try to extract JSON from response
      const json = this.extractJSON(llmResponse);

      // Parse JSON
      const parsed = JSON.parse(json);

      // Validate structure
      this.validateOutput(parsed);

      return parsed as AgentOutput;
    } catch (error) {
      console.error('Failed to parse LLM output:', error);
      console.error('Raw response:', llmResponse);

      // Return fallback low-confidence output
      return {
        actions: [
          {
            type: 'ASK_FOR_DETAILS',
            payload: {
              message:
                "I'm having trouble understanding. Could you please rephrase that?",
            },
          },
        ],
        summary: 'Failed to parse LLM response',
        confidence: 0.3,
        followUpNeeded: true,
      };
    }
  }

  /**
   * Extract JSON from LLM response (handles markdown code blocks, etc.)
   */
  private extractJSON(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // If no match, try the whole cleaned string
    return cleaned.trim();
  }

  /**
   * Validate output structure
   */
  private validateOutput(output: any): void {
    if (!output || typeof output !== 'object') {
      throw new Error('Output must be an object');
    }

    if (!Array.isArray(output.actions)) {
      throw new Error('Output must have actions array');
    }

    if (typeof output.summary !== 'string') {
      throw new Error('Output must have summary string');
    }

    if (
      typeof output.confidence !== 'number' ||
      output.confidence < 0 ||
      output.confidence > 1
    ) {
      throw new Error('Output must have confidence between 0 and 1');
    }

    if (typeof output.followUpNeeded !== 'boolean') {
      throw new Error('Output must have followUpNeeded boolean');
    }

    // Validate each action
    output.actions.forEach((action: any, index: number) => {
      if (!action.type || typeof action.type !== 'string') {
        throw new Error(`Action ${index} must have type string`);
      }

      if (!action.payload || typeof action.payload !== 'object') {
        throw new Error(`Action ${index} must have payload object`);
      }
    });
  }

  /**
   * Parse with retry - attempts multiple parsing strategies
   */
  parseWithRetry(llmResponse: string, maxAttempts: number = 3): AgentOutput {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return this.parse(llmResponse);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Parse attempt ${attempt} failed:`, error);

        // Try cleaning the response differently
        if (attempt < maxAttempts) {
          llmResponse = this.cleanResponse(llmResponse, attempt);
        }
      }
    }

    console.error('All parse attempts failed:', lastError);

    // Return safe fallback
    return {
      actions: [
        {
          type: 'ASK_FOR_DETAILS',
          payload: {
            message: "I'm having trouble processing that. Could you try again?",
          },
        },
      ],
      summary: 'Parse failure after all attempts',
      confidence: 0.2,
      followUpNeeded: true,
    };
  }

  /**
   * Clean response with different strategies based on attempt number
   */
  private cleanResponse(response: string, attempt: number): string {
    switch (attempt) {
      case 1:
        // Remove all whitespace outside JSON
        return response.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      case 2:
        // Try to fix common JSON errors
        return response
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/'/g, '"') // Replace single quotes with double
          .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
      default:
        return response;
    }
  }
}
