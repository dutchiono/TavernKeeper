import { supabase } from '@/lib/supabase';
import { 
  validateAction, 
  executeAction,
  getAvailableActions,
  getRoomDetails,
  getConnectedRooms,
  getEntitiesInRoom
} from '@innkeeper/engine';
import type { Action, Entity, GameEvent, DungeonMap } from '@innkeeper/lib';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { action, runId } = body as { action: Action; runId?: string };

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    if (!runId) {
      return NextResponse.json(
        { error: 'runId is required to execute action' },
        { status: 400 }
      );
    }

    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Ensure action is for this agent
    if (action.actorId !== id) {
      return NextResponse.json(
        { error: 'Action actorId must match agent id' },
        { status: 400 }
      );
    }

    // Load run
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*, dungeon:dungeons(*)')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Check run is active
    if (run.status === 'completed' || run.status === 'failed') {
      return NextResponse.json(
        { error: 'Run is not active', status: run.status },
        { status: 400 }
      );
    }

    // Load current game state from run_state table
    const { data: stateData, error: stateError } = await supabase
      .from('run_state')
      .select('*')
      .eq('run_id', runId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (stateError || !stateData) {
      return NextResponse.json(
        { error: 'Game state not found. Run may not be initialized.' },
        { status: 404 }
      );
    }

    // Parse game state
    const gameState = stateData.state as {
      entities: Map<string, Entity>;
      map: DungeonMap;
      currentTurn: number;
      events: GameEvent[];
      objectives: any[];
    };

    // Convert entities from object to Map if needed
    const entitiesMap = gameState.entities instanceof Map 
      ? gameState.entities 
      : new Map(Object.entries(gameState.entities || {}));

    // Get the agent entity
    const agentEntity = entitiesMap.get(id);
    if (!agentEntity) {
      return NextResponse.json(
        { error: 'Agent entity not found in game state' },
        { status: 404 }
      );
    }

    // Validate action against current state
    const validation = validateAction(action, entitiesMap);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Execute the action
    const executionResult = executeAction(
      action,
      entitiesMap,
      gameState.map,
      gameState.currentTurn
    );

    // Update game state
    gameState.entities = entitiesMap;
    gameState.events = [...(gameState.events || []), ...executionResult.events].slice(-100); // Keep last 100 events
    gameState.currentTurn = gameState.currentTurn + 1;

    // Persist updated state
    const { error: updateError } = await supabase
      .from('run_state')
      .upsert({
        run_id: runId,
        state: gameState,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error('Failed to update game state:', updateError);
      return NextResponse.json(
        { error: 'Failed to persist game state' },
        { status: 500 }
      );
    }

    // Log the action to run_logs
    await supabase.from('run_logs').insert({
      run_id: runId,
      event_type: 'action',
      actor_id: id,
      json: {
        action,
        events: executionResult.events,
        turn: gameState.currentTurn,
      },
      timestamp: new Date().toISOString(),
    });

    // Build comprehensive context for agent response
    const currentRoom = agentEntity.roomId 
      ? getRoomDetails(agentEntity.roomId, gameState.map, agentEntity.position?.z)
      : null;

    const entitiesInRoom = agentEntity.roomId
      ? getEntitiesInRoom(agentEntity.roomId, entitiesMap, agentEntity.position?.z)
      : [];

    const connectedRooms = currentRoom
      ? getConnectedRooms(currentRoom.id, gameState.map, agentEntity.position?.z)
      : [];

    const availableActions = getAvailableActions(
      agentEntity,
      gameState.map,
      entitiesMap,
      agentEntity.position?.z
    );

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      events: executionResult.events,
      turn: gameState.currentTurn,
      context: {
        // Agent state
        agent: {
          id: agentEntity.id,
          name: agentEntity.name,
          hp: agentEntity.hp,
          maxHp: agentEntity.maxHp,
          position: agentEntity.position,
          roomId: agentEntity.roomId,
          inventory: agentEntity.inventory || [],
          stats: agentEntity.stats,
        },
        // Current room
        currentRoom: currentRoom ? {
          id: currentRoom.id,
          name: currentRoom.name,
          description: currentRoom.description,
          type: currentRoom.type,
          connections: currentRoom.connections,
          isExplored: currentRoom.isExplored,
        } : null,
        // Entities in same room
        nearbyEntities: entitiesInRoom
          .filter(e => e.id !== id)
          .map(e => ({
            id: e.id,
            name: e.name,
            type: e.isPlayer ? 'player' : 'enemy',
            hp: e.hp,
            maxHp: e.maxHp,
            position: e.position,
          })),
        // Connected rooms
        connectedRooms: connectedRooms.map(room => ({
          id: room.id,
          name: room.name,
          type: room.type,
          isExplored: room.isExplored,
        })),
        // Available actions
        availableActions,
        // Objectives
        objectives: gameState.objectives || [],
        // Recent events (last 5)
        recentEvents: gameState.events?.slice(-5) || [],
      },
    });
  } catch (error) {
    console.error('Error in agent action endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve current game context without taking an action
 * Useful for agents to observe state before deciding on an action
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json(
      { error: 'runId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Load current game state
    const { data: stateData, error: stateError } = await supabase
      .from('run_state')
      .select('*')
      .eq('run_id', runId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (stateError || !stateData) {
      return NextResponse.json(
        { error: 'Game state not found' },
        { status: 404 }
      );
    }

    const gameState = stateData.state as {
      entities: Map<string, Entity>;
      map: DungeonMap;
      currentTurn: number;
      events: GameEvent[];
      objectives: any[];
    };

    const entitiesMap = gameState.entities instanceof Map 
      ? gameState.entities 
      : new Map(Object.entries(gameState.entities || {}));

    const agentEntity = entitiesMap.get(id);
    if (!agentEntity) {
      return NextResponse.json(
        { error: 'Agent entity not found in game state' },
        { status: 404 }
      );
    }

    // Build context (same as POST response)
    const currentRoom = agentEntity.roomId 
      ? getRoomDetails(agentEntity.roomId, gameState.map, agentEntity.position?.z)
      : null;

    const entitiesInRoom = agentEntity.roomId
      ? getEntitiesInRoom(agentEntity.roomId, entitiesMap, agentEntity.position?.z)
      : [];

    const connectedRooms = currentRoom
      ? getConnectedRooms(currentRoom.id, gameState.map, agentEntity.position?.z)
      : [];

    const availableActions = getAvailableActions(
      agentEntity,
      gameState.map,
      entitiesMap,
      agentEntity.position?.z
    );

    return NextResponse.json({
      turn: gameState.currentTurn,
      context: {
        agent: {
          id: agentEntity.id,
          name: agentEntity.name,
          hp: agentEntity.hp,
          maxHp: agentEntity.maxHp,
          position: agentEntity.position,
          roomId: agentEntity.roomId,
          inventory: agentEntity.inventory || [],
          stats: agentEntity.stats,
        },
        currentRoom: currentRoom ? {
          id: currentRoom.id,
          name: currentRoom.name,
          description: currentRoom.description,
          type: currentRoom.type,
          connections: currentRoom.connections,
          isExplored: currentRoom.isExplored,
        } : null,
        nearbyEntities: entitiesInRoom
          .filter(e => e.id !== id)
          .map(e => ({
            id: e.id,
            name: e.name,
            type: e.isPlayer ? 'player' : 'enemy',
            hp: e.hp,
            maxHp: e.maxHp,
            position: e.position,
          })),
        connectedRooms: connectedRooms.map(room => ({
          id: room.id,
          name: room.name,
          type: room.type,
          isExplored: room.isExplored,
        })),
        availableActions,
        objectives: gameState.objectives || [],
        recentEvents: gameState.events?.slice(-5) || [],
      },
    });
  } catch (error) {
    console.error('Error retrieving game context:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve game context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
