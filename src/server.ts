import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { IncidentTriageEngine } from './incident_triage.js';
import { ChimeVoiceOrchestrator } from './chime_voice_orchestrator.js';
import { MessagingGateway } from './messaging_gateway.js';
import { A2AMessageBus, TriageSupervisorAgent, DevOpsRemediationAgent, IncidentReporterAgent } from './a2a_orchestrator.js';
import { resolveSafePath, readJsonBody } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const sendJson = (res: http.ServerResponse, status: number, payload: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

/** Build the DispatchAgent.AI server (with a seeded demo incident) without binding a port. */
export function createDispatchServer(): {
  server: http.Server;
  triage: IncidentTriageEngine;
  voice: ChimeVoiceOrchestrator;
  messaging: MessagingGateway;
  bus: A2AMessageBus;
} {
  const triage = new IncidentTriageEngine();
  const voice = new ChimeVoiceOrchestrator(triage);
  const messaging = new MessagingGateway(triage);
  const bus = new A2AMessageBus();
  const supervisor = new TriageSupervisorAgent(bus);
  const devops = new DevOpsRemediationAgent(bus);
  const reporter = new IncidentReporterAgent(bus);

  const initialAlert = triage.ingestAlert({
    severity: 'P1',
    serviceName: 'checkout-payment-api',
    metricViolation: 'HTTP 500 error rate spiked to 14.8% (threshold: 1.0%)'
  });
  supervisor.evaluateAlert(initialAlert);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.url === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { status: 'online', service: 'DispatchAgent AI', timestamp: new Date().toISOString(), incidentCount: triage.activeIncidents.size });
      }

      if (req.url === '/api/state' && req.method === 'GET') {
        return sendJson(res, 200, {
          incidents: Array.from(triage.activeIncidents.values()),
          a2aLogs: bus.messageLog,
          activeCalls: Array.from(voice.activeCalls.values())
        });
      }

      if (req.url === '/api/alert' && req.method === 'POST') {
        const payload = await readJsonBody(req);
        const inc = triage.ingestAlert(payload);
        supervisor.evaluateAlert(inc);
        return sendJson(res, 201, { incident: inc });
      }

      if (req.url === '/api/call/initiate' && req.method === 'POST') {
        const { incidentId } = await readJsonBody(req);
        return sendJson(res, 200, { call: await voice.initiateCall(incidentId) });
      }

      if (req.url === '/api/call/speak' && req.method === 'POST') {
        const { callId, spokenText } = await readJsonBody(req);
        const result = await voice.processSpokenInput(callId, spokenText);
        if (result.actionsTaken.some((a) => a.tool === 'trigger_rollback')) {
          devops.executeAction('trigger_rollback', { version: 'v2.4.1' });
        }
        return sendJson(res, 200, result);
      }

      if (req.url === '/api/sms' && req.method === 'POST') {
        const { incidentId, recipientPhone } = await readJsonBody(req);
        return sendJson(res, 200, await messaging.sendUrgentSMS(incidentId, recipientPhone));
      }

      if (req.url === '/api/report' && req.method === 'GET') {
        const activeInc = Array.from(triage.activeIncidents.values())[0];
        return sendJson(res, 200, reporter.generateReport(activeInc || {}, []));
      }

      const filePath = resolveSafePath(PUBLIC_DIR, req.url);
      if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, content) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
          res.writeHead(code, { 'Content-Type': 'text/plain' });
          res.end(code === 404 ? '404 Not Found' : 'Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
          res.end(content);
        }
      });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      sendJson(res, e.statusCode || 400, { error: e.message });
    }
  });

  return { server, triage, voice, messaging, bus };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const PORT = process.env.PORT || 3003;
  const { server } = createDispatchServer();
  server.listen(PORT, () => {
    console.log(`🚨 DispatchAgent.AI Server running at http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  });
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
