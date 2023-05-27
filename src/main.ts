/**
 * Starting express application middleware for CollegeMate Miscellaneous API
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Server} from 'http';
import ExpressServer from './ExpressServer';
import ServerConfig from './ServerConfig';

// Configuration of the server
if (!process.env.DB_ENDPOINT || !process.env.DB_KEY || !process.env.DB_ID) {
  console.log('NEED DB_ENDPOINT, DB_KEY AND DB_ID ENV VARIABLE');
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}
const configInstance = new ServerConfig(
  process.env.DB_ENDPOINT,
  process.env.DB_KEY,
  process.env.DB_ID
);
const expressServer = new ExpressServer(configInstance); // express server setup

// Startup the express server
const {app} = expressServer;
const server: Server = app.listen(configInstance.expressPort);
console.log(`Start API Server at port ${configInstance.expressPort}`);

// Gracefully shutdown express server
const shutdown = async (): Promise<void> => {
  // Close database connection
  await expressServer.closeServer();

  // Close API Server
  await server.close();

  console.log('Shutdown API Server');
  // eslint-disable-next-line no-process-exit
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
