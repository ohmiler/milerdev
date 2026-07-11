const { spawn } = require('node:child_process');
const { config } = require('dotenv');

config({ path: '.env.local', override: true, quiet: true });

if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);

  // Next.js expands unescaped `$` values while loading .env files.
  databaseUrl.password = databaseUrl.password.replace(/\$/g, '%24');
  process.env.DATABASE_URL = databaseUrl.toString();
}

const child = spawn(
  process.execPath,
  [require.resolve('next/dist/bin/next'), 'dev'],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 1);
});
