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

describe('GET /auth/renew', () => {
  let testEnv: TestEnv;
  const refreshTokenMap = {
    valid: '',
    deleted: '',
    soonExpired: '',
    expired: '',
    signup: '',
  };

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName as string);

    // Start Test Environment
    await testEnv.start();
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Fail: No Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
  });

  test('Fail: Expired Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
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

    // Invalidate Refresh Token
    expect(await invalidateToken(testEnv.dbClient, 180)).toBeGreaterThanOrEqual(
      1
    );

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail: No Application Key and Not Origin', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
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

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://suspicious.app'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail: Wrong Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
    const tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'access',
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

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail: Signup Token with Request Body', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Signup purpose OTP Request
    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signup', email: 'newAccount@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const requestId = response.body.requestId;
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({email: 'newAccount@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();

    const cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN');
    const testToken = cookie[1];

    // Test with Refresh Token and No Request Body
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail: Deleted User', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
    const tokenContent: AuthToken = {
      id: 'deleted@wisc.edu',
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
      'deleted@wisc.edu',
      expireAt
    );
    testTokenObj.expireAt = (testTokenObj.expireAt as Date).toISOString();
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>(testTokenObj);

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Success: Signup Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Signup purpose OTP Request
    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const requestId = response.body.requestId;
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();

    let cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN');
    const testToken = cookie[1];

    // Test with Refresh Token and No Request Body
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'});
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    expect(response.header['set-cookie']).toHaveLength(1);
    // Parse Access Token and check expiration
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    expect(response.header['set-cookie'].length).toBe(1);
  });

  test('Success: Application Key with Soon-to-be Expired Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
    const tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '10m',
    });
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 10);
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

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    expect(response.header['set-cookie']).toHaveLength(2);
    // Parse Access Token and check expiration
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();

    // DB Checks - Token Existence
    const dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 181);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success: Application Key', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
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

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token and check expiration
    const cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(response.header['set-cookie']).toHaveLength(1);
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
  });

  test('Success: Web with Soon-to-be Expired Refresh Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
    const tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let testToken = jwt.sign(tokenContent, 'keySecretRefresh', {
      algorithm: 'HS512',
      expiresIn: '10m',
    });
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 10);
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

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    expect(response.header['set-cookie']).toHaveLength(2);
    // Parse Access Token and check expiration
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();

    // DB Checks - Token Existence
    const dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 181);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success: Web', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Test Web - Refresh Token
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

    // Test with Refresh Token and Request Body
    const response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`])
      .set({Origin: 'https://collegemate.app'})
      .send({renewRefreshToken: true});
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token and check expiration
    const cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(response.header['set-cookie']).toHaveLength(1);
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Cookie Name
    // Check for token contents and expiration
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
  });
});
