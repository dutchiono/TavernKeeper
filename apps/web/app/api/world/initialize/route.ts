import { NextRequest, NextResponse } from 'next/server';
import { initializeWorld, isWorldInitialized } from '@/lib/services/worldInitializationService';

/**
 * POST /api/world/initialize
 * Manually initialize the world (admin endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if already initialized
    const initialized = await isWorldInitialized();
    if (initialized) {
      return NextResponse.json(
        { message: 'World already initialized', initialized: true },
        { status: 200 }
      );
    }

    // Initialize world
    await initializeWorld();

    return NextResponse.json(
      { message: 'World initialized successfully', initialized: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initializing world:', error);
    return NextResponse.json(
      { error: 'Failed to initialize world', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/world/initialize
 * Check if world is initialized
 */
export async function GET(request: NextRequest) {
  try {
    const initialized = await isWorldInitialized();
    return NextResponse.json({ initialized }, { status: 200 });
  } catch (error) {
    console.error('Error checking world initialization:', error);
    return NextResponse.json(
      { error: 'Failed to check world initialization' },
      { status: 500 }
    );
  }
}

