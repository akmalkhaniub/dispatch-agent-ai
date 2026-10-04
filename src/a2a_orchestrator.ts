/**
 * AWS Strands SDK & A2A (Agent-to-Agent) Multi-Agent Orchestrator
 * Specialized agents: TriageSupervisor, TelephonyVoice, DevOpsRemediation, IncidentReporter.
 */
import { EventEmitter } from 'events';
import type { Incident } from './incident_triage.js';

export interface A2AMessage {
  sender: string;
  recipient: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface A2APacket extends A2AMessage {
  id: string;
  timestamp: string;
}

export class A2AMessageBus extends EventEmitter {
  messageLog: A2APacket[] = [];

  dispatch(message: A2AMessage): A2APacket {
    const packet: A2APacket = {
      id: 'a2a_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...message
    };
    this.messageLog.push(packet);
    this.emit('message', packet);
    this.emit(`agent:${message.recipient}`, packet);
    return packet;
  }
}

export interface DelegationPlan {
  incidentId: string;
  priority: 'P1_CRITICAL' | 'P2_HIGH';
  requiredAgents: string[];
  recommendedAction: string;
}

export class TriageSupervisorAgent {
  name = 'TriageSupervisorAgent';
  capabilities = ['incident_assessment', 'blast_radius_analysis', 'agent_delegation'];
  constructor(private bus: A2AMessageBus) {}

  evaluateAlert(alert: Partial<Incident>): DelegationPlan {
    const isP1 = alert.severity === 'P1' || (alert.metricViolation || '').includes('500');
    const plan: DelegationPlan = {
      incidentId: alert.id || 'inc_' + Date.now(),
      priority: isP1 ? 'P1_CRITICAL' : 'P2_HIGH',
      requiredAgents: ['TelephonyVoiceAgent', 'DevOpsRemediationAgent', 'IncidentReporterAgent'],
      recommendedAction: isP1 ? 'CALL_PRIMARY_AND_PREPARE_ROLLBACK' : 'SEND_SLACK_NOTIFICATION'
    };
    this.bus.dispatch({
      sender: this.name,
      recipient: 'TelephonyVoiceAgent',
      type: 'A2A_DISPATCH_CALL',
      payload: {
        incidentId: plan.incidentId,
        onCallTarget: alert.onCallSchedule?.primaryName || 'Alex Chen',
        phone: alert.onCallSchedule?.primaryPhone || '+1-555-0199',
        summary: alert.metricViolation
      }
    });
    return plan;
  }
}

export class DevOpsRemediationAgent {
  name = 'DevOpsRemediationAgent';
  capabilities = ['rollback_deployment', 'restart_ecs_service', 'drain_canary_traffic'];
  constructor(private bus: A2AMessageBus) {}

  executeAction(actionName: string, params: Record<string, any> = {}): Record<string, unknown> {
    // Actions are SIMULATED (no live ECS/deploy here), so we flag them and do not
    // report fabricated execution timings.
    let result: Record<string, unknown>;
    if (actionName === 'trigger_rollback') {
      result = { action: 'trigger_rollback', targetVersion: params.version || 'previous stable release', status: 'SUCCESS', deploymentId: 'dpl_' + Math.random().toString(36).substring(2, 8), simulated: true };
    } else if (actionName === 'drain_canary') {
      result = { action: 'drain_canary', weight: 0, status: 'TRAFFIC_DIVERTED', simulated: true };
    } else {
      result = { action: actionName, status: 'COMPLETED', simulated: true };
    }
    this.bus.dispatch({ sender: this.name, recipient: 'IncidentReporterAgent', type: 'A2A_REMEDIATION_LOG', payload: result });
    return result;
  }
}

export class IncidentReporterAgent {
  name = 'IncidentReporterAgent';
  capabilities = ['generate_postmortem', 'publish_statuspage', 'audit_timeline'];
  constructor(private bus: A2AMessageBus) {}

  generateReport(incident: Partial<Incident>, remediationLogs: unknown[] = []): Record<string, unknown> {
    // Derive the rolled-back version from the actual remediation log (if any).
    const rollback = (remediationLogs as Array<Record<string, unknown>>).find((l) => l && l.action === 'trigger_rollback');
    const version = (rollback?.targetVersion as string) || 'the previous stable release';
    const actions = (remediationLogs as Array<Record<string, unknown>>).map((l) => String(l.action)).filter(Boolean);
    return {
      title: `[POST-MORTEM] Incident ${incident.id || 'INC-1042'} - ${incident.serviceName || 'checkout-payment-api'}`,
      status: 'RESOLVED',
      rootCause: incident.metricViolation || 'Upstream service failure',
      timeToAcknowledge: 'not measured — voice leg is simulated',
      timeToRemediate: 'not measured — rollback is simulated',
      remediations: remediationLogs,
      postMortemMarkdown: `
# Executive Incident Report: ${incident.serviceName || 'checkout-payment-api'}
**Severity**: ${incident.severity || 'P1'} | **Status**: Resolved
- **Detection**: CloudWatch Alarm triggered at ${new Date().toISOString()}
- **A2A Orchestration**: TriageSupervisor -> TelephonyVoiceAgent -> DevOpsRemediationAgent
- **Actions executed (simulated)**: ${actions.length ? actions.join(', ') : 'none recorded'}
  - Outbound Chime voice call connected with the on-call engineer (simulated SIP leg)
  - Spoken instruction classified by the heuristic voice-command interpreter (not an LLM call)
  - Deployment rollback to \`${version}\` executed (simulated — no live ECS deploy)
      `.trim()
    };
  }
}
