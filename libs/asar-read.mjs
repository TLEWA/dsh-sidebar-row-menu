
import fs from 'node:fs';
const [,, rel] = process.argv;
const b = fs.readFileSync('D:/DSH/resources/app.asar');
const len = b.readUInt32LE(12);
const header = JSON.parse(b.subarray(16, 16 + len).toString('utf8'));
const dataStart = Math.ceil((16 + len) / 4) * 4;
let node = header;
for (const part of rel.split('/')) {
  node = node?.files?.[part];
  if (node === undefined) { console.error('missing', part, rel); process.exit(2); }
}
if (!node.files) {
  const off = dataStart + Number(node.offset);
  const size = Number(node.size);
  process.stdout.write(b.subarray(off, off + size));
} else {
  console.error('is dir', rel); process.exit(3);
}
