import type {
  AgentActivitySummary,
  KeyEventEntry,
  LogFilterOptions,
  DetailedLogEntry,
} from '../types/logging';
import type { GameEvent } from '@innkeeper/lib';
import {
  getDetailedLogBuffer,
  createKeyEventEntry,
  classifyEventImportance,
} from '../engine/logging';

/**
 * Service for querying logs and generating summaries
 * Integrates with database for permanent logs
 */
export class LoggingService {
  /**
   * Generate an activity summary for an agent from detailed logs
   * Used to update agent memory with what happened during idle time
   */
  generateAgentSummary(
    agentId: string,
    startTime: Date,
    endTime: Date
  ): AgentActivitySummary {
    const buffer = getDetailedLogBuffer();
    const agentEntries = buffer
      .getAgentEntries(agentId)
      .filter(
        (entry) =>
          entry.event.timestamp >= startTime.getTime() &&
          entry.event.timestamp <= endTime.getTime()
      );

    // Generate narrative summary
    const summary = this.generateNarrativeSummary(agentEntries);

    // Extract key events
    const keyEvents = agentEntries
      .filter((entry) => entry.importance === 'critical' || entry.importance === 'important')
      .map((entry) => ({
        timestamp: new Date(entry.event.timestamp),
        event: entry.event,
        importance: entry.importance,
      }));

    // Calculate statistics
    const stats = this.calculateStatistics(agentEntries);

    return {
      agentId,
      startTime,
      endTime,
      summary,
      keyEvents,
      statistics: stats,
    };
  }

  /**
   * Generate a narrative summary from log entries
   */
  private generateNarrativeSummary(entries: DetailedLogEntry[]): string {
    if (entries.length === 0) {
      return 'No activity during this period.';
    }

    const events = entries.map((e) => e.event);
    const combatEvents = events.filter((e) => e.type === 'combat');
    const explorationEvents = events.filter((e) => e.type === 'exploration');
    const interactionEvents = events.filter((e) => e.type === 'interaction');

    const parts: string[] = [];

    // Combat summary
    if (combatEvents.length > 0) {
      const deaths = combatEvents.filter(
        (e) => (e as any).action === 'death'
      ).length;
      const attacks = combatEvents.filter(
        (e) => (e as any).action === 'attack'
      ).length;
      if (deaths > 0) {
        parts.push(`Engaged in ${attacks} combat encounters, with ${deaths} defeat${deaths > 1 ? 's' : ''}.`);
      } else if (attacks > 0) {
        parts.push(`Participated in ${attacks} combat encounter${attacks > 1 ? 's' : ''}.`);
      }
    }

    // Exploration summary
    if (explorationEvents.length > 0) {
      const discoveries = explorationEvents.filter(
        (e) => (e as any).action === 'discover'
      ).length;
      const roomTransitions = explorationEvents.filter(
        (e) => (e as any).action === 'enter_room'
      ).length;
      if (discoveries > 0) {
        parts.push(`Discovered ${discoveries} new area${discoveries > 1 ? 's' : ''}.`);
      }
      if (roomTransitions > 0) {
        parts.push(`Explored ${roomTransitions} room${roomTransitions > 1 ? 's' : ''}.`);
      }
    }

    // Interaction summary
    if (interactionEvents.length > 0) {
      const successful = interactionEvents.filter((e) => (e as any).success).length;
      if (successful > 0) {
        parts.push(`Successfully interacted with ${successful} object${successful > 1 ? 's' : ''}.`);
      }
    }

    if (parts.length === 0) {
      return 'Moved around and explored the area.';
    }

    return parts.join(' ');
  }

  /**
   * Calculate statistics from log entries
   */
  private calculateStatistics(entries: DetailedLogEntry[]): AgentActivitySummary['statistics'] {
    const events = entries.map((e) => e.event);
    return {
      totalEvents: events.length,
      combatActions: events.filter((e) => e.type === 'combat').length,
      explorationActions: events.filter((e) => e.type === 'exploration').length,
      interactions: events.filter((e) => e.type === 'interaction').length,
      deaths: events.filter(
        (e) => e.type === 'combat' && (e as any).action === 'death'
      ).length,
      victories: events.filter(
        (e) => e.type === 'system' && (e as any).message?.includes('victory')
      ).length,
    };
  }

  /**
   * Query key events from database
   * This would integrate with Supabase in the actual implementation
   */
  async queryKeyEvents(
    options: LogFilterOptions
  ): Promise<KeyEventEntry[]> {
    // TODO: Implement database query
    // This is a placeholder that shows the expected interface
    // In actual implementation, this would query the key_events table
    throw new Error('Database integration not yet implemented');
  }

  /**
   * Persist a key event to the database
   */
  async persistKeyEvent(
    event: GameEvent,
    runId?: string,
    agentId?: string
  ): Promise<void> {
    const importance = classifyEventImportance(event);
    if (importance === 'critical' || importance === 'important') {
      const keyEvent = createKeyEventEntry(event, importance, runId, agentId);
      // TODO: Insert into database
      // await supabase.from('key_events').insert(keyEvent);
    }
  }

  /**
   * Get all detailed log entries for a time range
   */
  getDetailedLogs(startTime: Date, endTime: Date): DetailedLogEntry[] {
    const buffer = getDetailedLogBuffer();
    return buffer.getEntriesInRange(startTime, endTime);
  }
}

