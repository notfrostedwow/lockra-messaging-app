import { CallError, type CallingService } from './service';

export function createCallingHandler(service: CallingService, verify: (token: string) => Promise<string>, origins: string[]) {
  const rates = new Map<string, { at: number; count: number }>();
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
    // Cross-origin browser API only; Origin-less/native transports need a separate review.
    if (!origin || !origins.includes(origin)) return new Response('{}', { status: 403, headers });
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const bearer = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') ?? '');
      if (!bearer || bearer[1].length > 16000) throw new CallError(401, 'Signed calling session required.');
      let subject: string;
      try { subject = await verify(bearer[1]); } catch { throw new CallError(401, 'Calling session rejected.'); }
      const actor = await service.caller(subject);
      const now = Date.now();
      for (const [key, value] of rates) if (now - value.at > 60000) rates.delete(key);
      const rate = rates.get(actor.id) ?? { at: now, count: 0 };
      if (++rate.count > 120) throw new CallError(429, 'Calling request rate exceeded.'); rates.set(actor.id, rate);
      const path = new URL(request.url).pathname.split('/').filter(Boolean);
      let result: unknown;
      if (request.method === 'GET' && path.length === 1 && path[0] === 'calls') result = await service.list(actor);
      else if (request.method === 'GET' && path.length === 2 && path[0] === 'calls') result = await service.get(actor, path[1]);
      else if (request.method === 'POST' && path[0] === 'calls') {
        const text = await request.text(); if (text.length > 4096) throw new CallError(413, 'Request too large.');
        const body = text ? JSON.parse(text) : {};
        if (path.length === 1) {
          if (Object.keys(body).some(k => !['callee', 'kind'].includes(k)) || typeof body.callee !== 'string') throw new CallError(400, 'Invalid invite fields.');
          result = await service.invite(actor, body.callee, body.kind);
        } else if (path.length === 3 && Object.keys(body).length === 0) {
          const [id, action] = path.slice(1);
          if (action === 'accept') result = await service.accept(actor, id);
          else if (action === 'reject') result = await service.reject(actor, id);
          else if (action === 'end') result = await service.end(actor, id);
          else if (action === 'token') result = await service.token(actor, id);
          else throw new CallError(404, 'Unknown operation.');
        } else throw new CallError(400, 'Invalid calling operation.');
      } else throw new CallError(404, 'Unknown operation.');
      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (e) {
      const status = e instanceof CallError ? e.status : e instanceof SyntaxError ? 400 : 503;
      return new Response(JSON.stringify({ error: e instanceof CallError ? e.message : 'Calling operation failed; no successful connection or cleanup is implied.' }), { status, headers });
    }
  };
}
