/**
 * Define 409 Conflict Error based on HTTPError
 * Contains HTTP Status code and message for commonly caused
 *     400 Conflict Error
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import HTTPError from './HTTPError';

/**
 * Conflict Error is a type of HTTPError, of which status code is 409
 */
export default class ConflictError extends HTTPError {
  /**
   * Constructor for Conflict Error
   */
  constructor() {
    super(409, 'Conflict');
  }
}
