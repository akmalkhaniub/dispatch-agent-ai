# Technical Specification: DispatchAgent.AI
**Project Name:** DispatchAgent.AI (AWS CDS Agentic AI Partner Hackathon)  
**Status:** Prototype implemented — spec is target design (updated 2026-09-18)  

> **Implementation status (2026-09-18):** The sections below describe the *target* architecture. Built: a Node.js A2A orchestrator, incident triage engine, mock Chime voice orchestrator, and mock messaging gateway with deterministic tool calls (511 LOC, 7 passing tests). Not yet built: real AWS Chime SDK/SIP telephony, the audio/transcription bridge, live AWS End User Messaging (SMS/WhatsApp), and the Next.js incident room (currently static HTML).
**Version:** 1.0.0  

---

## 1. System Architecture
DispatchAgent.AI connects real-time incident event streams with voice and SMS telephony via AWS Communication Developer Services (Amazon Chime SDK Voice Connector & AWS End User Messaging), powered by Amazon Bedrock Claude 3.5 Sonnet agent runtime.

```mermaid
graph TD
    A[Monitoring Alert: PagerDuty / CloudWatch] --> B[Incident Trigger Ingestion API]
    B --> C[DispatchAgent State Machine]
    C -->|Dial On-Call Engineer| D[AWS Chime SDK / SIP Trunk Voice Connector]
    D -->|Bidirectional Audio Stream| E[Audio Bridge & Transcriber]
    E -->|Real-time STT / TTS| F[Bedrock Agentic Conversational Core]
    F -->|Tool Calls: Query Logs, Ack Alert, Escalate| G[Enterprise Tool Registry]
    F -->|Fallback to SMS / WhatsApp| H[AWS End User Messaging]
    C --> I[Real-time Ops Dashboard (Next.js + WebSockets)]
```

---

## 2. Agent Workflow & State Machine

1. **TRIGGER:** High-severity incident received via webhook.
2. **TRIAGE:** Agent parses logs, correlates historical runbooks, and drafts an initial incident assessment.
3. **DISPATCH (Voice):** Agent initiates outbound phone call to on-call engineer using AWS Chime SDK Voice Connector.
4. **INTERACTIVE CONVERSATION:**
   - Agent speaks concise incident summary via low-latency streaming TTS.
   - Engineer responds with voice instructions (e.g., *"Roll back deployment to v1.4 and acknowledge incident"*).
   - Agent interprets natural language, executes tool action, and confirms execution verbally.
5. **FALLBACK / ESCALATION:** If engineer does not answer within 45 seconds, agent sends an SMS with deep-link approval via AWS End User Messaging, then escalates to secondary engineer.

---

## 3. Data Schema & Tool Specifications

### 3.1 Incident Event Payload
```typescript
interface IncidentEvent {
  incidentId: string;
  severity: 'P1' | 'P2' | 'P3';
  serviceName: string;
  metricViolation: string;
  timestamp: string;
  runbookUrl?: string;
  onCallSchedule: {
    primaryPhone: string;
    primaryName: string;
    secondaryPhone: string;
    secondaryName: string;
  };
}
```

### 3.2 Agent Tool Definitions
```json
[
  {
    "name": "acknowledge_incident",
    "description": "Marks the incident as acknowledged by the current responder.",
    "parameters": {
      "incident_id": "string",
      "responder_notes": "string"
    }
  },
  {
    "name": "trigger_rollback",
    "description": "Executes automated deployment rollback to a specified target version.",
    "parameters": {
      "service_name": "string",
      "target_version": "string"
    }
  },
  {
    "name": "escalate_to_secondary",
    "description": "Triggers immediate outbound call to secondary on-call engineer.",
    "parameters": {
      "incident_id": "string",
      "reason": "string"
    }
  }
]
```

---

## 4. Acceptance Criteria
1. Webhook trigger initiates an automated voice call using AWS Chime SDK simulator or live phone number.
2. Bidirectional voice audio processes with `< 1200ms` total turn-around latency.
3. Agent correctly calls `acknowledge_incident` or `trigger_rollback` tools upon verbal instruction.
4. Real-time transcript, call status, and action logs appear live on the Next.js Ops Dashboard.
