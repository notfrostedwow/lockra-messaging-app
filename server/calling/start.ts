import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createCallingHandler } from './handler';
import { CallingService } from './service';
import { createSessionVerifier } from './auth';
import { createDevelopmentDirectory } from './directory';
import { createLiveKitProvider } from './livekit';

// No dotenv discovery. No network/listener before deliberate complete configuration.
if (process.env.LOCKRA_ENABLE_CALL_SERVER !== 'true') throw new Error('Calling server disabled. Explicit local integration configuration required.');
const settings = {
  LOCKRA_CALL_ORIGINS: process.env.LOCKRA_CALL_ORIGINS,
  LOCKRA_CLERK_ISSUER: process.env.LOCKRA_CLERK_ISSUER,
  LOCKRA_CALL_AUDIENCE: process.env.LOCKRA_CALL_AUDIENCE,
  LOCKRA_CALL_DIRECTORY_FILE: process.env.LOCKRA_CALL_DIRECTORY_FILE,
  LOCKRA_LIVEKIT_URL: process.env.LOCKRA_LIVEKIT_URL,
  LOCKRA_LIVEKIT_API_KEY: process.env.LOCKRA_LIVEKIT_API_KEY,
  LOCKRA_LIVEKIT_API_SECRET: process.env.LOCKRA_LIVEKIT_API_SECRET,
};
const required = (name: keyof typeof settings) => { const value = settings[name]; if (!value || /example|YOUR_|placeholder/i.test(value)) throw new Error(`Missing explicit server configuration: ${name}`); return value as string; };
const origins = required('LOCKRA_CALL_ORIGINS').split(',').map((value: string) => new URL(value).origin);
const verify = createSessionVerifier(required('LOCKRA_CLERK_ISSUER'), required('LOCKRA_CALL_AUDIENCE'), origins);
const directoryPath = resolve(required('LOCKRA_CALL_DIRECTORY_FILE'));
const privateRoot = resolve('artifacts/private');
if (!directoryPath.startsWith(privateRoot + sep)) throw new Error('Private calling directory must be inside workspace artifacts/private.');
const directory = createDevelopmentDirectory(JSON.parse(readFileSync(directoryPath, 'utf8')));
const provider = createLiveKitProvider({ url: required('LOCKRA_LIVEKIT_URL'), apiKey: required('LOCKRA_LIVEKIT_API_KEY'), apiSecret: required('LOCKRA_LIVEKIT_API_SECRET') });
const service = new CallingService(directory, provider);
const handler = createCallingHandler(service, verify, origins);
createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 8192) { res.writeHead(413).end(); return; } chunks.push(chunk); }
    const headers = new Headers(); for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    const body = Buffer.concat(chunks).toString('utf8');
    const request = new Request('http://127.0.0.1:4178' + (req.url ?? '/'), { method: req.method, headers, ...(body ? { body } : {}) });
    const response = await handler(request); res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
  } catch { res.writeHead(400).end(); }
}).listen(4178, '127.0.0.1', () => console.log('Deliberately configured local calling API listening on 127.0.0.1:4178. Provider use requires separate approval.'));
setInterval(() => { service.sweep().catch(() => console.error('Calling provider cleanup failed.')); }, 10000).unref();
