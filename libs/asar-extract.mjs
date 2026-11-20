import fs from 'node:fs';
import path from 'node:path';
const b=fs.readFileSync('D:/DSH/resources/app.asar');
const len=b.readUInt32LE(12);
const header=JSON.parse(b.subarray(16,16+len).toString('utf8'));
const dataStart=Math.ceil((16+len)/4)*4;
const outRoot='C:/Users/TLEWA/AppData/Local/Temp/dsh-asar-src';
const targets=process.argv.slice(2);
for(const rel of targets){
  let node=header;
  for(const part of rel.split('/')){node=node?.files?.[part]; if(!node){console.error('missing',rel);continue;}}
  if(node?.files){console.error('is dir',rel);continue;}
  const off=dataStart+Number(node.offset), size=Number(node.size);
  const out=path.join(outRoot, rel.replaceAll(':','_'));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,b.subarray(off,off+size));
  console.log(out);
}
