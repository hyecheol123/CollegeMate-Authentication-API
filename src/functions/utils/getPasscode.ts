/**
 * Function to generate OTP passcode
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {randomInt} from 'crypto';

/**
 * Function to generate OTP passcode
 *
 * @return {string} six-digit OTP passcode
 */
export default function getPasscode(): string {
  return randomInt(0, 1000000)
    .toString()
    .padStart(6, randomInt(0, 10).toString());
}
