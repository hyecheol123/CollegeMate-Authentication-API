/**
 * Jest Unit Test for GET /auth/request/{requestId}/verify method
 * 
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import TestEnv from "../../TestEnv";

describe('GET /auth/request/{requestId}/verify - Verify OTP Request', () => {
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

  test('Success - signup purpose', () => {
    fail();
  });

  test('Success - signin purpose', () => {
    fail();
  });

  test('Success - sudo purpose', () => {
    fail();
  });
});