/**
 * Runner to execute deleteServerAdminKey() function on the command-line.
 *
 * Need two Command-Line Arguments (Starts from 2)
 *   2. operationType (either nickname or key)
 *   3. value
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import ServerConfig from '../ServerConfig';
import deleteServerAdminKey from '../functions/utils/deleteServerAdminKey';

// Check Command-Line Argument (2 for system-generated, 2 provided)
if (process.argv.length !== 4) {
  console.error(
    String.prototype.concat(
      'Incorrect number of command-line arguments provided!!\n\n',
      'Please check how to use the function and try again.\n',
      'usage: node dist/utilsRunner/deleteServerAdminKey.runner.js [operationType] [value]'
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

deleteServerAdminKey(process.argv[2], process.argv[3], config).then(
  // DB Operation Success
  () => {
    console.log(`${process.argv[2]} - ${process.argv[3]} Deleted`);
  },
  // DB Operation Failed
  error => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
);
