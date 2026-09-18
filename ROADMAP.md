# Roadmap & Milestones: DispatchAgent.AI
**Hackathon:** AWS CDS Agentic AI Partner Hackathon  
**Target Submission Deadline:** October 28, 2026  

---

> **Status legend (updated 2026-09-18):** `[x]` implemented in code · `[~]` partial / stand-in (working JS prototype, not the production stack named) · `[ ]` not started.
> **Reality note:** Node.js prototype with an A2A orchestrator, incident triage engine, mock Chime voice orchestrator, and mock messaging gateway (511 LOC, 7 passing tests). No live AWS Chime/SIP, real telephony, or End User Messaging integration; dashboard is static HTML.

## Phase 1: Agentic Core & Tool Execution (Week 1)
- [~] Implement LangGraph / Python state machine for incident triage and call states. *(JS orchestrator, not LangGraph)*
- [x] Define deterministic tool executions (`acknowledge_incident`, `trigger_rollback`, `fetch_metrics`).
- [x] Write mock incident simulation generator and verification unit tests.

## Phase 2: Telephony & Audio Bridge (Week 2)
- [~] Setup AWS Chime SDK Voice Connector or programmable SIP audio stream. *(mock orchestrator only)*
- [~] Implement real-time WebSocket audio streaming bridge (PCM audio chunks <-> Transcribe / Polly / Cartesia).
- [~] Add voice activity detection (VAD) and barge-in / interruptibility handling.

## Phase 3: Omnichannel Fallback & Ops Dashboard (Week 3)
- [~] Integrate AWS End User Messaging (SMS & WhatsApp notifications). *(mock messaging gateway)*
- [~] Build Next.js 14 real-time incident room with live call waveform, transcript, and timeline events. *(static HTML)*
- [~] Implement human-in-the-loop manual override buttons.

## Phase 4: Verification, Video Demonstration & Submission (Week 4)
- [~] Execute end-to-end simulated P1 outage call from webhook trigger to verbal rollback. *(simulated in tests)*
- [ ] Record high-definition demonstration video illustrating both sides of the call.
- [ ] Prepare public architecture documentation and Devpost submission package.
