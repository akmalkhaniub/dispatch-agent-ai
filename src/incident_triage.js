/**
 * Incident Triage Engine for DispatchAgent.AI
 * Ingests alerts, parses telemetry, and controls the incident lifecycle state machine.
 */

export class IncidentTriageEngine {
  constructor() {
    this.activeIncidents = new Map();
  }

  /**
   * Register and prioritize an incoming incident alert
   */
  ingestAlert({ incidentId, severity = 'P1', serviceName, metricViolation, onCallSchedule }) {
    const id = incidentId || 'inc_' + Date.now();
    const incident = {
      id,
      severity, // 'P1' | 'P2' | 'P3'
      serviceName,
      metricViolation,
      status: 'DISPATCHING', // 'DISPATCHING' | 'CALL_IN_PROGRESS' | 'ACKNOWLEDGED' | 'ACTION_EXECUTING' | 'RESOLVED' | 'ESCALATED'
      createdAt: new Date().toISOString(),
      onCallSchedule: onCallSchedule || {
        primaryName: 'Alex Chen',
        primaryPhone: '+1-555-0199',
        secondaryName: 'Jordan Taylor',
        secondaryPhone: '+1-555-0288'
      },
      actionLog: []
    };

    this.activeIncidents.set(id, incident);
    this.logAction(id, `Alert ingested with severity ${severity} on service ${serviceName}: ${metricViolation}`);
    return incident;
  }

  /**
   * Log an operational event into the incident audit trail
   */
  logAction(incidentId, message) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return;

    incident.actionLog.push({
      timestamp: new Date().toISOString(),
      message
    });
  }

  /**
   * Update incident lifecycle state
   */
  updateState(incidentId, nextState) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    incident.status = nextState;
    this.logAction(incidentId, `Lifecycle state transition -> ${nextState}`);
    return incident;
  }

  getIncident(incidentId) {
    return this.activeIncidents.get(incidentId);
  }
}
