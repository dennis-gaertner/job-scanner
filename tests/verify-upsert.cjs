// Local differential tests of complete upsert entry points; no Google/network calls.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const [baseline,candidate]=process.argv.slice(2);
if(!baseline||!candidate)throw Error('Usage: node tests/verify-upsert.cjs BASELINE_DIR CANDIDATE_DIR');
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
function files(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>['.git','node_modules'].includes(e.name)?[]:e.isDirectory()?files(path.join(d,e.name)):e.name.endsWith('.js')?[path.join(d,e.name)]:[]).sort()}
function load(d){const c=vm.createContext({Session:{getActiveUser:()=>({getEmail:()=> 'test@example.invalid'})}}),names=new Set();for(const f of files(d)){const s=read(f);for(const m of s.matchAll(/^function (\w+)\(/gm)){assert(!names.has(m[1]),'Duplicate '+m[1]);names.add(m[1])}new vm.Script(s,{filename:f}).runInContext(c)}return c}
const old=load(baseline),next=load(candidate),names=Object.keys(old).filter(n=>typeof old[n]==='function').sort();
assert.deepEqual(Object.keys(next).filter(n=>typeof next[n]==='function').sort(),[...names,'upsertJobRows_'].sort());
assert.deepEqual(names.filter(n=>old[n].toString().replace(/\r\n/g,'\n')!==next[n].toString().replace(/\r\n/g,'\n')),['upsertJobsToAll_','upsertRowsToSheetByName_']);
for(const f of files(baseline)){const rel=path.relative(baseline,f).replace(/\\/g,'/');if(!['core/job-store.js','test_sink.js'].includes(rel))assert.equal(read(path.join(candidate,rel)),read(f),rel)}
for(const f of ['.clasp.json','.claspignore','appsscript.json'])assert.equal(read(path.join(candidate,f)),read(path.join(baseline,f)),f);
const headers=vm.runInContext('JOBS_ALL_COLUMNS',old);const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
function row(o){return Array.from(headers,h=>o[h]??'')}
const stored={unique_key:'a',title:'old',url:'old-url',first_seen_at:'first-old',mail_date:'mail-old',notified_at:'sent',detail_text:'detail-old',run_id:'run-old',archived_at:'archive-old',archive_reason:'reason-old'};
const incoming={unique_key:'a',title:'new',url:'new-url',first_seen_at:'first-new',mail_date:'mail-new',notified_at:'new-sent',detail_text:'detail-new',run_id:'run-new',archived_at:'archive-new',archive_reason:'reason-new'};
const fixtures=[
 {name:'empty',existing:[stored],input:[]},
 {name:'append',existing:[],input:[incoming]},
 {name:'update',existing:[stored],input:[incoming]},
 {name:'mixed',existing:[stored],input:[{unique_key:'b',title:'append'},incoming]},
 {name:'duplicate incoming',existing:[stored],input:[incoming,{...incoming,title:'last'}]},
 {name:'duplicate new',existing:[],input:[incoming,{...incoming,title:'last'}]},
 {name:'blank keys',existing:[stored],input:[{}, {unique_key:''}]},
 {name:'existing duplicates',existing:[stored,{...stored,title:'second'}],input:[incoming]},
 {name:'empty url',existing:[stored],input:[{...incoming,url:''}]},
 {name:'empty fields',existing:[stored],input:[{unique_key:'a'}]},
 {name:'empty stored fields',existing:[{unique_key:'a'}],input:[incoming]},
 {name:'false and zero',existing:[{...stored,mail_date:0,first_seen_at:false}],input:[{...incoming,detail_text:0,run_id:false}]},
 {name:'missing sheet',existing:[],input:[incoming],missing:true},
 {name:'missing sheet empty',existing:[],input:[],missing:true},
 {name:'open failure',existing:[],input:[incoming],openFail:true},
 {name:'write failure',existing:[stored],input:[incoming,{unique_key:'b'}],writeFail:1},
 {name:'append failure after update',existing:[stored],input:[incoming,{unique_key:'b'}],writeFail:2},
 {name:'missing archive headers',existing:[stored],input:[incoming],omit:['archived_at','archive_reason']},
 {name:'missing key header',existing:[stored],input:[incoming],omit:['unique_key']},
 {name:'reordered headers',existing:[stored],input:[incoming],reverse:true},
 {name:'repeated run',existing:[stored],input:[incoming,{unique_key:'b',title:'new'}],repeat:true}
];
function run(c,f,target){
 const h=Array.from(headers).filter(x=>!(f.omit||[]).includes(x));if(f.reverse)h.reverse();
 const data=[h,...f.existing.map(o=>h.map(k=>o[k]??''))],input=f.input.map(row),trace=[];let writes=0;
 const sheet={getDataRange(){trace.push(['getDataRange']);return{getValues(){trace.push(['getValues']);return data.map(r=>r.slice())}}},getLastRow(){trace.push(['getLastRow']);return data.length},getRange(r,col,n,w){trace.push(['getRange',r,col,n,w]);return{setValues(values){trace.push(['setValues',structuredClone(values)]);if(++writes===f.writeFail)throw Error('fixture write failure');for(let j=0;j<n;j++){data[r-1+j]??=[];for(let k=0;k<w;k++)data[r-1+j][col-1+k]=values[j][k]}}}}};
 function open(kind,id){trace.push([kind,id]);if(f.openFail)throw Error('fixture open failure');return{getSheetByName(name){trace.push(['getSheetByName',name]);return f.missing?null:sheet}}}
 c.SpreadsheetApp={getActiveSpreadsheet:()=>open('active',''),openById:id=>open('byId',id)};c.Logger={log:m=>trace.push(['log',m])};
 let result,error,second;try{const call=()=>target==='production'?c.upsertJobsToAll_(input):c.upsertRowsToSheetByName_('fixture-id','fixture-sheet',input);result=call();if(f.repeat)second=call()}catch(e){error=e.message}
 return JSON.parse(JSON.stringify({data,input,trace,result,error,second}));
}
let comparisons=0;
for(const f of fixtures)for(const target of ['production','test']){const a=run(old,f,target),b=run(next,f,target);assert.deepEqual(b,a,target+': '+f.name);comparisons++;
 if(f.name==='update'){const r=b.data[1];assert.equal(r[idx.first_seen_at],'first-old');assert.equal(r[idx.mail_date],'mail-old');assert.equal(r[idx.notified_at],'sent');assert.equal(r[idx.detail_text],'detail-new');assert.equal(r[idx.archived_at],'archive-old');assert.deepEqual(b.result,{jobs_upserted:1,new_jobs:0,updated_jobs:1})}
 if(f.name==='empty'||f.name==='missing sheet empty')assert.deepEqual(b.trace,[]);
 if(f.name==='empty url')assert.equal(b.trace.filter(x=>x[0]==='log').length,target==='test'?1:0);
}
console.log('PASS: '+comparisons+' complete production/test upsert comparisons (rows, input mutation, call/write order, warnings, totals and errors).');
console.log('PASS: '+(names.length-2)+' existing functions unchanged; configuration/deployment files unchanged; no duplicate declarations.');
