/**
 * express Router middleware for Authentication APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import {Client} from '@microsoft/microsoft-graph-client';
import ServerConfig from '../ServerConfig';
import ServerAdminKey from '../datatypes/ServerAdminKey/ServerAdminKey';
import OTP from '../datatypes/OTP/OTP';
import User from '../datatypes/User/User';
import getUserProfile from '../datatypes/User/getUserProfile';
import getTnC from '../datatypes/TNC/getTnC';
import RefreshToken from '../datatypes/RefreshToken/RefreshToken';
import RefreshTokenVerifyResult from '../datatypes/Token/RefreshTokenVerifyResult';
import HTTPError from '../exceptions/HTTPError';
import UnauthenticatedError from '../exceptions/UnauthenticatedError';
import ForbiddenError from '../exceptions/ForbiddenError';
import BadRequestError from '../exceptions/BadRequestError';
import ConflictError from '../exceptions/ConflictError';
import PasscodeNotMatchError from '../exceptions/PasscodeNotMatchError';
import createServerAdminToken from '../functions/JWT/createServerAdminToken';
import createAccessToken from '../functions/JWT/createAccessToken';
import createRefreshToken from '../functions/JWT/createRefreshToken';
import verifyRefreshToken from '../functions/JWT/verifyRefreshToken';
import verifyServerAdminToken from '../functions/JWT/verifyServerAdminToken';
import {validateInitiateOTPRequest} from '../functions/inputValidator/validateInitiateOTPRequest';
import {validateEnterOTPCodeRequest} from '../functions/inputValidator/validateEnterOTPCodeRequest';
import sendOTPCodeMail from '../functions/utils/sendOTPCodeMail';
import getPasscode from '../functions/utils/getPasscode';
import {validateRenewTokenRequest} from '../functions/inputValidator/validateRenewTokenRequest';
import updateLastLogin from '../datatypes/User/updateLastLogin';

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
        dbClient,
        req,
        req.app.get('jwtRefreshKey')
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
    const passcode = getPasscode();
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

// POST: /auth/request/{requestId}/code
authenticationRouter.post(
  '/request/:requestId/code',
  async (req, res, next) => {
    const dbClient: Cosmos.Database = req.app.locals.dbClient;
    const requestId = req.params.requestId;

    try {
      // Check Origin/applicationKey
      if (
        req.header('Origin') !== req.app.get('webpageOrigin') &&
        !req.app.get('applicationKey').includes(req.header('X-APPLICATION-KEY'))
      ) {
        throw new ForbiddenError();
      }

      // Check Request Body
      type EnterOTPCodeRequest = {
        email: string;
        passcode: string;
        staySignedIn?: boolean;
      };
      const enterOTPCodeRequestBody: EnterOTPCodeRequest = req.body;
      if (!validateEnterOTPCodeRequest(enterOTPCodeRequestBody)) {
        throw new BadRequestError();
      }
      if (
        !req.app
          .get('applicationKey')
          .includes(req.header('X-APPLICATION-KEY')) && // Not Mobile
        enterOTPCodeRequestBody.staySignedIn !== undefined // Should not be set
      ) {
        throw new BadRequestError();
      }

      // Check OTP DB Container (Match email)
      const otpObject = await OTP.read(dbClient, requestId);
      if (otpObject.email !== enterOTPCodeRequestBody.email) {
        throw new BadRequestError();
      }
      if (otpObject.verified || (otpObject.expireAt as Date) < new Date()) {
        throw new ConflictError();
      }

      // Check refreshToken if needed (sudo purpose)
      let refreshTokenVerifyResult: RefreshTokenVerifyResult | undefined;
      if (otpObject.purpose === 'sudo') {
        refreshTokenVerifyResult = await verifyRefreshToken(
          dbClient,
          req,
          req.app.get('jwtRefreshKey')
        );
        if (
          refreshTokenVerifyResult.content.id !==
            enterOTPCodeRequestBody.email ||
          refreshTokenVerifyResult.content.id !== otpObject.email
        ) {
          throw new ForbiddenError();
        }
      }

      // Retrieve user information (USER API)
      let userProfile: User | undefined = undefined;
      try {
        userProfile = await getUserProfile(otpObject.email, req);
      } catch (e) {
        // istanbul ignore else
        if ((e as HTTPError).statusCode === 404) {
          // signin and sudo should have user information in the database
          if (otpObject.purpose === 'signin' || otpObject.purpose === 'sudo') {
            throw new UnauthenticatedError();
          }
        } else {
          throw e;
        }
      }
      if (userProfile) {
        if (otpObject.purpose === 'signup') {
          // signup - should not have user information in the database
          throw new ConflictError();
        } else {
          // If signin and sudo request from delete or locked user, throw error.
          if (userProfile.deleted || userProfile.locked) {
            throw new UnauthenticatedError();
          }
        }
      }

      // Match Passcode
      const hashedPasscode = ServerConfig.hash(
        otpObject.email,
        otpObject.purpose,
        enterOTPCodeRequestBody.passcode
      );
      if (hashedPasscode !== otpObject.passcode) {
        throw new PasscodeNotMatchError();
      }

      // DB Operations - Update verified tag
      const verificationExpiresAt = new Date();
      verificationExpiresAt.setMinutes(verificationExpiresAt.getMinutes() + 10);
      await OTP.updateSetVerified(dbClient, requestId);

      // Create new tokens (signin and signup)
      const tokens = {access: '', refresh: ''};
      let refreshTokenExpiresAfter = 0;
      if (otpObject.purpose === 'signup') {
        refreshTokenExpiresAfter = 60;
      } else if (otpObject.purpose === 'signin') {
        refreshTokenExpiresAfter = enterOTPCodeRequestBody.staySignedIn
          ? 60 * 24 * 30
          : 180;
      }
      if (otpObject.purpose === 'signin' || otpObject.purpose === 'signup') {
        tokens.access = createAccessToken(
          otpObject.email,
          req.app.get('jwtAccessKey')
        );
        tokens.refresh = await createRefreshToken(
          dbClient,
          otpObject.email,
          req.app.get('jwtRefreshKey'),
          refreshTokenExpiresAfter
        );
      }

      // Retrieve most recent TNC Version (Miscellaneous API / signin)
      let needNewTNCAccpet: boolean | undefined = undefined;
      if (otpObject.purpose === 'signin' && userProfile) {
        const recentTnC = await getTnC(req);
        if (userProfile.tncVersion < recentTnC.version) {
          needNewTNCAccpet = true;
        }
      }

      // Response
      if (otpObject.purpose === 'sudo') {
        res.status(200).json({
          verificationExpiresAt: verificationExpiresAt.toISOString(),
          shouldRenewToken: refreshTokenVerifyResult?.aboutToExpire
            ? true
            : undefined,
        });
      } else {
        const cookieOption: express.CookieOptions = {
          httpOnly: true,
          maxAge: 10 * 60,
          secure: true,
          domain: req.app.get('serverDomain'),
          sameSite: 'strict',
        };
        res.cookie('X-ACCESS-TOKEN', tokens.access, cookieOption);
        cookieOption.maxAge = refreshTokenExpiresAfter * 60;
        cookieOption.domain = `${req.app.get('serverDomain')}`;
        cookieOption.path = '/auth';
        res.cookie('X-REFRESH-TOKEN', tokens.refresh, cookieOption);
        res.status(201).json({
          needNewTNCAccpet: needNewTNCAccpet ? true : undefined,
        });
      }
    } catch (e) {
      next(e);
    }
  }
);

// GET: /auth/request/{requestId}/verify
authenticationRouter.get(
  '/request/:requestId/verify',
  async (req, res, next) => {
    const dbClient: Cosmos.Database = req.app.locals.dbClient;

    try {
      // Header check - serverAdminToken
      const serverToken = req.header('X-SERVER-TOKEN');
      if (serverToken === undefined) {
        throw new UnauthenticatedError();
      }
      verifyServerAdminToken(serverToken, req.app.get('jwtAccessKey'));

      // DB Operation
      const requestId = req.params.requestId;
      const otpContent = await OTP.read(dbClient, requestId);

      // if signin, update lastLogin of the user
      if (otpContent.purpose === 'signin') {
        await updateLastLogin(otpContent.email, req);
      }

      // Response
      res.status(200).json({
        email: otpContent.email,
        purpose: otpContent.purpose,
        verified: otpContent.verified,
        expireAt: otpContent.verified
          ? (otpContent.expireAt as Date).toISOString()
          : undefined,
      });
    } catch (e) {
      next(e);
    }
  }
);

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
    await verifyRefreshToken(dbClient, req, req.app.get('jwtRefreshKey'));
    const refreshToken = req.cookies['X-REFRESH-TOKEN'];

    // DB Operation - Delete refresh token and access token
    try {
      await RefreshToken.delete(dbClient, refreshToken);
    } catch (e) {
      // istanbul ignore next
      if ((e as HTTPError).statusCode !== 404) {
        throw e;
      }
    }

    // Send response - 200: Response Header cookie set
    res.clearCookie('X-ACCESS-TOKEN', {httpOnly: true, maxAge: 0});
    res.clearCookie('X-REFRESH-TOKEN', {httpOnly: true, maxAge: 0});
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// GET: /auth/renew
authenticationRouter.get('/renew', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Check Origin/applicationKey
    if (
      req.header('Origin') !== req.app.get('webpageOrigin') &&
      !req.app.get('applicationKey').includes(req.header('X-APPLICATION-KEY'))
    ) {
      throw new ForbiddenError();
    }

    const tokenVerifyRequest: {renewRefreshToken: boolean} = req.body;
    if (!validateRenewTokenRequest(tokenVerifyRequest)) {
      throw new BadRequestError();
    }

    // Cookies check - refreshToken
    const tokenVerifyResult = await verifyRefreshToken(
      dbClient,
      req,
      req.app.get('jwtRefreshKey')
    );

    let refreshToken: string | undefined;
    // Check only when renewing refreshToken
    if (tokenVerifyRequest.renewRefreshToken) {
      // Retrieve user information (USER API)
      let userProfile: User | undefined;
      try {
        userProfile = await getUserProfile(tokenVerifyResult.content.id, req);
      } catch (e) {
        // istanbul ignore else
        if ((e as HTTPError).statusCode === 404) {
          // RefreshToken generated by SignUp OTP Request
          throw new ForbiddenError();
        } else {
          throw e;
        }
      }

      // If user is deleted or locked and renewRefreshToken is true, throw error
      if (userProfile.deleted || userProfile.locked) {
        throw new ForbiddenError();
      }

      // Renew access token, and refresh token if needed
      if (tokenVerifyResult.aboutToExpire) {
        refreshToken = await createRefreshToken(
          dbClient,
          tokenVerifyResult.content.id,
          req.app.get('jwtRefreshKey'),
          180
        );
      }
    }

    const accessToken = createAccessToken(
      tokenVerifyResult.content.id,
      req.app.get('jwtAccessKey')
    );

    // Send response - 200: Response Header cookie set
    const cookieOption: express.CookieOptions = {
      httpOnly: true,
      maxAge: 10 * 60,
      secure: true,
      domain: req.app.get('serverDomain'),
      sameSite: 'strict',
    };
    res.cookie('X-ACCESS-TOKEN', accessToken, cookieOption);

    if (refreshToken !== undefined) {
      cookieOption.maxAge = 180 * 60;
      cookieOption.domain = req.app.get('serverDomain');
      cookieOption.path = '/auth';
      res.cookie('X-REFRESH-TOKEN', refreshToken, cookieOption);
    }
    res.status(200).send();
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
