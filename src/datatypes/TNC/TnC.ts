/**
 * Define type of Terms and Conditions
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

export default interface TnC {
  version: string;
  createdAt: Date | string;
  content: string;
}
