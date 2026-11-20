
import fs from 'node:fs';
const b=fs.readFileSync('D:/DSH/resources/app.asar');
const len=b.readUInt32LE(12);
const header=JSON.parse(b.subarray(16,16+len).toString('utf8'));
let n=0; const hits=[];
function walk(node,p){
  for(const k of Object.keys(node.files||{})){
    const v=node.files[k]; const np=p?p+'/'+k:k;
    if(v&&v.files) walk(v,np);
    else { n++; if(np.toLowerCase().includes('context')) hits.push(np); }
  }
}
walk(header,'');
console.log('files',n,'hits',hits.length);
console.log(hits.slice(0,40).join(String.fromCharCode(10)));
