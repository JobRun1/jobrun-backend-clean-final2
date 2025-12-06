/**
 * Core type definitions for the JobRun Agent System
 * Phase 3: AI Agent Intelligence Layer
 */

export type AgentTier = 'CORE' | 'AUTOMATION' | 'ELITE' | 'ADMIN';

export type AgentTriggerType =
  | 'INBOUND_SMS'
  | 'INBOUND_CALL'
  | 'BOOKING_REQUEST'
  | 'CONVERSATION_CLOSE'
  | 'NEW_CUSTOMER'
  | 'SETTINGS_CHANGED'
  | 'WEEKLY_CRON'
  | 'DAILY_CRON'
  | 'CALENDAR_CONFLICT'
  | 'NO_REPLY_TIMEOUT'
  | 'JOB_COMPLETED'
  | 'OVERDUE_PAYMENT'
  | 'ADMIN_ACTIVATION'
  | 'SYSTEM_ERROR'
  | 'MONTHLY_CRON'
  | 'PATTERN_DETECTED';

export type AgentActionType =
  | 'SEND_MESSAGE'
  | 'CREATE_BOOKING'
  | 'UPDATE_BOOKING'
  | 'CANCEL_BOOKING'
  | 'SUGGEST_SLOTS'
  | 'ASK_FOR_DETAILS'
  | 'UPDATE_CUSTOMER'
  | 'CREATE_LEAD'
  | 'UPDATE_LEAD'
  | 'LOG_INSIGHT'
  | 'SEND_NOTIFICATION'
  | 'CREATE_TASK'
  | 'REQUEST_REVIEW'
  | 'SEND_PAYMENT_REMINDER'
  | 'GENERATE_REPORT'
  | 'UPDATE_SETTINGS'
  | 'CREATE_DEMO_DATA'
  | 'NO_ACTION';

export interface AgentAction {
  type: AgentActionType;
  payload: Record<string, any>;
}

export interface AgentOutput {
  actions: AgentAction[];
  summary: string;
  confidence: number; // 0-1
  followUpNeeded: boolean;
  reasoning?: string; // Optional for debugging
}

export interface AgentContext {
  clientId: string;
  customerId?: string;
  conversationId?: string;
  bookingId?: string;
  trigger: AgentTriggerType;
  input: {
    message?: string;
    metadata?: Record<string, any>;
  };
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  clientSettings?: {
    businessName: string;
    services: string;
    availability: string;
    pricing: string;
    [key: string]: any;
  };
  customerData?: {
    name?: string;
    phone: string;
    email?: string;
    tags?: string[];
    previousBookings?: number;
    totalSpent?: number;
    [key: string]: any;
  };
}

export interface AgentConfig {
  name: string;
  tier: AgentTier;
  triggers: AgentTriggerType[];
  priority: number; // 1-100, higher = more important
  enabled: boolean;
  rateLimits?: {
    maxExecutionsPerHour?: number;
    maxExecutionsPerDay?: number;
    cooldownMinutes?: number;
  };
  confidenceThreshold: number; // Minimum confidence to execute actions
  llmConfig: {
    model: 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
    temperature: number;
    maxTokens: number;
  };
}

export interface AgentExecutionResult {
  agentName: string;
  success: boolean;
  output?: AgentOutput;
  error?: string;
  executionTimeMs: number;
  timestamp: Date;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
}

export interface SafetyCheckResult {
  safe: boolean;
  violations: string[];
  warnings: string[];
}

export interface AgentLogEntry {
  id: string;
  agentName: string;
  clientId: string;
  customerId?: string | null;
  conversationId?: string | null;
  trigger: string;
  input: any;
  output?: any;
  error?: string | null;
  executionTimeMs: number;
  createdAt: Date;
}
