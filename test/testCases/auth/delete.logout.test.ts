/**
 * Jest unit test for DELETE /auth/logout method
 *
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import TestConfig from '../../TestConfig';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import RefreshToken from '../../../src/datatypes/RefreshToken/RefreshToken';

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

    // Create Refresh Token
    const tokenContent = TestConfig.hash(
      'webLogout',
      new Date('2024-05-31T00:12:23.000Z').toISOString(),
      'user - web'
    );

    const testToken = jwt.sign(tokenContent,
      , {
      algorithm: 'HS512',
      expiresIn: '60m',
    });

    // Test with Refresh Token
    const response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${testToken}`]);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({});
  });
});
