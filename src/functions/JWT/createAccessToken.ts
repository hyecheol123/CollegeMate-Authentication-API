/**
 * Generate new Access Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as jwt from 'jsonwebtoken';
import AuthToken from '../../datatypes/Token/AuthToken';

/**
 * Method to generate new accessToken
 *   - expires within 10 min
 *   - using HS512 as hashing algorithm
 *   - contains email
 *
 * @param {AuthToken['id']} email email address of user
 * @param {string} jwtKey jwt secret
 * @return {string} JWT access token
 */
export default function createAccessToken(
  email: AuthToken['id'],
  jwtKey: string
): string {
  // Token Content
  const tokenContent: AuthToken = {
    id: email,
    type: 'access',
    tokenType: 'user',
  };

  // Generate AccessToken
  return jwt.sign(tokenContent, jwtKey, {
    algorithm: 'HS512',
    expiresIn: '10m',
  });
}
