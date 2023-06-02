/**
 * express Router middleware for Authentication APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import {Client} from '@microsoft/microsoft-graph-client';
import ServerAdminKey from '../datatypes/ServerAdminKey/ServerAdminKey';
import OTP from '../datatypes/OTP/OTP';
import getUserProfile from '../datatypes/User/getUserProfile';
import HTTPError from '../exceptions/HTTPError';
import UnauthenticatedError from '../exceptions/UnauthenticatedError';
import ForbiddenError from '../exceptions/ForbiddenError';
import BadRequestError from '../exceptions/BadRequestError';
import ConflictError from '../exceptions/ConflictError';
import RefreshTokenVerifyResult from '../datatypes/Token/RefreshTokenVerifyResult';
import createServerAdminToken from '../functions/JWT/createServerAdminToken';
import {validateInitiateOTPRequest} from '../functions/inputValidator/validateInitiateOTPRequest';
import sendOTPCodeMail from '../functions/utils/sendOTPCodeMail';
import verifyRefreshToken from '../functions/JWT/verifyRefreshToken';
import ServerConfig from '../ServerConfig';
import {randomInt} from 'crypto';
import User from '../datatypes/User/User';

// Path: /auth
const authenticationRouter = express.Router();

// POST: /auth/request
authenticationRouter.post('/request', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const msGraphClient: Client = req.app.locals.msGraphClient;

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
    let refreshTokenVerifyResult: RefreshTokenVerifyResult | undefined;
    if (initiateOTPRequestBody.purpose === 'sudo') {
      refreshTokenVerifyResult = await verifyRefreshToken(
        req,
        req.app.get('jwtRefreshKey'),
        dbClient
      );
      if (
        refreshTokenVerifyResult.content.id !== initiateOTPRequestBody.email
      ) {
        throw new ForbiddenError();
      }
    }

    // Retrieve user information (USER API)
    let userProfile: User | undefined = undefined;
    try {
      userProfile = await getUserProfile(initiateOTPRequestBody.email, req);
    } catch (e) {
      // istanbul ignore else
      if ((e as HTTPError).statusCode === 404) {
        // signin and sudo should have user information in the database
        if (
          initiateOTPRequestBody.purpose === 'signin' ||
          initiateOTPRequestBody.purpose === 'sudo'
        ) {
          throw new UnauthenticatedError();
        }
      } else {
        throw e;
      }
    }
    if (userProfile) {
      if (initiateOTPRequestBody.purpose === 'signup') {
        // signup - should not have user information in the database
        throw new ConflictError();
      } else {
        // If signin and sudo request from delete or locked user, throw error.
        if (userProfile.deleted) {
          throw new HTTPError(401, 'Unauthenticated - Deleted User');
        } else if (userProfile.locked) {
          throw new HTTPError(401, 'Unauthenticated - Locked User');
        }
      }
    }

    // DB Operation
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 3);
    const passcode = randomInt(0, 1000000)
      .toString()
      .padStart(6, randomInt(0, 10).toString());
    const id = ServerConfig.hash(
      initiateOTPRequestBody.email,
      initiateOTPRequestBody.purpose,
      expireAt.toISOString()
    );
    const hashedPasscode = ServerConfig.hash(
      initiateOTPRequestBody.email,
      initiateOTPRequestBody.purpose,
      passcode
    );
    const otpRequestInformation = new OTP(
      id,
      initiateOTPRequestBody.email,
      initiateOTPRequestBody.purpose,
      expireAt,
      hashedPasscode,
      false
    );
    await OTP.create(dbClient, otpRequestInformation);

    // Send Code
    await sendOTPCodeMail(
      msGraphClient,
      req.app.get('azureUserObjId'),
      req.app.get('noReplyEmailAddress'),
      req.app.get('mainEmailAddress'),
      initiateOTPRequestBody.email,
      passcode
    );

    // Response
    res.status(201).json({
      requestId: id,
      codeExpireAt: expireAt.toISOString(),
      shouldRenewToken:
        refreshTokenVerifyResult !== undefined &&
        refreshTokenVerifyResult.aboutToExpire
          ? true
          : undefined,
    });
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
