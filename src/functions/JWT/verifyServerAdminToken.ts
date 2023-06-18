/**
 * Verifying Server Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as jwt from 'jsonwebtoken';
import AuthToken, {JWTObject} from '../../datatypes/Token/AuthToken';
import ForbiddenError from '../../exceptions/ForbiddenError';
import checkAccountType from '../inputValidator/checkAccountType';

/**
 * Method to verify serverAdminToken
 *
 * @param {string} serverAdminToken JWT serverAdminToken
 * @param {string} jwtAccessKey jwt access key secret
 * @return {AuthToken} authentication token content
 */
export default function verifyServerAdminToken(
  serverAdminToken: string,
  jwtAccessKey: string
): AuthToken {
  let tokenContents: JWTObject;
  try {
    // Check validity of token
    tokenContents = jwt.verify(serverAdminToken, jwtAccessKey, {
      algorithms: ['HS512'],
    }) as JWTObject;
  } catch (e) {
    throw new ForbiddenError();
  }

  // Check token content
  if (
    tokenContents.type !== 'access' ||
    tokenContents.tokenType !== 'serverAdmin' ||
    tokenContents.accountType === undefined ||
    !checkAccountType(tokenContents.accountType)
  ) {
    throw new ForbiddenError();
  }

  // return
  delete tokenContents.iat;
  delete tokenContents.exp;
  return tokenContents as AuthToken;
}
