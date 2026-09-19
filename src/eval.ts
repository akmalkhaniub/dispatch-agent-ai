/**
 * Command-understanding evaluation for the voice orchestrator.
 *
 * Runs a set of labeled spoken commands through the real tool-interpretation path and
 * measures action accuracy — the fraction where the executed tools exactly match the
 * expected set. This is the number that says "the agent does the right thing when told."
 */
import { IncidentTriageEngine } from './incident_triage.js';
import { ChimeVoiceOrchestrator } from './chime_voice_orchestrator.js';

interface Case {
  spoken: string;
  expected: string[]; // expected tool names, sorted
}

export const CASES: Case[] = [
  { spoken: 'I acknowledge the outage.', expected: ['acknowledge_incident'] },
  { spoken: 'Roll back the deployment to v2.4.1 now.', expected: ['trigger_rollback'] },
  { spoken: 'Ack and roll back to v2.3.0 immediately.', expected: ['acknowledge_incident', 'trigger_rollback'] },
  { spoken: "I'm not available, escalate to secondary.", expected: ['escalate_call'] },
  { spoken: 'Understood, got it, revert the last release.', expected: ['acknowledge_incident', 'trigger_rollback'] },
  { spoken: 'Give me the current metrics.', expected: [] }, // no actionable tool
];

export interface EvalResult {
  total: number;
  correct: number;
  accuracy: number;
  perCase: Array<{ spoken: string; expected: string[]; got: string[]; ok: boolean }>;
}

export async function evaluate(cases: Case[] = CASES): Promise<EvalResult> {
  const perCase: EvalResult['perCase'] = [];
  let correct = 0;
  for (const c of cases) {
    const triage = new IncidentTriageEngine();
    const inc = triage.ingestAlert({ severity: 'P1', serviceName: 'svc', metricViolation: 'errors' });
    const voice = new ChimeVoiceOrchestrator(triage);
    const call = await voice.initiateCall(inc.id);
    const res = await voice.processSpokenInput(call.callId, c.spoken);
    const got = res.actionsTaken.map((a) => a.tool).sort();
    const exp = [...c.expected].sort();
    const ok = got.length === exp.length && got.every((t, i) => t === exp[i]);
    if (ok) correct++;
    perCase.push({ spoken: c.spoken, expected: exp, got, ok });
  }
  return { total: cases.length, correct, accuracy: Number((correct / cases.length).toFixed(3)), perCase };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMain) {
  evaluate().then((r) => {
    console.log(`DispatchAgent command accuracy: ${r.accuracy} (${r.correct}/${r.total})`);
    for (const c of r.perCase) console.log(`  ${c.ok ? '✓' : '✗'} "${c.spoken}" -> [${c.got}]`);
  });
}
