import assert from 'assert';
import { createDispatchServer } from '../src/server.js';

console.log('🧪 Starting DispatchAgent.AI Server Integration Suite...\n');

let passed = 0;
function ok(label: string, cond: boolean): void {
  assert(cond, label);
  passed++;
  console.log(`   ✅ ${label}`);
}

const { server } = createDispatchServer();
await new Promise<void>((resolve) => server.listen(0, resolve));
const { port } = server.address() as import('net').AddressInfo;
const base = `http://127.0.0.1:${port}`;
const get = (p: string) => fetch(base + p).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as any }));
const post = (p: string, body: unknown) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as any }));

try {
  console.log('1️⃣ Health, state & seeded incident...');
  const health = await get('/api/health');
  ok('server boots and /api/health returns 200', health.status === 200);
  ok('one incident seeded at startup', health.body.incidentCount === 1);
  const state = await get('/api/state');
  ok('/api/state serializes incidents (no field-name crash)', Array.isArray(state.body.incidents) && state.body.incidents.length === 1);
  ok('A2A dispatch logged at startup', state.body.a2aLogs.length >= 1);

  const incidentId = state.body.incidents[0].id;

  console.log('\n2️⃣ Voice call + spoken command flow...');
  const call = await post('/api/call/initiate', { incidentId });
  ok('call initiates (CONNECTED)', call.body.call.status === 'CONNECTED');
  const speak = await post('/api/call/speak', { callId: call.body.call.callId, spokenText: 'Acknowledge and roll back to v2.4.1' });
  ok('spoken command triggers 2 tools', speak.body.actionsTaken.length === 2);

  console.log('\n3️⃣ SMS fallback + report...');
  const sms = await post('/api/sms', { incidentId, recipientPhone: '+1-555-0288' });
  ok('SMS dispatched', sms.status === 200 && sms.body.body.includes('ops.dispatchagent.aws'));
  ok('report synthesized', (await get('/api/report')).body.status === 'RESOLVED');

  console.log('\n4️⃣ Security guards...');
  ok('encoded path traversal blocked (403)', (await fetch(base + '/..%2f..%2fserver.ts')).status === 403);
  ok('oversized body rejected (413)', (await post('/api/alert', { serviceName: 'x'.repeat(70 * 1024) })).status === 413);

  console.log(`\n🎉 ALL ${passed} DISPATCHAGENT SERVER INTEGRATION ASSERTIONS PASSED.\n`);
} finally {
  server.close();
}
