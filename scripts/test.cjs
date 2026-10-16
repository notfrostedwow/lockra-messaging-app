const { spawn } = require('node:child_process');
const { readdirSync } = require('node:fs');
const env = require('./env.cjs')();
const files = process.argv[2] === 'auth' ? ['tests/auth.test.ts'] :
  readdirSync('tests').filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/${name}`);
const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...files], { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
