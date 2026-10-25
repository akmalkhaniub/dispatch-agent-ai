import assert from 'assert';
import { BedrockConverseAgent } from '../src/bedrock_converse_agent.js';

console.log('🧪 Starting Bedrock Converse Tool-Calling Suite...');

const agent = new BedrockConverseAgent({ isMock: true });

// 1. Single tool call: acknowledge
const ackResult = await agent.interpretSpokenCommand('I acknowledge this P1 outage.', {
  incidentId: 'inc_test_1',
  serviceName: 'checkout-api',
  responderName: 'Alex'
});

assert(ackResult.toolCalls.length === 1, 'Must invoke 1 tool');
assert(ackResult.toolCalls[0].name === 'acknowledge_incident', 'Must invoke acknowledge_incident');
assert(ackResult.verbalResponse.includes('inc_test_1'), 'Verbal response must cite incident ID');
console.log('   ✅ Acknowledge tool parsed and invoked.');

// 2. Compound tool call: rollback + drain canary
const compound = await agent.interpretSpokenCommand('Rollback to v2.4.1 immediately and drain the canary traffic.', {
  incidentId: 'inc_test_2',
  serviceName: 'payment-service',
  responderName: 'Alex'
});

assert(compound.toolCalls.length === 2, 'Must invoke 2 compound tools');
assert(compound.toolCalls.some(t => t.name === 'trigger_rollback' && t.input.targetVersion === 'v2.4.1'), 'Must extract targetVersion v2.4.1');
assert(compound.toolCalls.some(t => t.name === 'drain_canary_traffic'), 'Must invoke drain_canary_traffic');
console.log('   ✅ Compound tools (rollback v2.4.1 + drain canary) parsed and invoked.');

// 3. Escalation tool call
const escResult = await agent.interpretSpokenCommand("I am unavailable right now, please escalate to secondary responder", {
  incidentId: 'inc_test_3',
  serviceName: 'auth-service',
  responderName: 'Alex'
});

assert(escResult.toolCalls.length === 1, 'Must invoke 1 tool for escalation');
assert(escResult.toolCalls[0].name === 'escalate_call', 'Must invoke escalate_call');
console.log('   ✅ Escalation command correctly parsed.');

// 4. Non-actionable utterance
const chatter = await agent.interpretSpokenCommand('What is the weather in Seattle right now?', {
  incidentId: 'inc_test_4',
  serviceName: 'auth-service',
  responderName: 'Alex'
});

assert(chatter.toolCalls.length === 0, 'Non-actionable query should not invoke emergency tools');
console.log('   ✅ Non-actionable utterance produces 0 tool calls.');

console.log('\n🎉 ALL 4 BEDROCK CONVERSE ASSERTIONS PASSED WITH 100% SUCCESS!\n');
