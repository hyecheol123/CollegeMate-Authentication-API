/**
 * Jest unit test for POST /auth/request/{requestId}/code method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/Token/AuthToken';
import RefreshToken from '../../../src/datatypes/RefreshToken/RefreshToken';
import OTP from '../../../src/datatypes/OTP/OTP';
import invalidateToken from '../../utils/invalidateRefreshToken';

describe('POST /auth/request/{requestId}/code - Enter OTP Code', () => {
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

  test('Fail - Request not from collegemate.app nor Mobile Application', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request from wrong Origin Header
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://suspicious.com'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Request from wrong applicationKey Header
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Suspicious-App>'})
      .send({
        email: 'existing@wisc.edu',
        passcode: '123456',
      });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Request from without applicationKey or Origin Header
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .send({
        email: 'existing@wisc.edu',
        passcode: '123456',
      });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - Missing Required Properties or has Additional Properties', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Missing Email
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({passcode: '123456'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Missing Passcode
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Additional Properties
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({
        email: 'existing@wisc.edu',
        passcode: '123456',
        additional: 'property',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - Not Matching Email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Wrong Email
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'notMatching@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - requestId Not Found', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;
    const fakeRequestId = 'notFound';

    // Incorrect requestId
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${fakeRequestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - Expired Request', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Expired Request
    let dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    const {resource} = dbOps;
    resource.expireAt = new Date();
    resource.expireAt.setMinutes(resource.expireAt.getMinutes() - 1);
    await testEnv.dbClient.container('otp').item(requestId).replace(resource);

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
  });

  test('Fail - sudo purpose request without refreshToken or with expired refreshToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    const tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request New OTP
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    expect(new Date(response.body.codeExpireAt) > new Date()).toBe(true);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const {requestId} = response.body;

    // Invalidate refreshToken
    expect(await invalidateToken(testEnv.dbClient, 190)).toBeGreaterThanOrEqual(
      1
    );
    // Sudo Purpose Request - Without RefreshToken
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');

    // Sudo Purpose Request - With Expired RefreshToken
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - sudo purpose request with invalid token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    let tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request New OTP
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    expect(new Date(response.body.codeExpireAt) > new Date()).toBe(true);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const {requestId} = response.body;

    // Create Invalid RefreshToken
    tokenContents = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    refreshToken = jwt.sign(tokenContents, 'Invalid Key', {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Incorrect RefreshToken
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - sudo purpose request with unmatching refreshToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request New OTP
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    expect(new Date(response.body.codeExpireAt) > new Date()).toBe(true);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const {requestId} = response.body;

    // Create RefreshToken - Unmatching Token
    tokenContents.id = 'old@wisc.edu';
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'old@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Create RefreshToken - Unmatching Token
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - Already Verified Request', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Signin
    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    let {requestId} = response.body;
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();
    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();
    // DB Checks - Token Existence
    let dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 181);
    expect(sessionExpires < expectedExpires).toBe(true);
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
    // Request - Enter OTP Code Again
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');
    let dbOps2 = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps2.statusCode !== 404).toBe(true);
    expect(dbOps2.resource.expireAt).toBe(dbOps.resource.expireAt);

    // Signup
    // Generate OTP Request
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signup', email: 'newaccount@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    requestId = response.body.requestId;
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({email: 'newaccount@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();
    // Check Cookie & Token Information
    // Parse Access Token
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('newaccount@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('newaccount@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();
    // DB Checks - Token Existence
    dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('newaccount@wisc.edu');
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 61);
    expect(sessionExpires < expectedExpires).toBe(true);
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('newaccount@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signup');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
    // Request - Enter OTP Code Again
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({email: 'newaccount@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');
    dbOps2 = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps2.statusCode !== 404).toBe(true);
    expect(dbOps2.resource.expireAt).toBe(dbOps.resource.expireAt);

    // Sudo
    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });
    // Request New OTP
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    expect(new Date(response.body.codeExpireAt) > new Date()).toBe(true);
    expect(response.body.shouldRenewToken).toBeUndefined();
    requestId = response.body.requestId;
    // Create RefreshToken
    // Want to check whether the enter OTP code will work with
    // different refreshToken that owned by the same user.
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(200);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const otpExpires = new Date(response.body.verificationExpiresAt);
    const currDate = new Date();
    expect(otpExpires > currDate).toBe(true);
    currDate.setMinutes(currDate.getMinutes() + 11);
    expect(otpExpires < currDate).toBe(true);
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
    // Request - Enter OTP Code Again
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');
    dbOps2 = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps2.statusCode !== 404).toBe(true);
    expect(dbOps2.resource.expireAt).toBe(dbOps.resource.expireAt);
  });

  test('Fail - signup purpose request with existing email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate New OTP Request Manually
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    const passcode = '123456';
    const id = TestConfig.hash(
      'existing@wisc.edu',
      'signup',
      expireAt.toISOString()
    );
    const hashedPasscode = TestConfig.hash(
      'existing@wisc.edu',
      'signup',
      passcode
    );
    const otpRequestInformation = new OTP(
      id,
      'existing@wisc.edu',
      'signup',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);

    // Request - Enter OTP Code
    const response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signup');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - signin purpose request with not existing email or deleted/locked email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Deleted
    // Generate New OTP Request Manually
    let expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    const passcode = '123456';
    let id = TestConfig.hash(
      'deleted@wisc.edu',
      'signin',
      expireAt.toISOString()
    );
    let hashedPasscode = TestConfig.hash(
      'deleted@wisc.edu',
      'signin',
      passcode
    );
    let otpRequestInformation = new OTP(
      id,
      'deleted@wisc.edu',
      'signin',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);
    // Request - Enter OTP Code
    let response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'deleted@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();
    // DB Checks - OTP Verified Flags
    let dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('deleted@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);

    // Locked
    // Generate New OTP Request Manually
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    id = TestConfig.hash('locked@wisc.edu', 'signin', expireAt.toISOString());
    hashedPasscode = TestConfig.hash('locked@wisc.edu', 'signin', passcode);
    otpRequestInformation = new OTP(
      id,
      'locked@wisc.edu',
      'signin',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'locked@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('locked@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);

    // Not Existing Email
    // Generate New OTP Request Manually
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    id = TestConfig.hash('na@wisc.edu', 'signin', expireAt.toISOString());
    hashedPasscode = TestConfig.hash('na@wisc.edu', 'signin', passcode);
    otpRequestInformation = new OTP(
      id,
      'na@wisc.edu',
      'signin',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'na@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('na@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - sudo purpose request with not existing email or deleted/locked email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Deleted
    // Generate New OTP Request Manually
    let expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    const passcode = '123456';
    let id = TestConfig.hash(
      'deleted@wisc.edu',
      'sudo',
      expireAt.toISOString()
    );
    let hashedPasscode = TestConfig.hash('deleted@wisc.edu', 'sudo', passcode);
    let otpRequestInformation = new OTP(
      id,
      'deleted@wisc.edu',
      'sudo',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);
    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'deleted@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'deleted@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });
    // Request - Enter OTP Code
    let response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'deleted@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    // DB Checks - OTP Verified Flags
    let dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('deleted@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);

    // Locked
    // Generate New OTP Request Manually
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    id = TestConfig.hash('locked@wisc.edu', 'sudo', expireAt.toISOString());
    hashedPasscode = TestConfig.hash('locked@wisc.edu', 'sudo', passcode);
    otpRequestInformation = new OTP(
      id,
      'locked@wisc.edu',
      'sudo',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);
    // Create RefreshToken
    tokenContents.id = 'locked@wisc.edu';
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'locked@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'locked@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('locked@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);

    // Not Existing Email
    // Generate New OTP Request Manually
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    id = TestConfig.hash('na@wisc.edu', 'sudo', expireAt.toISOString());
    hashedPasscode = TestConfig.hash('na@wisc.edu', 'sudo', passcode);
    otpRequestInformation = new OTP(
      id,
      'na@wisc.edu',
      'sudo',
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(testEnv.dbClient, otpRequestInformation);
    // Create RefreshToken
    tokenContents.id = 'na@wisc.edu';
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'na@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${id}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'na@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(id).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('na@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - wrong code', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({
        email: 'existing@wisc.edu',
        passcode: '999999',
      });
    expect(response.status).toBe(499);
    expect(response.body.error).toBe('Passcode Not Match');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - signin purpose / Not Mobile with StaySignedIn flag', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({
        email: 'existing@wisc.edu',
        passcode: '123456',
        staySignedIn: true,
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Check Cookie & Token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(false);
    // Code still should be expires in 3 minutes
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 4);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - signup purpose', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signup', email: 'newaccount@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({email: 'newaccount@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();
    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('newaccount@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('newaccount@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();

    // DB Checks - Token Existence
    let dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('newaccount@wisc.edu');
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 61);
    expect(sessionExpires < expectedExpires).toBe(true);

    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('newaccount@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signup');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - signin purpose', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();
    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();

    // DB Checks - Token Existence
    let dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 181);
    expect(sessionExpires < expectedExpires).toBe(true);

    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - signin purpose / Mobile: Stay Signed In', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signin', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({
        email: 'existing@wisc.edu',
        passcode: '123456',
        staySignedIn: true,
      });
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBeUndefined();
    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('existing@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();

    // DB Checks - Token Existence
    let dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 181);
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(
      expectedExpires.getMinutes() + 24 * 30 * 60 - 180
    );
    expect(sessionExpires < expectedExpires).toBe(true);

    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - signin purpose / user with old Terms and Condition', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Generate OTP Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'old@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    const {requestId} = response.body;

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .send({email: 'old@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(201);
    expect(response.body.needNewTNCAccpet).toBe(true);
    // Check Cookie & Token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('old@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.accountType).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1].substring(3),
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('old@wisc.edu');
    expect(tokenPayload.tokenType).toBe('user');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.accountType).toBeUndefined();

    // DB Checks - Token Existence
    let dbOps = await testEnv.dbClient
      .container('refreshToken')
      .item(cookie[1])
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('old@wisc.edu');
    let sessionExpires = new Date(dbOps.resource.expireAt);
    let expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 181);
    expect(sessionExpires < expectedExpires).toBe(true);

    // DB Checks - OTP Verified Flags
    dbOps = await testEnv.dbClient.container('otp').item(requestId).read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('old@wisc.edu');
    expect(dbOps.resource.purpose).toBe('signin');
    expect(dbOps.resource.verified).toBe(true);
    sessionExpires = new Date(dbOps.resource.expireAt);
    expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - sudo purpose', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request New OTP
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    expect(new Date(response.body.codeExpireAt) > new Date()).toBe(true);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const {requestId} = response.body;

    // Create RefreshToken
    // Want to check whether the enter OTP code will work with
    // different refreshToken that owned by the same user.
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(200);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const otpExpires = new Date(response.body.verificationExpiresAt);
    const currDate = new Date();
    expect(otpExpires > currDate).toBe(true);
    currDate.setMinutes(currDate.getMinutes() + 11);
    expect(otpExpires < currDate).toBe(true);

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(true);
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - sudo purpose / with about to expire token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 180);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request New OTP
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    expect(new Date(response.body.codeExpireAt) > new Date()).toBe(true);
    expect(response.body.shouldRenewToken).toBeUndefined();
    const {requestId} = response.body;

    // Create RefreshToken
    // Want to check whether the enter OTP code will work with
    // different refreshToken that is owned by the same user.
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '3m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 3);
    refreshToken =
      tokenExpireAt.getMilliseconds().toString().padStart(3, '0') +
      refreshToken;
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: tokenExpireAt.toISOString(),
      });

    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(200);
    expect(response.body.shouldRenewToken).toBe(true);
    const otpExpires = new Date(response.body.verificationExpiresAt);
    const currDate = new Date();
    expect(otpExpires > currDate).toBe(true);
    currDate.setMinutes(currDate.getMinutes() + 11);
    expect(otpExpires < currDate).toBe(true);

    // DB Checks - OTP Verified Flags
    const dbOps = await testEnv.dbClient
      .container('otp')
      .item(requestId)
      .read();
    expect(dbOps.statusCode !== 404).toBe(true);
    expect(dbOps.resource.email).toBe('existing@wisc.edu');
    expect(dbOps.resource.purpose).toBe('sudo');
    expect(dbOps.resource.verified).toBe(true);
    const sessionExpires = new Date(dbOps.resource.expireAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 11);
    expect(sessionExpires < expectedExpires).toBe(true);
  });
});
