import EmbeddedPostgres from 'embedded-postgres';
import { join } from 'node:path';

const [databaseDirectory, portValue] = process.argv.slice(2);
const port = Number(portValue);
const postgres = new EmbeddedPostgres({
  databaseDir: join(databaseDirectory, 'data'),
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: false,
  autoRehydrateSymlinks: true,
  onLog: () => undefined,
  onError: (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  },
});

try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase('school_coupon_test');
  process.stdout.write(`READY:${port}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', async (input) => {
  if (!input.includes('STOP')) {
    return;
  }

  await postgres.stop();
  process.exit(0);
});
