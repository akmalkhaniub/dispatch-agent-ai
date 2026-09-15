# Roadmap & Milestones: DispatchAgent.AI
**Hackathon:** AWS CDS Agentic AI Partner Hackathon  
**Target Submission Deadline:** October 28, 2026  

---

## Phase 1: Agentic Core & Tool Execution (Week 1)
- [ ] Implement LangGraph / Python state machine for incident triage and call states.
- [ ] Define deterministic tool executions (`acknowledge_incident`, `trigger_rollback`, `fetch_metrics`).
- [ ] Write mock incident simulation generator and verification unit tests.

## Phase 2: Telephony & Audio Bridge (Week 2)
- [ ] Setup AWS Chime SDK Voice Connector or programmable SIP audio stream.
- [ ] Implement real-time WebSocket audio streaming bridge (PCM audio chunks <-> Transcribe / Polly / Cartesia).
- [ ] Add voice activity detection (VAD) and barge-in / interruptibility handling.

## Phase 3: Omnichannel Fallback & Ops Dashboard (Week 3)
- [ ] Integrate AWS End User Messaging (SMS & WhatsApp notifications).
- [ ] Build Next.js 14 real-time incident room with live call waveform, transcript, and timeline events.
- [ ] Implement human-in-the-loop manual override buttons.

## Phase 4: Verification, Video Demonstration & Submission (Week 4)
- [ ] Execute end-to-end simulated P1 outage call from webhook trigger to verbal rollback.
- [ ] Record high-definition demonstration video illustrating both sides of the call.
- [ ] Prepare public architecture documentation and Devpost submission package.
