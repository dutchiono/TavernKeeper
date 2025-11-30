// Load environment variables BEFORE importing any modules that use them
import 'dotenv/config';
import './runWorker';
import './replayWorker';

console.log('Workers started. Listening for jobs...');

// Keep process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down workers...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down workers...');
  process.exit(0);
});

