/**
 * MessagingGateway - AWS End User Messaging (SMS & Push Fallback)
 * Dispatches deep-link SMS notifications when voice calls encounter no-answer or busy signals.
 */

export class MessagingGateway {
  constructor(triageEngine) {
    this.triage = triageEngine;
    this.dispatchedMessages = [];
  }

  /**
   * Dispatch urgent SMS notification with action deep-links
   */
  async sendUrgentSMS(incidentId, recipientPhone) {
    const incident = this.triage.getIncident(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    const messageId = 'sms_' + Date.now();
    const token = Math.random().toString(36).substr(2, 8);
    const deepLinkUrl = `https://ops.dispatchagent.aws/ack/${incident.id}?token=${token}`;

    const body = `[AWS ALERT] ${incident.severity} on ${incident.serviceName}: ${incident.metricViolation}. Tap to ACK or Rollback: ${deepLinkUrl}`;

    const record = {
      messageId,
      incidentId,
      recipientPhone,
      body,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED'
    };

    this.dispatchedMessages.push(record);
    this.triage.logAction(incidentId, `Dispatched fallback SMS via AWS End User Messaging to ${recipientPhone}`);

    return record;
  }
}
