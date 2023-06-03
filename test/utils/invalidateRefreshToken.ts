/**
 * Making refreshToken to be expired earlier
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as Cosmos from '@azure/cosmos';

/**
 * Method to make sessions be expired earlier
 *
 * @param dbClient {Cosmos.Database} DB Client (Cosmos Database)
 * @param min {number} How many minutes the token be expired earlier
 * @return {number} Number of affected sessions
 */
export default async function invalidateToken(
  dbClient: Cosmos.Database,
  min: number
): Promise<number> {
  // Get al refresh token
  const dbOps = await dbClient
    .container('refreshToken')
    .items.query('SELECT * FROM refreshToken')
    .fetchAll();
  if (dbOps.resources.length === 0) {
    return 0;
  }

  // Update session
  let counter = 0;
  for (let index = 0; index < dbOps.resources.length; ++index) {
    // Generate new ISOString for the session
    // passed x min is same as token expires x min earlier
    const refreshTokenObj = dbOps.resources[index];
    const expiresAt = new Date(refreshTokenObj.expireAt);
    expiresAt.setMinutes(expiresAt.getMinutes() - min);
    refreshTokenObj.expireAt = expiresAt.toISOString();

    // DB Operation
    const dbUpdate = await dbClient
      .container('refreshToken')
      .item(refreshTokenObj.id)
      .replace(refreshTokenObj);

    /* istanbul ignore else */
    if (dbUpdate.statusCode < 400) {
      counter += 1;
    } else {
      throw new Error('Session Update Error');
    }
  }
  return counter;
}
