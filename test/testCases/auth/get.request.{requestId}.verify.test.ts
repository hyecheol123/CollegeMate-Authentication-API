/**
 * Jest Unit Test for GET /auth/request/{requestId}/verify method
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
import RefreshToken from '../../../src/datatypes/RefreshToken/RefreshToken';

describe('GET /auth/request/{requestId}/verify - Verify OTP Request', () => {
  let testEnv: TestEnv;
  const requestIdMap = {
    signin: '',
    signup: '',
    sudo: '',
  };

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName as string);

    // Start Test Environment
    await testEnv.start();

    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Signin Purpose OTP Request
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
    requestIdMap.signin = requestId;

    // Signup purpose OTP Request
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
    requestIdMap.signup = requestId;

    // Sudo purpose OTP Request
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
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    requestId = response.body.requestId;
    // Request - Enter OTP Code
    response = await request(testEnv.expressServer.app)
      .post(`/auth/request/${requestId}/code`)
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({email: 'existing@wisc.edu', passcode: '123456'});
    expect(response.status).toBe(200);
    expect(response.body.shouldRenewToken).toBeUndefined();
    requestIdMap.sudo = requestId;
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Fail - Request without ServerAdminToken', () => {
    fail();
  });

  test('Fail - Request with invalid ServerAdminToken', () => {
    // Provide accessToken of user as ServerAdminToken
    // Provide serverAdminToken that signed with wrong key
    fail();
  });

  test('Fail - Request with expired ServerAdminToken', () => {
    // Provide accessToken of user as ServerAdminToken
    fail();
  });

  test('Fail - Not Existing Request ID', () => {
    fail();
  });

  test('Success', () => {
    fail();
  });
});
