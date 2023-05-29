/**
 * Setup test environment
 *  - Setup Database for testing
 *  - Build table that will be used during the testing
 *  - Setup express server
 *
 * Teardown test environment after test
 *  - Remove used table and close database connection from the express server
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as crypto from 'crypto';
import * as Cosmos from '@azure/cosmos';
import TestConfig from './TestConfig';
import ExpressServer from '../src/ExpressServer';
import ServerAdminKey from '../src/datatypes/ServerAdminKey/ServerAdminKey';
import {AccountType} from '../src/datatypes/AuthToken';

/**
 * Class for Test Environment
 */
export default class TestEnv {
  testConfig: TestConfig; // Configuration Object (to use hash function later)
  expressServer: ExpressServer | undefined; // Express Server Object
  dbClient: Cosmos.Database | undefined; // DB Client Object
  dbIdentifier: string; // unique identifier string for the database

  /**
   * Constructor for TestEnv
   *  - Setup express server
   *  - Setup db client
   *
   * @param identifier Identifier to specify the test
   */
  constructor(identifier: string) {
    // Hash identifier to create new identifier string
    this.dbIdentifier = crypto
      .createHash('md5')
      .update(identifier)
      .digest('hex');

    // Generate TestConfig obj
    this.testConfig = new TestConfig(this.dbIdentifier);
  }

  /**
   * beforeEach test case, run this function
   * - Setup Database for testing
   * - Build table that will be used during the testing
   */
  async start(): Promise<void> {
    // Setup DB
    const dbClient = new Cosmos.CosmosClient({
      endpoint: this.testConfig.db.endpoint,
      key: this.testConfig.db.key,
    });
    const dbOps = await dbClient.databases.create({
      id: this.testConfig.db.databaseId,
    });
    /* istanbul ignore next */
    if (dbOps.statusCode !== 201) {
      throw new Error(JSON.stringify(dbOps));
    }
    this.dbClient = dbClient.database(this.testConfig.db.databaseId);

    // Create resources
    // serverAdminKey container
    const containerOps = await this.dbClient.containers.create({
      id: 'serverAdminKey',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [{path: '/*'}],
        excludedPaths: [{path: '/"_etag"/?'}],
      },
      uniqueKeyPolicy: {
        uniqueKeys: [{paths: ['/nickname']}],
      },
    });
    /* istanbul ignore next */
    if (containerOps.statusCode !== 201) {
      throw new Error(JSON.stringify(containerOps));
    }
    // serverAdminKey data
    const serverAdminKeySamples: ServerAdminKey[] = [];
    // testAdmin, admin
    let keyTimestamp = new Date('2022-03-10T00:50:43.000Z');
    let nickname = 'testAdmin';
    let accountType = 'admin';
    serverAdminKeySamples.push({
      id: TestConfig.hash(nickname, keyTimestamp.toISOString(), accountType),
      generatedAt: keyTimestamp.toISOString(),
      nickname: nickname,
      accountType: accountType as AccountType,
    });
    // testAuthAPI, server - authentication
    keyTimestamp = new Date('2023-03-11T00:50:43.000Z');
    nickname = 'testAuthAPI';
    accountType = 'server - authentication';
    serverAdminKeySamples.push({
      id: TestConfig.hash(nickname, keyTimestamp.toISOString(), accountType),
      generatedAt: keyTimestamp.toISOString(),
      nickname: nickname,
      accountType: accountType as AccountType,
    });
    for (let index = 0; index < serverAdminKeySamples.length; index++) {
      await this.dbClient
        .container('serverAdminKey')
        .items.create(serverAdminKeySamples[index]);
    }

    // Setup Express Server
    this.expressServer = new ExpressServer(this.testConfig);
  }

  /**
   * Teardown test environment after test
   *  - Remove used resources (DB)
   *  - close database/redis connection from the express server
   */
  async stop(): Promise<void> {
    // Drop database
    await (this.dbClient as Cosmos.Database).delete();

    // Close database connection of the express server
    await (this.expressServer as ExpressServer).closeServer();

    // Close database connection used during tests
    await (this.dbClient as Cosmos.Database).client.dispose();
  }
}
