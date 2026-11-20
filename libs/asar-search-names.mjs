import fs from 'node:fs';
const b = fs.readFileSync('D:/DSH/resources/app.asar');
const len = b.readUInt32LE(12);
const header = JSON.parse(b.subarray(16, 16 + len).toString('utf8'));
const q = (process.argv[2] || '').toLowerCase();
const out = [];
(function walk(n, p) {
  for (const k of Object.keys(n.files || {})) {
    const v = n.files[k];
    const np = p ? p + '/' + k : k;
    if (v && v.files) walk(v, np);
    else if (np.toLowerCase().includes(q)) out.push(np);
  }
})(header, '');
console.log(out.join('\n'));