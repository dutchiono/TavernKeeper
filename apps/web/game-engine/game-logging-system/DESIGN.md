# Game Logging System - Design Overview

## Problem Statement

The game needs two different types of logging:

1. **Detailed logs for agents**: When players are away, agents need to know what their characters did. This requires comprehensive, detailed logs that can be summarized into narrative text for agent memory updates.

2. **Permanent game history**: The game needs to maintain a permanent record of important events that all players can access. However, storing every single event would create massive amounts of data, so we need to filter and store only meaningful events.

## Solution Design

### Two-Tier Architecture

#### Tier 1: Detailed Log (Temporary)
- **Purpose**: Capture everything that happens with full context
- **Storage**: In-memory buffer (optionally temporary database table)
- **Lifetime**: Ephemeral - cleared after agent summaries are generated
- **Use Case**: Generate narrative summaries for agents during idle time

#### Tier 2: Key Events Log (Permanent)
- **Purpose**: Store only important events permanently
- **Storage**: PostgreSQL database table
- **Lifetime**: Permanent (game history)
- **Use Case**: Query game history, show important events to players

### Event Importance Classification

Events are automatically classified into four importance levels:

- **Critical**: Deaths, victories, major discoveries, boss encounters
- **Important**: Significant combat, room transitions, successful major interactions
- **Normal**: Regular attacks, movement, routine interactions
- **Verbose**: Minor actions, heals, routine system messages

Only `critical` and `important` events are stored permanently by default (configurable).

### How It Works

1. **During Game Simulation**:
   - Every event is logged to the detailed log buffer with full context
   - Events are classified by importance
   - Important events are also persisted to the database

2. **During Idle Time**:
   - Agent summaries are generated from detailed logs
   - Summaries are narrative text describing what happened
   - Summaries update agent memory (episodic memory)

3. **For Game History**:
   - Players can query permanent key events
   - Events are filterable by importance, type, actor, time range, etc.
   - Provides a searchable history of significant game events

### Key Features

1. **Automatic Classification**: Events are automatically classified by importance based on their type and content
2. **Context Preservation**: Detailed logs include turn number, room context, party state, etc.
3. **Narrative Generation**: Automatic generation of human-readable summaries from event logs
4. **Efficient Storage**: Only important events stored permanently, reducing database size
5. **Flexible Querying**: Rich filtering options for both detailed and permanent logs

### Integration Points

- **Engine**: Log events as they're generated during simulation
- **Workers**: Persist key events and generate agent summaries after runs
- **API**: Endpoints for querying logs and generating summaries
- **Agents**: Use summaries to update memory during idle time

### Data Flow

```
Game Simulation
    ↓
Events Generated
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
Detailed Log      Key Event Filter   │
(Temporary)       (Importance Check) │
    │                  │             │
    │                  ↓             │
    │         Key Events Log         │
    │         (Permanent DB)          │
    │                                 │
    ↓                                 │
Agent Summary                         │
Generation                            │
    ↓                                 │
Agent Memory                          │
Update                                │
                                      │
Player History Queries ←──────────────┘
```

### Benefits

1. **For Agents**: Rich context for understanding what happened during idle time
2. **For Players**: Searchable history of important game events
3. **For System**: Efficient storage by filtering at the source
4. **For Development**: Easy to adjust importance thresholds and add new event types

### Future Enhancements

- Configurable importance thresholds per event type
- Custom importance rules for specific scenarios
- Compression for old detailed logs
- Analytics and insights from event patterns
- Real-time event streaming for live updates







