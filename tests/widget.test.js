import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const core=await readFile(new URL('../extension/core.js',import.meta.url),'utf8');
const personalize=await readFile(new URL('../extension/personalize.js',import.meta.url),'utf8');
const widget=await readFile(new URL('../extension/widget.js',import.meta.url),'utf8');
const markup='<body><a id="account-nav">Demo Student</a><input id="hideGrade" type="radio"><div id="coursesContainer"><div class="row"><a href="#academicclass/1/0">H Biology (D)</a><h5>Room | Semester 1 | School</h5><h3 class="showGrade">90%</h3><a data-analysis="1"></a></div></div></body>';
function setup(url='https://milkenschool.myschoolapp.com/app/student#studentmyday/progress',html=markup){const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});dom.window.matchMedia=()=>({matches:true});dom.window.eval(core);dom.window.eval(personalize);dom.window.eval(widget);return dom;}
const pause=()=>new Promise(r=>setTimeout(r,250));
test('floating widget updates grades, changes modes, and closes on Escape',async()=>{
 const dom=setup(),w=dom.window,host=w.document.querySelector('milken-gpa-widget'),root=host.shadowRoot;
 assert.equal(host.parentNode,w.document.body);assert.equal(root.querySelector('.compact-number').textContent,'3.70');
 root.querySelector('.toggle').click();assert.equal(root.querySelector('.toggle').getAttribute('aria-expanded'),'true');
 root.querySelector('[data-mode=weighted]').click();assert.equal(root.querySelector('.compact-number').textContent,'4.20');
 w.document.querySelector('.showGrade').textContent='83%';await pause();assert.equal(root.querySelector('.compact-number').textContent,'3.50');
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(root.querySelector('.toggle').getAttribute('aria-expanded'),'false');
 w.MilkenGPAWidget.dispose();dom.window.close();
});
test('calculates visually hidden grades, keeps updating, and clears on sign-out',async()=>{
 const dom=setup(),w=dom.window,root=w.document.querySelector('milken-gpa-widget').shadowRoot;
 w.document.querySelector('#hideGrade').checked=true;w.document.querySelector('.showGrade').style.visibility='hidden';w.document.dispatchEvent(new w.Event('change'));await pause();assert.equal(root.querySelector('.compact-number').textContent,'3.70');
 w.document.querySelector('.showGrade').textContent='95%';await pause();assert.equal(root.querySelector('.compact-number').textContent,'4.00');
 w.location.hash='studentmyday/schedule';w.document.querySelector('#coursesContainer').remove();w.document.querySelector('#hideGrade').remove();await pause();assert.equal(root.querySelector('.compact-number').textContent,'4.00');
 w.location.hash='login';await pause();assert.equal(w.document.querySelector('milken-gpa-widget'),null);assert.equal(w.document.querySelector('iframe[data-milken-gpa-source]'),null);
 w.MilkenGPAWidget.dispose();dom.window.close();
});
test('cached GPA remains available across MyMilken navigation',async()=>{
 const dom=setup(),w=dom.window;w.location.hash='studentmyday/schedule';w.document.querySelector('#coursesContainer').remove();await pause();assert.equal(w.document.querySelector('milken-gpa-widget').shadowRoot.querySelector('.compact-number').textContent,'3.70');w.MilkenGPAWidget.dispose();dom.window.close();
});
test('does not run on other sites or signed-out pages',()=>{
 for(const url of ['https://example.com/#studentmyday/progress','https://milkenschool.myschoolapp.com/app/student#login']){const dom=setup(url);assert.equal(dom.window.document.querySelector('milken-gpa-widget'),null);dom.window.MilkenGPAWidget?.dispose();dom.window.close();}
});
test('reads background Progress HTML when starting on a different page',async()=>{
 const dom=setup('https://milkenschool.myschoolapp.com/app/student#studentmyday/schedule','<body><a id="account-nav">Demo Student</a></body>'),w=dom.window;
 const frame=w.document.querySelector('iframe[data-milken-gpa-source]');assert.ok(frame);assert.equal(frame.getAttribute('src'),'/app/student?svcid=edu#studentmyday/progress');
 frame.contentDocument.open();frame.contentDocument.write(markup);frame.contentDocument.close();frame.dispatchEvent(new w.Event('load'));await pause();
 assert.equal(w.document.querySelector('milken-gpa-widget').shadowRoot.querySelector('.compact-number').textContent,'3.70');assert.equal(w.document.querySelector('iframe[data-milken-gpa-source]'),null);
 w.MilkenGPAWidget.dispose();dom.window.close();
});

test('calculates immediately when MyMilken initially hides the grades',()=>{
 const hiddenMarkup=markup.replace('id="hideGrade" type="radio"','id="hideGrade" type="radio" checked').replace('class="showGrade"','class="showGrade" style="visibility:hidden"');
 const dom=setup(undefined,hiddenMarkup);assert.equal(dom.window.document.querySelector('milken-gpa-widget').shadowRoot.querySelector('.compact-number').textContent,'3.70');dom.window.MilkenGPAWidget.dispose();dom.window.close();
});

test('uses a matching session cache on a standalone MyMilken page',async()=>{
 const dom=new JSDOM('<body><a id="account-nav">Demo Student</a></body>',{url:'https://milkenschool.myschoolapp.com/lms-assignment/assignment-center/student',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:true});
 w.chrome={runtime:{getURL:s=>s,sendMessage:async msg=>msg.type==='glimpse:load'?{owner:'Demo Student',savedAt:Date.now(),courses:[{id:'1',name:'H Biology (D)',raw:'90%',term:'Semester 1'}]}:{ok:true}}};
 w.eval(core);w.eval(personalize);w.eval(widget);await pause();
 assert.equal(w.document.querySelector('milken-gpa-widget').shadowRoot.querySelector('.compact-number').textContent,'3.70');
 w.MilkenGPAWidget.dispose();dom.window.close();
});

test('does not display cached grades belonging to a different account',async()=>{
 const dom=new JSDOM('<body><a id="account-nav">Another Student</a></body>',{url:'https://milkenschool.myschoolapp.com/lms-assignment/assignment-center/student',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:true});w.chrome={runtime:{getURL:s=>s,sendMessage:async()=>({owner:'Demo Student',savedAt:Date.now(),courses:[{id:'1',name:'Biology',raw:'90%',term:'Semester 1'}]})}};
 w.eval(core);w.eval(personalize);w.eval(widget);await pause();assert.equal(w.document.querySelector('milken-gpa-widget').shadowRoot.querySelector('.compact-number').textContent,'—');
 w.MilkenGPAWidget.dispose();dom.window.close();
});

test('matches the account across legacy Progress and modern Assignment Center headers',async()=>{
 const avatar='https://example.test/large_user_1234567_1.jpg';
 const saved=[];
 const legacy=markup.replace('<a id="account-nav">Demo Student</a>',`<a id="account-nav"><img src="${avatar}"><span class="title">Demo<br>Student</span></a>`);
 const d1=new JSDOM(legacy,{url:'https://milkenschool.myschoolapp.com/app/student#studentmyday/progress',runScripts:'outside-only',pretendToBeVisual:true});
 d1.window.matchMedia=()=>({matches:true});d1.window.chrome={runtime:{getURL:s=>s,sendMessage:async m=>{if(m.type==='glimpse:save')saved.push(m);return {ok:true};}}};d1.window.eval(core);d1.window.eval(personalize);d1.window.eval(widget);
 assert.equal(saved[0].owner,'user:1234567');
 const modern=`<body><a id="account-nav"><img src="${avatar}"><div class="title"><div>Demo</div><div> Student </div></div></a></body>`;
 const d2=new JSDOM(modern,{url:'https://milkenschool.myschoolapp.com/lms-assignment/assignment-center/student',runScripts:'outside-only',pretendToBeVisual:true});
 d2.window.matchMedia=()=>({matches:true});d2.window.chrome={runtime:{getURL:s=>s,sendMessage:async m=>m.type==='glimpse:load'?{...saved[0],savedAt:Date.now()}:{ok:true}}};d2.window.eval(core);d2.window.eval(personalize);d2.window.eval(widget);await pause();
 assert.equal(d2.window.document.querySelector('milken-gpa-widget').shadowRoot.querySelector('.compact-number').textContent,'3.70');
 d1.window.MilkenGPAWidget.dispose();d2.window.MilkenGPAWidget.dispose();d1.window.close();d2.window.close();
});

test('first-run grade setup, local preferences, creator links and account separation',async()=>{
 const dom=new JSDOM(markup,{url:'https://milkenschool.myschoolapp.com/app/student#studentmyday/progress',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const saved={};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.chrome={storage:{local:{get:async k=>({[k]:saved[k]}),set:async v=>Object.assign(saved,v)}},runtime:{getURL:s=>s,sendMessage:async()=>null}};
 w.eval(core);w.eval(personalize);w.eval(widget);await pause();
 const host=w.document.querySelector('milken-gpa-widget'),r=host.shadowRoot;
 assert.equal(r.querySelector('.personal-panel').hidden,false);
 const select=r.querySelector('select');select.value='10';select.dispatchEvent(new w.Event('change'));await pause();
 assert.equal(saved['glimpse:grade:Demo Student'],10);
 assert.match(r.querySelector('.compare-sub').textContent,/Grade 10/);
 assert.match(r.querySelector('.percentile-band').textContent,/57–100 percentile band/);
 r.querySelector('[data-theme-choice=dark]').click();await pause();assert.equal(host.dataset.dark,'true');assert.equal(saved['glimpse:appearance'].theme,'dark');
 r.querySelector('[data-theme-choice=light]').click();assert.equal(host.dataset.dark,'false');
 r.querySelector('.done-button').click();r.querySelector('.creator-button').click();assert.equal(r.querySelector('.creator-content').hidden,false);assert.equal(r.querySelectorAll('.socials a').length,5);
 for(const a of r.querySelectorAll('.socials a')){assert.equal(a.target,'_blank');assert.match(a.rel,/noopener/);}
 w.document.querySelector('#account-nav').textContent='Other Student';await pause();assert.equal(select.value,'');assert.match(r.querySelector('.compare-title').textContent,/Make Glimpse yours/);
 w.MilkenGPAWidget.dispose();w.close();
});

test('keyboard movement clamps to viewport and position can be reset',async()=>{
 const dom=setup(),w=dom.window,r=w.document.querySelector('milken-gpa-widget').shadowRoot,h=r.host;
 await pause();const toggle=r.querySelector('.toggle');
 toggle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true}));
 assert.equal(h.style.getPropertyValue('--glimpse-left'),'8px');
 toggle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true}));assert.equal(h.style.getPropertyValue('--glimpse-top'),'16px');
 r.querySelector('.reset-position').click();assert.equal(h.style.getPropertyValue('--glimpse-left'),'');
 w.MilkenGPAWidget.dispose();w.close();
});

test('reference boundaries, ties, missing data, and unsupported grades',()=>{
 const dom=setup(),c=dom.window.GlimpsePersonalize.compare;
 assert.equal(c(10,3.6,3.1).label,'Met reference average');assert.equal(c(9,3.4,3.1).label,'Below reference average');assert.equal(c(12,3.8,3.1).label,'Above reference average');
 assert.equal(c(8,4,4),null);assert.equal(c(10,null,4),null);assert.equal(c(10,4,NaN),null);
 assert.equal(c(10,4,1.99).low,0);assert.equal(c(10,4,2).low,4);assert.equal(c(10,4,4).high,100);
 dom.window.MilkenGPAWidget.dispose();dom.window.close();
});
