/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import * as jwt from 'jsonwebtoken';
import AuthToken from '../../datatypes/Token/AuthToken';
import RefreshToken from '../../datatypes/RefreshToken/RefreshToken';

/**
 * Method to generate new refreshToken
 *  - expires within given minutes
 *  - using HS512 as hashing algorithm
 *  - contains email
 * This method will also push refreshToken to the database
 *
 * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
 * @param {string} email contains email
 * @param {string} jwtRefreshKey jwt Refresh Token Secret
 * @param {number} expireAfterMin time in miniutes refreshToken will expire after
 * @return {string} JWT refresh Token
 */
export default async function createRefreshToken(
  dbClient: Cosmos.Database,
  email: AuthToken['id'],
  jwtRefreshKey: string,
  expireAfterMin: number
): Promise<string> {
  // Token content
  const tokenContent: AuthToken = {
    id: email,
    type: 'refresh',
    tokenType: 'user',
  };

  // Generate RefreshToken
  let token = jwt.sign(tokenContent, jwtRefreshKey, {
    algorithm: 'HS512',
    expiresIn: `${expireAfterMin}m`,
  });

  // DB Operation
  const expireAt = new Date();
  expireAt.setMinutes(expireAt.getMinutes() + expireAfterMin);
  token = expireAt.getMilliseconds().toString().padStart(3, '0') + token;
  const refreshTokenObj = new RefreshToken(token, email, expireAt);
  await RefreshToken.create(dbClient, refreshTokenObj);

  return token;
}
