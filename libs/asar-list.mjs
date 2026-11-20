import fs from 'node:fs';
const b=fs.readFileSync('D:/DSH/resources/app.asar');
const len=b.readUInt32LE(12);
const header=JSON.parse(b.subarray(16,16+len).toString('utf8'));
const rel=process.argv[2];
let node=header;
for(const p of rel.split('/')) node=node?.files?.[p];
if(!node){console.error('missing');process.exit(2);}
if(node.files) console.log(Object.keys(node.files).join('\n'));
else console.log('file',node.size);
