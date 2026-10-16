const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const intake = JSON.parse(fs.readFileSync('docs/evidence/intake-manifest.json', 'utf8'));
const original = JSON.parse(fs.readFileSync('docs/evidence/original-manifest.json', 'utf8'));
const relocations = Object.fromEntries(JSON.parse(fs.readFileSync('docs/evidence/support-relocations.json', 'utf8')));
const output = 'docs/evidence/preservation.json';
const root = process.cwd();
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function checkedPath(relative) {
  const full = path.resolve(root, relative);
  if (!full.startsWith(root + path.sep)) throw new Error('Preservation target outside workspace.');
  if (!fs.statSync(full).isFile()) throw new Error(`Missing source target: ${relative}`);
  return full;
}
if (intake.source_sha !== '7029d5b7fefdfa8ecd40270e25e8092230200fb5' ||
  original.source_sha !== intake.source_sha || original.files.length !== 152 ||
  new Set(original.files.map(file => file.path)).size !== 152 ||
  new Set(intake.files.map(file => file.path)).size !== 151 ||
  intake.files.length !== 151 || original.source_file_count !== 152 ||
  original.route_and_app_support_paths.length !== 41 ||
  JSON.stringify(intake.excluded) !== JSON.stringify(['supabase/.temp/cli-latest'])) throw new Error('Full-source contract mismatch.');
for (const item of intake.files) {
  const source = original.files.find(file => file.path === item.path);
  if (!source || source.source_sha256 !== item.original_sha256) throw new Error(`Original manifest disagreement: ${item.path}`);
}
const omitted = original.files.filter(file => !intake.files.some(item => item.path === file.path)).map(file => file.path);
if (JSON.stringify(omitted) !== JSON.stringify(intake.excluded) ||
    original.route_and_app_support_paths.some(route => !intake.files.some(file => file.path === route))) throw new Error('Original/app path coverage mismatch.');
if (process.argv.includes('--record')) {
  const files = intake.files.map(file => {
    let targets = [relocations[file.path] ?? file.path];
    let reason = 'Original feature/source contract retained; targeted type/API, diagnostics and lifecycle repairs where hashes differ.';
    if (/\.sql$|^SQL\/|^fix_recursion_sql\.txt$/.test(file.path)) {
      targets = [`docs/legacy/${file.path}.txt`];
      reason = 'Verbatim non-runnable legacy SQL/schema reference, outside migration and route discovery; no SQL executed.';
    } else if (/^scripts\//.test(file.path) || file.path === 'test_auth.js') {
      targets.push(`docs/legacy/${file.path}.txt`);
      reason = 'Fail-closed executable entry point; original body retained verbatim as non-runnable reference. Offline assertions replace live diagnostic execution.';
    } else if (file.path === 'lib/communityService.ts') {
      targets.push('lib/communityRepository.ts');
      reason = 'Original service entry point retained; existing algorithms extracted for dependency injection and actual offline contract tests.';
    } else if (file.path === 'app/device-settings.tsx') {
      targets.push('docs/legacy/app/device-settings-samples.tsx.txt');
      reason = 'Device screen and local settings preserved; original fabricated measurement/permission/cache callbacks retained as non-runnable references. Current UI shows unavailable or actual readable platform constants.';
    } else if (file.path === 'package.json') {
      reason = 'Original application dependencies/source contracts retained on supported SDK57. React/DOM align to official 19.2.3; TypeScript aligns to ~6.0.3. Unused optional RSC transport added during restoration is omitted from this non-RSC SPA rather than forcing its incompatible peers. No original RSC source/feature exists or was removed. Fresh synchronized lock resolution is recorded in sdk57-residual-lock-delta.json; no peer bypass or dependency patch.';
    } else if (file.path === 'package-lock.json') {
      reason = 'Fresh npm resolution from the supported manifest in an isolated ignored directory inside this workspace; then clean npm ci with lifecycle scripts ignored. Exact version additions/removals and hoisting explanation in sdk57-residual-lock-delta.json. No incompatible overrides, forks or installed-package edits.';
    } else if (file.path === 'app.json') {
      targets.push('docs/legacy/app-linking.json');
      reason = 'Invalid legacy top-level linking configuration relocated without changing its object to docs/legacy/app-linking.json. Expo Router already derives routes from preserved app files; lockra scheme and all auth/tab route source stay intact. No application reader of expo.linking existed.';
    } else if (file.path === 'tsconfig.json') {
      reason = 'Strict TypeScript remains enabled. SDK57-supported TS6 removes implicit ambient-type inclusion, so node/react types are explicit for existing app/server/tests. Deprecated baseUrl is removed; the unchanged relative paths alias resolves from the config directory. No ignoreDeprecations flag or check weakening.';
    } else if (file.path === 'README.md') {
      reason = 'Original documentation restored to source-evidenced features and honest offline/E2EE/calling limits. Current user-authorized SDK57 residual policy replaces the former blanket moderate stop; runtime bundle evidence, supported alignment and independent final publication gates are explicit.';
    } else if (file.path === 'app/terms.tsx') {
      reason = 'Original terms screen retained; legacy private support contact replaced with support@example.invalid. Exact targeted byte/hash receipt in privacy-redactions.json.';
    } else if (relocations[file.path]) reason = 'Support module relocated outside Expo Router discovery; original contract retained and repaired.';
    if (file.path.startsWith('assets/')) reason = 'Original image retained verbatim; independent privacy, authorship and redistribution-rights review pending.';
    const current = targets.map(target => ({ path: target, sha256: sha256(checkedPath(target)) }));
    if ((reason.startsWith('Verbatim') || /^scripts\//.test(file.path) || file.path === 'test_auth.js') &&
      !current.some(target => target.sha256 === file.export_sha256)) throw new Error(`Legacy source bytes changed: ${file.path}`);
    return { original_path: file.path, original_sha256: file.original_sha256, intake_sha256: file.export_sha256,
      intake_targeted_replacements: file.targeted_replacements, current, reason };
  });
  fs.writeFileSync(output, JSON.stringify({ source_sha: intake.source_sha, preserved_original_paths: files.length,
    original_app_paths: 41, omitted_original_paths: intake.excluded, recorded_at: new Date().toISOString(), files }, null, 2) + '\n');
}
const recorded = JSON.parse(fs.readFileSync(output, 'utf8'));
if (recorded.source_sha !== intake.source_sha || recorded.files.length !== intake.files.length ||
    new Set(recorded.files.map(file => file.original_path)).size !== 151) throw new Error('Preservation record incomplete.');
for (const file of intake.files) {
  const record = recorded.files.find(item => item.original_path === file.path);
  if (!record || record.intake_sha256 !== file.export_sha256 || !record.current.length) throw new Error(`Missing mapping: ${file.path}`);
  for (const target of record.current) if (sha256(checkedPath(target.path)) !== target.sha256) throw new Error(`Update and review preservation mapping: ${target.path}`);
}
console.log('Verified all 151 original source mappings, 41 original app paths, original/intake hash agreement and current target hashes.');
