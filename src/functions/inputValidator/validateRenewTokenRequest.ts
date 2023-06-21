/**
 * Validate user input - Renew OTP Request
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import Ajv from 'ajv';

export const validateRenewTokenRequest = new Ajv().compile({
  type: 'object',
  properties: {
    renewRefreshToken: { type: 'boolean' },
  },
  additionalProperties: false,
});
