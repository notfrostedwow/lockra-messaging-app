const { spawn } = require('node:child_process');
const platform = process.argv[2];
if (!['ios', 'android'].includes(platform)) throw new Error('Choose ios or android.');
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'run:' + platform], { env: require('./env.cjs')(), stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
