import { startServer, parseConfig } from './index.js';

const config = parseConfig();
startServer(config)
  .then(() => {
    console.log(`mDocs server listening at http://${config.host}:${config.port}`);
  })
  .catch((err: Error) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
