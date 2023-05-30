/**
 * Validate user input - Initiate OTP Request
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const validateInitiateOTPRequest = addFormats(new Ajv()).compile({
  type: 'object',
  properties: {
    email: {type: 'string', format: 'email'},
    purpose: {type: 'string', enum: ['signup', 'signin', 'sudo']},
  },
  required: ['email', 'purpose'],
  additionalProperties: false,
});
