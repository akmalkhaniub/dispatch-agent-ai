/**
 * Incident Triage Engine for DispatchAgent.AI
 * Ingests alerts, parses telemetry, and controls the incident lifecycle state machine.
 */

export type Severity = 'P1' | 'P2' | 'P3';
export type IncidentStatus =
  | 'DISPATCHING'
  | 'CALL_IN_PROGRESS'
  | 'ACKNOWLEDGED'
  | 'ACTION_EXECUTING'
  | 'RESOLVED'
  | 'ESCALATED';

export interface OnCallSchedule {
  primaryName: string;
  primaryPhone: string;
  secondaryName: string;
  secondaryPhone: string;
}

export interface Incident {
  id: string;
  severity: Severity;
  serviceName?: string;
  metricViolation?: string;
  status: IncidentStatus;
  createdAt: string;
  onCallSchedule: OnCallSchedule;
  actionLog: Array<{ timestamp: string; message: string }>;
}

export interface AlertInput {
  incidentId?: string;
  severity?: Severity;
  serviceName?: string;
  metricViolation?: string;
  onCallSchedule?: OnCallSchedule;
}

const DEFAULT_SCHEDULE: OnCallSchedule = {
  primaryName: 'Alex Chen',
  primaryPhone: '+1-555-0199',
  secondaryName: 'Jordan Taylor',
  secondaryPhone: '+1-555-0288'
};

export class IncidentTriageEngine {
  activeIncidents: Map<string, Incident>;

  constructor() {
    this.activeIncidents = new Map();
  }

  /** Register and prioritize an incoming incident alert. */
  ingestAlert({ incidentId, severity = 'P1', serviceName, metricViolation, onCallSchedule }: AlertInput): Incident {
    const id = incidentId || 'inc_' + Date.now();
    const incident: Incident = {
      id,
      severity,
      serviceName,
      metricViolation,
      status: 'DISPATCHING',
      createdAt: new Date().toISOString(),
      onCallSchedule: onCallSchedule || { ...DEFAULT_SCHEDULE },
      actionLog: []
    };
    this.activeIncidents.set(id, incident);
    this.logAction(id, `Alert ingested with severity ${severity} on service ${serviceName}: ${metricViolation}`);
    return incident;
  }

  /** Log an operational event into the incident audit trail. */
  logAction(incidentId: string, message: string): void {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return;
    incident.actionLog.push({ timestamp: new Date().toISOString(), message });
  }

  /** Update incident lifecycle state. */
  updateState(incidentId: string, nextState: IncidentStatus): Incident {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);
    incident.status = nextState;
    this.logAction(incidentId, `Lifecycle state transition -> ${nextState}`);
    return incident;
  }

  getIncident(incidentId: string): Incident | undefined {
    return this.activeIncidents.get(incidentId);
  }
}
