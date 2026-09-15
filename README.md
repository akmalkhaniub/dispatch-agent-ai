# AWS Communication Developer Services (CDS) Agentic AI Partner Hackathon

- **Official Challenge URL:** [https://aws-cds-partner.devpost.com/](https://aws-cds-partner.devpost.com/)
- **Organizer:** Amazon Web Services (AWS)
- **Host Platform:** Devpost
- **Total Prize Pool:** $40,000 USD
- **Submission Dates:** September 14, 2026 – October 28, 2026
- **Format:** Online / Global
- **Primary Themes:** Agentic AI, Cloud Telephony, Omnichannel Communication (SMS, Voice, Video), Mobile & Web

---

## 1. Hackathon Objective & Problem Statement
AWS Communication Developer Services (including Amazon Chime SDK, Amazon Connect, AWS End User Messaging) provides infrastructure for programmable voice, video, SMS, and messaging channels.

This challenge tasks developers with creating **Agentic AI systems** that communicate autonomously across real telecommunications and digital channels—orchestrating multi-turn, multi-channel conversations that can take action, resolve customer tickets, handle emergency dispatches, or manage real-world operations.

### Judging Criteria
1. **Agent Autonomy & Intelligence (30%):** Complexity and reliability of the agent reasoning loop, tool execution, and dynamic context retention.
2. **AWS CDS Integration (25%):** Native leverage of AWS Chime SDK, End User Messaging, or Amazon Connect.
3. **Business Value & Impact (25%):** Direct practical utility in enterprise support, logistics, healthcare, or field operations.
4. **Execution & Documentation (20%):** Robust deployment scripts, clean codebase, and end-to-end demonstrable test calls/SMS.

---

## 2. Selected Project Concept: DispatchAgent.AI (Autonomous Field Ops & Incident Commander)
An autonomous dispatch and triage agent that monitors urgent enterprise alerts (IoT/APIs), autonomously calls or texts on-call engineers via AWS CDS, conducts an interactive voice triage to assess availability, verifies diagnostics, and dynamically re-routes tickets or initiates conference bridges when critical thresholds are breached.

---

## 3. Directory Structure
```
aws-cds-agentic-ai/
├── README.md               # Challenge rules, links, judging criteria (this file)
├── SPECIFICATION.md        # Architecture specification, CDS API flows, agent state machine
├── ROADMAP.md              # Milestone plan leading to October 28 deadline
├── agent/                  # Multi-agent coordinator (Python, LangGraph / AutoGen)
├── telephony-bridge/       # AWS Chime SDK & WebSockets audio streaming server
└── web/                    # Real-time incident commander dashboard
```
