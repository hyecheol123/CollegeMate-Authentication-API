/**
 * Jest unit test for utility to list metadata of all existing ServerAdminKey
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import TestEnv from '../../TestEnv';
import listServerAdminKey from '../../../src/functions/utils/listServerAdminKey';

describe('Utility - listServerAdminKey function', () => {
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

  test('Success - Existing ServerAdminKey', async () => {
    // Call listServerAdminKey function
    const metadata = await listServerAdminKey(testEnv.testConfig);
    expect(metadata.length).toBe(2);
    expect(metadata[0].nickname).toBe('testAdmin');
    expect(metadata[0].accountType).toBe('admin');
    expect(metadata[1].nickname).toBe('testAuthAPI');
    expect(metadata[1].accountType).toBe('server - authentication');
    // Check keys are not included in metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((metadata[0] as any).id).toBe(undefined);
  });
});
