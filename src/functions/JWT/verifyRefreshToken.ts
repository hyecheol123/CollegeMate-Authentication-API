/**
 * Verifying Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Request} from 'express';
import * as Cosmos from '@azure/cosmos';
import * as jwt from 'jsonwebtoken';
import RefreshTokenVerifyResult from '../../datatypes/Token/RefreshTokenVerifyResult';
import AuthToken, {JWTObject} from '../../datatypes/Token/AuthToken';
import UnauthenticatedError from '../../exceptions/UnauthenticatedError';
import ForbiddenError from '../../exceptions/ForbiddenError';
import RefreshToken from '../../datatypes/RefreshToken/RefreshToken';
import HTTPError from '../../exceptions/HTTPError';

/**
 * Function to verify refreshToken
 *
 * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
 * @param {Request} req Express request object
 * @param {string} jwtRefreshKey JWT Secret
 * @returns
 */
export default async function verifyRefreshToken(
  dbClient: Cosmos.Database,
  req: Request,
  jwtRefreshKey: string
): Promise<RefreshTokenVerifyResult> {
  if (!('X-REFRESH-TOKEN' in req.cookies)) {
    throw new UnauthenticatedError();
  }

  let tokenContents: JWTObject;
  try {
    // Check validity of token
    tokenContents = jwt.verify(
      req.cookies['X-REFRESH-TOKEN'].substring(3),
      jwtRefreshKey,
      {
        algorithms: ['HS512'],
      }
    ) as JWTObject;
  } catch (e) {
    throw new ForbiddenError();
  }
  if (tokenContents.type !== 'refresh') {
    throw new ForbiddenError();
  }

  // Check token in DB
  let dbRefreshToken;
  try {
    dbRefreshToken = await RefreshToken.read(
      dbClient,
      req.cookies['X-REFRESH-TOKEN']
    );
    // istanbul ignore if
    if (dbRefreshToken.expireAt < new Date()) {
      throw new ForbiddenError();
    }
  } catch (e) {
    // istanbul ignore else
    if ((e as HTTPError).statusCode === 404) {
      throw new ForbiddenError();
    } else {
      throw e;
    }
  }

  // If RefreshToken expires within 20 minute, we have to notify user
  const expectedExpire = new Date();
  expectedExpire.setMinutes(expectedExpire.getMinutes() + 20);
  const willExpireSoon = new Date(dbRefreshToken.expireAt) < expectedExpire;

  delete tokenContents.iat;
  delete tokenContents.exp;
  return {content: tokenContents as AuthToken, aboutToExpire: willExpireSoon};
}
