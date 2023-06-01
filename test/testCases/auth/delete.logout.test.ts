/**
 * Jest unit test for DELETE /auth/logout method
 *
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import RefreshToken from '../../../src/datatypes/RefreshToken/RefreshToken';
import createRefreshToken from '../../../src/functions/JWT/createRefreshToken';
import AuthToken from '../../../src/datatypes/Token/AuthToken';

describe('DELETE /auth/logout', () => {
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

    // Test Web logout
    let testToken = createRefreshToken(
      'webLogout@wisc.edu',
      'keySecretRefresh'
    );

    // Test with Refresh Token
    let response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(200);

    // Cookie Clear Check
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    expect(cookie[1]).toBe('');
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    expect(cookie[1]).toBe('');

    // DB Check
    try {
      await RefreshToken.read(testEnv.dbClient, testToken);
      fail('Refresh Token should have been deleted');
    } catch (e) {
      if (e instanceof Error) expect(e.message).toBe('Not Found');
    }

    // Test App logout
    testToken = createRefreshToken('appLogout@wisc.edu', 'keySecretRefresh');

    // Test with Refresh Token
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'});
    expect(response.status).toBe(200);

    // Cookie Clear Check
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    expect(cookie[1]).toBe('');
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    expect(cookie[1]).toBe('');

    // DB Check
    try {
      await RefreshToken.read(testEnv.dbClient, testToken);
      fail('Refresh Token should have been deleted');
    } catch (e) {
      if (e instanceof Error) expect(e.message).toBe('Not Found');
    }

    // Put deleted Refresh Token back to DB & Test RefreshToken.create()
    const userRefreshTokenSamples: RefreshToken[] = [];
    // testAuthAPI, logout
    let expireAt = new Date('2024-05-31T00:52:23.000Z');
    userRefreshTokenSamples.push({
      id: createRefreshToken('webLogout@wisc.edu', 'keySecretRefresh'),
      email: 'webLogout@wisc.edu',
      expireAt: expireAt.toISOString(),
    });
    expireAt = new Date('2024-05-30T00:52:23.000Z');
    userRefreshTokenSamples.push({
      id: createRefreshToken('appLogout@wisc.edu', 'keySecretRefresh'),
      email: 'appLogout@wisc.edu',
      expireAt: expireAt,
    });

    for (let index = 0; index < userRefreshTokenSamples.length; index++) {
      await RefreshToken.create(
        testEnv.dbClient,
        userRefreshTokenSamples[index]
      );
    }
  });

  test('Fail: No Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web logout
    let response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(401);

    // Test App logout
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'});
    expect(response.status).toBe(401);
  });

  test('Fail: Invalid Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web logout - Refresh Token with invalid email
    let testToken = createRefreshToken('fakeEmail', 'keySecretRefresh');

    // Test with Refresh Token
    let response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);

    // Test Web logout - Refresh Token with invalid secret string
    testToken = createRefreshToken('webLogout@wisc.edu', 'fakeSecret');

    // Test with Refresh Token
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);
  });

  test('Fail: Wrong Token Type', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Token content with wrong token type
    const tokenContent: AuthToken = {
      id: 'webLogout@wisc.edu',
      type: 'access',
      tokenType: 'user',
    };

    // Generate RefreshToken
    const testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '60m',
    });

    const response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);
  });

  test('Fail: No Application Key and Not Web', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test with Refresh Token
    const response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set({Origin: 'wrong origin'});
    expect(response.status).toBe(403);
  });
});
