/**
 * Jest unit test for utility to delete an existing ServerAdminKey
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
import deleteServerAdminKey from '../../../src/functions/utils/deleteServerAdminKey';

describe('Utility - deleteServerAdminKey function', () => {
  let testEnv: TestEnv;

  // DB Container ID
  const SERVER_ADMIN_KEY = 'serverAdminKey';

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName as string);

    // Start Test Environment
    await testEnv.start();
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success - Nickname', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call deleteServerAdminKey function
    await deleteServerAdminKey('nickname', 'testAdmin', testEnv.testConfig);

    // DB Check
    let queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(
        String.prototype.concat(
          `SELECT * FROM ${SERVER_ADMIN_KEY} `,
          `WHERE ${SERVER_ADMIN_KEY}.nickname = "testAdmin"`
        )
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
    queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
  });

  test('Success - Key', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call deleteServerAdminKey function
    const key = TestConfig.hash(
      'testAuthAPI',
      new Date('2023-03-11T00:50:43.000Z').toISOString(),
      'server - authentication'
    );
    await deleteServerAdminKey('key', key, testEnv.testConfig);

    // DB Check
    let queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(
        String.prototype.concat(
          `SELECT * FROM ${SERVER_ADMIN_KEY} `,
          `WHERE ${SERVER_ADMIN_KEY}.id = "${key}"`
        )
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
    queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
  });

  test('Fail - Not existing nickname', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call deleteServerAdminKey function
    await expect(
      deleteServerAdminKey('nickname', 'notExisting', testEnv.testConfig)
    ).rejects.toThrow('Not Found');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });

  test('Fail - Not existing key', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call deleteServerAdminKey function
    const key = TestConfig.hash(
      'testAuthAPI',
      new Date('2023-03-12T00:50:43.000Z').toISOString(),
      'server - authentication'
    );
    await expect(
      deleteServerAdminKey('key', key, testEnv.testConfig)
    ).rejects.toThrow('Not Found');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });

  test('Fail - Wrong OperationType', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call deleteServerAdminKey function
    await expect(
      deleteServerAdminKey('others', 'notExisting', testEnv.testConfig)
    ).rejects.toThrow(
      'Invalid Operation Type - either nickname or key accepted'
    );

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });
});
