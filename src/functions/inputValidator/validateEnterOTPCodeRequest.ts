/**
 * Validate user input - Enter OTP Code
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const validateEnterOTPCodeRequest = addFormats(new Ajv()).compile({
  type: 'object',
  properties: {
    email: {type: 'string', format: 'email'},
    passcode: {type: 'string'},
    staySignedIn: {type: 'boolean'},
  },
  required: ['email', 'passcode'],
  additionalProperties: false,
});
