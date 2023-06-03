/**
 * Define type and CRUD methods for each OTP entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';

// DB Container id
const OTP_DB = 'otp';

export default class OTP {
  id: string;
  email: string;
  purpose: 'signin' | 'signup' | 'sudo';
  expireAt: Date | string;
  passcode: string;
  verified: boolean;

  /**
   * Constructor for OTP Object
   *
   * @param {string} id hashed string indicating the OTP request
   * @param {string} email owner of this OTP request
   * @param {'signin' | 'signup' | 'sudo'} purpose purpose of ths OTP request
   * @param {Date} expireAt the expiration date of request (or passcode)
   * @param {string} passcode hashed string indicates the passcode
   * @param {boolean} verified whether or not this OTP request has been verified or not
   */
  constructor(
    id: string,
    email: string,
    purpose: 'signin' | 'signup' | 'sudo',
    expireAt: Date,
    passcode: string,
    verified: boolean
  ) {
    this.id = id;
    this.email = email;
    this.purpose = purpose;
    this.expireAt = expireAt;
    this.passcode = passcode;
    this.verified = verified;
  }

  /**
   * Create new entry in otp container
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {OTP} otpRequest otp request information
   */
  static async create(
    dbClient: Cosmos.Database,
    otpRequest: OTP
  ): Promise<void> {
    otpRequest.expireAt = (otpRequest.expireAt as Date).toISOString();
    await dbClient.container(OTP_DB).items.create<OTP>(otpRequest);
  }
}
