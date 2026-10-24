const { execSync } = require('child_process');
const out = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=''node.exe''\\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const rows = JSON.parse(out);
const list = Array.isArray(rows) ? rows : [rows];
for (const r of list) {
  console.log(r.ProcessId + ' :: ' + String(r.CommandLine).slice(0, 160));
}
