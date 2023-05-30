/**
 * Define type for the AuthToken object
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

export type AccountType =
  | 'admin'
  | 'server - authentication'
  | 'server - user'
  | 'server - friend'
  | 'server - schedule'
  | 'server - notification'
  | 'server - miscellaneous';

export default interface AuthToken {
  id: string; // contain nickname (for serverAdminToken) or email (for others)
  type: 'access' | 'refresh'; // type of token (refresh tokens are also saved in DB)
  tokenType: 'serverAdmin' | 'user'; // type of token
  accountType?: AccountType; // only for serverAdmin tokenType
}

export interface JWTObject extends AuthToken {
  iat?: number; // issued at
  exp?: number; // expire at
}
