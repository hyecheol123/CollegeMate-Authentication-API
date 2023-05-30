/**
 * Define 403 Forbidden Error based on HTTPError
 * Contains HTTP Status code and message for commonly used 403 Forbidden
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import HTTPError from './HTTPError';

/**
 * Forbidden Error is type of HTTPError of which status code is 403
 */
export default class ForbiddenError extends HTTPError {
  /**
   * Constructor for Forbidden Error
   */
  constructor() {
    super(403, 'Forbidden');
  }
}
