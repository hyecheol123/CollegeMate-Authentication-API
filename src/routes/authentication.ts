/**
 * express Router middleware for Authentication APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import ServerAdminKey from '../datatypes/ServerAdminKey/ServerAdminKey';
import HTTPError from '../exceptions/HTTPError';
import UnauthenticatedError from '../exceptions/UnauthenticatedError';
import ForbiddenError from '../exceptions/ForbiddenError';
import createServerAdminToken from '../functions/JWT/createServerAdminToken';
import verifyRefreshToken from '../functions/JWT/verifyRefreshToken';
import RefreshToken from '../datatypes/RefreshToken/RefreshToken';

// Path: /auth
const authenticationRouter = express.Router();

// POST: /auth/login
authenticationRouter.post('/login', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Header check - serverAdminKey
    const serverKey = req.header('X-SERVER-KEY');
    if (serverKey === undefined) {
      throw new UnauthenticatedError();
    }

    // DB Operation - Check serverAdminKey existence
    let serverAdminKey;
    try {
      serverAdminKey = await ServerAdminKey.read(dbClient, serverKey);
    } catch (e) {
      // istanbul ignore else
      if ((e as HTTPError).statusCode === 404) {
        throw new ForbiddenError();
      } else {
        throw e;
      }
    }

    // Create Access Token (serverAdminToken)
    const serverAdminToken = createServerAdminToken(
      serverAdminKey.nickname,
      serverAdminKey.accountType,
      req.app.get('jwtAccessKey')
    );
    const expiresAt = new Date();
    // To be safe, will show client that
    // this token will be expired after 59 minutes
    expiresAt.setMinutes(expiresAt.getMinutes() + 59);

    // Response
    res.status(200).json({
      serverAdminToken: serverAdminToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

// DELETE: /auth/logout
authenticationRouter.delete('/logout', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  try {
    // Check Origin/applicationKey
    if (
      req.header('Origin') !== req.app.get('webpageOrigin') &&
      !req.app.get('applicationKey').includes(req.header('X-APPLICATION-KEY'))
    ) {
      throw new ForbiddenError();
    }

    // Cookies check - refreshToken
    await verifyRefreshToken(req, req.app.get('jwtRefreshKey'), dbClient);
    const refreshToken = req.cookies('X-REFRESH-TOKEN');

    // DB Operation - Delete refresh token and access token
    try {
      await RefreshToken.delete(dbClient, refreshToken);
    } catch (e) {
      // istanbul ignore if
      if ((e as Cosmos.ErrorResponse).code !== 404) {
        throw e;
      }
    }

    // Clear Cookie & Response
    res.clearCookie('X-ACCESS-TOKEN', {httpOnly: true, maxAge: 0});
    res.clearCookie('X-REFRESH-TOKEN', {httpOnly: true, maxAge: 0});

    // TODO: Send response - 200: Response Header cookie set, boolean value for success
    res.status(200);
  } catch (e) {
    next(e);
  }
});

export default authenticationRouter;
