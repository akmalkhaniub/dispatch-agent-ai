import assert from 'assert';
import { evaluate, CASES } from '../src/eval.js';

console.log('🧪 DispatchAgent command-understanding eval...\n');
let passed = 0;
const ok = (label: string, cond: boolean) => { assert(cond, label); passed++; console.log(`   ✅ ${label}`); };

const r = await evaluate();
for (const c of r.perCase) console.log(`   ${c.ok ? '✓' : '✗'} "${c.spoken.slice(0,40)}" -> [${c.got}]`);
console.log('   accuracy:', r.accuracy);

ok('covers all labeled commands', r.total === CASES.length);
ok('perfect action accuracy on the labeled set (1.0)', r.accuracy === 1.0);
ok('acknowledge+rollback compound handled', r.perCase.some((c) => c.expected.length === 2 && c.ok));
ok('non-actionable command yields no tools', r.perCase.some((c) => c.expected.length === 0 && c.got.length === 0 && c.ok));

console.log(`\n🎉 ALL ${passed} DISPATCHAGENT EVAL ASSERTIONS PASSED.\n`);
