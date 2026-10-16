const severityNames = ['info', 'low', 'moderate', 'high', 'critical'];

function validateReport(report, lock) {
  if (report?.error || report?.auditReportVersion !== 2 || !report.vulnerabilities || !report.metadata?.vulnerabilities) throw new Error('Incomplete audit report');
  const actual = Object.fromEntries(severityNames.map(name => [name, 0]));
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (finding.name !== name || !severityNames.includes(finding.severity) || !Array.isArray(finding.via) || !finding.via.length || !Array.isArray(finding.nodes) || !finding.nodes.length) throw new Error(`Invalid audit entry: ${name}`);
    actual[finding.severity]++;
    for (const node of finding.nodes) if (!lock.packages[node]?.version) throw new Error(`Unresolved audit node: ${node}`);
  }
  for (const name of severityNames) if (actual[name] !== report.metadata.vulnerabilities[name]) throw new Error('Audit severity counts disagree');
  if (Object.values(actual).reduce((sum, count) => sum + count, 0) !== report.metadata.vulnerabilities.total) throw new Error('Audit total disagrees');
}

function rootAdvisories(report, name, ancestors = new Set()) {
  if (ancestors.has(name)) return [];
  if (!report.vulnerabilities[name]) throw new Error(`Missing propagated advisory: ${name}`);
  const visited = new Set([...ancestors, name]);
  return report.vulnerabilities[name].via.flatMap(via => typeof via === 'string' ? rootAdvisories(report, via, visited) : [via]);
}

function sourceBelongsTo(source, packagePath) {
  const normalized = source.replaceAll('\\', '/');
  return normalized.startsWith(packagePath + '/') || normalized.includes('/' + packagePath + '/');
}

function evaluateReports({ reports, lock, policy, inventories }) {
  if (!Array.isArray(reports) || reports.length !== 2) throw new Error('Both fresh audit reports are required');
  if (policy.version !== 1 || !Array.isArray(policy.residuals)) throw new Error('Invalid explicit residual policy');
  for (const scope of ['web', 'ios', 'android', 'calling-server']) {
    if (!inventories[scope]?.length) throw new Error(`Missing fresh source inventory: ${scope}`);
  }
  const observed = new Map();
  for (const report of reports) {
    validateReport(report, lock);
    for (const [name, finding] of Object.entries(report.vulnerabilities)) {
      const roots = rootAdvisories(report, name);
      if (!roots.length) throw new Error(`Unexplained audit finding: ${name}`);
      if (severityNames.indexOf(finding.severity) !== Math.max(...roots.map(root => severityNames.indexOf(root.severity)))) throw new Error(`Unexplained severity propagation: ${name}`);
      if (finding.severity === 'critical') throw new Error(`Critical finding requires review: ${name}`);
      for (const root of roots) {
        const decision = policy.residuals.find(item => root.url === `https://github.com/advisories/${item.ghsa}` && root.name === item.package);
        if (!decision || decision.severity !== root.severity || root.severity === 'critical') throw new Error(`New or changed advisory requires review: ${root.url}`);
        const rootFinding = report.vulnerabilities[root.name];
        if (!rootFinding || rootFinding.nodes.length !== decision.nodes.length) throw new Error(`Changed advisory paths: ${root.name}`);
        for (const node of rootFinding.nodes) {
          const pinned = decision.nodes.find(item => item.path === node);
          if (!pinned || lock.packages[node]?.version !== pinned.version) throw new Error(`Changed affected version/path: ${node}`);
        }
        const runtime = Object.fromEntries(Object.entries(inventories).map(([scope, sources]) => [scope, sources.filter(source => decision.nodes.some(node => sourceBelongsTo(source, node.path)))]));
        const bundled = Object.values(runtime).some(sources => sources.length);
        if (root.severity === 'high' && bundled) throw new Error(`HIGH runtime advisory blocks clearance: ${root.url}`);
        if (decision.classification === 'tooling-only' && bundled) throw new Error(`Tooling assessment invalidated by runtime import: ${root.name}`);
        if (bundled && (decision.classification !== 'runtime-moderate' || root.severity !== 'moderate')) throw new Error(`Runtime risk requires explicit review: ${root.name}`);
        if (!['tooling-only', 'runtime-moderate'].includes(decision.classification) || !decision.mitigation || !decision.whyNoSupportedFix) throw new Error('Residual explanation missing');
        observed.set(decision.ghsa, { package: root.name, ghsa: decision.ghsa, severity: root.severity, classification: decision.classification, runtimeSources: runtime });
      }
    }
  }
  return { result: 'pass-under-explicit-residual-policy', scope: 'Fresh exported JavaScript graphs and optional calling-server graph; not native compilation, provider QA or final publication approval', runtimeHighOrCritical: 0, residuals: [...observed.values()] };
}

module.exports = { evaluateReports, rootAdvisories, sourceBelongsTo };
