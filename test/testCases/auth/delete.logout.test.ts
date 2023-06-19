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
import AuthToken from '../../../src/datatypes/Token/AuthToken';
import RefreshToken from '../../../src/datatypes/RefreshToken/RefreshToken';
import invalidateToken from '../../utils/invalidateRefreshToken';

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
    let tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    let expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;
    let testTokenObj = new RefreshToken(
      testToken,
      'existing@wisc.edu',
      expireAt
    );
    testTokenObj.expireAt = (testTokenObj.expireAt as Date).toISOString();
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>(testTokenObj);

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
      await testEnv.dbClient.container('refreshTokens').item(testToken).read();
      fail('Refresh Token should have been deleted');
    } catch (e) {
      if (e instanceof Error) expect(e).toBeDefined();
    }

    // Test App logout
    tokenContent = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;
    testTokenObj = new RefreshToken(testToken, 'existing@wisc.edu', expireAt);
    testTokenObj.expireAt = (testTokenObj.expireAt as Date).toISOString();
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>(testTokenObj);

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
      await testEnv.dbClient.container('refreshTokens').item(testToken).read();
      fail('Refresh Token should have been deleted');
    } catch (e) {
      if (e instanceof Error) expect(e).toBeDefined();
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

  test('Fail: Expired Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web logout
    const tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;
    const testTokenObj = new RefreshToken(
      testToken,
      'existing@wisc.edu',
      expireAt
    );
    testTokenObj.expireAt = (testTokenObj.expireAt as Date).toISOString();
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>(testTokenObj);

    // Invalidate Token
    expect(await invalidateToken(testEnv.dbClient, 180)).toBeGreaterThanOrEqual(
      1
    );

    // Test with Refresh Token
    const response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);
  });

  test('Fail: Already Logged out', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web logout
    const tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;
    const testTokenObj = new RefreshToken(
      testToken,
      'existing@wisc.edu',
      expireAt
    );
    testTokenObj.expireAt = (testTokenObj.expireAt as Date).toISOString();
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>(testTokenObj);

    // (First Logout) Test with Refresh Token
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

    // (Second Logout) Test with Refresh Token
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);
  });

  test('Fail: Invalid Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web logout - Refresh Token with invalid email
    let tokenContent: AuthToken = {
      id: 'fakeemail@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    let expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;

    // Test with Refresh Token
    let response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);

    // Test Web logout - Refresh Token with invalid secret string
    tokenContent = {
      id: 'appLogout@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    testToken = jwt.sign(tokenContent, 'fakesecret', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;

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
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '60m',
    });
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 60);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;

    const response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);
  });

  test('Fail: No Application Key and Not Web', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    const tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testToken =
      expireAt.getMilliseconds().toString().padStart(3, '0') + testToken;
    const testTokenObj = new RefreshToken(
      testToken,
      'existing@wisc.edu',
      expireAt
    );
    testTokenObj.expireAt = (testTokenObj.expireAt as Date).toISOString();
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>(testTokenObj);

    // Test with Refresh Token
    let response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://suspicious.app'});
    expect(response.status).toBe(403);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({'X-APPLICATION-KEY': 'WrongKey'});
    expect(response.status).toBe(403);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`]);
    expect(response.status).toBe(403);
  });
});
