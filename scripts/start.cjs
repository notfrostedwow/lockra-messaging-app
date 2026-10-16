// No .env discovery, tunnel, provider configuration or telemetry in the demo.
const { spawn } = require('node:child_process');
const env = require('./env.cjs')();
env.NODE_OPTIONS = '--max-old-space-size=1024';
env.BROWSER = 'none'; // Browser access is deliberate; never launch a global browser.
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--web', '--localhost', '--max-workers', '1'],
  { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
