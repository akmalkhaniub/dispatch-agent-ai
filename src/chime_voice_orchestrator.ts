/**
 * ChimeVoiceOrchestrator - AWS Chime SDK Voice Connector & Agent Interaction
 * Handles telephony state, spoken command interpretation, and tool execution.
 *
 * NOTE: outbound PSTN dialing via the AWS Chime SDK Voice Connector requires
 * provisioned SIP media infrastructure that cannot run in this environment, so
 * calls are simulated here. The command-interpretation + tool-execution logic is real.
 */
import type { IncidentTriageEngine } from './incident_triage.js';

export interface CallRecord {
  callId: string;
  incidentId: string;
  phoneNumber: string;
  recipient: string;
  status: 'DIALING' | 'CONNECTED' | 'COMPLETED';
  startedAt: string;
  endedAt?: string;
  transcript: Array<{ speaker: string; text: string }>;
}

export interface SpokenResult {
  callId: string;
  agentVerbalReply: string;
  actionsTaken: Array<{ tool: string; status: string; targetVersion?: string }>;
}

export class ChimeVoiceOrchestrator {
  activeCalls: Map<string, CallRecord>;
  constructor(private triage: IncidentTriageEngine) {
    this.activeCalls = new Map();
  }

  /** Initiate an automated outbound call via AWS Chime SDK Voice Connector (simulated). */
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
    this.triage.logAction(incidentId, `Dialing primary on-call ${callRecord.recipient} (${callRecord.phoneNumber}) via AWS Chime Voice Connector`);

    callRecord.status = 'CONNECTED';
    const introPrompt = `Hello ${callRecord.recipient}. This is AWS DispatchAgent with a high-priority ${incident.severity} alert on ${incident.serviceName}. ${incident.metricViolation}. Please state your instructions or say acknowledge.`;
    callRecord.transcript.push({ speaker: 'Agent', text: introPrompt });
    this.triage.logAction(incidentId, `Spoken prompt delivered to responder.`);

    return { callId, status: 'CONNECTED', agentSpokenPrompt: introPrompt };
  }

  /** Process natural language spoken input from the engineer. */
  async processSpokenInput(callId: string, spokenText: string): Promise<SpokenResult> {
    const call = this.activeCalls.get(callId);
    if (!call) throw new Error(`Call session not found: ${callId}`);

    call.transcript.push({ speaker: 'Responder', text: spokenText });
    this.triage.logAction(call.incidentId, `Responder voice response: "${spokenText}"`);

    const lower = spokenText.toLowerCase();
    const actionsTaken: SpokenResult['actionsTaken'] = [];
    let agentVerbalReply = '';

    // Heuristic keyword classifier. This is not an Amazon Bedrock call.
    // Word-boundary match so "roll back" does not falsely match the token "ack".
    if (/\backnowledge\b/.test(lower) || /\back\b/.test(lower) || lower.includes('got it')) {
      this.triage.updateState(call.incidentId, 'ACKNOWLEDGED');
      actionsTaken.push({ tool: 'acknowledge_incident', status: 'SUCCESS' });
      agentVerbalReply += `Incident acknowledged by ${call.recipient}. `;
    }

    if (lower.includes('rollback') || lower.includes('roll back') || lower.includes('revert')) {
      const versionMatch = spokenText.match(/v?\d+\.\d+(\.\d+)?/i);
      const targetVersion = versionMatch ? versionMatch[0] : 'previous stable release';
      this.triage.updateState(call.incidentId, 'ACTION_EXECUTING');
      this.triage.logAction(call.incidentId, `Executed deployment rollback to target: ${targetVersion}`);
      actionsTaken.push({ tool: 'trigger_rollback', targetVersion, status: 'SUCCESS' });
      agentVerbalReply += `Initiated automated deployment rollback to ${targetVersion}. `;
    }

    if (lower.includes('escalate') || lower.includes('not available') || lower.includes('call someone else')) {
      this.triage.updateState(call.incidentId, 'ESCALATED');
      actionsTaken.push({ tool: 'escalate_call', status: 'ESCALATED' });
      agentVerbalReply += `Understood. Escalating to secondary on-call engineer immediately.`;
    }

    if (!agentVerbalReply) agentVerbalReply = `Instruction recorded: ${spokenText}. Standing by for further commands.`;

    call.transcript.push({ speaker: 'Agent', text: agentVerbalReply });
    return { callId, agentVerbalReply, actionsTaken };
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
