import fs from 'node:fs';
const b = fs.readFileSync('D:/DSH/resources/app.asar');
const len = b.readUInt32LE(12);
const header = JSON.parse(b.subarray(16, 16 + len).toString('utf8'));
const prefix = process.argv[2];
let node = header;
for (const part of prefix.split('/')) node = node?.files?.[part];
const out = [];
(function walk(n, p) {
  for (const k of Object.keys(n.files || {})) {
    const v = n.files[k];
    const np = p ? p + '/' + k : k;
    if (v && v.files) walk(v, np);
    else out.push(np + ' ' + v.size);
  }
})(node, '');
console.log(out.join('\n'));