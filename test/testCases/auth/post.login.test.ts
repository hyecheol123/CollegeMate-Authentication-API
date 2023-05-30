/**
 * Jest unit test for POST /auth/login method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import TestConfig from '../../TestConfig';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/Token/AuthToken';

describe('POST /auth/login - Get Server/Admin Authentication Token (Server Use Only)', () => {
  let testEnv: TestEnv;

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName as string);

    // Start Test Environment
    await testEnv.start();
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Succes', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test with admin key
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .set({
        'X-SERVER-KEY': TestConfig.hash(
          'testAdmin',
          new Date('2022-03-10T00:50:43.000Z').toISOString(),
          'admin'
        ),
      });
    expect(response.status).toBe(200);
    let expiresAt = new Date(response.body.expiresAt);
    expect(expiresAt > new Date()).toBe(true);
    let expectedExpiration = new Date();
    expectedExpiration.setMinutes(expectedExpiration.getMinutes() + 60);
    expect(expiresAt <= expectedExpiration).toBe(true);
    let tokenObject = jwt.verify(response.body.serverAdminToken, 'keySecret', {
      algorithms: ['HS512'],
    }) as AuthToken;
    expect(tokenObject.id).toBe('testAdmin');
    expect(tokenObject.type).toBe('access');
    expect(tokenObject.tokenType).toBe('serverAdmin');
    expect(tokenObject.accountType).toBe('admin');

    // Test with server key
    response = response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .set({
        'X-SERVER-KEY': TestConfig.hash(
          'testAuthAPI',
          new Date('2023-03-11T00:50:43.000Z').toISOString(),
          'server - authentication'
        ),
      });
    expect(response.status).toBe(200);
    expiresAt = new Date(response.body.expiresAt);
    expect(expiresAt > new Date()).toBe(true);
    expectedExpiration = new Date();
    expectedExpiration.setMinutes(expectedExpiration.getMinutes() + 60);
    expect(expiresAt <= expectedExpiration).toBe(true);
    tokenObject = jwt.verify(response.body.serverAdminToken, 'keySecret', {
      algorithms: ['HS512'],
    }) as AuthToken;
    expect(tokenObject.id).toBe('testAuthAPI');
    expect(tokenObject.type).toBe('access');
    expect(tokenObject.tokenType).toBe('serverAdmin');
    expect(tokenObject.accountType).toBe('server - authentication');

    // Add new serverAdminKey to DB and test with recently inserted key
    // testAuthAPI2, server - authentication
    const keyTimestamp = new Date('2023-05-11T00:50:43.000Z');
    const nickname = 'testAuthAPI2';
    const accountType = 'server - authentication';
    const key = TestConfig.hash(
      nickname,
      keyTimestamp.toISOString(),
      accountType
    );
    await testEnv.dbClient.container('serverAdminKey').items.create({
      id: key,
      generatedAt: keyTimestamp.toISOString(),
      nickname: nickname,
      accountType: accountType,
    });
    response = response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .set({'X-SERVER-KEY': key});
    expect(response.status).toBe(200);
    expiresAt = new Date(response.body.expiresAt);
    expect(expiresAt > new Date()).toBe(true);
    expectedExpiration = new Date();
    expectedExpiration.setMinutes(expectedExpiration.getMinutes() + 60);
    expect(expiresAt <= expectedExpiration).toBe(true);
    tokenObject = jwt.verify(response.body.serverAdminToken, 'keySecret', {
      algorithms: ['HS512'],
    }) as AuthToken;
    expect(tokenObject.id).toBe(nickname);
    expect(tokenObject.type).toBe('access');
    expect(tokenObject.tokenType).toBe('serverAdmin');
    expect(tokenObject.accountType).toBe(accountType);
  });

  test('Fail - Request without X-SERVER-KEY Header', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    // Request without any header
    let response = await request(testEnv.expressServer.app).post('/auth/login');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');

    // Request with header not containing X-SERVER-KEY
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .set({'X-OTHER-KEY': '<Some-Other-Value>'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
  });

  test('Fail - Request with not existing serverAdminKey', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request with not existing serverAdminKey
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .set({
        'X-SERVER-KEY': TestConfig.hash(
          'NOT A VALID TOKEN',
          new Date().toISOString(),
          'admin'
        ),
      });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Request with deleted serverAdminKey
    const targetKey = TestConfig.hash(
      'testAuthAPI',
      new Date('2023-03-11T00:50:43.000Z').toISOString(),
      'server - authentication'
    );
    testEnv.dbClient.container('serverAdminKey').item(targetKey).delete();
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .set({'X-SERVER-KEY': targetKey});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });
});
