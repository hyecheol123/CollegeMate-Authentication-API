/**
 * Runner to execute listServerAdminKey() function on the command-line.
 *
 * No Command-Line Arguments needed
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import ServerConfig from '../ServerConfig';
import listServerAdminKey from '../functions/utils/listServerAdminKey';

// Check Command-Line Argument (2 for system-generated, 0 provided)
if (process.argv.length !== 2) {
  console.error(
    String.prototype.concat(
      'Incorrect number of command-line arguments provided!!\n\n',
      'Please check how to use the function and try again.\n',
      'usage: node dist/utilsRunner/deleteServerAdminKey.runner.js'
    )
  );
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

// Check for DB Connection information
if (!process.env.DB_ENDPOINT || !process.env.DB_KEY || !process.env.DB_ID) {
  console.log('NEED DB_ENDPOINT, DB_KEY AND DB_ID ENV VARIABLE');
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}
const config = new ServerConfig(
  process.env.DB_ENDPOINT,
  process.env.DB_KEY,
  process.env.DB_ID
);

listServerAdminKey(config).then(data =>
  console.table(data, ['nickname', 'accountType', 'generatedAt'])
);
