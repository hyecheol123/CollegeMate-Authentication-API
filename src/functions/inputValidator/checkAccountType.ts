/**
 * Check User Input - check account type
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

const ACCOUNT_TYPE_LIST = [
  'admin',
  'server - authentication',
  'server - user',
  'server - friend',
  'server - schedule',
  'server - notification',
  'server - miscellaneous',
];

/**
 * Method to check account type. Only allow:
 *   - 'admin'
 *   - 'server - authentication'
 *   - 'server - user'
 *   - 'server - friend'
 *   - 'server - schedule'
 *   - 'server - notification'
 *   - 'server - miscellaneous'
 *
 * @param {string} accountType account type that user input
 * @return {boolean} indicates whether given accountType is valid or not
 */
export default function checkAccountType(accountType: string): boolean {
  return ACCOUNT_TYPE_LIST.includes(accountType) ? true : false;
}
