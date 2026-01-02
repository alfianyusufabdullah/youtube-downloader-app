import { downloadWorker } from './workers/downloadWorker.js';
import { QUEUE_NAME } from './queues/downloadQueue.js';

console.log(`Worker listening on queue: ${QUEUE_NAME}`);

// Keep process alive
process.on('SIGINT', async () => {
    await downloadWorker.close();
    process.exit(0);
});
