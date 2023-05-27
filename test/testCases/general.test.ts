/**
 * Jest unit test for Express Server Setup (General Behaviors)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../TestEnv';
import ExpressServer from '../../src/ExpressServer';

describe('General Behaviors', () => {
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

  test('Not Found', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    const response = await request(testEnv.expressServer.app)
      .post('/not-existing-path')
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Not Permitted Methods', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;

    let response = await request(testEnv.expressServer.app)
      .options('/auth/login')
      .send();
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');

    response = await request(testEnv.expressServer.app)
      .trace('/auth/login')
      .send();
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');
  });
});
