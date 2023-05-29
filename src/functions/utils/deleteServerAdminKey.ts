/**
 * Utility to delete existing admin/server key
 *   - Able to be called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import ServerAdminKey from '../../datatypes/ServerAdminKey/ServerAdminKey';

/**
 * Function to delete an existing ServerAdminKey
 *
 * @param {string} operationType indicates which value to be provided
 *     (either key or nickname)
 * @param {string} value unique indicator of the key
 * @param {ServerConfigTemplate} config Server configuration,
 *     containing DB connection information
 */
export default async function deleteServerAdminKey(
  operationType: string,
  value: string,
  config: ServerConfigTemplate
): Promise<void> {
  const dbClient = new Cosmos.CosmosClient({
    endpoint: config.db.endpoint,
    key: config.db.key,
  }).database(config.db.databaseId);

  switch (operationType) {
    case 'nickname':
      await ServerAdminKey.deleteByNickname(dbClient, value);
      break;
    case 'key':
      await ServerAdminKey.deleteByKey(dbClient, value);
      break;
    default:
      throw new Error(
        'Invalid Operation Type - either nickname or key accepted'
      );
  }
}
