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

  test('Fail: No Refresh Token', async () => {
    fail();
  });

  test('Fail: Expired Refresh Token', async () => {
    fail();
  });

  test('Fail: Request from Wrong Origin', async () => {
    fail();
  });

  test('Fail: No Application Key and Not Web', async () => {
    fail();
  });

  test('Fail: Wrong Token', async () => {
    fail();
  });

  test('Succes: With Application Key', async () => {
    fail();
  });

  test('Succes: With Application Key and Request Body', async () => {
    fail();
  });

  test('Succes: With Web', async () => {
    fail();
  });

  test('Succes: With Web and Request Body', async () => {
    fail();
  });
});
