/**
 * Define types for the objects related with configuring the server
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface to define ConfigObj object
 * This type of object will given to the constructor of ServerConfig
 */
export interface ConfigObj {
  db: DbObj; // contain database configuration parameters
  expressPort: number; // indicate express server port
  jwtKeys: JwtKeyObj; // indicate jwt token credentials
  serverDomainPath: ServerDomainPathObj; // indicate server's domain and path
  webpageOrigin: string; // indicate our website Origin
  applicationKey: string[]; // Indicate the list of applicationKey (Mobile Application Origin Check)
  serverAdminKey: string; // Indicate unique key for this server
  azureAppRegistrationInfo: AzureAppRegistrationObj; // Indicate Azure App Registration Authentication Information
}

/**
 * Interface to define DbObj object
 * This type of object should be contained in the ConfigObj
 */
export interface DbObj {
  endpoint: string; // URL indicating the location of database server and port
  key: string;
  databaseId: string; // default database name
}

/**
 * Interface to define jwtKeyObj object
 * This type of object should be contained in the ConfigObj
 */
export interface JwtKeyObj {
  secretKey: string; // key that used to validate the token
  refreshKey: string; // different key that used to  validate refresh token
}

/**
 * Interface to define server's domain and path
 * This type of object should be contained in the ConfigObj.
 */
export interface ServerDomainPathObj {
  domain: string; // API Server's Domain
  path?: string; // API Server's path
}

/**
 * Interface to define Azure App Registration's authentication information.
 * This type of object should be contained in the ConfigObj.
 */
export interface AzureAppRegistrationObj {
  clientId: string;
  tenantId: string;
  clientSecret: string;
  userObjectId: string;
  noReplyEmailAddress: string;
  mainEmailAddress: string;
}
