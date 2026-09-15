/**
 * ChimeVoiceOrchestrator - AWS Chime SDK Voice Connector & Agent Interaction
 * Handles real-time telephony state, voice speech synthesis, and spoken command interpretation.
 */

export class ChimeVoiceOrchestrator {
  constructor(triageEngine) {
    this.triage = triageEngine;
    this.activeCalls = new Map();
  }

  /**
   * Initiate an automated outbound call via AWS Chime SDK Voice Connector
   */
  async initiateCall(incidentId) {
    const incident = this.triage.getIncident(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    const callId = 'call_' + Date.now();
    const callRecord = {
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

    // Simulate connected call
    callRecord.status = 'CONNECTED';
    const introPrompt = `Hello ${callRecord.recipient}. This is AWS DispatchAgent with a high-priority ${incident.severity} alert on ${incident.serviceName}. ${incident.metricViolation}. Please state your instructions or say acknowledge.`;
    
    callRecord.transcript.push({ speaker: 'Agent', text: introPrompt });
    this.triage.logAction(incidentId, `Spoken prompt delivered to responder.`);

    return {
      callId,
      status: 'CONNECTED',
      agentSpokenPrompt: introPrompt
    };
  }

  /**
   * Process natural language spoken input from the engineer
   */
  async processSpokenInput(callId, spokenText) {
    const call = this.activeCalls.get(callId);
    if (!call) throw new Error(`Call session not found: ${callId}`);

    call.transcript.push({ speaker: 'Responder', text: spokenText });
    this.triage.logAction(call.incidentId, `Responder voice response: "${spokenText}"`);

    const lower = spokenText.toLowerCase();
    const actionsTaken = [];
    let agentVerbalReply = '';

    // 1. Tool Call: Acknowledge Incident
    if (lower.includes('acknowledge') || lower.includes('ack') || lower.includes('got it')) {
      this.triage.updateState(call.incidentId, 'ACKNOWLEDGED');
      actionsTaken.push({ tool: 'acknowledge_incident', status: 'SUCCESS' });
      agentVerbalReply += `Incident acknowledged by ${call.recipient}. `;
    }

    // 2. Tool Call: Rollback Deployment
    if (lower.includes('rollback') || lower.includes('roll back') || lower.includes('revert')) {
      const versionMatch = spokenText.match(/v?\d+\.\d+(\.\d+)?/i);
      const targetVersion = versionMatch ? versionMatch[0] : 'previous stable release';
      
      this.triage.updateState(call.incidentId, 'ACTION_EXECUTING');
      this.triage.logAction(call.incidentId, `Executed deployment rollback to target: ${targetVersion}`);
      actionsTaken.push({ tool: 'trigger_rollback', targetVersion, status: 'SUCCESS' });
      agentVerbalReply += `Initiated automated deployment rollback to ${targetVersion}. `;
    }

    // 3. Fallback / Escalation
    if (lower.includes('escalate') || lower.includes('not available') || lower.includes('call someone else')) {
      this.triage.updateState(call.incidentId, 'ESCALATED');
      actionsTaken.push({ tool: 'escalate_call', status: 'ESCALATED' });
      agentVerbalReply += `Understood. Escalating to secondary on-call engineer immediately.`;
    }

    if (!agentVerbalReply) {
      agentVerbalReply = `Instruction recorded: ${spokenText}. Standing by for further commands.`;
    }

    call.transcript.push({ speaker: 'Agent', text: agentVerbalReply });
    return {
      callId,
      agentVerbalReply,
      actionsTaken
    };
  }

  /**
   * Conclude voice call session
   */
  hangUp(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    call.status = 'COMPLETED';
    call.endedAt = new Date().toISOString();
    this.triage.logAction(call.incidentId, `Voice call concluded.`);
    return call;
  }
}
