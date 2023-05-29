/**
 * Runner to execute newServerAdminKey() function on the command-line
 *
 * Need two Command-Line Arguments (Starts from 2)
 *   2. nickname
 *   3. accountType
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import ServerConfig from '../ServerConfig';
import newServerAdminKey from '../functions/utils/newServerAdminKey';

// Check Command-Line Argument (2 for system-generated, 2 provided)
if (process.argv.length !== 4) {
  console.error(
    String.prototype.concat(
      'Incorrect number of command-line arguments provided!!\n\n',
      'Please check how to use the function and try again.\n',
      'usage: node dist/utilsRunner/newServerAdminKey.runner.js [nickname] [accountType]'
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

newServerAdminKey(
  process.argv[2],
  process.argv[3],
  ServerConfig.hash,
  config
).then(
  // DB Operation Success
  key => {
    console.log('Successfully add new ServerAdminKey');
    console.log(`Key: ${key}`);
    // eslint-disable-next-line no-process-exit
    process.exit();
  },
  // DB Operation Failed
  error => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
);
