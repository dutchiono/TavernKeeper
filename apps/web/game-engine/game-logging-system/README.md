# Game Logging System

## What This Does

This contribution implements a two-tier logging system for game events:

1. **Detailed Log (Temporary)**: A comprehensive, in-memory log that captures all events with full context. This log is used by agents to generate summaries of character activity during idle time between player sessions. It is not permanently stored.

2. **Key Events Log (Permanent)**: A filtered, permanent log that stores only important events in the database. This serves as the permanent history of the game for all players, with events categorized by importance to manage data volume.

## Where It Should Be Integrated

### Type Definitions
- `packages/lib/src/types/logging.ts` - New file with log types and interfaces
- `packages/lib/src/index.ts` - Export new types

### Logging Utilities
- `packages/engine/src/logging.ts` - New file with logging utilities
- `packages/engine/src/index.ts` - Export logging functions

### Database Schema
- `supabase/migrations/YYYYMMDDHHMMSS_game_logging.sql` - New migration for permanent key events table

### Integration Points
- `packages/engine/src/engine.ts` - Integrate logging into event generation
- `apps/web/workers/runWorker.ts` - Store detailed logs during runs, persist key events
- `apps/web/lib/services/loggingService.ts` - New service for querying logs and generating agent summaries

### API Endpoints (Optional)
- `apps/web/app/api/logs/agent-summary/route.ts` - Endpoint to get agent activity summaries
- `apps/web/app/api/logs/key-events/route.ts` - Endpoint to query permanent game history

## How to Test

### Unit Tests
1. Test log importance classification
2. Test detailed log buffer management
3. Test key event filtering
4. Test agent summary generation

### Integration Tests
1. Run a simulation and verify detailed logs are captured
2. Verify key events are persisted to database
3. Test agent summary generation from detailed logs
4. Test querying permanent logs by various filters

### Manual Testing
1. Start a run and observe events being logged
2. Check that detailed logs are available in memory
3. Verify key events appear in database
4. Generate an agent summary from detailed logs
5. Query permanent logs with different importance filters

## Dependencies

- No new npm packages required
- Uses existing database connection (Supabase)
- Integrates with existing event system (`@innkeeper/lib`)

## Breaking Changes

None - this is an additive feature that doesn't modify existing functionality. The existing `run_logs` and `world_events` tables remain unchanged.

## Design Decisions

1. **Importance Levels**: Events are classified as `critical`, `important`, `normal`, or `verbose` to differentiate key events from routine activity.

2. **Detailed Log Storage**: Detailed logs are stored in-memory during runs and can optionally be stored in a temporary table with TTL (time-to-live) for agent summarization.

3. **Key Event Filtering**: Only events with `critical` or `important` importance are stored permanently by default, with configurable thresholds.

4. **Agent Summaries**: Detailed logs are processed to generate narrative summaries of character activity, which agents can use to update their memory.

5. **Backward Compatibility**: Existing event system continues to work; logging is an additional layer that enhances the system.

## Code Structure

```
game-engine/game-logging-system/
├── README.md (this file)
├── code/
│   ├── types/
│   │   └── logging.ts              # Log types and interfaces
│   ├── engine/
│   │   └── logging.ts               # Logging utilities for engine
│   ├── services/
│   │   └── loggingService.ts        # Service for querying and summarizing
│   └── database/
│       └── migration.sql            # Database schema for key events
└── examples/
    └── usage-examples.ts            # Code examples showing integration
```

## Integration Example

```typescript
// In engine.ts, when generating events:
import { logEvent, classifyEventImportance } from './logging';

const event: CombatEvent = {
  type: 'combat',
  id: `combat-${Date.now()}`,
  timestamp: Date.now(),
  actorId: actor.id,
  targetId: target.id,
  action: 'attack',
  damage: result.damage,
};

// Log to detailed log (temporary)
logEvent(event, 'detailed');

// If important, also log to permanent log
const importance = classifyEventImportance(event);
if (importance === 'critical' || importance === 'important') {
  await persistKeyEvent(event, importance);
}
```

## Notes

- The detailed log is designed to be ephemeral and can be cleared after agent summaries are generated
- Key events are stored permanently and should be indexed for efficient querying
- Agent summaries can be generated on-demand or periodically via a background job
- The system is designed to scale by filtering events at the source rather than storing everything







