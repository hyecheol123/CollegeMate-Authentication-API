/**
 * Define Passcode Not Match Error based on HTTPError
 * Contains HTTP Status code and message for
 *     non-standard Passcode Not Match Error
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import HTTPError from './HTTPError';

/**
 * Passcode Not Match Error is a type of HTTPError, of which status code is 499
 */
export default class PasscodeNotMatchError extends HTTPError {
  /**
   * Constructor for Passcode Not Match Error
   */
  constructor() {
    super(499, 'Passcode Not Match');
  }
}
