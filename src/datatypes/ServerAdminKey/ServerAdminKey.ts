/**
 * Define type and CRUD methods for each serverAdminKey entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import HTTPError from '../../exceptions/HTTPError';

// DB Container id
const SERVER_ADMIN_KEY = 'serverAdminKey';

export type AccountType =
  | 'admin'
  | 'server - authentication'
  | 'server - user'
  | 'server - friend'
  | 'server - schedule'
  | 'server - notification'
  | 'server - miscellaneous';

export default class ServerAdminKey {
  id: string;
  generatedAt: Date | string;
  nickname: string;
  accountType: AccountType;

  /**
   * Constructor for ServerAdminKey Object
   *
   * @param {string} id unique id of ServerAdminKey, indicating the key
   * @param {Date} generatedAt when the key created
   * @param {string} nickname nickname for the key.
   *     Also can be used as a short memo field.
   * @param {AccountType} accountType Type of account
   *     (either admin or specific type of server)
   */
  constructor(
    id: string,
    generatedAt: Date,
    nickname: string,
    accountType: AccountType
  ) {
    this.id = id;
    this.generatedAt = generatedAt;
    this.nickname = nickname;
    this.accountType = accountType;
  }

  /**
   * Create new entry in serverAdminKey container
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {ServerAdminKey} keyObj serverAdminKey information
   * @return {Promise<Cosmos.ItemResponse<ServerAdminKey>>} db operation result
   */
  static async create(
    dbClient: Cosmos.Database,
    keyObj: ServerAdminKey
  ): Promise<Cosmos.ItemResponse<ServerAdminKey>> {
    keyObj.generatedAt = (keyObj.generatedAt as Date).toISOString();

    let dbOps;
    try {
      dbOps = await dbClient
        .container(SERVER_ADMIN_KEY)
        .items.create<ServerAdminKey>(keyObj);
    } catch (e) {
      // Check for duplicated key
      if ((e as Cosmos.ErrorResponse).code === 409) {
        throw new HTTPError(409, 'Duplicated Key');
      } else {
        throw e;
      }
    }

    return dbOps;
  }
}
