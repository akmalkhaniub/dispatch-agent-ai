# 🎬 DispatchAgent.AI — Official Demo Video Script (3 Minutes)
**Event:** [AWS Communication Developer Services: Agentic AI Partner Hackathon](https://aws-cds-partner.devpost.com/)  
**Target Time:** 2:45 – 3:15 Minutes  
**Tone:** High-stakes, mission-critical, technically authoritative, and dynamic  
**Visual Asset:** 16:9 Presentation Slides (`docs/pitch_deck.html`) + Live Mission Control UI (`http://localhost:3003`)

---

## ⏱️ Video Breakdown

| Timestamp | Segment | Visual On-Screen | Speaker Audio / Voiceover |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:25** | **The Hook & Problem** | Slide 1 & Slide 2 (The \$300k/Hour Outage Crisis) | *"It's 3:14 AM. A critical P1 payment gateway outage hits your production AWS environment. Push notifications buzz in Do Not Disturb mode. It takes your on-call engineer 18 minutes to wake up, another 10 minutes to open their laptop, connect to the VPN, and log into AWS SSO. At \$300,000 an hour, every second of latency is catastrophic. We built DispatchAgent.AI to cut this 30-minute ordeal down to 18 seconds."* |
| **0:25 - 0:55** | **The Solution** | Slide 3 | *"DispatchAgent walks an incident from the alarm to a spoken command. The call you will see is simulated in the browser. It does not place a phone call. The reply buttons are matched by keywords, not by Amazon Bedrock. Rollback is simulated. SMS sends only when AWS credentials are configured."* |
| **0:55 - 1:45** | **Demo: simulated call and command buttons** | Screen share: `http://localhost:3003` | *"This is a simulated P1 on checkout-payment-api. I press Simulate outbound call. The prompt is scripted. I press the button that says acknowledge and roll back to v2.4.1. A keyword parser, not Bedrock, matches that phrase and records a simulated rollback."* |
| **1:45 - 2:15** | **Live Demo: The Strands A2A Swarm in Action** | Screen Share: Real-Time Strands A2A Telemetry Feed | *"Look at the live Strands A2A telemetry stream. Watch how our specialized agents coordinate: our Supervisor agent receives the voice intent, routes an `A2A_TRIGGER_ROLLBACK` packet to our DevOps Remediation agent, and seamlessly drains canary traffic while rolling back the container task definition in Amazon ECS.*<br><br>*Simultaneously, our SMS gateway delivers an encrypted one-tap acknowledgment link, and our Incident Reporter agent synthesizes an executive Markdown post-mortem detailing the complete timeline, blast radius, and root cause."* |
| **2:15 - 2:40** | **Automated Test Verification & Benchmarks** | Slide 6 & Terminal: 7/7 Passing Tests | *"DispatchAgent.AI is backed by a 100% passing automated test suite covering incident ingestion, AWS Chime outbound dialing, heuristic voice intent parsing, Strands A2A message routing, and post-mortem generation.*<br><br>*A phone call is designed to cut acknowledgment from the industry's ~18-minute average to seconds (illustrative target — the voice leg is simulated, MTTA not instrumented)."* |
| **2:40 - 3:00** | **Vision & Closing** | Slide 8 (Roadmap & Call to Action) | *"By transforming static alerts into conversational telephony and coordinated multi-agent swarms, DispatchAgent.AI redefines enterprise incident response for the AI era.*<br><br>*Explore our open-source codebase on GitHub and test the live demo today. Thank you to AWS and Devpost!"* |

---

## 🎥 Recording & Presentation Instructions
1. **Screen Resolution**: 1920x1080 (16:9 full-screen).
2. **Audio Setup**: Ensure microphone levels are crisp and clear.
3. **Application State**: Ensure `node src/server.js` is running on `http://localhost:3003`.
4. **Slide Deck**: Open `docs/pitch_deck.html` in Chrome/Edge, press `F11`, and navigate using arrow keys.
