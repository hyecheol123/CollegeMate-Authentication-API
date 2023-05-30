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
import BadRequestError from '../exceptions/BadRequestError';
import RefreshTokenVerifyResult from '../datatypes/Token/RefreshTokenVerifyResult';
import createServerAdminToken from '../functions/JWT/createServerAdminToken';
import {validateInitiateOTPRequest} from '../functions/inputValidator/validateInitiateOTPRequest';
import verifyRefreshToken from '../functions/JWT/verifyRefreshToken';

// Path: /auth
const authenticationRouter = express.Router();

// POST: /auth/request
authenticationRouter.post('/request', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Check Origin/applicationKey
    if (
      req.header('Origin') !== req.app.get('webpageOrigin') &&
      !req.app.get('applicationKey').includes(req.header('X-APPLICATION-KEY'))
    ) {
      throw new ForbiddenError();
    }

    // Check requestBody
    type InitiateOTPRequest = {
      email: string;
      purpose: 'signup' | 'signin' | 'sudo';
    };
    const initiateOTPRequestBody: InitiateOTPRequest = req.body;
    if (!validateInitiateOTPRequest(initiateOTPRequestBody)) {
      throw new BadRequestError();
    }

    // Check refreshToken if needed (sudo purpose)
    let refreshTokenVerifyResult: RefreshTokenVerifyResult;
    if (initiateOTPRequestBody.purpose === 'sudo') {
      refreshTokenVerifyResult = await verifyRefreshToken(
        req,
        req.app.get('jwtRefreshKey'),
        dbClient
      );
    }

    // TODO: Retrieve user information (USER API)
    // TODO: DB Operation
    // TODO: Send Code
    // TODO: Response
  } catch (e) {
    next(e);
  }
});

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

export default authenticationRouter;
