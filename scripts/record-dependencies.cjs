const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const dependencies = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).map(([name, declared]) => {
  const resolved = lock.packages['node_modules/' + name];
  if (!resolved) throw new Error('Unresolved direct dependency: ' + name);
  return { name, declared, resolved: resolved.version, licenseMetadata: resolved.license ?? 'Not supplied', dev: !!pkg.devDependencies[name], hasInstallScript: !!resolved.hasInstallScript };
});
fs.writeFileSync('docs/evidence/dependencies-final.json', JSON.stringify({ recordedAt: new Date().toISOString(),
  scope: 'Resolved lockfile receipt; declarations/peer acceptance are not native runtime proof. Lifecycle scripts were ignored.', dependencies }, null, 2) + '\n');
console.log('Recorded ' + dependencies.length + ' direct dependency versions and declared license metadata.');
