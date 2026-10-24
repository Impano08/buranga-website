// Lists node processes holding port 5050 or running a src server entry.
// Usage: node scripts/_findnode.js
const { execFileSync } = require('child_process');

function ps(args) {
  return execFileSync('powershell', ['-NoProfile', '-Command', ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

const procs = ps(["Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"]);
let list;
try { list = JSON.parse(procs); } catch (e) { console.log('parse fail', e.message); process.exit(0); }
if (!Array.isArray(list)) list = [list];

for (const p of list) {
  const cmd = String(p.CommandLine || '');
  console.log(p.ProcessId + ' :: ' + cmd.slice(0, 200));
}
