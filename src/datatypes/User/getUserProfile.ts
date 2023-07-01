/**
 * Function to retrieve User Profile from User API
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Request} from 'express';
import {Buffer} from 'node:buffer';
import ServerAdminKey from '../ServerAdminKey/ServerAdminKey';
import createServerAdminToken from '../../functions/JWT/createServerAdminToken';
import User from './User';

/**
 * Function to retrieve User Profile from User API
 *
 * @param {string} email email address for user
 * @param {Request} req express Request object
 * @return {Promise<User>} User Profile
 */
export default async function getUserProfile(
  email: string,
  req: Request
): Promise<User> {
  const base64Email = Buffer.from(email, 'utf8').toString('base64url');
  let response = await fetch(
    `https://api.collegemate.app/user/${base64Email}`,
    {
      method: 'GET',
      headers: {'X-SERVER-TOKEN': req.app.get('serverAdminToken')},
    }
  );

  if (response.status === 401 || response.status === 403) {
    try {
      const serverAdminKeyInfo = await ServerAdminKey.read(
        req.app.locals.dbClient,
        req.app.get('serverAdminKey')
      );
      req.app.set(
        'serverAdminToken',
        createServerAdminToken(
          serverAdminKeyInfo.nickname,
          serverAdminKeyInfo.accountType,
          req.app.get('jwtAccessKey')
        )
      );
      response = await fetch(
        `https://api.collegemate.app/user/${base64Email}`,
        {
          method: 'GET',
          headers: {'X-SERVER-TOKEN': req.app.get('serverAdminToken')},
        }
      );
    } catch (e) {
      // Something goes wrong during serverAdminToken renewal - 500 Error
      throw new Error('[serverAdminToken renewal fail]\n(e as Error).message');
    }
  }

  if (response.status !== 200) {
    throw new Error('[Fail on retreiving User Profile]');
  }

  // Found requested user
  const userProfileInfo = await response.json();
  return {
    email: email,
    nickname: userProfileInfo.nickname,
    lastLogin: new Date(userProfileInfo.lastLogin),
    signUpDate: new Date(userProfileInfo.signUpDate),
    nicknameChanged: new Date(userProfileInfo.nicknameChanged),
    deleted: userProfileInfo.deleted,
    deletedAt: userProfileInfo.deleted
      ? new Date(userProfileInfo.deletedAt)
      : undefined,
    locked: false,
    lockedAt: userProfileInfo.locked
      ? new Date(userProfileInfo.lockedAt)
      : undefined,
    lockedDescription: userProfileInfo.locked
      ? userProfileInfo.lockedDescription
      : undefined,
    major: userProfileInfo.major,
    graduationYear: userProfileInfo.graduationYear,
    tncVersion: userProfileInfo.tncVersion,
  };
}
