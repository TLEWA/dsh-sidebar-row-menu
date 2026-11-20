import fs from 'node:fs';
const b=fs.readFileSync('D:/DSH/resources/app.asar');
const len=b.readUInt32LE(12);
const header=JSON.parse(b.subarray(16,16+len).toString('utf8'));
const hits=[];
function walk(node,p){for(const k of Object.keys(node.files||{})){const v=node.files[k];const np=p?p+'/'+k:k;if(v&&v.files)walk(v,np);else if(/presented|changed-files|attachments|ref-chip|open-in-app|context-menu|contextmenus/i.test(np))hits.push(np);}}
walk(header,'');
console.log('hits',hits.length);
console.log(hits.join('\n'));
