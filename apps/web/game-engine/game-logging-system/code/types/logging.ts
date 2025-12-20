import type { GameEvent } from '@innkeeper/lib';

/**
 * Importance levels for game events
 * Used to determine which events should be permanently stored
 */
export type EventImportance = 'critical' | 'important' | 'normal' | 'verbose';

/**
 * Detailed log entry - contains full event context
 * Used for agent summarization and temporary analysis
 */
export interface DetailedLogEntry {
  event: GameEvent;
  importance: EventImportance;
  context: {
    turn?: number;
    roomId?: string;
    partyMembers?: string[];
    dungeonState?: {
      currentRoom?: string;
      discoveredRooms?: string[];
      objectivesComplete?: number;
      objectivesTotal?: number;
    };
  };
  metadata?: {
    agentId?: string;
    runId?: string;
    sessionId?: string;
  };
}

/**
 * Key event entry - filtered important events for permanent storage
 * Stored in database as game history
 */
export interface KeyEventEntry {
  id: string;
  eventId: string; // Reference to original event ID
  type: string; // Event type (combat, exploration, etc.)
  importance: EventImportance;
  actorId?: string;
  targetId?: string;
  summary: string; // Human-readable summary
  payload: Record<string, unknown>; // Full event payload
  timestamp: Date;
  runId?: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent activity summary
 * Generated from detailed logs for agent memory updates
 */
export interface AgentActivitySummary {
  agentId: string;
  startTime: Date;
  endTime: Date;
  summary: string; // Narrative summary of activity
  keyEvents: Array<{
    timestamp: Date;
    event: GameEvent;
    importance: EventImportance;
  }>;
  statistics: {
    totalEvents: number;
    combatActions: number;
    explorationActions: number;
    interactions: number;
    deaths: number;
    victories: number;
  };
}

/**
 * Log filter options for querying
 */
export interface LogFilterOptions {
  importance?: EventImportance[];
  eventTypes?: string[];
  actorId?: string;
  runId?: string;
  agentId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Detailed log buffer configuration
 */
export interface DetailedLogConfig {
  maxEntries?: number; // Maximum entries before oldest are removed
  ttl?: number; // Time-to-live in milliseconds
  enablePersistence?: boolean; // Whether to persist to temporary table
}







