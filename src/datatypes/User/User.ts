/**
 * Define type and methods to communicate with User API
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Request} from 'express';
import {Buffer} from 'node:buffer';
import createServerAdminToken from '../../functions/JWT/createServerAdminToken';
import ServerAdminKey from '../ServerAdminKey/ServerAdminKey';
import NotFoundError from '../../exceptions/NotFoundError';

export default class User {
  email: string;
  nickname: string;
  lastLogin: Date | string;
  signUpDate: Date | string;
  nicknameChanged: Date | string;
  deleted: boolean;
  deletedAt?: Date | string;
  locked: boolean;
  lockedDescription?: string;
  lockedAt?: Date | string;
  major: string;
  graduationYear: number;
  tncVersion: string;

  constructor(
    email: string,
    nickname: string,
    lastLogin: Date,
    signUpDate: Date,
    nicknameChanged: Date,
    deleted: false,
    locked: false,
    major: string,
    graduationYear: number,
    tncVersion: string
  ) {
    this.email = email;
    this.nickname = nickname;
    this.lastLogin = lastLogin;
    this.signUpDate = signUpDate;
    this.nicknameChanged = nicknameChanged;
    this.deleted = deleted;
    this.locked = locked;
    this.major = major;
    this.graduationYear = graduationYear;
    this.tncVersion = tncVersion;
  }

  private userDeleted(deletedAt: Date): void {
    this.deleted = true;
    this.deletedAt = deletedAt;
  }

  private userLocked(lockedDescription: string, lockedAt: Date): void {
    this.locked = true;
    this.lockedDescription = lockedDescription;
    this.lockedAt = lockedAt;
  }

  static async getUserProfile(email: string, req: Request): Promise<User> {
    const base64Email = Buffer.from(email, 'utf8').toString('base64url');
    let response = await fetch(
      `https://api.collegemate.app/user/${base64Email}`,
      {
        method: 'GET',
        headers: {'X-SERVER-TOKEN': req.app.get('serverAdminToken')},
      }
    );

    if (response.status === 401) {
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
        throw new Error(
          '[serverAdminToken renewal fail]\n(e as Error).message'
        );
      }
    }

    if (response.status === 404) {
      // Requested user not found
      throw new NotFoundError();
    } else if (response.status === 200) {
      // Found requested user
      const userProfileInfo = await response.json();
      const user = new User(
        email,
        userProfileInfo.nickname,
        new Date(userProfileInfo.lastLogin),
        new Date(userProfileInfo.signUpDate),
        new Date(userProfileInfo.nicknameChanged),
        false,
        false,
        userProfileInfo.major,
        userProfileInfo.graduationYear,
        userProfileInfo.tncVersion
      );
      if (userProfileInfo.deleted) {
        user.userDeleted(new Date(userProfileInfo.deletedAt));
      }
      if (userProfileInfo.locked) {
        user.userLocked(
          userProfileInfo.lockedDescription,
          new Date(userProfileInfo.lockedAt)
        );
      }
      return user;
    } else {
      throw new Error('[Fail on retreiving User Profile]');
    }
  }
}
