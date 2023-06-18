/**
 * Jest unit test for POST /auth/request/{requestId}/code method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
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

  test('Fail - Request not from collegemate.app nor Mobile Application', () => {
    fail();
  });

  test('Fail - Missing Required Properties or has Additional Properties', () => {
    fail();
  });

  test('Fail - Not Matching Email', () => {
    fail();
  });

  test('Fail - requestId Not Found', () => {
    fail();
  });

  test('Fail - Expired Request', () => {
    fail();
  });

  test('Fail - sudo purpose request without refreshToken or with expired refreshToken', () => {
    fail();
  });

  test('Fail - sudo purpose request with invalid token', () => {
    fail();
  });

  test('Fail - sudo purpose request with unmatching refreshToken', () => {
    fail();
  });

  test('Fail - Already Verified Request', () => {
    fail();
  });

  test('Fail - signup purpose request with existing email', () => {
    fail();
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
      cookie[1],
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
      cookie[1],
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
      cookie[1],
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
      cookie[1],
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
      expiresIn: '181m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 181);
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
      expiresIn: '3m',
    });
    tokenExpireAt = new Date();
    tokenExpireAt.setMinutes(tokenExpireAt.getMinutes() + 3);
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
