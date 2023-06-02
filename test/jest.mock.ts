/**
 * File to execute when jest test environmet is started.
 * Mocking some modules
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Request} from 'express';
import NotFoundError from '../src/exceptions/NotFoundError';
import User from '../src/datatypes/User/User';

// User Mock Data
jest.mock('../src/datatypes/User/getUserProfile', () => ({
  __esModule: true,
  default: jest
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .mockImplementation(async (email: string, _req: Request) => {
      let returnValue: User;
      switch (email) {
        case 'existing@wisc.edu':
          returnValue = {
            email: 'existing@wisc.edu',
            nickname: 'existingUser',
            lastLogin: new Date('2023-05-10T00:50:43.000Z'),
            signUpDate: new Date('2022-03-10T00:50:43.000Z'),
            nicknameChanged: new Date('2022-03-10T00:50:43.000Z'),
            deleted: false,
            locked: false,
            major: 'Computer Science',
            graduationYear: 2026,
            tncVersion: 'v1.0.2',
          };
          break;
        case 'locked@wisc.edu':
          returnValue = {
            email: 'locked@wisc.edu',
            nickname: 'lockedUser',
            lastLogin: new Date('2023-05-10T00:50:43.000Z'),
            signUpDate: new Date('2022-03-10T00:50:43.000Z'),
            nicknameChanged: new Date('2022-03-10T00:50:43.000Z'),
            deleted: false,
            locked: true,
            lockedAt: new Date('2023-05-15T00:50:43.000Z'),
            lockedDescription: 'Spam Reports',
            major: 'Computer Science',
            graduationYear: 2026,
            tncVersion: 'v1.0.2',
          };
          break;
        case 'deleted@wisc.edu':
          returnValue = {
            email: 'deleted@wisc.edu',
            nickname: 'deletedUser',
            lastLogin: new Date('2023-05-10T00:50:43.000Z'),
            signUpDate: new Date('2022-03-10T00:50:43.000Z'),
            nicknameChanged: new Date('2022-03-10T00:50:43.000Z'),
            deleted: true,
            deletedAt: new Date('2023-05-18T00:50:43.000Z'),
            locked: false,
            major: 'Computer Science',
            graduationYear: 2026,
            tncVersion: 'v1.0.2',
          };
          break;
        default:
          throw new NotFoundError();
      }
      return returnValue;
    }),
}));

// Mocking Email Sending Module
jest.mock('../src/functions/utils/sendOTPCodeMail', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => Promise.resolve()),
}));
