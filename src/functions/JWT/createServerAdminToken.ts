/**
 * Generate new Server Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as jwt from 'jsonwebtoken';
import AuthToken, {AccountType} from '../../datatypes/Token/AuthToken';

/**
 * Method to generate a new serverAdminToken
 *   - expires within 60min
 *   - using HS512 as hashing algorithm
 *   - contains key's nickname and accountType
 *
 * @param {AuthToken['id']} keyNickname unique nickname of associated key
 * @param {AccountType} accountType indicates key owner's role
 * @param {string} jwtAccessKey jwt access key secret
 * @returns {string} JWT access token (used for serverAdminToken)
 */
export default function createServerAdminToken(
  keyNickname: AuthToken['id'],
  accountType: AccountType,
  jwtAccessKey: string
): string {
  const tokenContent: AuthToken = {
    id: keyNickname,
    type: 'access',
    tokenType: 'serverAdmin',
    accountType: accountType,
  };

  // Generate AccessToken
  return jwt.sign(tokenContent, jwtAccessKey, {
    algorithm: 'HS512',
    expiresIn: '60m',
  });
}
