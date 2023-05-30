/**
 * Configuration for the Test Environment.
 * Work identical as ServerConfig of src.
 *
 * TestConfig.ts contain ip address specific to the machine.
 * The file should be ignored from the version control.
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as crypto from 'crypto';
import {ConfigObj} from '../src/datatypes/ConfigObj';
import ServerConfigTemplate from '../src/ServerConfigTemplate';

/**
 * Module contains the configuration
 */
export default class TestConfig extends ServerConfigTemplate {
  /**
   * Constructor for ServerConfig
   *
   * @param identifier test name / used to identify test cases
   */
  constructor(identifier: string) {
    const config: ConfigObj = {
      db: {
        endpoint: process.env.COSMOS_EMULATOR_ENDPOINT as string,
        key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
        databaseId: `db_${identifier}`,
      },
      expressPort: 3000,
      webpageOrigin: 'https://collegemate.app',
      applicationKey: ['<Android-App-v1>', '<iOS-App-v1>'],
      jwtKeys: {secretKey: 'keySecret', refreshKey: 'keySecretRefresh'},
      serverDomainPath: {domain: 'api.collegemate.app'},
      serverAdminKey: '',
    };
    super(config);
  }

  /**
   * Function to create hashed password
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
    const salt: crypto.BinaryLike = id.toString() + additionalSalt.toString();
    return crypto
      .pbkdf2Sync(secretString, salt, 10, 64, 'sha512')
      .toString('base64url');
  }
}
