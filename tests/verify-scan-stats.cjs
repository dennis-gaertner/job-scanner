// Compare this pass with the working structural-refactor baseline. No Google/network calls.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const [baseline, candidate] = process.argv.slice(2);
if (!baseline || !candidate) throw Error('Usage: node tests/verify-scan-stats.cjs BASELINE_DIR CANDIDATE_DIR');
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e =>
    ['.git','node_modules'].includes(e.name) ? [] : e.isDirectory() ? files(path.join(dir,e.name)) :
    e.name.endsWith('.js') ? [path.join(dir,e.name)] : []).sort();
}
function load(dir) {
  const ctx = vm.createContext({Session:{getActiveUser:()=>({getEmail:()=> 'test@example.invalid'})}});
  const declarations = new Set();
  for (const file of files(dir)) {
    const code = fs.readFileSync(file,'utf8');
    for (const m of code.matchAll(/^function (\w+)\(/gm)) {
      assert(!declarations.has(m[1]), 'Duplicate function: '+m[1]); declarations.add(m[1]);
    }
    new vm.Script(code, {filename:file}).runInContext(ctx);
  }
  return ctx;
}
const old = load(baseline), next = load(candidate);
const readText = file => fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const body = (ctx,n) => ctx[n].toString().replace(/\r\n/g,'\n');
const names = Object.keys(old).filter(n=>typeof old[n]==='function').sort();
assert.deepEqual(Object.keys(next).filter(n=>typeof next[n]==='function').sort(), [...names,'buildScanStats_'].sort());
const changed = names.filter(n=>body(old,n)!==body(next,n));
assert.equal(changed.length,19);
for (const n of changed) assert(n.startsWith('scan'), 'Unexpected changed function: '+n);
// All non-scanner files from the baseline must remain identical, except documentation.
for (const file of files(baseline)) {
  const rel=path.relative(baseline,file);
  if (rel.startsWith('scanners'+path.sep)) continue;
  assert.equal(readText(path.join(candidate,rel)),readText(file),rel+' changed');
}
for (const file of ['.clasp.json','.claspignore','appsscript.json'])
  assert.equal(readText(path.join(candidate,file)),readText(path.join(baseline,file)),file);
const fixtures = [
  {cats:[], counts:[0,0,0], totals:[0,0,0]},
  {cats:['Relevant','Vielleicht','Ignorieren'], counts:[1,1,1], totals:[3,2,1]},
  {cats:['Relevant','Relevant','Relevant'], counts:[3,0,0], totals:[1,0,1]}, // duplicate input rows
  {cats:['',null,undefined,0,false,'unknown'], counts:[0,0,0], totals:[6,6,0]},
  {cats:['relevant',' Relevant','Vielleicht ','IGNORIEREN'], counts:[0,0,0], totals:[4,0,4]},
  {cats:['Vielleicht','Vielleicht','Ignorieren'], counts:[0,2,1], totals:[3,0,3]},
  {cats:['Ignorieren','Relevant','', 'Vielleicht','Ignorieren'], counts:[1,1,2], totals:[4,1,3]},
  {cats:['Relevant'], counts:[1,0,0], totals:[undefined,undefined,undefined]}
];
let comparisons=0;
for (const name of changed) {
  const before=body(old,name),after=body(next,name);
  const start=before.indexOf('  let relevantCount = 0;'); assert(start>=0,name);
  const resultStart=before.indexOf('  return {',start)>=0 && before.indexOf('  return {',start)<before.indexOf('\n  };',start)
    ? before.indexOf('  return {',start) : before.indexOf('  const result = {',start);
  const newStart=after.indexOf('  return {',start)>=0 && after.indexOf('  return {',start)<after.indexOf('\n  };',start)
    ? after.indexOf('  return {',start) : after.indexOf('  const result = {',start);
  assert(resultStart>=0 && newStart>=0,name);
  const oldEnd=before.indexOf('\n  };',resultStart)+5,newEnd=after.indexOf('\n  };',newStart)+5;
  // Full fetching/parsing/normalisation/storage prefix and trailing logging unchanged.
  assert.equal(before.slice(0,start).trimEnd(),after.slice(0,newStart).trimEnd(),name+' prefix');
  assert.equal(before.slice(oldEnd),after.slice(newEnd),name+' suffix');
  function resultCode(s,a,b) {
    const code=s.slice(a,b);
    return '(function(){'+code+(code.includes('const result = {')?'\nreturn result;':'')+'})()';
  }
  for (const f of fixtures) {
    const rows=Object.freeze(f.cats.map(c=>Object.freeze(['same-key',c])));
    const totals=Object.freeze({jobs_upserted:f.totals[0],new_jobs:f.totals[1],updated_jobs:f.totals[2]});
    const context={rows,normalizedRows:rows,upsertStats:totals,idx:{category:1},jobsIdx:{category:1},
      labelName:'Jobs/Fixture',threadIds:new Set([1,2]),messages:[1,2,3],itemsSeen:13,parsedJobsCount:11,
      jobs:[1,2,3,4],fetchedJobs:[1,2,3,4,5],dedupedJobs:[1,2],rawJobs:[1,2,3],
      detailFetchAttempted:7,detailFetchCount:5};
    Object.assign(old,context);Object.assign(next,context);
    const a=vm.runInContext(resultCode(before,start,oldEnd),old);
    const b=vm.runInContext(resultCode(after,newStart,newEnd),next);
    const plain=x=>Object.fromEntries(Object.entries(x));
    assert.deepEqual(plain(a),plain(b),name+' result');
    const s=next.buildScanStats_(rows,totals,{category:1});
    assert.deepEqual([s.relevant_count,s.maybe_count,s.ignore_count],f.counts);
    assert.equal(s.rows_input_to_upsert,rows.length);
    comparisons++;
  }
}
console.log('PASS: 19 scanner bookkeeping blocks consolidated; '+(names.length-changed.length)+' existing functions unchanged.');
console.log('PASS: '+comparisons+' complete result comparisons; scanner prefixes/suffixes and non-scanner code unchanged.');
console.log('PASS: category edge cases, duplicate input versus stored totals, configuration, deployment files and duplicate declarations.');
