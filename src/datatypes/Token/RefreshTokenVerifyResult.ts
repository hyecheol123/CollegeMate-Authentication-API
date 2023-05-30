/**
 * Define type for the objects that contains the result
 * for RefreshToken verification
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import AuthToken from './AuthToken';

/**
 * Interface to define RefreshToken's verification result
 * When RefreshToken is about to expire, aboutToExpire flag is set.
 */
export default interface RefreshTokenVerifyResult {
  content: AuthToken;
  aboutToExpire: boolean;
}
