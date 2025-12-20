/**
 * Usage Examples for Game Logging System
 * 
 * These examples show how to integrate the logging system into the game engine
 * and how to use it for agent summaries and permanent event storage.
 */

import type { GameEvent, CombatEvent, ExplorationEvent } from '@innkeeper/lib';
import {
  initializeDetailedLog,
  logEvent,
  classifyEventImportance,
  shouldStorePermanently,
  createKeyEventEntry,
  getDetailedLogBuffer,
} from '../code/engine/logging';
import { LoggingService } from '../code/services/loggingService';

// ============================================================================
// Example 1: Initialize the logging system
// ============================================================================

export function exampleInitializeLogging() {
  // Initialize with custom configuration
  initializeDetailedLog({
    maxEntries: 5000, // Keep last 5000 events
    ttl: 48 * 60 * 60 * 1000, // 48 hours
    enablePersistence: false, // Don't persist to database (in-memory only)
  });
}

// ============================================================================
// Example 2: Log events during game simulation
// ============================================================================

export function exampleLogEventDuringSimulation() {
  // In your engine simulation, when an event occurs:
  const combatEvent: CombatEvent = {
    type: 'combat',
    id: `combat-${Date.now()}`,
    timestamp: Date.now(),
    actorId: 'player-1',
    targetId: 'goblin-1',
    action: 'attack',
    roll: 18,
    hit: true,
    damage: 15,
    critical: false,
  };

  // Log to detailed log with context
  logEvent(
    combatEvent,
    {
      turn: 5,
      roomId: 'room-1',
      partyMembers: ['player-1', 'player-2'],
      dungeonState: {
        currentRoom: 'room-1',
        discoveredRooms: ['room-1'],
        objectivesComplete: 0,
        objectivesTotal: 3,
      },
    },
    {
      agentId: 'agent-1',
      runId: 'run-123',
      sessionId: 'session-456',
    }
  );

  // Check if it should be stored permanently
  if (shouldStorePermanently(combatEvent, 'important')) {
    // Store in database (implement database integration)
    const keyEvent = createKeyEventEntry(combatEvent, 'important', 'run-123', 'agent-1');
    // await persistKeyEvent(keyEvent);
  }
}

// ============================================================================
// Example 3: Generate agent summary for idle time
// ============================================================================

export function exampleGenerateAgentSummary() {
  const loggingService = new LoggingService();

  // Generate summary for an agent's activity during idle time
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endTime = new Date();

  const summary = loggingService.generateAgentSummary('agent-1', startTime, endTime);

  console.log('Agent Summary:', summary.summary);
  console.log('Statistics:', summary.statistics);
  console.log('Key Events:', summary.keyEvents.length);

  // Use this summary to update agent memory
  // await updateAgentMemory('agent-1', {
  //   episodic: [{
  //     runId: null,
  //     summary: summary.summary,
  //     timestamp: endTime,
  //   }],
  // });
}

// ============================================================================
// Example 4: Query permanent key events
// ============================================================================

export async function exampleQueryKeyEvents() {
  const loggingService = new LoggingService();

  // Query important events from the last week
  const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endTime = new Date();

  try {
    const events = await loggingService.queryKeyEvents({
      importance: ['critical', 'important'],
      startTime,
      endTime,
      limit: 100,
    });

    console.log(`Found ${events.length} important events`);
    events.forEach((event) => {
      console.log(`[${event.importance}] ${event.summary} at ${event.timestamp}`);
    });
  } catch (error) {
    // Database integration not yet implemented
    console.log('Query would return key events from database');
  }
}

// ============================================================================
// Example 5: Integration in engine.ts
// ============================================================================

export function exampleEngineIntegration() {
  // In packages/engine/src/engine.ts, modify executeAction function:

  /*
  function executeAction(state: EngineState, action: Action): GameEvent[] {
    const events: GameEvent[] = [];
    
    // ... existing event generation code ...
    
    // After generating events, log them
    events.forEach((event) => {
      // Log to detailed log
      logEvent(
        event,
        {
          turn: state.currentTurn,
          roomId: actor.roomId,
          partyMembers: Array.from(state.entities.values())
            .filter((e) => e.isPlayer)
            .map((e) => e.id),
          dungeonState: state.dungeonState ? {
            currentRoom: actor.roomId,
            discoveredRooms: Array.from(state.dungeonState.discoveredRooms),
            objectivesComplete: state.dungeonState.map.objectives.filter(
              (obj) => areAllObjectivesComplete([obj], state.entities, state.events)
            ).length,
            objectivesTotal: state.dungeonState.map.objectives.length,
          } : undefined,
        },
        {
          runId: state.runId, // Add runId to EngineState
          agentId: actor.agentId, // Add agentId to Entity if applicable
        }
      );
    });
    
    return events;
  }
  */
}

// ============================================================================
// Example 6: Integration in runWorker.ts
// ============================================================================

export async function exampleWorkerIntegration() {
  // In apps/web/workers/runWorker.ts, after simulation:

  /*
  const result = await simulateRun(config);
  
  // Log all events to detailed log
  result.events.forEach((event) => {
    logEvent(event, {
      turn: event.turn, // Add turn to event if needed
      // ... other context
    }, {
      runId: runId,
      agentId: getAgentIdForEvent(event), // Helper function
    });
  });
  
  // Persist key events to database
  const loggingService = new LoggingService();
  for (const event of result.events) {
    if (shouldStorePermanently(event, 'important')) {
      await loggingService.persistKeyEvent(event, runId, getAgentIdForEvent(event));
    }
  }
  
  // Generate summaries for each agent
  const agentIds = getAgentIdsFromParty(party);
  for (const agentId of agentIds) {
    const summary = loggingService.generateAgentSummary(
      agentId,
      new Date(startTime),
      new Date()
    );
    // Update agent memory with summary
    await updateAgentMemory(agentId, summary);
  }
  */
}

// ============================================================================
// Example 7: API endpoint for agent summaries
// ============================================================================

export function exampleAPIEndpoint() {
  // In apps/web/app/api/logs/agent-summary/route.ts:

  /*
  import { NextRequest, NextResponse } from 'next/server';
  import { LoggingService } from '@innkeeper/engine/logging';
  
  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    
    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }
    
    const loggingService = new LoggingService();
    const summary = loggingService.generateAgentSummary(
      agentId,
      startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime ? new Date(endTime) : new Date()
    );
    
    return NextResponse.json(summary);
  }
  */
}

// ============================================================================
// Example 8: Query permanent game history
// ============================================================================

export function exampleHistoryAPI() {
  // In apps/web/app/api/logs/key-events/route.ts:

  /*
  import { NextRequest, NextResponse } from 'next/server';
  import { LoggingService } from '@innkeeper/engine/logging';
  
  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    
    const options = {
      importance: searchParams.get('importance')?.split(',') as EventImportance[],
      eventTypes: searchParams.get('types')?.split(','),
      actorId: searchParams.get('actorId') || undefined,
      runId: searchParams.get('runId') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      startTime: searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined,
      endTime: searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };
    
    const loggingService = new LoggingService();
    const events = await loggingService.queryKeyEvents(options);
    
    return NextResponse.json({
      events,
      count: events.length,
    });
  }
  */
}

