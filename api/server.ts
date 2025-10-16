/**
 * local server entry file, for local development
 */
import app from './app.js';
import { startScheduledPostsCron } from './services/cron/scheduled-posts-cron.js';
import { AutomationSchedulerService } from './services/automation-scheduler-service.js';
import { AutomationJobProcessor } from './services/automation-job-processor.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
  console.log(`Server ready on port ${PORT}`);

  // Initialize cron jobs
  console.log('Initializing cron jobs...');
  startScheduledPostsCron();
  await AutomationSchedulerService.initializeSchedules();
  console.log('Cron jobs initialized');

  // Start automation job processor
  console.log('Starting automation job processor...');
  AutomationJobProcessor.start();
  console.log('Automation job processor started');
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  AutomationJobProcessor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  AutomationJobProcessor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;