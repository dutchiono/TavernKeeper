// Vitest setup file
import { vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Mock environment variables for testing
process.env.SUPABASE_PROJECT_URL = 'https://test.supabase.co';
process.env.SUPABASE_API_KEY = 'test-key';
process.env.REDIS_URL = 'redis://localhost:6379';
// process.env.NODE_ENV = 'test';

// Suppress console.error for expected error tests
// These errors are intentional - tests are verifying error handling works correctly
// The errors are logged to stderr but the tests still pass
// This is expected behavior - we're testing that error handling works
const originalError = console.error;
console.error = (...args: any[]) => {
  // Only suppress errors that match expected test error patterns
  const message = args[0]?.toString() || '';
  if (
    message.includes('Error processing frame action') ||
    message.includes('Error validating frame signature') ||
    message.includes('Error fetching run') ||
    message.includes('Error fetching dungeon map') ||
    message.includes('Error in agent conversation') ||
    message.includes('Error creating run') ||
    message.includes('ECONNREFUSED') ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('Redis connection')
  ) {
    // Suppress expected test errors - these are intentional
    // Redis connection errors are expected when Redis isn't running during tests
    return;
  }
  // Allow other errors through
  originalError(...args);
};


