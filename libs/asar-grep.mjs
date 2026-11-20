import fs from 'node:fs';
const b=fs.readFileSync('D:/DSH/resources/app.asar');
const len=b.readUInt32LE(12);
const header=JSON.parse(b.subarray(16,16+len).toString('utf8'));
const dataStart=Math.ceil((16+len)/4)*4;
const needles=['data-message-attachments','data-ref-chip','data-changed-files','data-presented-file','workspacePathApplications','openWorkspacePath','ContextMenuTriggerProps'];
function walk(node,p){
  for(const k of Object.keys(node.files||{})){
    const v=node.files[k]; const np=p?p+'/'+k:k;
    if(v&&v.files){walk(v,np);continue;}
    if(!/\.(tsx?|jsx?|md)$/.test(k)) continue;
    const off=dataStart+Number(v.offset), size=Number(v.size);
    if(size>500000) continue;
    const text=b.subarray(off,off+size).toString('utf8');
    const hit=needles.filter(n=>text.includes(n));
    if(hit.length) console.log(np+' :: '+hit.join(','));
  }
}
walk(header,'');
