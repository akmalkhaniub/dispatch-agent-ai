# Changelog

## [Unreleased]

### Migrated to TypeScript (2026-09-18)
- Ported the incident-triage engine, Chime voice orchestrator, A2A multi-agent bus,
  messaging gateway, and server from JavaScript to **TypeScript** (strict).

### Fixed
- **`/api/state` and `/api/report` threw at request time**: the server read
  `triage.incidents`, but the engine field is `activeIncidents`. Fixed.

### Added
- Real **AWS SNS** SMS path in `MessagingGateway` (`@aws-sdk/client-sns` Publish) with a
  deterministic simulator fallback when AWS credentials are absent or the call fails.
- `createDispatchServer()` factory (testable) + server integration suite (10 assertions).
- Security: path-traversal guard (403), 64 KB request-body cap (413).
- Graceful shutdown, CI (Node 18/20/22), multi-stage Dockerfile, `engines.node >= 18`.

### Notes
- Outbound PSTN dialing via the AWS Chime SDK Voice Connector requires provisioned SIP
  media infra and remains simulated; the command-interpretation and A2A orchestration
  logic is real. See SPECIFICATION.md.
