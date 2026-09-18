import assert from 'assert';
import { IncidentTriageEngine } from '../src/incident_triage.js';
import { ChimeVoiceOrchestrator } from '../src/chime_voice_orchestrator.js';
import { MessagingGateway } from '../src/messaging_gateway.js';
import { A2AMessageBus, TriageSupervisorAgent, DevOpsRemediationAgent, IncidentReporterAgent } from '../src/a2a_orchestrator.js';

console.log('🧪 Starting DispatchAgent.AI Automated Verification Suite (AWS CDS Partner Hackathon 2026)...\n');

const triage = new IncidentTriageEngine();
const voice = new ChimeVoiceOrchestrator(triage);
const messaging = new MessagingGateway(triage, { isMock: true });

console.log('1️⃣ Testing High-Priority Incident Ingestion...');
const incident = triage.ingestAlert({
  severity: 'P1',
  serviceName: 'checkout-payment-api',
  metricViolation: 'HTTP 500 error rate spiked to 14.8% (threshold: 1.0%)'
});
assert(incident.status === 'DISPATCHING', 'Incident initial state must be DISPATCHING');
console.log(`   ✅ Incident [${incident.id}] ingested with severity ${incident.severity}.`);

console.log('2️⃣ Testing AWS Chime Voice Outbound Call Initiation...');
const callResult = await voice.initiateCall(incident.id);
assert(callResult.status === 'CONNECTED', 'Voice call must connect');
assert(callResult.agentSpokenPrompt.includes('checkout-payment-api'), 'Prompt must mention service');
assert(triage.getIncident(incident.id)!.status === 'CALL_IN_PROGRESS', 'Status must transition to CALL_IN_PROGRESS');
console.log('   📞 Call connected.');

console.log('3️⃣ Testing Natural Language Voice Command & Multi-Tool Execution...');
const responseResult = await voice.processSpokenInput(callResult.callId, 'I acknowledge the outage. Please roll back deployment to v2.4.1 right away.');
assert(responseResult.actionsTaken.length === 2, 'Should trigger 2 tool executions');
assert(responseResult.actionsTaken.some((a) => a.tool === 'acknowledge_incident'), 'Must execute acknowledge tool');
assert(responseResult.actionsTaken.some((a) => a.tool === 'trigger_rollback' && a.targetVersion === 'v2.4.1'), 'Must execute rollback to v2.4.1');
console.log('   ⚙️ Tools Executed:', responseResult.actionsTaken.map((a) => a.tool).join(', '));
voice.hangUp(callResult.callId);

console.log('4️⃣ Testing AWS End User Messaging SMS Gateway (simulator)...');
const smsResult = await messaging.sendUrgentSMS(incident.id, incident.onCallSchedule.secondaryPhone);
assert(smsResult.status === 'DELIVERED' || smsResult.status === 'SIMULATED', 'SMS must be delivered or simulated');
assert(smsResult.body.includes('https://ops.dispatchagent.aws'), 'SMS must contain deep-link token');
console.log('   📱 Dispatched SMS via', smsResult.provider);

console.log('5️⃣ Verifying Incident Action Audit Trail...');
assert(triage.getIncident(incident.id)!.actionLog.length >= 5, 'Must contain full timeline events');
console.log(`   📋 ${triage.getIncident(incident.id)!.actionLog.length} events logged.`);

console.log('6️⃣ Testing AWS Strands A2A Multi-Agent Protocol...');
const bus = new A2AMessageBus();
const supervisor = new TriageSupervisorAgent(bus);
const devops = new DevOpsRemediationAgent(bus);
const reporter = new IncidentReporterAgent(bus);
assert(supervisor.capabilities.includes('agent_delegation'), 'Supervisor must possess agent delegation');
assert(devops.capabilities.includes('rollback_deployment'), 'DevOps agent must handle rollbacks');
const plan = supervisor.evaluateAlert(incident);
assert(plan.priority === 'P1_CRITICAL', 'Plan priority must be P1_CRITICAL');
assert(plan.requiredAgents.length === 3, 'Must delegate to 3 specialized agents');
console.log('   🤖 A2A dispatch verified.');

console.log('7️⃣ Testing A2A Remediation & Incident Post-Mortem Synthesis...');
const devopsResult = devops.executeAction('trigger_rollback', { version: 'v2.4.1' }) as any;
assert(devopsResult.status === 'SUCCESS', 'DevOps action must succeed');
const postMortem = reporter.generateReport(incident, [devopsResult]) as any;
assert(postMortem.status === 'RESOLVED', 'Post-mortem status must be RESOLVED');
assert(postMortem.postMortemMarkdown.includes('v2.4.1'), 'Post-mortem must detail version rolled back');
console.log('   📄 Post-mortem synthesized:', postMortem.title);

console.log('\n🎉 ALL 7 DISPATCHAGENT.AI & AWS MULTI-AGENT A2A TESTS PASSED WITH 100% SUCCESS!\n');
