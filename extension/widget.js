(() => {
  'use strict';
  const SCHOOL='milkenschool.myschoolapp.com';
  const demo=['127.0.0.1','localhost'].includes(location.hostname);
  if ((!demo && location.hostname!==SCHOOL) || window.top!==window || document.querySelector('milken-gpa-widget')) return;
  const api=globalThis.MilkenGPA;
  const PROGRESS='/app/student?svcid=edu#studentmyday/progress';
  const REFRESH_MS=120000,MAX_AGE_MS=300000;
  const host=document.createElement('milken-gpa-widget');
  const root=host.attachShadow({mode:'open'});
  const css=document.createElement('link');css.rel='stylesheet';css.href=typeof chrome!=='undefined'&&chrome.runtime?.getURL?chrome.runtime.getURL('widget.css'):'./extension/widget.css';root.append(css);
  const dock=document.createElement('section');dock.className='dock';dock.dataset.state='waiting';dock.setAttribute('aria-label','GPA widget');
  // Only this static template uses HTML. All school-provided text uses textContent.
  dock.innerHTML=`<button type="button" class="toggle" aria-label="Show GPA details" aria-expanded="false" aria-controls="gpa-body"><svg class="ring" viewBox="0 0 32 32" aria-hidden="true"><circle class="track" cx="16" cy="16" r="14"/><circle class="fill" cx="16" cy="16" r="14"/></svg><span class="compact"><span class="label">Your GPA</span><span class="compact-number">—</span></span><span class="expanded-title">Your GPA</span><svg class="chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 10 4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="body" id="gpa-body" inert><div class="hero"><span class="large-number">—</span><span class="denominator">/ 4.0</span></div><div class="segment"><button type="button" data-mode="unweighted" aria-pressed="true">Unweighted</button><button type="button" data-mode="weighted" aria-pressed="false">Weighted</button></div><div class="course-list"></div><div class="meta"><span class="freshness"><span class="dot"></span><span class="status" role="status">Reading Progress</span></span><button type="button" class="about" aria-expanded="false">Estimate ⓘ</button></div><div class="explanation" hidden>Current-term estimate with equal course weights. Honors +0.5; AP +1.0; F gets no bonus. A/A+ 4.0, A− 3.7, B+ 3.3, B 3.0, B− 2.7, C+ 2.3, C 2.0, C− 1.7, D+ 1.3, D 1.0, D− 0.7, F 0. Percentage cutoffs: 93/90/87/83/80/77/73/70/67/63/60; no rounding. Missing and pass/fail grades excluded. Milken’s official GPA rules are not yet verified.<br><br>Created by Asher Menachem.</div></div>`;
  root.append(dock);
  const $=s=>root.querySelector(s);
  let courses=[],result=api.calculate([]),mode='unweighted',open=false,current=null,animation=0;
  let account='',lastRead=0,lastServerRead=0,lastAttempt=0,signature='',sourceFrame=null,sourceObserver=null,sourceTimeout=null;
  let localTimer=null,frameTimer=null,pollTimer=null,refreshTimer=null,ageTimer=null,disposed=false,state='waiting';
  let sourceDoc=null,cacheRequestedFor='';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const personal=globalThis.GlimpsePersonalize?.mount({host,root,dock,setOpen,demo});
  const progress=()=>location.hash.split('?')[0]==='#studentmyday/progress';
  const identity=doc=>{
    const nav=doc.querySelector('#account-nav');if(!nav)return '';
    const image=nav.querySelector('img')?.getAttribute('src')||'';
    const id=image.match(/(?:large|thumb)_user_?(\d+)/i)?.[1];
    if(id)return `user:${id}`;
    const title=nav.querySelector('.title')||nav;
    return (title.innerText||title.textContent||'').replace(/\s+/g,' ').trim();
  };
  function setOpen(value){open=value;dock.classList.toggle('open',open);$('.toggle').setAttribute('aria-expanded',String(open));$('.toggle').setAttribute('aria-label',open?'Hide GPA details':'Show GPA details');$('.body').inert=!open;if(!open){personal?.close();$('.explanation').hidden=true;$('.about').setAttribute('aria-expanded','false');}}
  $('.toggle').addEventListener('click',()=>setOpen(!open));
  $('.about').addEventListener('click',()=>{const show=$('.explanation').hidden;$('.explanation').hidden=!show;$('.about').setAttribute('aria-expanded',String(show));});
  root.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;$('.segment').classList.toggle('weighted',mode==='weighted');root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));paintNumber();}));
  function outside(event){if(open&&!event.composedPath().includes(host))setOpen(false);}
  function escape(event){if(event.key==='Escape'&&open){setOpen(false);$('.toggle').focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  function number(value){cancelAnimationFrame(animation);const startValue=current??value;const start=performance.now();const write=n=>{current=n;const text=n===null?'—':n.toFixed(2);$('.compact-number').textContent=text;$('.large-number').textContent=text;};
    if(value===null||reduced.matches||startValue===value){write(value);return;}
    const tick=now=>{const t=Math.min(1,(now-start)/650);write(startValue+(value-startValue)*(1-Math.pow(1-t,4)));if(t<1)animation=requestAnimationFrame(tick);};animation=requestAnimationFrame(tick);
  }
  function paintNumber(){personal?.update(['ready','stale'].includes(state)?result:{});const value=['ready','stale'].includes(state)?result[mode]:null;number(value);$('.fill').style.strokeDashoffset=String(88*(1-Math.min(1,(value??0)/(mode==='weighted'?5:4))));$('.denominator').textContent=mode==='weighted'?'weighted':'/ 4.0';$('.toggle').title=value===null?'GPA unavailable':`${mode==='weighted'?'Weighted':'Unweighted'} GPA estimate: ${value.toFixed(2)}`;}
  function freshness(){if(state==='ready'&&Date.now()-lastRead>MAX_AGE_MS)setState('stale');else if(state==='ready')$('.status').textContent=`${result.count} courses · ${Date.now()-lastRead<60000?'Just updated':'Updated '+Math.floor((Date.now()-lastRead)/60000)+'m ago'}`;}
  function setState(next){state=next;dock.dataset.state=next;$('.status').textContent=({waiting:'Reading Progress',unavailable:'Progress unavailable',stale:'Waiting to refresh',ready:''})[next];paintNumber();paintCourses();if(next==='ready')freshness();}
  function paintCourses(){const list=$('.course-list');list.replaceChildren();
    if(!['ready','stale'].includes(state)||!courses.length){const msg=document.createElement('div');msg.className='empty';msg.textContent=state==='waiting'?'Getting your grades from MyMilken…':'Open Progress to load your grades.';list.append(msg);if(state==='unavailable'){const b=document.createElement('button');b.type='button';b.className='open-progress';b.textContent='Open Progress';b.addEventListener('click',()=>{location.href=PROGRESS;});msg.append(document.createElement('br'),b);}return;}
    courses.forEach((c,i)=>{const row=document.createElement('div');row.className='course';row.style.setProperty('--i',String(Math.min(i,5)));const name=document.createElement('span');name.className='course-name';name.textContent=c.name.replace(/\s*-\s*\d+\s*(\([A-H]\)\s*)*$/,'').replace(/\s*\([A-H]\)\s*$/,'');name.title=c.name;const g=document.createElement('span');g.className='course-grade';g.textContent=c.grade?.raw||'—';row.append(name,g);list.append(row);});
  }
  function clearFrame(){clearTimeout(sourceTimeout);clearTimeout(frameTimer);clearTimeout(pollTimer);sourceObserver?.disconnect();sourceObserver=null;sourceDoc=null;sourceFrame?.remove();sourceFrame=null;}
  function reset(){personal?.owner('');clearFrame();cacheRequestedFor='';sync.lastLocalSignature='';courses=[];result=api.calculate([]);signature='';lastRead=0;lastServerRead=0;current=null;setOpen(false);setState('waiting');}
  function accept(doc,remote=false){const next=api.readCourses(doc);if(!next.length||(remote&&!api.calculate(next).count))return false;
    const owner=identity(doc);if(!demo&&(!owner||(account&&owner!==account)))return false;
    if(!account)account=owner;
    if(remote&&courses.length&&next[0].term!==courses[0].term){setState('stale');return true;}
    if(!host.isConnected)document.body.append(host);
    const sig=JSON.stringify(next);const changed=sig!==signature;
    // A stale visible Progress page must not overwrite a more recent refresh unless its DOM changes.
    if(!remote&&!changed&&lastRead)return true;
    courses=next;result=api.calculate(courses);signature=sig;lastRead=Date.now();if(remote)lastServerRead=lastRead;
    setState(result.count?'ready':'unavailable');
    if(!demo&&account&&result.count&&globalThis.chrome?.runtime?.sendMessage)chrome.runtime.sendMessage({type:'glimpse:save',owner:account,courses:next.map(({id,name,raw,term})=>({id,name,raw,term}))}).catch(()=>{});
    if(changed&&lastRead){dock.classList.remove('updated');requestAnimationFrame(()=>dock.classList.add('updated'));}
    return true;
  }
  function loadCache(owner){
    if(demo||!owner||cacheRequestedFor===owner||!globalThis.chrome?.runtime?.sendMessage)return;
    cacheRequestedFor=owner;
    chrome.runtime.sendMessage({type:'glimpse:load',owner}).then(record=>{
      if(disposed||loginPage()||identity(document)!==owner||account!==owner||lastRead||!record||record.owner!==owner||!Array.isArray(record.courses)||!Number.isFinite(record.savedAt))return;
      const next=record.courses.map(c=>({id:c.id,name:c.name,raw:c.raw,term:c.term,grade:api.grade(c.raw),level:api.level(c.name)}));
      const calculated=api.calculate(next);if(!calculated.count)return;
      courses=next;result=calculated;signature=JSON.stringify(next);lastRead=record.savedAt;
      setState(Date.now()-lastRead>MAX_AGE_MS?'stale':'ready');
    }).catch(()=>{});
  }
  function authenticated(){return demo||!!identity(document)||!!account;}
  function loginPage(){return /^#login(?:\/|$)/.test(location.hash)||/\/(?:SignOut|signin|login)(?:\/|$)/i.test(location.pathname);}
  function sync(){if(disposed)return;
    const owner=identity(document);
    if(loginPage()){if(account&&!demo&&globalThis.chrome?.runtime?.sendMessage)chrome.runtime.sendMessage({type:'glimpse:clear'}).catch(()=>{});host.remove();account='';reset();return;}
    if(!authenticated()){refresh();return;}
    if(account&&owner&&account!==owner)reset();account=owner||account;personal?.owner(demo?'preview':account);
    if(!host.isConnected)document.body.append(host);
    if(owner&&!lastRead)loadCache(owner);
    if(progress()&&document.querySelector('#coursesContainer')){
      const localSig=JSON.stringify(api.readCourses(document));
      if(localSig!==sync.lastLocalSignature||!lastRead){sync.lastLocalSignature=localSig;accept(document);}
    }
    if(!lastRead&&!demo)refresh();freshness();
  }
  function refresh(){if(disposed||demo||document.visibilityState==='hidden'||loginPage()||sourceFrame||Date.now()-lastAttempt<30000)return;
    lastAttempt=Date.now();const iframe=document.createElement('iframe');iframe.hidden=true;iframe.setAttribute('aria-hidden','true');iframe.tabIndex=-1;iframe.dataset.milkenGpaSource='';iframe.src=PROGRESS;sourceFrame=iframe;
    const failed=()=>{clearFrame();setState(lastRead?'stale':'unavailable');};
    sourceTimeout=setTimeout(failed,45000);
    // The page can take a long time to fire load because of unrelated assets.
    // Watch the actual Progress DOM as soon as it exists, and rebind after navigation.
    const read=()=>{
      if(sourceFrame!==iframe)return;
      try {
        const doc=iframe.contentDocument;
        if(doc?.body && doc.location.origin===location.origin && doc.location.hash.startsWith('#login')){
          account='';reset();host.remove();return;
        }
        if(doc?.body && doc.location.origin===location.origin && doc.location.hash.startsWith('#studentmyday/progress')){
          if(doc!==sourceDoc){sourceObserver?.disconnect();sourceDoc=doc;sourceObserver=new MutationObserver(()=>{clearTimeout(frameTimer);frameTimer=setTimeout(read,200);});sourceObserver.observe(doc.body,{subtree:true,childList:true,characterData:true});}
          if(accept(doc,true)){clearFrame();return;}
        }
      } catch { /* Cross-origin redirects are ignored until the timeout. */ }
      clearTimeout(pollTimer);pollTimer=setTimeout(read,1000);
    };
    iframe.addEventListener('load',read);
    document.body.append(iframe);
    pollTimer=setTimeout(read,500);
  }
  function schedule(){if(localTimer)return;localTimer=setTimeout(()=>{localTimer=null;sync();},100);}
  const observer=new MutationObserver(records=>{if(records.some(r=>r.target!==host&&!host.contains(r.target)))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','checked']});
  const focus=()=>{sync();if(Date.now()-lastServerRead>30000)refresh();};
  document.addEventListener('change',schedule);window.addEventListener('hashchange',schedule);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  refreshTimer=setInterval(refresh,REFRESH_MS);ageTimer=setInterval(freshness,15000);
  function dispose(){disposed=true;personal?.dispose();clearFrame();observer.disconnect();clearInterval(refreshTimer);clearInterval(ageTimer);clearTimeout(localTimer);cancelAnimationFrame(animation);document.removeEventListener('change',schedule);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('hashchange',schedule);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);host.remove();}
  window.addEventListener('pagehide',()=>{if(!disposed)clearFrame();});
  // Scoped to the extension's isolated world; allows a development preview to clean up.
  globalThis.MilkenGPAWidget={dispose};sync();
})();
