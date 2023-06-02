/**
 * Jest unit test for POST /auth/request method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import * as jwt from 'jsonwebtoken';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/Token/AuthToken';
import RefreshToken from '../../../src/datatypes/RefreshToken/RefreshToken';
import invalidateToken from '../../utils/invalidateRefreshToken';

describe('POST /auth/request - Initiate OTP Request', () => {
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

  test('Fail - Request not from collegemate.app nor Mobile Application', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request - Without Origin Header and applicationKey Header
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .send({purpose: 'signup', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Request - With wrong Origin Header
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://suspicious.com'})
      .send({purpose: 'signup', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Request - With wrong applicationKey Header
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Suspicious-App>'})
      .send({purpose: 'signup', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - Missing Required Properties or has Additional Properties', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request with missing properties
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signup'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({email: 'someemail@wisc.edu'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Request with additional properties
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signup', email: 'someemail@wisc.edu', admin: true});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signup', email: 'someemail@wisc.edu', admin: true});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - Not Supported Purpose', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request with not supported purpose
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'createNewAccount', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'admin', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - sudo purpose request without refreshToken or with expired refreshToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // sudo purpose request without refreshToken
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');

    // sudo purpose request with expired refreshToken
    // Create new refreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    const refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    await testEnv.dbClient
      .container('refreshToken')
      .items.create<RefreshToken>({
        id: refreshToken,
        email: 'existing@wisc.edu',
        expireAt: expireAt.toISOString(),
      });
    // Invalidate refreshToken
    expect(await invalidateToken(testEnv.dbClient, 190)).toBeGreaterThanOrEqual(
      1
    );
    // Request
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'existing@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - sudo purpose request with unmatching refreshToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create new refreshToken
    const tokenContents: AuthToken = {
      id: 'existing@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    const refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testEnv.dbClient.container('refreshToken').items.create<RefreshToken>({
      id: refreshToken,
      email: 'existing@wisc.edu',
      expireAt: expireAt.toISOString(),
    });

    // Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'someemail@wisc.edu'});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - signup purpose request with existing email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signup', email: 'existing@wisc.edu'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signup', email: 'deleted@wisc.edu'});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - signin purpose request with not existing email or deleted/locked email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .send({purpose: 'signin', email: 'locked@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated - Locked User');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<iOS-App-v1>'})
      .send({purpose: 'signin', email: 'deleted@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated - Deleted User');
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .send({purpose: 'signin', email: 'notexisting@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Fail - sudo purpose request with not existing email or deleted/locked email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request - sudo purpose request with locked email
    // Create new refreshToken
    let tokenContents: AuthToken = {
      id: 'locked@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    let refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '180m'}
    );
    let expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testEnv.dbClient.container('refreshToken').items.create<RefreshToken>({
      id: refreshToken,
      email: 'locked@wisc.edu',
      expireAt: expireAt.toISOString(),
    });
    // Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<Android-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'locked@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated - Locked User');

    // Request - sudo purpose request with deleted email
    // Create new refreshToken
    tokenContents = {
      id: 'deleted@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testEnv.dbClient.container('refreshToken').items.create<RefreshToken>({
      id: refreshToken,
      email: 'deleted@wisc.edu',
      expireAt: expireAt.toISOString(),
    });
    // Request
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({'X-APPLICATION-KEY': '<iOS-App-v1>'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'deleted@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated - Deleted User');

    // Request - sudo purpose request with not existing email
    // Create new refreshToken
    tokenContents = {
      id: 'notexisting@wisc.edu',
      type: 'refresh',
      tokenType: 'user',
    };
    refreshToken = jwt.sign(tokenContents, testEnv.testConfig.jwt.refreshKey, {
      algorithm: 'HS512',
      expiresIn: '180m',
    });
    expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 180);
    testEnv.dbClient.container('refreshToken').items.create<RefreshToken>({
      id: refreshToken,
      email: 'notexisting@wisc.edu',
      expireAt: expireAt.toISOString(),
    });
    // Request
    response = await request(testEnv.expressServer.app)
      .post('/auth/request')
      .set({Origin: 'https://collegemate.app'})
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({purpose: 'sudo', email: 'notexisting@wisc.edu'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');

    // DB Checks
    const dbQuery = await testEnv.dbClient
      .container('otp')
      .items.query({
        query: 'SELECT * FROM otp',
      })
      .fetchAll();
    expect(dbQuery.resources.length).toBe(0);
  });

  test('Success - signup purpose', async () => {
    fail();
  });

  test('Success - signin purpose', async () => {
    fail();
  });

  test('Success - sudo purpose', async () => {
    fail();
  });

  test('Success - sudo purpose / with about to expire token', async () => {
    fail();
  });
});
