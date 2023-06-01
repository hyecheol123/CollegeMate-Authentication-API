/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import * as jwt from 'jsonwebtoken';
import AuthToken from '../../datatypes/Token/AuthToken';

/**
 * Method to generate new refreshToken
 *  - expires within 60min
 *  - using HS512 as hashing algorithm
 *  - contains email
 *
 * @param email contains email
 * @param jwtRefreshKey jwt Refresh Token Secret
 * @return {string} JWT refresh Token
 */
export default function createRefreshToken(
  email: AuthToken['id'],
  jwtRefreshKey: string
): string {
  // Token content
  const tokenContent: AuthToken = {
    id: email,
    type: 'refresh',
    tokenType: 'user',
  };

  // Generate RefreshToken
  return jwt.sign(tokenContent, jwtRefreshKey, {
    algorithm: 'HS512',
    expiresIn: '60m',
  });
}
