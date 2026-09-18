/**
 * MessagingGateway - AWS End User Messaging (SMS fallback).
 * Dispatches deep-link SMS notifications when voice calls go unanswered.
 *
 * Sends via real AWS SNS (`@aws-sdk/client-sns` Publish) when AWS credentials are
 * present; otherwise records a deterministic simulated delivery so the flow is
 * demoable offline.
 */
import type { IncidentTriageEngine } from './incident_triage.js';

export interface SmsRecord {
  messageId: string;
  incidentId: string;
  recipientPhone: string;
  body: string;
  sentAt: string;
  status: 'DELIVERED' | 'SIMULATED';
  provider: 'aws-sns' | 'simulator';
}

export class MessagingGateway {
  dispatchedMessages: SmsRecord[] = [];
  private isMock: boolean;

  constructor(private triage: IncidentTriageEngine, options: { isMock?: boolean } = {}) {
    this.isMock = options.isMock ?? (!process.env.AWS_ACCESS_KEY_ID || process.env.MOCK_SNS === 'true');
  }

  /** Dispatch an urgent SMS with an action deep-link. */
  async sendUrgentSMS(incidentId: string, recipientPhone: string): Promise<SmsRecord> {
    const incident = this.triage.getIncident(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    const token = Math.random().toString(36).substring(2, 10);
    const deepLinkUrl = `https://ops.dispatchagent.aws/ack/${incident.id}?token=${token}`;
    const body = `[AWS ALERT] ${incident.severity} on ${incident.serviceName}: ${incident.metricViolation}. Tap to ACK or Rollback: ${deepLinkUrl}`;

    let messageId = 'sms_' + Date.now();
    let status: SmsRecord['status'] = 'SIMULATED';
    let provider: SmsRecord['provider'] = 'simulator';

    if (!this.isMock) {
      try {
        const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
        const client = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
        const out = await client.send(new PublishCommand({ PhoneNumber: recipientPhone, Message: body }));
        messageId = out.MessageId || messageId;
        status = 'DELIVERED';
        provider = 'aws-sns';
      } catch (err) {
        this.triage.logAction(incidentId, `AWS SNS publish failed, using simulator: ${(err as Error).message}`);
      }
    }

    const record: SmsRecord = { messageId, incidentId, recipientPhone, body, sentAt: new Date().toISOString(), status, provider };
    this.dispatchedMessages.push(record);
    this.triage.logAction(incidentId, `Dispatched fallback SMS via ${provider} to ${recipientPhone}`);
    return record;
  }
}
