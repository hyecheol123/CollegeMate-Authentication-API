/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import AuthToken from '../../datatypes/Token/AuthToken';
import RefreshToken from '../../datatypes/RefreshToken/RefreshToken';

/**
 * Method to generate new refreshToken
 *  - expires within 60min
 *  - using HS512 as hashing algorithm
 *  - contains email
 *  - Saved to DB (Cosmos Database)
 *
 * @param dbClient DB Client (Cosmos Database)
 * @param email contains email
 * @param jwtRefreshKey jwt Refresh Token Secret
 * @return {Promise<string>} JWT refresh Token
 */
export default async function createRefreshToken(
  dbClient: Cosmos.Database,
  email: AuthToken['id'],
  jwtRefreshKey: string
): Promise<string> {
  // Token content
  const tokenContent: AuthToken = {
    id: email,
    type: 'refresh',
    tokenType: 'user',
  };

  // Generate RefreshToken
  const refreshToken = jwt.sign(tokenContent, jwtRefreshKey, {
    algorithm: 'HS512',
    expiresIn: '120m',
  });

  // Database - Add new refresh token
  const expDate = new Date();
  expDate.setMinutes(expDate.getMinutes() + 60);
  RefreshToken.create(dbClient, new RefreshToken(refreshToken, email, expDate));

  return refreshToken;
}
