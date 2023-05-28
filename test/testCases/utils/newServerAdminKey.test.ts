/**
 * Jest unit test for utility to add new ServerAdminKey
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
import newServerAdminKey from '../../../src/functions/utils/newServerAdminKey';

describe('Utility - newServerAdminKey function', () => {
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

  test('Success', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call newServerAdminKey function
    const newKey = await newServerAdminKey(
      'unitTest',
      'server - schedule',
      TestConfig.hash,
      testEnv.testConfig
    );

    // DB Check
    let queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(
        String.prototype.concat(
          `SELECT * FROM ${SERVER_ADMIN_KEY} `,
          `WHERE ${SERVER_ADMIN_KEY}.accountType = "server - schedule"`
        )
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].id).toBe(newKey);
    expect(queryResult.resources[0].nickname).toBe('unitTest');
    expect(queryResult.resources[0].accountType).toBe('server - schedule');
    queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(3);
  });

  test('Fail - Invalid Account Type', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call newServerAdminKey function
    await expect(
      newServerAdminKey(
        'unitTest',
        'server - not exist',
        TestConfig.hash,
        testEnv.testConfig
      )
    ).rejects.toThrow('Invalid Account Type');
    await expect(
      newServerAdminKey(
        'unitTest',
        'suspicious',
        TestConfig.hash,
        testEnv.testConfig
      )
    ).rejects.toThrow('Invalid Account Type');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query(`SELECT * FROM ${SERVER_ADMIN_KEY}`)
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });
});
