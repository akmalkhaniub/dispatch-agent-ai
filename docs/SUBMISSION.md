# DispatchAgent submission notes

Deadline 28 Oct 2026.

## What a judge can run today

```bash
npm install
npm run dev
```

Open http://localhost:3003. Dial the simulated call and use a spoken-command button. Intent matching is a keyword heuristic, not Amazon Bedrock. The post-mortem says acknowledgement and remediation times are **not measured**. SMS sends only when AWS SNS credentials and a topic are configured.

## Not in this submission

No real phone call, no live SMS, and no public URL.
