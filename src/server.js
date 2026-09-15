import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IncidentTriageEngine } from './incident_triage.js';
import { ChimeVoiceOrchestrator } from './chime_voice_orchestrator.js';
import { MessagingGateway } from './messaging_gateway.js';
import { A2AMessageBus, TriageSupervisorAgent, DevOpsRemediationAgent, IncidentReporterAgent } from './a2a_orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3003;

const triage = new IncidentTriageEngine();
const voice = new ChimeVoiceOrchestrator(triage);
const messaging = new MessagingGateway(triage);

const bus = new A2AMessageBus();
const supervisor = new TriageSupervisorAgent(bus);
const devops = new DevOpsRemediationAgent(bus);
const reporter = new IncidentReporterAgent(bus);

// Seed initial demo incident
const initialAlert = triage.ingestAlert({
  severity: 'P1',
  serviceName: 'checkout-payment-api',
  metricViolation: 'HTTP 500 error rate spiked to 14.8% (threshold: 1.0%)',
  onCallSchedule: {
    primaryName: 'Alex Chen',
    primaryPhone: '+1-555-0199',
    secondaryName: 'Jordan Taylor',
    secondaryPhone: '+1-555-0288'
  }
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

  // API Routes
  if (req.url === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      incidents: Array.from(triage.incidents.values()),
      a2aLogs: bus.messageLog,
      activeCalls: Array.from(voice.activeCalls.values())
    }));
    return;
  }

  if (req.url === '/api/alert' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const inc = triage.ingestAlert(payload);
        supervisor.evaluateAlert(inc);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ incident: inc }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/call/initiate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { incidentId } = JSON.parse(body);
        const call = await voice.initiateCall(incidentId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ call }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/call/speak' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { callId, spokenText } = JSON.parse(body);
        const result = await voice.processSpokenInput(callId, spokenText);

        // If rollback was commanded, trigger devops remediation via A2A
        if (result.actionsTaken.some(a => a.tool === 'trigger_rollback')) {
          devops.executeAction('trigger_rollback', { version: 'v2.4.1' });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/report' && req.method === 'GET') {
    const activeInc = Array.from(triage.incidents.values())[0];
    const report = reporter.generateReport(activeInc || {}, []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report));
    return;
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚨 DispatchAgent.AI Server running at http://localhost:${PORT}`);
});
