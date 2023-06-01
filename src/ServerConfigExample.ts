/**
 * Configuration example for the Server.
 * Need to create ServerConfig.ts by copying this file.
 *
 * ServerConfig.ts file contains important credentials.
 * Should not be uploaded to version control system (git).
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as crypto from 'crypto';
import {ConfigObj} from './datatypes/ConfigObj';
import ServerConfigTemplate from './ServerConfigTemplate';

/**
 * Module contains the configuration
 */
export default class ServerConfig extends ServerConfigTemplate {
  /**
   * Constructor for ServerConfig
   *
   * @param dbEndpoint {string} database endpoint url
   * @param dbKey {string} primary key to access the CosmosDB Server
   * @param dbId {string} database key to identify db
   */
  /* istanbul ignore next */
  constructor(dbEndpoint: string, dbKey: string, dbId: string) {
    const config: ConfigObj = {
      db: {
        endpoint: dbEndpoint,
        key: dbKey,
        databaseId: dbId,
      },
      expressPort: 3000,
      webpageOrigin: 'https://collegemate.app',
      applicationKey: ['<Android-App-v1>', '<iOS-App-v1>'],
      jwtKeys: {secretKey: 'keySecret', refreshKey: 'keySecretRefresh'},
      serverDomainPath: {domain: 'api.collegemate.app'},
      serverAdminKey: '',
      azureAppRegistrationInfo: {
        clientId: '',
        tenantId: '',
        clientSecret: '',
        userObjectId: '',
        noReplyEmailAddress: '',
        mainEmailAddress: '',
      },
    };
    super(config);
  }

  /**
   * Function to create hashed password
   *
   * Detail of this function also should not be disclosed for security purpose.
   * Should not be uploaded to version control system (git).
   *
   * @param id user's id (used to generate salt)
   * @param additionalSalt unique additional salt element for each user
   * @param secretString string to be hashed (password, etc)
   * @returns {string} Hashed Password
   */
  static hash(
    id: crypto.BinaryLike,
    additionalSalt: crypto.BinaryLike,
    secretString: crypto.BinaryLike
  ): string {
    // TODO: Should generate your own hash function
    const salt: crypto.BinaryLike = id.toString() + additionalSalt.toString();
    return crypto
      .pbkdf2Sync(secretString, salt, 10, 64, 'sha512')
      .toString('base64url');
  }
}
