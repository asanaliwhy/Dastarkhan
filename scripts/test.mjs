import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('work/tests', { recursive:true });
await build({ entryPoints:['tests/release.test.ts'], outfile:'work/tests/release.test.cjs', bundle:true, platform:'node', format:'cjs' });
const result=spawnSync(process.execPath,['--test','work/tests/release.test.cjs'],{stdio:'inherit'});
process.exitCode=result.status??1;
