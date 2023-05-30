/**
 * Define type and CRUD methods for each serverAdminKey entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import HTTPError from '../../exceptions/HTTPError';
import NotFoundError from '../../exceptions/NotFoundError';
import MetaData from './MetaData';
import {AccountType} from '../Token/AuthToken';

// DB Container id
const SERVER_ADMIN_KEY = 'serverAdminKey';

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
   * @return {Promise<string>} newly created key
   */
  static async create(
    dbClient: Cosmos.Database,
    keyObj: ServerAdminKey
  ): Promise<string> {
    keyObj.generatedAt = (keyObj.generatedAt as Date).toISOString();

    let dbOps;
    try {
      dbOps = await dbClient
        .container(SERVER_ADMIN_KEY)
        .items.create<ServerAdminKey>(keyObj);
    } catch (e) {
      // Check for duplicated key
      // istanbul ignore else
      if ((e as Cosmos.ErrorResponse).code === 409) {
        throw new HTTPError(409, 'Duplicated Key or Nickname');
      } else {
        throw e;
      }
    }

    return dbOps.item.id;
  }

  /**
   * Retrieve ServerAdminKey data of given key
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} key key to specify serverAdminKey entry
   * @return {Promise<ServerAdminKey>} a ServerAdminKey entry
   */
  static async read(
    dbClient: Cosmos.Database,
    key: string
  ): Promise<ServerAdminKey> {
    const dbOps = await dbClient.container(SERVER_ADMIN_KEY).item(key).read();

    if (dbOps.statusCode === 404) {
      throw new NotFoundError();
    }

    return new ServerAdminKey(
      key,
      new Date(dbOps.resource.generatedAt),
      dbOps.resource.nickname,
      dbOps.resource.accountType
    );
  }

  /**
   * Retrieve Metadata of existing ServerAdminKey
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @return {Promise<MetaData[]>} list of metadata of ServerAdminKey
   *     (contains nickname, generatedAt, accountType)
   */
  static async readMetaData(dbClient: Cosmos.Database): Promise<MetaData[]> {
    return (
      await dbClient
        .container(SERVER_ADMIN_KEY)
        .items.query<MetaData>({
          query: String.prototype.concat(
            'SELECT a.generatedAt, a.nickname, a.accountType ',
            `FROM ${SERVER_ADMIN_KEY} as a ORDER BY a.generatedAt`
          ),
        })
        .fetchAll()
    ).resources;
  }

  /**
   * Delete existing ServerAdminKey entry by key
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} key unique key to identify server or admin
   */
  static async deleteByKey(
    dbClient: Cosmos.Database,
    key: string
  ): Promise<void> {
    try {
      await dbClient.container(SERVER_ADMIN_KEY).item(key).delete();
    } catch (e) {
      // istanbul ignore else
      if ((e as Cosmos.ErrorResponse).code === 404) {
        throw new NotFoundError();
      } else {
        throw e;
      }
    }
  }

  /**
   * Delete existing ServerAdminKey entry by nickname
   *
   * @param {Cosmos.Database} dbClient DB Client (Cosmos Database)
   * @param {string} nickname nickname associated with the key
   */
  static async deleteByNickname(
    dbClient: Cosmos.Database,
    nickname: string
  ): Promise<void> {
    const dbOps = await dbClient
      .container(SERVER_ADMIN_KEY)
      .items.query<ServerAdminKey>({
        query: String.prototype.concat(
          `SELECT a.id FROM ${SERVER_ADMIN_KEY} as a `,
          'WHERE a.nickname = @nickname'
        ),
        parameters: [{name: '@nickname', value: nickname}],
      })
      .fetchAll();
    if (dbOps.resources.length === 0) {
      throw new NotFoundError();
    }

    await this.deleteByKey(dbClient, dbOps.resources[0].id);
  }
}
