const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const { evaluateReports } = require('./dependency-policy.cjs');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const env = { ...require('./env.cjs')(), npm_config_cache: path.resolve('.cache/npm-remediation'), NODE_OPTIONS: '--max-old-space-size=1536' };
const npm = [process.env.npm_execpath,
  path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
].find(candidate => candidate && fs.existsSync(candidate));
if (!npm) throw new Error('Run this audit with npm and the supported Node runtime.');
function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

function mapSources(map) {
  if (map.sections) return map.sections.flatMap(section => mapSources(section.map));
  if (!Array.isArray(map.sources) || map.sources.some(source => typeof source !== 'string')) throw new Error('Incomplete source map');
  return map.sources.map(source => source.replaceAll('\\', '/'));
}

async function main() {
  const cache = path.resolve('.cache/dependency-audit');
  fs.mkdirSync(cache, { recursive: true });
  const run = fs.mkdtempSync(path.join(cache, 'run-'));
  const reports = [];
  const auditCommands = [];
  for (const [scope, omit] of [['full', false], ['production', true]]) {
    const args = ['audit', '--json', '--registry=https://registry.npmjs.org', ...(omit ? ['--omit=dev'] : [])];
    const result = spawnSync(process.execPath, [npm, ...args], { env, encoding: 'utf8', timeout: 90000, maxBuffer: 10 * 1024 * 1024 });
    if (result.error || ![0, 1].includes(result.status)) throw new Error('Audit request failed; incomplete responses cannot pass.');
    const report = JSON.parse(result.stdout);
    fs.writeFileSync(path.join(run, `${scope}.json`), result.stdout);
    if (!report.metadata?.vulnerabilities) throw new Error('Audit metadata missing.');
    if ((result.status === 0) !== (report.metadata.vulnerabilities.total === 0)) throw new Error('Raw audit status/count mismatch.');
    reports.push(report);
    const command = { scope, command: `npm ${args.join(' ')}`, rawExit: result.status, counts: report.metadata.vulnerabilities };
    auditCommands.push(command);
    console.log(JSON.stringify(command));
  }
  // Build fresh, complete inventories on every run. Exporting native JavaScript
  // does not compile or test a native app. Source maps stay in ignored cache.
  const output = path.join(run, 'bundles');
  const exportArgs = ['export', '--platform', 'all', '--source-maps', 'external', '--no-bytecode', '--max-workers', '1', '--output-dir', output];
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), ...exportArgs], { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Fresh audit bundle export failed (${code})`)));
  });
  const inventories = { web: [], ios: [], android: [], 'calling-server': [] };
  const artifacts = [];
  for (const file of filesUnder(output).filter(file => file.endsWith('.map'))) {
    const relative = path.relative(output, file).replaceAll('\\', '/');
    const platform = ['web', 'ios', 'android'].find(scope => relative.includes(`/js/${scope}/`));
    if (!platform) throw new Error(`Unclassified source map: ${relative}`);
    const bytes = fs.readFileSync(file);
    const sources = mapSources(JSON.parse(bytes));
    inventories[platform].push(...sources);
    artifacts.push({ path: relative, sha256: sha256(bytes), sourceCount: sources.length });
  }
  const server = await require('esbuild').build({ entryPoints: ['server/calling/start.ts'], bundle: true, platform: 'node', format: 'esm', write: false, metafile: true, logLevel: 'silent' });
  inventories['calling-server'] = Object.keys(server.metafile.inputs).map(source => source.replaceAll('\\', '/'));
  for (const scope of Object.keys(inventories)) inventories[scope] = [...new Set(inventories[scope])].sort();
  for (const scope of ['web', 'ios', 'android']) {
    if (inventories[scope].length < 50 || !inventories[scope].some(source => source.includes('node_modules/expo-router/'))) throw new Error(`Unrecognized or incomplete Metro source inventory: ${scope}`);
  }
  if (!inventories['calling-server'].includes('server/calling/auth.ts')) throw new Error('Calling auth missing from server graph.');
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const policy = JSON.parse(fs.readFileSync('docs/dependency-risk-policy.json', 'utf8'));
  const assessment = evaluateReports({ reports, lock, policy, inventories });
  const receipt = { date: new Date().toISOString(), node: process.version, lockSha256: sha256(fs.readFileSync('package-lock.json')), policySha256: sha256(fs.readFileSync('docs/dependency-risk-policy.json')), auditCommands, exportCommand: ['expo', ...exportArgs.map(arg => arg === output ? '<ignored fresh output>' : arg)].join(' '), artifacts,
    inventoryCounts: Object.fromEntries(Object.entries(inventories).map(([scope, sources]) => [scope, sources.length])), inventories, assessment };
  fs.writeFileSync(path.join(run, 'assessment.json'), JSON.stringify(receipt, null, 2) + '\n');
  fs.writeFileSync(path.join(cache, 'latest.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ auditGate: assessment.result, runtimeHighOrCritical: assessment.runtimeHighOrCritical, inventories: receipt.inventoryCounts, residuals: assessment.residuals.map(({ package: name, severity, classification, runtimeSources }) => ({ package: name, severity, classification, runtimeSourceCounts: Object.fromEntries(Object.entries(runtimeSources).map(([scope, sources]) => [scope, sources.length])) })) }));
  console.log('Residual findings retain their reported severity. See SECURITY.md and docs/dependency-risk-policy.json. This is not final publication clearance.');
}

main().catch(error => { console.error(`Dependency/runtime gate FAILED: ${error.message}`); process.exitCode = 1; });
