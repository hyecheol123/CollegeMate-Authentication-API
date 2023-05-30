/**
 * Define 401 Unauthenticated Error based on HTTPError
 * Contains HTTP Status code and message for commonly used 401 Unauthenticated
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import HTTPError from './HTTPError';

/**
 * Unauthenticated Error is type of HTTPError of which status code is 401
 */
export default class UnauthenticatedError extends HTTPError {
  /**
   * Constructor for Unauthenticated Error
   */
  constructor() {
    super(401, 'Unauthenticated');
  }
}
