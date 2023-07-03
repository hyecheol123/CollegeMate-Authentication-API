/**
 * Function to update last login date of user with User API
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import {Request} from 'express';
import {Buffer} from 'node:buffer';
import ServerAdminKey from '../ServerAdminKey/ServerAdminKey';
import createServerAdminToken from '../../functions/JWT/createServerAdminToken';

/**
 * Function to update last login date of user with User API
 *
 * @param {string} email email address for user
 * @param {Request} req express Request object
 */
export default async function updateLastLogin(
  email: string,
  req: Request
): Promise<void> {
  const base64Email = Buffer.from(email, 'utf8').toString('base64url');
  const updateTime = new Date().toISOString();
  let response = await fetch(
    `https://api.collegemate.app/user/profile/${base64Email}/lastLogin`,
    {
      method: 'POST',
      headers: {'X-SERVER-TOKEN': req.app.get('serverAdminToken')},
      body: JSON.stringify({lastLogin: updateTime}),
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
    } catch (e) {
      // Something goes wrong during serverAdminToken renewal - 500 Error
      throw new Error('[serverAdminToken renewal fail]\n(e as Error).message');
    }

    response = await fetch(
      `https://api.collegemate.app/user/profile/${base64Email}/lastLogin`,
      {
        method: 'POST',
        headers: {'X-SERVER-TOKEN': req.app.get('serverAdminToken')},
        body: JSON.stringify({lastLogin: updateTime}),
      }
    );
  }

  if (response.status !== 200) {
    throw new Error('[Fail on updating User lastLogin]');
  }
}
