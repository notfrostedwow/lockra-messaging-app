const { spawn } = require('node:child_process');
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--max-workers', '1'],
  { env: { ...require('./env.cjs')(), NODE_OPTIONS: '--max-old-space-size=1024' }, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
