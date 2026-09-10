const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
function files(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):e.name.endsWith('.js')?[path.join(d,e.name)]:[]).sort()}
function load(d){const c=vm.createContext({Utilities:{DigestAlgorithm:{MD5:'md5'},computeDigest:(alg,s)=>Array.from(require('crypto').createHash(alg).update(s).digest()).map(b=>b>127?b-256:b)},Session:{getActiveUser:()=>({getEmail:()=> 'test@example.invalid'})}});for(const f of files(d)){new vm.Script(fs.readFileSync(f,'utf8'),{filename:f}).runInContext(c)}return c}
const baseline=process.argv[2], candidate=process.argv[3];
if(!baseline || !candidate) throw Error('Usage: node tests/verify-refactor.cjs BASELINE_DIR REFACTORED_DIR');
const a=load(baseline),b=load(candidate);
const names=Object.keys(a).filter(k=>typeof a[k]==='function').sort();assert.deepStrictEqual(Object.keys(b).filter(k=>typeof b[k]==='function').sort(),names);
for(const n of names) assert.equal(a[n].toString().replace(/\r\n/g,'\n'),b[n].toString().replace(/\r\n/g,'\n'),n+' changed');
for(const n of ['CONFIG','JOBS_ALL_COLUMNS','JOBS_USER_COLUMNS','JOBS_COCKPIT_COLUMNS','NOTIFIED_COLUMNS','SCAN_LOG_COLUMNS','SCORING_COCKPIT_COLUMNS','ENABLE_AUTO_ARCHIVE','LH_QUERIES'])assert.equal(vm.runInContext('JSON.stringify('+n+')',a),vm.runInContext('JSON.stringify('+n+')',b),n);
const defs=new Map();for(const f of files(candidate))for(const m of fs.readFileSync(f,'utf8').matchAll(/^function (\w+)\(/gm)){assert(!defs.has(m[1]),'duplicate '+m[1]);defs.set(m[1],f)}
console.log('PASS: '+names.length+' function implementations unchanged; configuration/schema checks pass; no duplicate function declarations.');

const cases = [
  "buildUniqueKey_('LH','Analyst','Lufthansa','Frankfurt','https://example.test/job?id=123','mail-456')",
  "buildUniqueKey_('JobRoom','Analyst','Employer','Bern','https://example.test/job?cache=123','abc')",
  "buildUniqueKey_('OEBB','Analyst','ÖBB','Wien','https://example.test/job/123','mail-456')",
  "matchesConfiguredKeyword_('wirtschaftspolitik', 'wirtschaft*')",
  "matchesConfiguredKeyword_('data analyst', 'data')",
  "normalizeScoreByThresholds_(9, {relevant:9, maybe:4})",
  "normalizeScoreByThresholds_(0, {relevant:9, maybe:4})",
  "selectJobsForNotification_([{masterRow:[''], final_category:'Relevant', visibility_preference:'',job_state:'open'}, {masterRow:['sent'],final_category:'Relevant'}, {masterRow:[''],final_category:'Vielleicht',visibility_preference:'hidden'}, {masterRow:[''],final_category:'Relevant',job_state:'closed'}], {notified_at:0})"
];
for(const src of ['bundch','bundde','bundat','oebb','sbb','eucareers','lh','skyguide','aa-kn','zrh','airbus','eurocontrol','jobroom','db','stadtwien','aa-cities']) {
 cases.push('scoreJobBySource_('+JSON.stringify({source:src,title:'Strategie und Analyse',employer:'Example',location:'Wien',detail_text:''})+')');
}
for(const c of [a,b]) vm.runInContext('LEARNING_CACHE = {tokenScores:{}, sourceScores:{}}',c);
for(const expression of cases) assert.equal(vm.runInContext('JSON.stringify('+expression+')',a), vm.runInContext('JSON.stringify('+expression+')',b),expression);
console.log('PASS: '+cases.length+' baseline comparison cases (identity, keyword matching, score normalisation, notification selection, scoring sources).');
