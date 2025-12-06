/**
 * AgentEngine - Core engine for executing individual agents with LLM
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput, AgentExecutionResult } from '../base/types';
import { LLMClient } from '../../llm/LLMClient';
import { PromptBuilder } from '../../llm/PromptBuilder';
import { OutputParser } from '../../llm/OutputParser';
import { SafetyValidator } from '../../llm/SafetyValidator';
import { ModelRouter } from '../../llm/ModelRouter';

export class AgentEngine {
  private llmClient: LLMClient;
  private promptBuilder: PromptBuilder;
  private outputParser: OutputParser;
  private safetyValidator: SafetyValidator;
  private modelRouter: ModelRouter;

  constructor() {
    this.llmClient = new LLMClient();
    this.promptBuilder = new PromptBuilder();
    this.outputParser = new OutputParser();
    this.safetyValidator = new SafetyValidator();
    this.modelRouter = new ModelRouter();
  }

  /**
   * Execute an agent with LLM
   */
  async executeAgent(
    agent: BaseAgent,
    context: AgentContext
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // Build prompts
      const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt(
        agent.getName(),
        context
      );

      // Validate prompts
      const promptSafety = this.safetyValidator.validatePrompt(
        systemPrompt,
        userPrompt,
        context
      );

      if (!promptSafety.safe) {
        throw new Error(`Prompt safety check failed: ${promptSafety.issues.join(', ')}`);
      }

      // Get model for this agent
      const config = agent.getConfig();
      const model = config.llmConfig.model;

      // Call LLM
      const llmResponse = await this.llmClient.generate({
        model,
        systemPrompt,
        userPrompt,
        temperature: config.llmConfig.temperature,
        maxTokens: config.llmConfig.maxTokens,
        jsonMode: true,
      });

      // Validate output
      const outputSafety = this.safetyValidator.validateOutput(llmResponse.content);
      if (!outputSafety.safe) {
        throw new Error(`Output safety check failed: ${outputSafety.issues.join(', ')}`);
      }

      // Parse output
      const output = this.outputParser.parseWithRetry(llmResponse.content);

      // Validate output structure
      this.validateAgentOutput(output);

      // Return successful result
      const executionTimeMs = Date.now() - startTime;
      return {
        agentName: agent.getName(),
        success: true,
        output,
        executionTimeMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      return {
        agentName: agent.getName(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate agent output meets minimum requirements
   */
  private validateAgentOutput(output: AgentOutput): void {
    if (!output.actions || !Array.isArray(output.actions)) {
      throw new Error('Agent output must include actions array');
    }

    if (typeof output.summary !== 'string') {
      throw new Error('Agent output must include summary string');
    }

    if (
      typeof output.confidence !== 'number' ||
      output.confidence < 0 ||
      output.confidence > 1
    ) {
      throw new Error('Agent output confidence must be between 0 and 1');
    }

    if (typeof output.followUpNeeded !== 'boolean') {
      throw new Error('Agent output must include followUpNeeded boolean');
    }

    // Validate each action
    output.actions.forEach((action, index) => {
      if (!action.type) {
        throw new Error(`Action ${index} missing type`);
      }
      if (!action.payload || typeof action.payload !== 'object') {
        throw new Error(`Action ${index} missing or invalid payload`);
      }
    });
  }
}
