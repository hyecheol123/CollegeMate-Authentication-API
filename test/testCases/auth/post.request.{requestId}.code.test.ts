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
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/Token/AuthToken';

describe('POST /auth/request/{requestId}/code - Enter OTP Code', () => {
  let testEnv: TestEnv;

  beforeAll(() => {
    jest.setTimeout(120000);
  });

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

  test('Fail - signin purpose request with not existing email or deleted/locked email', () => {
    fail();
  });

  test('Fail - sudo purpose request with not existing email or deleted/locked email', () => {
    fail();
  });

  test('Fail - wrong code', () => {
    fail();
  });

  test('Fail - signin purpose / Not Mobile with StaySignedIn flag', () => {
    fail();
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

  test('Success - signin purpose', () => {
    fail();
  });

  test('Success - signin purpose / Mobile: Stay Signed In', () => {
    fail();
  });

  test('Success - signin purpose / user with old Terms and Condition', () => {
    fail();
  });

  test('Success - sudo purpose', () => {
    fail();
  });

  test('Success - sudo purpose / with about to expire token', () => {
    fail();
  });
});
