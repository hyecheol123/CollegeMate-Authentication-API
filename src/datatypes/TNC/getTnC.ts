/**
 * Function to retrieve most recent public terms and condition from
 *   Miscellaneous API
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Request} from 'express';
import TnC from './TnC';

/**
 * Function to retrieve most recent public terms and condition from
 *   Miscellaneous API
 *
 * @param {Request} req express Request object
 * @return {Promise<TnC>} Terms and Condition
 */
export default async function getTnC(req: Request): Promise<TnC> {
  const response = await fetch('https://api.collegemate.app/tnc', {
    method: 'GET',
    headers: {'X-APPLICATION-KEY': req.app.get('serverApplicationKey')},
  });

  if (response.status === 404) {
    throw new Error(
      '[Fail on retrieving Terms and Condition - DB entry not found]'
    );
  }

  if (response.status !== 200) {
    throw new Error('[Fail on retreiving Terms and Condition]');
  }

  return await response.json();
}
