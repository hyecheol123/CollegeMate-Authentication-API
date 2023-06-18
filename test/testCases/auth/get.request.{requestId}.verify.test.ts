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
    notVerified: '',
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

    // Not Yet Verified - signup
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signup', email: 'newaccount@wisc.edu'});
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeDefined();
    requestId = response.body.requestId;
    requestIdMap.notVerified = requestId;
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Fail - Request without ServerAdminToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    // Request without any header
    let response = await request(testEnv.expressServer.app).get(
      `/auth/request/${requestIdMap.signin}/verify`
    );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');

    // Request with header not containing X-SERVER-TOKEN
    response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signin}/verify`)
      .set({'X-OTHER-KEY': '<Some-Other-Value>'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
  });

  test('Fail - Request with invalid ServerAdminToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    // Provide accessToken of user as ServerAdminToken
    // Generate token
    let tokenContent: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'access',
      tokenType: 'user',
    };
    let token = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '60m',
    });
    // Request
    let response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signin}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Provide serverAdminToken that signed with wrong key
    // Generate Token
    tokenContent = {
      id: 'testAdmin',
      type: 'access',
      tokenType: 'serverAdmin',
      accountType: 'admin',
    };
    token = jwt.sign(tokenContent, 'wrong key', {
      algorithm: 'HS512',
      expiresIn: '60m',
    });
    // Request
    response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signin}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Missing Account Type
    // Generate Token
    tokenContent = {
      id: 'testAdmin',
      type: 'access',
      tokenType: 'serverAdmin',
    };
    token = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '60m',
    });
    // Request
    response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signin}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail - Request with expired ServerAdminToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    // Generate token
    const tokenContent: AuthToken = {
      id: 'testAdmin',
      type: 'access',
      tokenType: 'serverAdmin',
      accountType: 'admin',
    };
    const token = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '1ms',
    });

    // Wait for 10 ms
    await new Promise(resolve => setTimeout(resolve, 10));

    // Request
    const response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signin}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail - Not Existing Request ID', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    // Generate token
    const tokenContent: AuthToken = {
      id: 'testAdmin',
      type: 'access',
      tokenType: 'serverAdmin',
      accountType: 'admin',
    };
    const token = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '10m',
    });

    // Request
    const response = await request(testEnv.expressServer.app)
      .get('/auth/request/not-existing-request-id/verify')
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Success', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    // Generate token
    const tokenContent: AuthToken = {
      id: 'testAdmin',
      type: 'access',
      tokenType: 'serverAdmin',
      accountType: 'admin',
    };
    const token = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '10m',
    });

    // Request - signin purpose
    let response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signin}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('existing@wisc.edu');
    expect(response.body.purpose).toBe('signin');
    expect(response.body.verified).toBe(true);
    let expireAt = new Date(response.body.expireAt);
    let currentDate = new Date();
    expect(expireAt > currentDate).toBe(true);
    currentDate.setMinutes(currentDate.getMinutes() + 11);
    expect(expireAt < currentDate).toBe(true);

    // Request - signup purpose
    response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.signup}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('newaccount@wisc.edu');
    expect(response.body.purpose).toBe('signup');
    expect(response.body.verified).toBe(true);
    expireAt = new Date(response.body.expireAt);
    currentDate = new Date();
    expect(expireAt > currentDate).toBe(true);
    currentDate.setMinutes(currentDate.getMinutes() + 11);
    expect(expireAt < currentDate).toBe(true);

    // Request - sudo purpose
    response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.sudo}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('existing@wisc.edu');
    expect(response.body.purpose).toBe('sudo');
    expect(response.body.verified).toBe(true);
    expireAt = new Date(response.body.expireAt);
    currentDate = new Date();
    expect(expireAt > currentDate).toBe(true);
    currentDate.setMinutes(currentDate.getMinutes() + 11);
    expect(expireAt < currentDate).toBe(true);

    // Request - notVerified purpose
    response = await request(testEnv.expressServer.app)
      .get(`/auth/request/${requestIdMap.notVerified}/verify`)
      .set({'X-SERVER-TOKEN': token});
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('newaccount@wisc.edu');
    expect(response.body.purpose).toBe('signup');
    expect(response.body.verified).toBe(false);
    expect(response.body.expireAt).toBeUndefined();
  });
});
