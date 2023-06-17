/**
 * Jest unit test for POST /auth/request/{requestId}/code method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import TestEnv from '../../TestEnv';

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

  test('Success - signup purpose', () => {
    fail();
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
