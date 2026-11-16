// TMU FC App - ログイン・権限・データ共有（Firebase）
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
const { initializeApp } = await import(SDK+'firebase-app.js');
const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } = await import(SDK+'firebase-auth.js');
const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, query, where, runTransaction, serverTimestamp } = await import(SDK+'firebase-firestore.js');

const firebaseConfig={apiKey:"AIzaSyAu4LiAEFy7-e1ILCMoN2U__XNDAJybad8",authDomain:"tmufc-app.firebaseapp.com",projectId:"tmufc-app",storageBucket:"tmufc-app.firebasestorage.app",messagingSenderId:"820014072624",appId:"1:820014072624:web:c23b0b8bae92c6a9333ef5"};
const KEY_LOCAL='tmu-pos-data';
const ADMIN_EMAILS=[];
const TITLES=['監督','コーチ','学生コーチ','トレーナー','マネージャー','その他'];
const ROLE_LABEL={admin:'監督（管理者）',staff:'スタッフ',player:'選手',pending:'承認待ち',disabled:'利用停止'};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
let db;
try{db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});}
catch(e){db=initializeFirestore(app,{});}
const PAGE=document.body.dataset.page||'pos';
const CLIENT=Math.random().toString(36).slice(2,10);
const clean=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- UI（ゲート・トースト） ----------
const css=document.createElement('style');
css.textContent=`.tg{position:fixed;inset:0;z-index:100;background:#0E1A33;color:#fff;display:flex;padding:24px;font-family:"Zen Kaku Gothic New","Hiragino Sans","Noto Sans JP",system-ui,sans-serif;overflow:auto}
.tg .box{width:100%;max-width:420px;margin:auto}
.tg h1{font-size:30px;margin:0 0 4px;letter-spacing:.02em}.tg h1 span{color:#6F93E0}
.tg .sub{color:rgba(255,255,255,.7);font-size:14px;margin:0 0 28px}
.tg p{font-size:14px;line-height:1.7;color:rgba(255,255,255,.85)}
.tg .tb{display:block;width:100%;border:0;border-radius:12px;background:#fff;color:#13294B;font:inherit;font-weight:700;font-size:16px;padding:14px;margin-top:12px;cursor:pointer}
.tg .tb.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}
.tg .err{color:#FF9C94;font-size:13px;margin-top:10px}
.tg .names{display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:50vh;overflow:auto;margin-top:8px}
.tg .names button{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:10px;font:inherit;font-size:14px;text-align:left;cursor:pointer}
.tg .names button.on{background:#4366B0;border-color:#4366B0}
.tg .gh{font-size:12px;color:rgba(255,255,255,.6);margin:12px 0 0}
.tacct{border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font:inherit;font-size:12px;border-radius:999px;padding:4px 10px;cursor:pointer;white-space:nowrap;margin-left:8px;vertical-align:middle;position:relative}
.tacct i{font-style:normal;background:#EE6A61;color:#fff;border-radius:999px;font-size:10px;padding:0 5px;margin-left:4px}
.tbanner{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:90;background:#13294B;color:#fff;border:1px solid #4366B0;border-radius:12px;padding:10px 12px;font-size:13px;display:flex;gap:10px;align-items:center;max-width:92%;font-family:inherit}
.tbanner button{border:0;background:#fff;color:#13294B;border-radius:8px;padding:6px 10px;font:inherit;font-weight:700;cursor:pointer}
.tmod{position:fixed;inset:0;z-index:95;background:rgba(5,12,24,.55);display:flex;align-items:flex-end;justify-content:center}
.tmod .sh{background:var(--surface,#fff);color:var(--ink,#14202E);width:100%;max-width:640px;max-height:88vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));font-family:inherit}
.tmod .hd{display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:17px;margin-bottom:10px}
.tmod .x{border:1px solid var(--line,#D5DDE7);background:none;border-radius:8px;padding:5px 12px;font:inherit;cursor:pointer;color:inherit}
.tmod .u{border-bottom:1px solid var(--line,#D5DDE7);padding:10px 0;display:grid;grid-template-columns:1fr;gap:6px}
.tmod .u b{font-size:15px}.tmod .u small{color:var(--sub,#5B6B7E);font-size:12px}
.tmod .u .r{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tmod select{font:inherit;font-size:14px;padding:6px 8px;border-radius:8px;border:1px solid var(--line,#D5DDE7);background:var(--bg,#EEF2F7);color:inherit}
.tmod .sv{border:0;background:#4366B0;color:#fff;border-radius:8px;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer}
.tmod .tag{font-size:11px;border-radius:4px;padding:1px 7px;background:#EE6A61;color:#fff}
.tmod .sec{font-size:12px;color:var(--sub,#5B6B7E);margin:14px 0 2px}
.tg .tabs{display:flex;gap:6px;margin:6px 0 4px}.tg .tabs button{flex:1;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;border-radius:10px;padding:9px;font:inherit;font-weight:700;cursor:pointer}.tg .tabs button.on{background:#fff;color:#13294B}
.tg input,.tg select{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;margin-top:6px}.tg select option{color:#13294B}
.tmod input.nm{font:inherit;font-size:14px;padding:6px 8px;border-radius:8px;border:1px solid var(--line,#D5DDE7);background:var(--bg,#EEF2F7);color:inherit;width:9em}
.tmod .btnrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.tmod .btnrow button{border:1px solid var(--line,#D5DDE7);background:none;border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer;color:inherit}
.ttoast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#14202E;color:#fff;font-size:13px;padding:9px 16px;border-radius:8px;z-index:120;max-width:90%;text-align:center}`;
document.head.appendChild(css);
function toast(t){const d=document.createElement('div');d.className='ttoast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600);}
let gate=document.createElement('div');gate.className='tg';document.body.appendChild(gate);
const brand=`<h1>TMU FC <span>App</span></h1><p class="sub">東京都立大学サッカー部</p>`;
function showGate(html){gate.style.display='flex';gate.innerHTML=`<div class="box">${brand}${html}</div>`;}
function hideGate(){gate.style.display='none';gate.innerHTML='';}
showGate('<p>読み込んでいます…</p>');

// ---------- ログイン ----------
async function login(){
  const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
  try{await signInWithPopup(auth,p);}
  catch(e){
    if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')){try{await signInWithRedirect(auth,p);return;}catch(e2){e=e2;}}
    if(e&&e.code==='auth/popup-closed-by-user')return;
    const m=gate.querySelector('.err');if(m)m.textContent='ログインできませんでした（'+(e&&e.code||'エラー')+'）。ホーム画面のアプリでうまくいかない場合は、Safariで開いてログインしてください。';
  }
}
function loginScreen(){showGate(`<p>部のメンバーだけが使えるアプリです。Googleアカウントでログインしてください。</p><button class="tb" id="tg_login">Googleでログイン</button><p class="err"></p>`);gate.querySelector('#tg_login').onclick=login;}
getRedirectResult(auth).catch(()=>{});

// ---------- 名簿・ユーザー ----------
async function getRoster(){try{const s=await getDoc(doc(db,'team','roster'));return s.exists()?(s.data().players||[]):[];}catch(e){return [];}}
let ME=null,meUnsub=null,started=false;
function roleOf(u,user){if(ADMIN_EMAILS.includes((user.email||'').toLowerCase()))return u&&u.role==='disabled'?'disabled':'admin';return u?u.role:'pending';}

onAuthStateChanged(auth,async user=>{
  if(meUnsub){meUnsub();meUnsub=null;}
  if(!user){try{localStorage.removeItem(KEY_LOCAL);}catch(e){}if(started){location.reload();return;}loginScreen();return;}
  const ref=doc(db,'users',user.uid);
  try{
    const s=await getDoc(ref);
    if(!s.exists()){const isA=ADMIN_EMAILS.includes((user.email||'').toLowerCase());await setDoc(ref,{email:user.email||'',name:user.displayName||'',role:isA?'admin':'pending',pid:'',requestPid:'',requestName:'',createdAt:serverTimestamp()});}
  }catch(e){showGate(`<p>アカウントの確認に失敗しました（${esc(e.code||e.message)}）。通信状況を確認して、開き直してください。</p><button class="tb ghost" id="tg_out">ログアウト</button>`);gate.querySelector('#tg_out').onclick=()=>signOut(auth);return;}
  meUnsub=onSnapshot(ref,snap=>{const u=snap.data()||{};const role=roleOf(u,user);const prev=ME;ME={uid:user.uid,email:user.email,name:u.name||user.displayName||'',role,pid:u.pid||'',raw:u};
    if(started){if(!prev||prev.role!==role||prev.pid!==ME.pid)location.reload();return;}
    route(user);});
});
async function route(user){
  const r=ME.role;
  if(r==='disabled'){showGate(`<p>このアカウントは利用停止になっています。監督に確認してください。</p><p style="font-size:12px;opacity:.7">${esc(ME.email)}</p><button class="tb ghost" id="tg_out">ログアウト</button>`);gate.querySelector('#tg_out').onclick=()=>signOut(auth);return;}
  if(r==='pending')return pendingScreen();
  if(r==='player'&&PAGE==='pos'){location.replace('condition.html');return;}
  if(r==='player'&&!ME.pid){showGate(`<p>選手として承認されていますが、名簿の名前と結びついていません。監督に確認してください。</p><button class="tb ghost" id="tg_out">ログアウト</button>`);gate.querySelector('#tg_out').onclick=()=>signOut(auth);return;}
  started=true;showGate('<p>データを読み込んでいます…</p>');
  try{
    if(PAGE==='pos'){await stateInit();hideGate();window.__APP_MAIN();addAcct();}
    else{const roster=await getRoster();if(r==='player'&&!roster.some(p=>p.id===ME.pid)){showGate(`<p>名簿にあなたの名前が見つかりません。監督に確認してください。</p><button class="tb ghost" id="tg_out">ログアウト</button>`);gate.querySelector('#tg_out').onclick=()=>signOut(auth);return;}const ctx=await condInit(r,ME.pid,roster);hideGate();window.__COND_MAIN(ctx);addAcct();}
  }catch(e){console.error(e);showGate(`<p>データを読み込めませんでした（${esc(e.code||e.message)}）。</p><button class="tb" onclick="location.reload()">読み込み直す</button>`);}
}
let pendTab=null;
async function pendingScreen(){
  const roster=await getRoster();const u=ME.raw;if(!pendTab)pendTab=u.requestStaff?'staff':'player';
  const g={};roster.forEach(p=>(g[p.grade||0]=g[p.grade||0]||[]).push(p));
  const list=Object.keys(g).sort((a,b)=>b-a).map(k=>`<div class="gh">${k>0?k+'年':'学年未設定'}</div><div class="names">${g[k].map(p=>`<button data-rp="${esc(p.id)}" class="${!u.requestStaff&&u.requestPid===p.id?'on':''}">${esc(p.name)}</button>`).join('')}</div>`).join('');
  const req=u.requestStaff?`スタッフ（${esc(u.requestTitle||'')}）の <b>${esc(u.requestName)}</b> として申請中です。`:u.requestPid?`選手の <b>${esc(u.requestName)}</b> として申請中です。`:'';
  const playerPart=roster.length?`<p>名簿から自分の名前を選んでください。</p>${list}`:'<p>名簿がまだ登録されていません。監督・スタッフが登録するまでお待ちください。</p>';
  const staffPart=`<p>名前と役職を入れて「申請する」を押してください。</p><input id="tg_nm" placeholder="名前（例：都立 太郎）" value="${esc(u.requestStaff?u.requestName:(u.name||''))}"><select id="tg_ti">${TITLES.map(t=>`<option ${u.requestTitle===t?'selected':''}>${t}</option>`).join('')}</select><button class="tb" id="tg_req">申請する</button>`;
  showGate(`<p>${req?req+'監督が承認すると使えるようになります（この画面は自動で切り替わります）。':'はじめてのログインです。あてはまる方を選んでください。'}</p>
<div class="tabs"><button data-tab="player" class="${pendTab==='player'?'on':''}">選手</button><button data-tab="staff" class="${pendTab==='staff'?'on':''}">スタッフ</button></div>
${pendTab==='player'?playerPart:staffPart}
<p class="gh">ログイン中：${esc(ME.email)}</p><button class="tb ghost" id="tg_out">ログアウト</button>`);
  const put=async data=>{try{await setDoc(doc(db,'users',ME.uid),{...data,role:'pending'},{merge:true});Object.assign(ME.raw,data);pendingScreen();}catch(e){toast('申請できませんでした');}};
  gate.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{pendTab=b.dataset.tab;pendingScreen();});
  gate.querySelectorAll('[data-rp]').forEach(b=>b.onclick=()=>{const p=roster.find(x=>x.id===b.dataset.rp);put({requestPid:p.id,requestName:p.name,requestStaff:false,requestTitle:''});});
  const rq=gate.querySelector('#tg_req');if(rq)rq.onclick=()=>{const nm=gate.querySelector('#tg_nm').value.trim();if(!nm){toast('名前を入れてください');return;}put({requestPid:'',requestName:nm,requestStaff:true,requestTitle:gate.querySelector('#tg_ti').value});};
  gate.querySelector('#tg_out').onclick=()=>signOut(auth);
}

// ---------- アカウントとメンバー管理 ----------
let usersCache=[],usersUnsub=null;
function addAcct(){
  const host=PAGE==='pos'?document.querySelector('header p'):document.querySelector('header .hrow');if(!host||host.querySelector('.tacct'))return;
  const b=document.createElement('button');b.className='tacct';b.type='button';b.innerHTML=`${esc((ME.name||ME.email).split(/[\s　@]/)[0])}<span class="cnt"></span>`;b.onclick=openAcct;host.appendChild(b);
  if(ME.role==='admin'){usersUnsub=onSnapshot(collection(db,'users'),s=>{usersCache=s.docs.map(d=>({uid:d.id,...d.data()}));const n=usersCache.filter(u=>u.role==='pending').length;b.querySelector('.cnt').innerHTML=n?`<i>${n}</i>`:'';if(document.querySelector('.tmod.users'))renderUsers();},()=>{});}
}
function openAcct(){
  const m=document.createElement('div');m.className='tmod';m.innerHTML=`<div class="sh"><div class="hd">アカウント<button class="x" data-x>閉じる</button></div>
<p style="margin:0">${esc(ME.name)}${ME.raw.title?`<small style="color:var(--sub)">（${esc(ME.raw.title)}）</small>`:''}<br><small style="color:var(--sub)">${esc(ME.email)}</small></p><p>権限：<b>${ROLE_LABEL[ME.role]||ME.role}</b></p>
${ME.role==='admin'||ME.role==='staff'?`<div class="r" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input class="nm" data-mynm value="${esc(ME.name)}" placeholder="名前"><select data-myti>${TITLES.map(t=>`<option ${ME.raw.title===t?'selected':''}>${t}</option>`).join('')}</select><button class="sv" data-mysv>名前を保存</button></div>`:''}
<div class="btnrow">${ME.role==='admin'?'<button data-users>メンバー管理</button>':''}<button data-tout>ログアウト</button></div></div>`;
  m.onclick=e=>{if(e.target===m)m.remove();};document.body.appendChild(m);
  m.querySelector('[data-x]').onclick=()=>m.remove();
  m.querySelector("[data-tout]").onclick=async()=>{if(confirmBox('ログアウトしますか？'))await signOut(auth);};
  const u=m.querySelector('[data-users]');if(u)u.onclick=()=>{m.remove();openUsers();};
  const ms=m.querySelector('[data-mysv]');if(ms)ms.onclick=async()=>{const name=m.querySelector('[data-mynm]').value.trim();if(!name){toast('名前を入れてください');return;}try{await setDoc(doc(db,'users',ME.uid),{name,title:m.querySelector('[data-myti]').value},{merge:true});ME.name=name;toast('保存しました');m.remove();const b=document.querySelector('.tacct');if(b&&b.firstChild)b.firstChild.textContent=name.split(/[\s　]/)[0];}catch(e){toast('保存できませんでした');}};
}
function confirmBox(t){return window.confirm?window.confirm(t):true;}
let rosterCache=null;
async function openUsers(){rosterCache=rosterCache||await getRoster();const m=document.createElement('div');m.className='tmod users';m.innerHTML='<div class="sh"></div>';m.onclick=e=>{if(e.target===m)m.remove();};document.body.appendChild(m);renderUsers();}
function renderUsers(){
  const m=document.querySelector('.tmod.users');if(!m)return;const sh=m.querySelector('.sh');const R=rosterCache||[];
  const ord={pending:0,admin:1,staff:2,player:3,disabled:4};const L=usersCache.slice().sort((a,b)=>(ord[a.role]??9)-(ord[b.role]??9)||String(a.name).localeCompare(String(b.name),'ja'));
  const linked=new Set(usersCache.filter(u=>u.role==='player'&&u.pid).map(u=>u.pid));
  const row=u=>{const self=u.uid===ME.uid;return `<div class="u" data-uid="${u.uid}"><div><b>${esc(u.name||'（名前なし）')}</b>${u.title&&(u.role==='staff'||u.role==='admin')?` <small>${esc(u.title)}</small>`:''} ${u.role==='pending'?'<span class="tag">承認待ち</span>':''}<br><small>${esc(u.email)}${u.role==='pending'&&u.requestName?`　申請：${u.requestStaff?'スタッフ（'+esc(u.requestTitle||'')+'）':'選手'} ${esc(u.requestName)}`:''}</small></div>
<div class="r"><select data-role ${self?'disabled':''}>${['pending','player','staff','admin','disabled'].map(r=>`<option value="${r}" ${(u.role==='pending'&&u.requestStaff?r==='staff':u.role==='pending'&&u.requestPid?r==='player':u.role===r)?'selected':''}>${ROLE_LABEL[r]}</option>`).join('')}</select>
<input class="nm" data-nm value="${esc(u.role==='pending'&&u.requestStaff?u.requestName:(u.name||''))}" placeholder="名前" ${(u.role==='pending'&&u.requestStaff)||u.role==='staff'||u.role==='admin'?'':'style="display:none"'} ${self?'disabled':''}>
<select data-ti ${(u.role==='pending'&&u.requestStaff)||u.role==='staff'||u.role==='admin'?'':'style="display:none"'} ${self?'disabled':''}>${TITLES.map(t=>`<option ${(u.title||u.requestTitle)===t?'selected':''}>${t}</option>`).join('')}</select>
<select data-pid ${u.role==='player'||(u.role==='pending'&&u.requestPid&&!u.requestStaff)?'':'style="display:none"'}><option value="">名簿の名前を選ぶ</option>${R.map(p=>`<option value="${esc(p.id)}" ${(u.pid||u.requestPid)===p.id?'selected':''}>${esc(p.name)}${linked.has(p.id)&&u.pid!==p.id?'（登録済み）':''}</option>`).join('')}</select>
<button class="sv" data-save ${self?'disabled':''}>保存</button></div></div>`;};
  sh.innerHTML=`<div class="hd">メンバー管理<button class="x" data-x>閉じる</button></div><p style="font-size:13px;color:var(--sub);margin:0">権限を選んで「保存」を押します。選手は名簿の名前と結びつけてください。</p>${L.map(row).join('')}`;
  sh.querySelector('[data-x]').onclick=()=>m.remove();
  sh.querySelectorAll('.u').forEach(el=>{const rs=el.querySelector('[data-role]'),ps=el.querySelector('[data-pid]');
    const ns=el.querySelector('[data-nm]'),ts=el.querySelector('[data-ti]');
    rs.onchange=()=>{ps.style.display=rs.value==='player'?'':'none';const st=rs.value==='staff'||rs.value==='admin';ns.style.display=st?'':'none';ts.style.display=st?'':'none';};
    el.querySelector('[data-save]').onclick=async()=>{const role=rs.value,pid=role==='player'?ps.value:'';if(role==='player'&&!pid){toast('名簿の名前を選んでください');return;}
      const data={role,pid};if(role==='staff'||role==='admin'){const nm=ns.value.trim();if(nm)data.name=nm;data.title=ts.value;}
      else if(role==='player'){const p=(rosterCache||[]).find(x=>x.id===pid);if(p)data.name=p.name;}
      try{await setDoc(doc(db,'users',el.dataset.uid),data,{merge:true});toast('保存しました');}catch(e){toast('保存できませんでした（'+(e.code||'')+'）');}};});
}

// ---------- ポジション整理・メンバー選考（team/state） ----------
const KEY='tmu-pos-data';
let baseRev=0,baseJson=null,pushTimer=null,pushing=false,lastRoster='';
const stateRef=()=>doc(db,'team','state');
function rosterOf(st){return (st.players||[]).filter(p=>!p.out).map(p=>({id:p.id,name:p.name,grade:p.grade||0,team:p.team||'',p1:p.p1||''}));}
async function pushRoster(st){const r=rosterOf(st);const j=JSON.stringify(r);if(j===lastRoster)return;try{await setDoc(doc(db,'team','roster'),{players:r,at:serverTimestamp()});lastRoster=j;}catch(e){}}
function mergeById(base,mine,theirs){const b={},m={};(base||[]).forEach(x=>b[x.id]=JSON.stringify(x));(mine||[]).forEach(x=>m[x.id]=x);
  let out=(theirs||[]).filter(x=>!(x.id in b&&!(x.id in m)));
  (mine||[]).forEach(x=>{if(b[x.id]===JSON.stringify(x))return;const i=out.findIndex(y=>y.id===x.id);if(i>=0)out[i]=x;else out.push(x);});return out;}
function merge3(base,mine,theirs){const r=JSON.parse(JSON.stringify(theirs));r.players=mergeById(base.players,mine.players,theirs.players);r.games=mergeById(base.games||[],mine.games||[],theirs.games||[]);
  Object.keys(mine).forEach(k=>{if(k==='players'||k==='games')return;if(JSON.stringify(mine[k])!==JSON.stringify(base[k]))r[k]=mine[k];});return r;}
async function writeState(obj,force){
  let result=obj;
  await runTransaction(db,async tx=>{const s=await tx.get(stateRef());const cur=s.exists()?s.data():null;
    if(cur&&!force&&cur.rev!==baseRev&&baseJson){result=merge3(JSON.parse(baseJson),obj,JSON.parse(cur.json));}
    const rev=(cur?cur.rev:0)+1;tx.set(stateRef(),{json:JSON.stringify(result),rev,client:CLIENT,by:ME.email,at:serverTimestamp()});baseRev=rev;});
  baseJson=JSON.stringify(result);return result;
}
async function stateInit(){
  const local=localStorage.getItem(KEY);const pushFlag=localStorage.getItem('tmu-push-local');
  const s=await getDoc(stateRef());
  if(pushFlag&&local){localStorage.removeItem('tmu-push-local');await writeState(JSON.parse(local),true);toast('読み込んだデータを全員に共有しました');}
  else if(s.exists()){const d=s.data();baseRev=d.rev;baseJson=d.json;localStorage.setItem(KEY,d.json);}
  else if(local){await writeState(JSON.parse(local),true);}
  else{window.TMU.needSeed=true;}
  if(baseJson)pushRoster(JSON.parse(baseJson));
  onSnapshot(stateRef(),snap=>{if(!snap.exists())return;const d=snap.data();if(d.client===CLIENT||d.rev<=baseRev)return;
    if(pushing||pushTimer){return;}
    baseRev=d.rev;baseJson=d.json;localStorage.setItem(KEY,d.json);remoteChanged(d.by);},()=>{});
}
function remoteChanged(by){
  const busy=document.querySelector('.modal,.askm,.tmod')||['INPUT','TEXTAREA','SELECT'].includes((document.activeElement||{}).tagName);
  if(!busy){try{sessionStorage.setItem('tmu-scroll',String(window.scrollY));}catch(e){}location.reload();return;}
  if(document.querySelector('.tbanner'))return;const b=document.createElement('div');b.className='tbanner';b.innerHTML=`<span>${esc((by||'').split('@')[0])}さんが内容を更新しました</span><button>最新にする</button>`;b.querySelector('button').onclick=()=>location.reload();document.body.appendChild(b);
}
try{const y=sessionStorage.getItem('tmu-scroll');if(y){sessionStorage.removeItem('tmu-scroll');setTimeout(()=>window.scrollTo(0,+y),300);}}catch(e){}
function statePush(st){
  clearTimeout(pushTimer);const snap=JSON.stringify(st);
  pushTimer=setTimeout(async()=>{pushTimer=null;pushing=true;
    try{const res=await writeState(JSON.parse(snap),false);pushRoster(res);if(JSON.stringify(res)!==snap){localStorage.setItem(KEY,JSON.stringify(res));remoteChanged('ほかのスタッフ');}setStatus('ok');}
    catch(e){console.error(e);setStatus('err');toast('保存できませんでした。通信状況を確認してください');}
    pushing=false;},1200);
  setStatus('wait');
}
let statusEl=null;function setStatus(s){window.__TMU_SAVE_STATUS=s;const m=document.getElementById('savemsg');if(m&&window.__renderSave)window.__renderSave();}
// コンディションのケガ → ポジションのケガ中
let injTimer=null;
function syncInj(map){if(!(ME.role==='admin'||ME.role==='staff'))return;clearTimeout(injTimer);injTimer=setTimeout(async()=>{try{await runTransaction(db,async tx=>{const s=await tx.get(stateRef());if(!s.exists())return;const d=s.data();const st=JSON.parse(d.json);let ch=false;
  (st.players||[]).forEach(pl=>{if(!(pl.id in map))return;const on=!!map[pl.id];if(!!pl.inj!==on&&(on||pl.injFromCond)){pl.inj=on;pl.injFromCond=on;ch=true;}});
  if(ch)tx.set(stateRef(),{json:JSON.stringify(st),rev:d.rev+1,client:CLIENT,by:ME.email,at:serverTimestamp()});});}catch(e){console.error(e);}},800);}

// ---------- コンディション ----------
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
async function condInit(role,pid,roster){
  const staff=role==='admin'||role==='staff';
  const DB={entries:{},reports:[],injuries:[],absences:[],self:[]};
  const synced={};const maps={reports:{},injuries:{},absences:{},self:{}};let listeners=[];let onRemote=null;
  const now=new Date();const from=dstr(new Date(now.getFullYear(),now.getMonth(),now.getDate()-40));
  const ym=d=>d.slice(0,7);const yms=[0,1,2].map(k=>{const x=new Date(now.getFullYear(),now.getMonth()-k,1);return `${x.getFullYear()}-${pad(x.getMonth()+1)}`;});
  const rebuildArr=coll=>{const all={};Object.values(maps[coll]).forEach(m=>Object.assign(all,m));DB[coll].length=0;Object.values(all).forEach(x=>DB[coll].push(x));};
  const qs=[];
  const Q=(...a)=>query(...a);
  if(staff){
    qs.push(['entries',Q(collection(db,'entries'),where('ym','in',yms))]);
    qs.push(['reports',Q(collection(db,'reports'),where('date','>=',from))]);
    qs.push(['absences',Q(collection(db,'absences'),where('date','>=',from))]);
    qs.push(['injuries',collection(db,'injuries')]);
    qs.push(['self',Q(collection(db,'self'),where('date','>=',from))]);
  }else{
    qs.push(['entries',Q(collection(db,'entries'),where('pid','==',pid))]);
    qs.push(['reports',Q(collection(db,'reports'),where('pid','==',pid))]);
    qs.push(['absences',Q(collection(db,'absences'),where('pid','==',pid))]);
    qs.push(['injuries',Q(collection(db,'injuries'),where('pid','==',pid))]);
    qs.push(['self',Q(collection(db,'self'),where('pid','==',pid))]);
    qs.push(['self',Q(collection(db,'self'),where('shared','==',true))]);
  }
  await Promise.all(qs.map(([coll,q],qi)=>new Promise((res,rej)=>{let first=true;
    listeners.push(onSnapshot(q,snap=>{
      if(coll==='entries'){snap.docChanges().forEach(ch=>{const d=ch.doc.data();Object.entries(d.d||{}).forEach(([date,obj])=>{DB.entries[date]=DB.entries[date]||{};if(ch.type==='removed'){delete DB.entries[date][d.pid];return;}DB.entries[date][d.pid]=obj;synced['e/'+date+'/'+d.pid]=JSON.stringify(obj);});});}
      else{const old=maps[coll][qi]||{};const m=maps[coll][qi]={};snap.docs.forEach(d=>{delete old[d.id];});Object.keys(old).forEach(id=>{delete synced[coll+'/'+id];});snap.docs.forEach(d=>{const x={...d.data(),id:d.id};m[d.id]=x;synced[coll+'/'+d.id]=JSON.stringify(x);});rebuildArr(coll);}
      if(first){first=false;res();}else if(!snap.metadata.hasPendingWrites&&onRemote)onRemote();
    },e=>{if(first){first=false;rej(e);}}));})));
  async function save(){
    const jobs=[];
    const dirty=new Set(),cur=new Set();
    Object.entries(DB.entries).forEach(([date,byP])=>Object.entries(byP).forEach(([p,obj])=>{const k='e/'+date+'/'+p,j=JSON.stringify(obj);cur.add(k);if(synced[k]===j)return;synced[k]=j;dirty.add(p+'|'+ym(date));}));
    Object.keys(synced).filter(k=>k.startsWith('e/')&&!cur.has(k)).forEach(k=>{const[,date,p]=k.split('/');delete synced[k];dirty.add(p+'|'+ym(date));});
    dirty.forEach(key=>{const[p,m]=key.split('|');const d={};Object.entries(DB.entries).forEach(([date,byP])=>{if(ym(date)===m&&byP[p])d[date]=clean(byP[p]);});
      jobs.push(setDoc(doc(db,'entries',p+'_'+m),{pid:p,ym:m,d}));});
    (staff?['reports','injuries','absences','self']:['reports','absences','self']).forEach(coll=>{const seen=new Set();DB[coll].forEach(x=>{if(!x.id)return;seen.add(x.id);const k=coll+'/'+x.id,j=JSON.stringify(x);if(synced[k]===j)return;synced[k]=j;const data=clean(x);delete data.id;jobs.push(setDoc(doc(db,coll,x.id),data));});
      Object.keys(synced).filter(k=>k.startsWith(coll+'/')&&!seen.has(k.slice(coll.length+1))).forEach(k=>{delete synced[k];jobs.push(deleteDoc(doc(db,coll,k.slice(coll.length+1))));});});
    if(!jobs.length)return;
    try{await Promise.all(jobs);}catch(e){console.error(e);toast('保存できませんでした（'+(e.code||'エラー')+'）');}
  }
  return {role,pid,roster,db:DB,save,syncInj,onRemote:f=>{onRemote=f;},me:ME};
}

window.TMU={statePush,toast,get me(){return ME;}};
