import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReports } from '../scripts/dependency-policy.cjs';

function fixture(severity = 'high', classification = 'tooling-only') {
  const advisory = { name: 'synthetic-tool', severity, url: 'https://github.com/advisories/GHSA-synthetic-review' };
  const report = { auditReportVersion: 2, vulnerabilities: {
    'synthetic-tool': { name: 'synthetic-tool', severity, via: [advisory], nodes: ['node_modules/synthetic-tool'] },
    'runtime-parent': { name: 'runtime-parent', severity, via: ['synthetic-tool'], nodes: ['node_modules/runtime-parent'] },
  }, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, [severity]: 2, total: 2 } } };
  return { reports: [report, structuredClone(report)], lock: { packages: { 'node_modules/synthetic-tool': { version: '1.0.0', dev: false }, 'node_modules/runtime-parent': { version: '2.0.0' } } },
    policy: { version: 1, residuals: [{ package: 'synthetic-tool', ghsa: 'GHSA-synthetic-review', severity, classification, nodes: [{ path: 'node_modules/synthetic-tool', version: '1.0.0' }], mitigation: 'trusted config', whyNoSupportedFix: 'No patch exists' }] },
    inventories: { web: ['node_modules/runtime-parent/client.js'], ios: ['app/index.tsx'], android: ['app/index.tsx'], 'calling-server': ['server/calling/start.ts'] } };
}

test('audit policy separates propagated runtime parents from absent vulnerable tooling code, irrespective of dev flag', () => {
  const result = evaluateReports(fixture());
  assert.equal(result.runtimeHighOrCritical, 0);
  assert.equal(result.residuals[0].severity, 'high');
});

test('high runtime code blocks even when marked devDependency and disguised under nested tooling', () => {
  const f = fixture(); f.lock.packages['node_modules/synthetic-tool'].dev = true;
  f.inventories.web.push('/project/node_modules/synthetic-tool/lib/verify.js');
  assert.throws(() => evaluateReports(f), /HIGH runtime/);
});

test('native and calling-server runtime imports cannot use a web-only absence assessment', () => {
  for (const scope of ['ios', 'android', 'calling-server'] as const) {
    const f = fixture(); f.inventories[scope].push('node_modules/synthetic-tool/index.js');
    assert.throws(() => evaluateReports(f), /HIGH runtime/);
  }
});

test('moderate runtime needs an explicit unchanged advisory assessment and keeps its true severity', () => {
  const f = fixture('moderate', 'runtime-moderate');
  f.inventories.web.push('node_modules/synthetic-tool/index.js');
  assert.equal(evaluateReports(f).residuals[0].severity, 'moderate');
  f.policy.residuals[0].classification = 'tooling-only';
  assert.throws(() => evaluateReports(f), /Tooling assessment/);
});

test('unknown advisories, changed severity/version/path, missing graphs and incomplete audit reports fail closed', () => {
  const changes = [
    (f: ReturnType<typeof fixture>) => { f.policy.residuals[0].ghsa = 'GHSA-other'; },
    (f: ReturnType<typeof fixture>) => { f.policy.residuals[0].severity = 'low'; },
    (f: ReturnType<typeof fixture>) => { f.lock.packages['node_modules/synthetic-tool'].version = '1.1.0'; },
    (f: ReturnType<typeof fixture>) => { f.policy.residuals[0].nodes[0].path = 'node_modules/other'; },
    (f: ReturnType<typeof fixture>) => { f.inventories.ios = []; },
    (f: ReturnType<typeof fixture>) => { f.reports[0].metadata.vulnerabilities.total = 0; },
    (f: ReturnType<typeof fixture>) => { f.reports[0].vulnerabilities['runtime-parent'].via = ['unknown']; },
  ];
  for (const change of changes) { const f = fixture(); change(f); assert.throws(() => evaluateReports(f)); }
  const missing = fixture(); missing.reports = [];
  assert.throws(() => evaluateReports(missing), /Both fresh audit/);
  assert.throws(() => evaluateReports(fixture('critical')), /Critical/);
});
