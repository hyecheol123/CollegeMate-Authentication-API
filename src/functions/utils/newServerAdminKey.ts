/**
 * Utility to add new admin/server key
 *  - Able to be called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import {BinaryLike} from 'crypto';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import ServerAdminKey, {
  AccountType,
} from '../../datatypes/ServerAdminKey/ServerAdminKey';
import checkAccountType from '../inputValidator/checkAccountType';

/**
 * Function to add new ServerAdminKey
 *
 * @param {string} nickname nickname to identify the key
 * @param {string} accountType accountType associated with the key
 * @param {function(BinaryLike, BinaryLike, BinaryLike):string} hashFunc
 *     hash function to geneate key
 * @param {ServerConfigTemplate} config Server configuration,
 *     containing DB connection information
 * @return {Promise<Cosmos.ItemResponse<ServerAdminKey>>} DB Operation Result
 */
export default async function newServerAdminKey(
  nickname: string,
  accountType: string,
  hashFunc: (
    id: BinaryLike,
    additionalSalt: BinaryLike,
    secretString: BinaryLike
  ) => string,
  config: ServerConfigTemplate
): Promise<string> {
  // Runtime type check for account type
  if (!checkAccountType(accountType)) {
    throw new Error('Invalid Account Type');
  }

  // Generate ServerAdminKey object with newly created key
  const generatedAt = new Date();
  generatedAt.setMilliseconds(0);
  const key = hashFunc(nickname, generatedAt.toISOString(), accountType);
  const keyObj = new ServerAdminKey(
    key,
    generatedAt,
    nickname,
    accountType as AccountType
  );

  // Create new ServerAdminKey entry on database
  const dbClient = new Cosmos.CosmosClient({
    endpoint: config.db.endpoint,
    key: config.db.key,
  }).database(config.db.databaseId);
  return await ServerAdminKey.create(dbClient, keyObj);
}
