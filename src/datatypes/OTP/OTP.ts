/**
 * Define type and CRUD methods for each OTP entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import NotFoundError from '../../exceptions/NotFoundError';

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

  /**
   * Read existing OTP document from the database
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} requestId OTP Request ID
   */
  static async read(
    dbClient: Cosmos.Database,
    requestId: string
  ): Promise<OTP> {
    const dbOps = await dbClient.container(OTP_DB).item(requestId).read<OTP>();

    if (dbOps.statusCode === 404 || dbOps.resource === undefined) {
      throw new NotFoundError();
    }

    return new OTP(
      requestId,
      dbOps.resource.email,
      dbOps.resource.purpose,
      new Date(dbOps.resource.expireAt),
      dbOps.resource.passcode,
      dbOps.resource.verified
    );
  }

  /**
   * Set verified flag of given OTP request
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} requestId OTP Request ID
   */
  static async updateSetVerified(
    dbClient: Cosmos.Database,
    requestId: string
  ): Promise<void> {
    const newExpireAt = new Date();
    newExpireAt.setMinutes(newExpireAt.getMinutes() + 10);

    const dbOps = await dbClient
      .container(OTP_DB)
      .item(requestId)
      .patch([
        {op: 'replace', path: '/verified', value: true},
        {op: 'replace', path: '/expireAt', value: newExpireAt.toISOString()},
      ]);

    // istanbul ignore if
    if (dbOps.statusCode === 404 || dbOps.resource === undefined) {
      throw new NotFoundError();
    }
  }
}
