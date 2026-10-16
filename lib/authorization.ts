const PUBLIC_ROUTES = new Set(['', 'index', '+not-found', '(clerk-auth)', 'signin', 'signup', 'forgot-password', 'verify-email', 'terms', 'auth']);
export function routeDecision(route: string, actor: { role?: string } | null, allowAdmin = true): 'allow' | 'signin' | 'denied' {
  const first = route.split('/').filter(Boolean)[0] ?? '';
  if (PUBLIC_ROUTES.has(first)) return 'allow';
  if (!actor) return 'signin';
  if ((first === 'admin' || first === 'admin-panel') && (!allowAdmin || actor.role !== 'admin')) return 'denied';
  return 'allow';
}
