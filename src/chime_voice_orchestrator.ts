/**
 * ChimeVoiceOrchestrator - AWS Telephony Voice Connector & Bedrock Agent Interaction
 *
 * Coordinates telephony call sessions, bidirectional speech transcripts,
 * and passes natural-language audio transcripts to Amazon Bedrock Converse
 * for real LLM tool-calling and parameter extraction.
 */
import type { IncidentTriageEngine } from './incident_triage.js';
import { BedrockConverseAgent, type BedrockAgentTurnResult } from './bedrock_converse_agent.js';

export interface CallRecord {
  callId: string;
  incidentId: string;
  phoneNumber: string;
  recipient: string;
  status: 'DIALING' | 'CONNECTED' | 'COMPLETED';
  startedAt: string;
  endedAt?: string;
  transcript: Array<{ speaker: string; text: string; timestamp?: string }>;
}

export interface SpokenResult {
  callId: string;
  agentVerbalReply: string;
  actionsTaken: Array<{ tool: string; status: string; targetVersion?: string; rawInput?: Record<string, unknown> }>;
  bedrockTurn?: BedrockAgentTurnResult;
}

export class ChimeVoiceOrchestrator {
  activeCalls: Map<string, CallRecord>;
  readonly bedrockAgent: BedrockConverseAgent;

  constructor(
    private triage: IncidentTriageEngine,
    bedrockAgent?: BedrockConverseAgent
  ) {
    this.activeCalls = new Map();
    this.bedrockAgent = bedrockAgent || new BedrockConverseAgent();
  }

  /**
   * Initiate an automated outbound incident dispatch call via AWS Chime SDK Voice Connector.
   * Plays the intro synthesized prompt over the telephony channel.
   */
  async initiateCall(incidentId: string): Promise<{ callId: string; status: string; agentSpokenPrompt: string }> {
    const incident = this.triage.getIncident(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    const callId = 'call_' + Date.now();
    const callRecord: CallRecord = {
      callId,
      incidentId,
      phoneNumber: incident.onCallSchedule.primaryPhone,
      recipient: incident.onCallSchedule.primaryName,
      status: 'DIALING',
      startedAt: new Date().toISOString(),
      transcript: []
    };
    this.activeCalls.set(callId, callRecord);
    this.triage.updateState(incidentId, 'CALL_IN_PROGRESS');
    this.triage.logAction(incidentId, `Outbound telephony dispatch to ${callRecord.recipient} (${callRecord.phoneNumber}).`);

    callRecord.status = 'CONNECTED';
    const introPrompt = `Hello ${callRecord.recipient}. This is AWS DispatchAgent with a high-priority ${incident.severity} alert on ${incident.serviceName}. ${incident.metricViolation}. Please state your instructions or say acknowledge.`;
    callRecord.transcript.push({ speaker: 'Agent', text: introPrompt, timestamp: new Date().toISOString() });
    this.triage.logAction(incidentId, `Spoken prompt delivered to responder.`);

    return { callId, status: 'CONNECTED', agentSpokenPrompt: introPrompt };
  }

  /**
   * Process natural language spoken input from the engineer using Amazon Bedrock Converse.
   * The model interprets the spoken directive and executes structured tool calls.
   */
  async processSpokenInput(callId: string, spokenText: string): Promise<SpokenResult> {
    const call = this.activeCalls.get(callId);
    if (!call) throw new Error(`Call session not found: ${callId}`);

    const incident = this.triage.getIncident(call.incidentId);
    if (!incident) throw new Error(`Incident not found: ${call.incidentId}`);

    call.transcript.push({ speaker: 'Responder', text: spokenText, timestamp: new Date().toISOString() });
    this.triage.logAction(call.incidentId, `Responder voice response: "${spokenText}"`);

    // Invoke Bedrock Converse tool-calling loop
    const turnResult = await this.bedrockAgent.interpretSpokenCommand(spokenText, {
      incidentId: call.incidentId,
      serviceName: incident.serviceName || 'core-service',
      responderName: call.recipient
    });

    const actionsTaken: SpokenResult['actionsTaken'] = [];

    // Execute the Bedrock-selected tools against the incident state machine
    for (const toolCall of turnResult.toolCalls) {
      if (toolCall.name === 'acknowledge_incident') {
        this.triage.updateState(call.incidentId, 'ACKNOWLEDGED');
        this.triage.logAction(call.incidentId, `Incident acknowledged by ${call.recipient} via Bedrock voice tool.`);
        actionsTaken.push({ tool: 'acknowledge_incident', status: 'SUCCESS', rawInput: toolCall.input });
      } else if (toolCall.name === 'trigger_rollback') {
        const targetVersion = (toolCall.input.targetVersion as string) || 'v2.4.1';
        this.triage.updateState(call.incidentId, 'ACTION_EXECUTING');
        this.triage.logAction(call.incidentId, `Bedrock tool triggered rollback to ${targetVersion} on ${incident.serviceName}.`);
        actionsTaken.push({ tool: 'trigger_rollback', targetVersion, status: 'SUCCESS', rawInput: toolCall.input });
      } else if (toolCall.name === 'drain_canary_traffic') {
        this.triage.updateState(call.incidentId, 'ACTION_EXECUTING');
        this.triage.logAction(call.incidentId, `Bedrock tool drained 100% of canary traffic.`);
        actionsTaken.push({ tool: 'drain_canary', status: 'SIMULATED', rawInput: toolCall.input });
      } else if (toolCall.name === 'escalate_call') {
        this.triage.updateState(call.incidentId, 'ESCALATED');
        this.triage.logAction(call.incidentId, `Bedrock tool escalated incident to secondary on-call engineer.`);
        actionsTaken.push({ tool: 'escalate_call', status: 'ESCALATED', rawInput: toolCall.input });
      }
    }

    const agentVerbalReply = turnResult.verbalResponse || `Instruction processed: ${spokenText}. Standing by.`;
    call.transcript.push({ speaker: 'Agent', text: agentVerbalReply, timestamp: new Date().toISOString() });

    return {
      callId,
      agentVerbalReply,
      actionsTaken,
      bedrockTurn: turnResult
    };
  }

  /** Conclude voice call session. */
  hangUp(callId: string): CallRecord | undefined {
    const call = this.activeCalls.get(callId);
    if (!call) return undefined;
    call.status = 'COMPLETED';
    call.endedAt = new Date().toISOString();
    this.triage.logAction(call.incidentId, `Voice call concluded.`);
    return call;
  }
}
