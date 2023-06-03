/**
 * Define type and CRUD methods for each refreshToken entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import NotFoundError from '../../exceptions/NotFoundError';

// DB Container id
const REFRESH_TOKEN = 'refreshToken';

export default class RefreshToken {
  id: string;
  email: string;
  expireAt: Date | string;

  /**
   * Constructor for RefreshToken Object
   *
   * @param {string} id unique id of object, indicating JWT token
   * @param {string} email token owner's email
   * @param {Date} expireAt time that token will be expires
   */
  constructor(id: string, email: string, expireAt: Date) {
    this.id = id;
    this.email = email;
    this.expireAt = expireAt;
  }

  /**
   * Create new entry in RefreshToken container
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {RefreshToken} refreshTokenObj refreshToken information
   */
  static async create(
    dbClient: Cosmos.Database,
    refreshTokenObj: RefreshToken
  ): Promise<void> {
    refreshTokenObj.expireAt = (refreshTokenObj.expireAt as Date).toISOString();
    await dbClient
      .container(REFRESH_TOKEN)
      .items.create<RefreshToken>(refreshTokenObj);
  }

  /**
   * Retrieve RefreshToken data with given key
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} token JWT refreshToken
   */
  static async read(
    dbClient: Cosmos.Database,
    token: string
  ): Promise<RefreshToken> {
    const dbOps = await dbClient.container(REFRESH_TOKEN).item(token).read();

    if (dbOps.statusCode === 404) {
      throw new NotFoundError();
    }

    return new RefreshToken(
      token,
      dbOps.resource.email,
      new Date(dbOps.resource.expireAt)
    );
  }

  /**
   * Delete entry in RefreshToken container
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} refreshToken refreshToken
   */
  static async delete(
    dbClient: Cosmos.Database,
    refreshToken: string
  ): Promise<void> {
    try {
      await dbClient.container(REFRESH_TOKEN).item(refreshToken).delete();
    } catch (e) {
      // istanbul ignore next
      if ((e as Cosmos.ErrorResponse).code === 404) {
        throw new NotFoundError();
      } else {
        throw e;
      }
    }
  }
}
