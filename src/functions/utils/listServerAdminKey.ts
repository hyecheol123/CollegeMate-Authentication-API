/**
 * Utility to list metadata of existing admin/server key
 *   - Able to be called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import ServerAdminKey from '../../datatypes/ServerAdminKey/ServerAdminKey';
import MetaData from '../../datatypes/ServerAdminKey/MetaData';

/**
 * Function to retrieve metadata of all existing ServerAdminKey
 *
 * @param {ServerConfigTemplate} config Server configuration,
 *     containing DB connection information
 * @return {Promise<MetaData[]>} list of metadata of ServerAdminKey
 *     (contains nickname, generatedAt, accountType)
 */
export default async function listServerAdminKey(
  config: ServerConfigTemplate
): Promise<MetaData[]> {
  const dbClient = new Cosmos.CosmosClient({
    endpoint: config.db.endpoint,
    key: config.db.key,
  }).database(config.db.databaseId);

  return await ServerAdminKey.readMetaData(dbClient);
}
