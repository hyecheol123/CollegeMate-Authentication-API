/**
 * Express application middleware dealing with the API requests
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as express from 'express';
import {CosmosClient} from '@azure/cosmos';
import * as cookieParser from 'cookie-parser';
import ServerConfig from './ServerConfig';
import HTTPError from './exceptions/HTTPError';
import authenticationRouter from './routes/authentication';

/**
 * Class contains Express Application and other relevant instances/functions
 */
export default class ExpressServer {
  app: express.Application;

  /**
   * Constructor for ExpressServer
   *
   * @param config Server's configuration variables
   */
  constructor(config: ServerConfig) {
    // Setup Express Application
    this.app = express();
    // Create DB Connection pool and link to the express application
    this.app.locals.dbClient = new CosmosClient({
      endpoint: config.db.endpoint,
      key: config.db.key,
    }).database(config.db.databaseId);

    // JWT Keys
    this.app.set('jwtAccessKey', config.jwt.secretKey);
    this.app.set('jwtRefreshKey', config.jwt.refreshKey);

    // API Server Domain
    this.app.set('serverDomain', config.domainPath.domain);

    // Setup Parsers
    this.app.use(express.json());
    this.app.use(cookieParser());

    // Origin and Application Key
    this.app.set('webpageOrigin', config.webpageOrigin);
    this.app.set('applicationKey', config.applicationKey);

    // Only Allow GET, POST, DELETE, PUT, PATCH method
    this.app.use(
      (
        req: express.Request,
        _res: express.Response,
        next: express.NextFunction
      ): void => {
        // Check HTTP methods
        if (
          !['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'HEAD'].includes(
            req.method
          )
        ) {
          next(new HTTPError(405, 'Method Not Allowed'));
        } else {
          next();
        }
      }
    );

    // Routers
    this.app.use('/auth', authenticationRouter);

    // Default Error Handler
    this.app.use(
      (
        err: HTTPError | Error,
        _req: express.Request,
        res: express.Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _next: express.NextFunction
      ): void => {
        /* istanbul ignore next */
        if (!(err instanceof HTTPError)) {
          console.error(err);
          err = new HTTPError(500, 'Server Error');
        }
        res.status((err as HTTPError).statusCode).json({error: err.message});
      }
    );

    this.app.use((_req, res) => {
      res.status(404).send({error: 'Not Found'});
    });
  }

  /**
   * CLose Server
   * - Close connection with Database server gracefully
   * - Flush Log
   */
  closeServer(): void {
    this.app.locals.dbClient.client.dispose();
  }
}
