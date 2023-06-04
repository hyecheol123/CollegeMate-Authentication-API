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
import createServerAdminToken from './functions/JWT/createServerAdminToken';
import ServerAdminKey from './datatypes/ServerAdminKey/ServerAdminKey';
import {Client} from '@microsoft/microsoft-graph-client';
import {ClientSecretCredential} from '@azure/identity';
import {TokenCredentialAuthenticationProvider} from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

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

    // Server Domain
    this.app.set('serverDomain', config.domainPath.domain);

    // Setup Parsers
    this.app.use(express.json());
    this.app.use(cookieParser());

    // Origin and Application Key
    this.app.set('webpageOrigin', config.webpageOrigin);
    this.app.set('serverApplicationKey', config.serverApplicationKey);
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
   * Method to initialize serverAdminAuthentication information asyncronously.
   *
   * @param config Server's configuration variables
   */
  // istanbul ignore next
  async initServerAdminAuth(config: ServerConfig): Promise<void> {
    // Set serverAdminKey and serverAdminToken
    this.app.set('serverAdminKey', config.serverAdminKey);
    const serverAdminKeyInfo = await ServerAdminKey.read(
      this.app.locals.dbClient,
      config.serverAdminKey
    );
    this.app.set(
      'serverAdminToken',
      createServerAdminToken(
        serverAdminKeyInfo.nickname,
        serverAdminKeyInfo.accountType,
        config.jwt.secretKey
      )
    );

    // Azure App Registration Authentication Information (For Microsoft Graph API)
    const azureCredential = new ClientSecretCredential(
      config.azureAppRegistrationInfo.tenantId,
      config.azureAppRegistrationInfo.clientId,
      config.azureAppRegistrationInfo.clientSecret
    );
    const azureAuthProvider = new TokenCredentialAuthenticationProvider(
      azureCredential,
      {scopes: ['https://graph.microsoft.com/.default']}
    );
    this.app.locals.msGraphClient = Client.initWithMiddleware({
      authProvider: azureAuthProvider,
    });
    this.app.set(
      'azureUserObjId',
      config.azureAppRegistrationInfo.userObjectId
    );
    this.app.set(
      'noReplyEmailAddress',
      config.azureAppRegistrationInfo.noReplyEmailAddress
    );
    this.app.set(
      'mainEmailAddress',
      config.azureAppRegistrationInfo.mainEmailAddress
    );
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
