import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'glimpse-installer-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 mkdirSync(join(dir,'Glimpse-main'));cpSync(join(root,'extension'),join(dir,'Glimpse-main','extension'),{recursive:true});
 const archive=join(dir,'fixture.tar.gz');execFileSync('tar',['-czf',archive,'-C',dir,'Glimpse-main']);
 const bin=join(dir,'bin');mkdirSync(bin);writeFileSync(join(bin,'curl'),`#!/bin/bash\nset -e\nwhile [[ $# -gt 0 ]]; do if [[ "$1" == --output ]]; then shift; out="$1"; fi; shift; done\nif [[ "\${GLIMPSE_FORCE_FAIL:-}" == 1 ]]; then exit 22; fi\ncp "$GLIMPSE_TEST_ARCHIVE" "$out"\n`,{mode:0o755});
 const env={...process.env,PATH:`${bin}:${process.env.PATH}`,GLIMPSE_TEST_MODE:'1',GLIMPSE_INSTALL_ROOT:join(dir,'install'),GLIMPSE_TEST_ARCHIVE:archive,NO_COLOR:'1'};
 const run=extra=>spawnSync('/bin/bash',[join(root,'install.sh')],{env:{...env,...extra},encoding:'utf8'});
 return {dir,env,run};
}
test('installer prepares extension, is repeatable, and explains Chrome steps',t=>{
 const {env,run}=fixture(t);const first=run();assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/Load unpacked/);assert.ok(existsSync(join(env.GLIMPSE_INSTALL_ROOT,'extension','manifest.json')));assert.ok(existsSync(join(env.GLIMPSE_INSTALL_ROOT,'.installed-by-glimpse')));
 const second=run();assert.equal(second.status,0,second.stderr);assert.equal(JSON.parse(readFileSync(join(env.GLIMPSE_INSTALL_ROOT,'extension','manifest.json'),'utf8')).name,'Glimpse');
});
test('installer preserves an unrelated folder and fails cleanly on download errors',t=>{
 const {dir,env,run}=fixture(t);mkdirSync(env.GLIMPSE_INSTALL_ROOT);const sentinel=join(env.GLIMPSE_INSTALL_ROOT,'important.txt');writeFileSync(sentinel,'keep');const collision=run();assert.notEqual(collision.status,0);assert.equal(readFileSync(sentinel,'utf8'),'keep');
 const failure=run({GLIMPSE_INSTALL_ROOT:join(dir,'failed-install'),GLIMPSE_FORCE_FAIL:'1'});assert.notEqual(failure.status,0);assert.ok(!existsSync(join(dir,'failed-install')));
});
