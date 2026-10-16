import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { installBrowserUrlGuard, isSafeRouteInput, MAX_ROUTE_INPUT } from '../lib/routingInput';

test('browser route boundary retains real routes, callback queries, Unicode, plus signs and encoded delimiters', () => {
  for (const path of ['/signin', '/signup', '/auth/callback?code=synthetic%2Bcode&state=a%3Db', '/chat/demo_alex', '/communities', '/contacts?q=Zo%C3%AB', '/?q=hello+world#one%20two', '/?q=%2525']) {
    assert.equal(isSafeRouteInput(path), true, path);
  }
});

test('browser route boundary rejects malformed escapes and UTF8 plus oversized input without using tolerant decoding', () => {
  for (const path of ['/?q=%', '/?q=%ZZ', '/?q=%E0%A4', '/?q=%FE%FF', '/?q=%C2', '/#%ED%A0%80']) {
    assert.equal(isSafeRouteInput(path), false, path);
  }
  assert.equal(isSafeRouteInput('/' + 'a'.repeat(MAX_ROUTE_INPUT - 1)), true);
  assert.equal(isSafeRouteInput('/' + 'a'.repeat(MAX_ROUTE_INPUT)), false);
});

test('entry never imports Router when its initial browser URL is rejected', () => {
  const source = transformSync(readFileSync('index.js', 'utf8'), { format: 'cjs', loader: 'js' }).code;
  for (const permitted of [true, false]) {
    const calls: string[] = [];
    runInNewContext(source, { require: (name: string) => {
      calls.push(name);
      return name === './lib/routingInput' ? { installBrowserUrlGuard: () => { calls.push('validated'); return permitted; } } : {};
    } });
    assert.ok(calls.indexOf('./lib/networkGuard') < calls.indexOf('validated'));
    assert.equal(calls.includes('expo-router/entry'), permitted);
    if (permitted) assert.ok(calls.indexOf('validated') < calls.indexOf('expo-router/entry'));
  }
});

test('browser initial and back/hash navigation rejects invalid input before Router listeners', () => {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  const redirects: string[] = [];
  const location = { pathname: '/signin', search: '', hash: '', replace: (url: string) => { redirects.push(url); } };
  const events = { addEventListener: ((name: string, listener: EventListenerOrEventListenerObject, options: AddEventListenerOptions) => {
    assert.equal(options.capture, true); listeners.set(name, listener);
  }) as Window['addEventListener'] };
  assert.equal(installBrowserUrlGuard(location, events), true);
  for (const name of ['popstate', 'hashchange']) {
    location.search = '?q=%E0%A4';
    let stopped = false;
    (listeners.get(name) as EventListener)({ stopImmediatePropagation: () => { stopped = true; } } as unknown as Event);
    assert.equal(stopped, true);
  }
  assert.deepEqual(redirects, ['/', '/']);
  listeners.clear();
  assert.equal(installBrowserUrlGuard(location, events), false);
  assert.equal(listeners.size, 0);
});
