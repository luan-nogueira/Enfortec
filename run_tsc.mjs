import { execSync } from 'child_process';
try {
  const output = execSync('node node_modules/typescript/bin/tsc --noEmit', { encoding: 'utf-8' });
  console.log('SUCCESS:', output);
} catch (e) {
  console.log('FAILED:\n', e.stdout || e.message);
}
