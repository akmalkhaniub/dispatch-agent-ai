import assert from 'assert';
import { IncidentTriageEngine } from '../src/incident_triage.js';
import { ChimeVoiceOrchestrator } from '../src/chime_voice_orchestrator.js';
import { MessagingGateway } from '../src/messaging_gateway.js';

console.log('🧪 Starting DispatchAgent.AI Automated Verification Suite (AWS CDS Partner Hackathon)...\n');

const triage = new IncidentTriageEngine();
const voice = new ChimeVoiceOrchestrator(triage);
const messaging = new MessagingGateway(triage);

// Test 1: Incident Ingestion
console.log('1️⃣ Testing High-Priority Incident Ingestion...');
const incident = triage.ingestAlert({
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

assert(incident.status === 'DISPATCHING', 'Incident initial state must be DISPATCHING');
console.log(`   ✅ Incident [${incident.id}] ingested successfully with severity ${incident.severity}.`);

// Test 2: Voice Call Initiation via AWS Chime Connector
console.log('2️⃣ Testing AWS Chime Voice Outbound Call Initiation...');
const callResult = await voice.initiateCall(incident.id);
assert(callResult.status === 'CONNECTED', 'Voice call must connect');
assert(callResult.agentSpokenPrompt.includes('checkout-payment-api'), 'Prompt must mention service');
assert(triage.getIncident(incident.id).status === 'CALL_IN_PROGRESS', 'Status must transition to CALL_IN_PROGRESS');
console.log('   📞 Call connected to:', incident.onCallSchedule.primaryPhone);
console.log('   🗣️ Agent Prompt:', callResult.agentSpokenPrompt);

// Test 3: Natural Language Spoken Command & Tool Execution
console.log('3️⃣ Testing Natural Language Voice Command & Multi-Tool Execution...');
const spokenCommand = 'I acknowledge the outage. Please roll back deployment to v2.4.1 right away.';
const responseResult = await voice.processSpokenInput(callResult.callId, spokenCommand);

assert(responseResult.actionsTaken.length === 2, 'Should trigger 2 tool executions');
assert(responseResult.actionsTaken.some(a => a.tool === 'acknowledge_incident'), 'Must execute acknowledge tool');
assert(responseResult.actionsTaken.some(a => a.tool === 'trigger_rollback' && a.targetVersion === 'v2.4.1'), 'Must execute rollback to v2.4.1');
console.log('   ✅ Spoken Command Processed:', spokenCommand);
console.log('   ⚙️ Tools Executed:', responseResult.actionsTaken.map(a => `${a.tool} (${a.targetVersion || a.status})`).join(', '));
console.log('   🤖 Verbal Confirmation:', responseResult.agentVerbalReply);

// Conclude call
voice.hangUp(callResult.callId);

// Test 4: SMS Fallback Dispatch via AWS End User Messaging
console.log('4️⃣ Testing AWS End User Messaging SMS Gateway...');
const smsResult = await messaging.sendUrgentSMS(incident.id, incident.onCallSchedule.secondaryPhone);
assert(smsResult.status === 'DELIVERED', 'SMS status must be DELIVERED');
assert(smsResult.body.includes('https://ops.dispatchagent.aws'), 'SMS must contain deep-link token');
console.log('   📱 Dispatched SMS to:', smsResult.recipientPhone);
console.log('   💬 Message Body:', smsResult.body);

// Test 5: Verify Comprehensive Audit Trail
console.log('5️⃣ Verifying Incident Action Audit Trail...');
const updatedIncident = triage.getIncident(incident.id);
assert(updatedIncident.actionLog.length >= 5, 'Must contain full timeline events');
console.log(`   📋 Incident Audit Log (${updatedIncident.actionLog.length} events logged):`);
for (const log of updatedIncident.actionLog) {
  console.log(`      [${log.timestamp.split('T')[1].split('.')[0]}] ${log.message}`);
}

console.log('\n🎉 ALL DISPATCHAGENT.AI & AWS CDS TESTS PASSED WITH 100% SUCCESS!\n');
