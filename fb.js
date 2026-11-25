// TMU FC App - ログイン・権限・データ共有（Firebase）
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
const { initializeApp } = await import(SDK+'firebase-app.js');
const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } = await import(SDK+'firebase-auth.js');
const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, collection, query, where, runTransaction, serverTimestamp, arrayUnion, arrayRemove, orderBy, limit, increment, updateDoc } = await import(SDK+'firebase-firestore.js');

const firebaseConfig={apiKey:"AIzaSyAu4LiAEFy7-e1ILCMoN2U__XNDAJybad8",authDomain:"tmufc-app.firebaseapp.com",projectId:"tmufc-app",storageBucket:"tmufc-app.firebasestorage.app",messagingSenderId:"820014072624",appId:"1:820014072624:web:c23b0b8bae92c6a9333ef5"};
const KEY_LOCAL='tmu-pos-data';
// 通知：Firebaseの「プロジェクトの設定 → Cloud Messaging → ウェブプッシュ証明書」で作った鍵（公開してよい鍵）
const VAPID_KEY='BL89NrfnKievTaEjRF_p70pdsDSMsHPw12gBoSIiOSt96_cXYap6xF4ev3JLkglDFqD8jpod4FLD0TV4NmrrgnE';
const ADMIN_EMAILS=[];
const TITLES=['総監督','監督','コーチ','トレーナー','マネージャー'];
const FULL=['admin','staff','leader'],CONDS=['admin','staff','leader','medical'],NEEDPID=['player','leader'],NAMED=['admin','staff','medical'];
const ROLE_ORDER=['pending','player','leader','medical','staff','admin','disabled'];
const ROLE_LABEL={admin:'管理者（全機能＋メンバー管理）',staff:'総監督・監督・コーチ（全機能）',medical:'トレーナー・マネージャー（コンディション・トレーニング・スケジュール）',leader:'幹部（全機能＋選手の入力）',player:'選手（選手の入力）',pending:'承認待ち',disabled:'利用停止'};

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
.ptr{position:fixed;left:50%;top:-40px;transform:translate(-50%,0);z-index:90;background:#14202E;color:#fff;font-size:13px;padding:7px 14px;border-radius:999px;transition:transform .15s;pointer-events:none;white-space:nowrap}
.ptr.go{background:#1F5FBF}
.trf{font-size:15px!important;padding:2px 9px!important;line-height:1.2}
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
.tmod .sv.del{background:transparent;color:#C93C34;border:1px solid #C93C34}
.tmod .sv{border:0;background:#4366B0;color:#fff;border-radius:8px;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer}
.tmod .sv.ghost{background:transparent;color:#4366B0;border:1px solid #4366B0}
.tmod .sv:disabled{opacity:.6}
.tmod .tag{font-size:11px;border-radius:4px;padding:1px 7px;background:#EE6A61;color:#fff}
.tmod .unreg{margin:12px 0 4px;border:1px solid var(--line,#D5DDE7);border-radius:10px;padding:10px 12px;font-size:14px}
.tmod .unreg.ok{color:var(--sub,#5B6B7E)}
.tmod .unreg summary{cursor:pointer}
.tmod .unreg .gh{font-size:12px;color:var(--sub,#5B6B7E);margin:8px 0}
.tmod .unreg .ug{display:flex;gap:8px;margin:6px 0;align-items:baseline}
.tmod .unreg .ug small{min-width:3.5em;color:var(--sub,#5B6B7E);font-size:12px}
.tmod .unreg .un{display:inline-block;font-size:13px;border:1px solid var(--line,#D5DDE7);border-radius:999px;padding:2px 10px;margin:0 4px 4px 0}
.tmod .unreg .un.rq{border-color:#EE6A61}
.tmod .unreg .un i{font-style:normal;font-size:10px;color:#EE6A61;margin-left:4px}
.tmod .unreg .x{margin-top:6px}
.tmod .sec{font-size:12px;color:var(--sub,#5B6B7E);margin:14px 0 2px}
.tg .tabs{display:flex;gap:6px;margin:6px 0 4px}.tg .tabs button{flex:1;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;border-radius:10px;padding:9px;font:inherit;font-weight:700;cursor:pointer}.tg .tabs button.on{background:#fff;color:#13294B}
.tg input,.tg select{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;margin-top:6px}.tg select option{color:#13294B}
.tmod input.nm{font:inherit;font-size:14px;padding:6px 8px;border-radius:8px;border:1px solid var(--line,#D5DDE7);background:var(--bg,#EEF2F7);color:inherit;width:9em}
.tmod .nt{margin-top:14px;padding-top:12px;border-top:1px solid var(--line,#D5DDE7)}
.tmod .nt .ntt{display:block;margin-bottom:4px}
.tmod .nt .gh{font-size:12px;color:var(--sub,#5B6B7E);margin:4px 0 8px;line-height:1.6}
.tmod .nt .ntr{display:flex;gap:8px;align-items:flex-start;font-size:14px;margin:8px 0}
.tmod .nt .ntr input{margin-top:3px}
.tmod .nt .sv{margin-top:6px}
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
  // アプリを開いたとき（ハッシュなしの index）はホームへ
  if(PAGE==='pos'&&!location.hash){location.replace('home.html');return;}
  if((!FULL.includes(r)&&PAGE==='pos')||(!CONDS.includes(r)&&PAGE==='tr')){location.replace('home.html');return;}
  if(NEEDPID.includes(r)&&!ME.pid){showGate(`<p>選手として承認されていますが、名簿の名前と結びついていません。監督に確認してください。</p><button class="tb ghost" id="tg_out">ログアウト</button>`);gate.querySelector('#tg_out').onclick=()=>signOut(auth);return;}
  started=true;showGate('<p>データを読み込んでいます…</p>');
  try{
    if(PAGE==='pos'){await stateInit();hideGate();window.__APP_MAIN();addAcct();}
    else if(PAGE==='sch'){const roster=await getRoster();const ctx=await schInit(roster);hideGate();window.__SCH_MAIN(ctx);addAcct();}
    else if(PAGE==='tr'){const roster=await getRoster();const ctx=await trInit(roster);hideGate();window.__TR_MAIN(ctx);addAcct();}
    else if(PAGE==='hm'){const roster=await getRoster();const ctx=await hmInit(roster);hideGate();window.__HM_MAIN(ctx);addAcct();}
    else if(PAGE==='ch'){const ctx=await chInit();hideGate();window.__CH_MAIN(ctx);addAcct();}
    else if(PAGE==='rv'){const roster=await getRoster();const ctx=await rvInit(roster);hideGate();window.__RV_MAIN(ctx);addAcct();}
    else{const roster=await getRoster();if(NEEDPID.includes(r)&&!roster.some(p=>p.id===ME.pid)){showGate(`<p>名簿にあなたの名前が見つかりません。監督に確認してください。</p><button class="tb ghost" id="tg_out">ログアウト</button>`);gate.querySelector('#tg_out').onclick=()=>signOut(auth);return;}const ctx=await condInit(r,ME.pid,roster);hideGate();window.__COND_MAIN(ctx);addAcct();}
  }catch(e){console.error(e);showGate(`<p>データを読み込めませんでした（${esc(e.code||e.message)}）。</p><button class="tb" onclick="location.reload()">読み込み直す</button><button class="tb ghost" id="tg_out" style="margin-top:10px">ログアウト</button><p class="gh" style="margin-top:14px">直らないときは、この画面を監督に送ってください。</p>`);const o=gate.querySelector('#tg_out');if(o)o.onclick=()=>signOut(auth);}
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
// ---------- 画面の更新 ----------
function reloadPage(){if(document.querySelector('.modal,.tmod,#sheet')&&!confirm('入力中の内容は消えます。画面を更新しますか？'))return;
  if(PAGE==='pos'&&(window.__TMU_SAVE_STATUS==='wait'||pushTimer)){toast('保存中です。少し待ってからもう一度押してください');return;}
  try{toast('更新しています…');}catch(e){}setTimeout(()=>location.reload(),150);}
// 画面のいちばん上で下に引っぱると更新（アプリとして開いたときにブラウザの更新がないため）
function pullToRefresh(){if(window.__ptr)return;window.__ptr=true;
  const ind=document.createElement('div');ind.className='ptr';ind.textContent='↓ 引っぱって更新';document.body.appendChild(ind);
  let y0=null,dy=0;const TH=80;
  addEventListener('touchstart',e=>{if(window.scrollY>0||e.touches.length!==1||document.querySelector('.modal,.tmod,#sheet')){y0=null;return;}y0=e.touches[0].clientY;dy=0;},{passive:true});
  addEventListener('touchmove',e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy<=0||window.scrollY>0){ind.style.transform='';return;}const d=Math.min(dy,TH*1.4);ind.style.transform=`translate(-50%,${d}px)`;ind.textContent=dy>TH?'↻ はなすと更新':'↓ 引っぱって更新';ind.classList.toggle('go',dy>TH);},{passive:true});
  addEventListener('touchend',()=>{if(y0==null)return;const go=dy>TH;y0=null;ind.style.transform='';ind.classList.remove('go');if(go)reloadPage();},{passive:true});}
function addAcct(){
  setTimeout(ntRefresh,3000);
  if(!FULL.includes(ME.role))document.querySelectorAll('.apptabs a[href^="./#"]').forEach(a=>a.remove());
  if(!CONDS.includes(ME.role))document.querySelectorAll('.apptabs a[href="training.html"]').forEach(a=>a.remove());
  try{const on=document.querySelector('.apptabs .on');if(on)on.scrollIntoView({inline:'center',block:'nearest'});}catch(e){}
  const host=PAGE==='pos'?document.querySelector('header p'):document.querySelector('header .hrow');if(!host||host.querySelector('.tacct'))return;
  const rf=document.createElement('button');rf.className='tacct trf';rf.type='button';rf.setAttribute('aria-label','画面を更新');rf.title='画面を更新';rf.textContent='↻';rf.onclick=reloadPage;host.appendChild(rf);
  pullToRefresh();
  const b=document.createElement('button');b.className='tacct';b.type='button';b.innerHTML=`${esc((ME.name||ME.email).split(/[\s　@]/)[0])}<span class="cnt"></span>`;b.onclick=openAcct;host.appendChild(b);
  if(ME.role==='admin'){usersUnsub=onSnapshot(collection(db,'users'),s=>{usersCache=s.docs.map(d=>({uid:d.id,...d.data()}));pushDir();const n=usersCache.filter(u=>u.role==='pending').length;b.querySelector('.cnt').innerHTML=n?`<i>${n}</i>`:'';if(document.querySelector('.tmod.users'))renderUsers();},()=>{});}
}
function openAcct(){
  const m=document.createElement('div');m.className='tmod';m.innerHTML=`<div class="sh"><div class="hd">アカウント<button class="x" data-x>閉じる</button></div>
<p style="margin:0">${esc(ME.name)}${ME.raw.title?`<small style="color:var(--sub)">（${esc(ME.raw.title)}）</small>`:''}<br><small style="color:var(--sub)">${esc(ME.email)}</small></p><p>権限：<b>${ROLE_LABEL[ME.role]||ME.role}</b></p>
${NAMED.includes(ME.role)?`<div class="r" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input class="nm" data-mynm value="${esc(ME.name)}" placeholder="名前"><select data-myti>${TITLES.map(t=>`<option ${ME.raw.title===t?'selected':''}>${t}</option>`).join('')}</select><button class="sv" data-mysv>名前を保存</button></div>`:''}
${ntKinds().length?'<div class="nt" data-nt></div>':''}
<div class="btnrow">${ME.role==='admin'?'<button data-users>メンバー管理</button>':''}<button data-tout>ログアウト</button></div></div>`;
  m.onclick=e=>{if(e.target===m)m.remove();};document.body.appendChild(m);
  m.querySelector('[data-x]').onclick=()=>m.remove();
  m.querySelector("[data-tout]").onclick=async()=>{if(confirmBox('ログアウトしますか？'))await signOut(auth);};
  const u=m.querySelector('[data-users]');if(u)u.onclick=()=>{m.remove();openUsers();};
  const nt=m.querySelector('[data-nt]');if(nt)renderNotif(nt);
  const ms=m.querySelector('[data-mysv]');if(ms)ms.onclick=async()=>{const name=m.querySelector('[data-mynm]').value.trim();if(!name){toast('名前を入れてください');return;}try{await setDoc(doc(db,'users',ME.uid),{name,title:m.querySelector('[data-myti]').value},{merge:true});ME.name=name;toast('保存しました');m.remove();const b=document.querySelector('.tacct');if(b&&b.firstChild)b.firstChild.textContent=name.split(/[\s　]/)[0];}catch(e){toast('保存できませんでした');}};
}
// ---------- 通知 ----------
const NT_LABEL={dm:'メッセージが届いたとき',am:'朝のチェックのリマインド（未入力のとき：練習・試合の日は2時間前、ない日は12時）',pain:'選手から痛みの報告が来たとき',abs:'今日の欠席・遅刻の連絡が入ったとき'};
const ntKinds=()=>['dm',...(NEEDPID.includes(ME.role)&&ME.pid?['am']:[]),...(CONDS.includes(ME.role)?['pain','abs']:[])];
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const NT_LOCAL='tmu-fcm-token';
async function fcmToken(){
  const reg=await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;
  const M=await import(SDK+'firebase-messaging.js');if(!(await M.isSupported()))throw new Error('unsupported');
  return await M.getToken(M.getMessaging(app),{vapidKey:VAPID_KEY,serviceWorkerRegistration:reg});}
async function ntSave(token,extra){
  await setDoc(doc(db,'tokens',ME.uid),{role:ME.role,pid:ME.pid||'',name:ME.name||'',updated:serverTimestamp(),...(token?{tokens:arrayUnion(token)}:{}),...(extra||{})},{merge:true});}
async function renderNotif(box){
  const head='<b class="ntt">通知</b>';
  const ok='Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
  if(isIOS()&&!standalone()){box.innerHTML=head+'<p class="gh">iPhoneでは、ホーム画面に追加したアプリから開くと通知を受け取れます。Safariの共有ボタン →「ホーム画面に追加」で追加して、そこから開いてください。</p>';return;}
  if(!ok){box.innerHTML=head+'<p class="gh">このブラウザは通知に対応していません。iPhoneはiOS 16.4以降が必要です。</p>';return;}
  if(!VAPID_KEY){box.innerHTML=head+'<p class="gh">通知はまだ準備中です。</p>';return;}
  let d={};try{const sn=await getDoc(doc(db,'tokens',ME.uid));d=sn.data()||{};}catch(e){}
  const mine=localStorage.getItem(NT_LOCAL);const on=Notification.permission==='granted'&&mine&&(d.tokens||[]).includes(mine);
  const pf=d.prefs||{};
  if(!on){box.innerHTML=head+`${Notification.permission==='denied'?'<p class="gh">通知が「許可しない」になっています。端末の設定（iPhoneは 設定 → 通知 → TMU FC App）で許可してから、もう一度押してください。</p>':'<p class="gh">この端末で通知を受け取れるようにします。</p>'}<button class="sv" data-nton>この端末で通知を受け取る</button>`;
    box.querySelector('[data-nton]').onclick=async e=>{const b=e.target;b.disabled=true;b.textContent='設定中…';
      try{const per=await Notification.requestPermission();if(per!=='granted'){toast('通知が許可されませんでした');renderNotif(box);return;}
        const t=await fcmToken();localStorage.setItem(NT_LOCAL,t);const prefs={};ntKinds().forEach(k=>{if(pf[k]===undefined)prefs[k]=true;});
        await ntSave(t,Object.keys(prefs).length?{prefs:{...pf,...prefs}}:{});toast('通知を受け取れるようにしました');renderNotif(box);}
      catch(err){console.error(err);toast('設定できませんでした（'+(err.code||err.message||'エラー')+'）');renderNotif(box);}};return;}
  box.innerHTML=head+`<p class="gh">この端末で通知を受け取っています。受け取る通知を選べます。</p>${ntKinds().map(k=>`<label class="ntr"><input type="checkbox" data-ntk="${k}" ${pf[k]!==false?'checked':''}> ${NT_LABEL[k]}</label>`).join('')}<button class="sv ghost" data-ntoff>この端末の通知を止める</button>`;
  box.querySelectorAll('[data-ntk]').forEach(c=>c.onchange=async()=>{try{await ntSave(null,{prefs:{...pf,[c.dataset.ntk]:c.checked}});pf[c.dataset.ntk]=c.checked;toast(c.checked?'オンにしました':'オフにしました');}catch(e){toast('保存できませんでした');}});
  box.querySelector('[data-ntoff]').onclick=async()=>{try{await setDoc(doc(db,'tokens',ME.uid),{tokens:arrayRemove(mine)},{merge:true});try{const M=await import(SDK+'firebase-messaging.js');await M.deleteToken(M.getMessaging(app));}catch(e){}localStorage.removeItem(NT_LOCAL);toast('この端末の通知を止めました');renderNotif(box);}catch(e){toast('止められませんでした');}};}
// 開くたびに通知の宛先を最新にしておく（宛先が変わることがあるため）
async function ntRefresh(){try{if(!VAPID_KEY||!('Notification' in window)||Notification.permission!=='granted')return;const old=localStorage.getItem(NT_LOCAL);if(!old||!ntKinds().length)return;
  const t=await fcmToken();if(t!==old){await setDoc(doc(db,'tokens',ME.uid),{tokens:arrayRemove(old)},{merge:true});localStorage.setItem(NT_LOCAL,t);}await ntSave(t);}catch(e){}}
function confirmBox(t){return window.confirm?window.confirm(t):true;}
let rosterCache=null;
async function openUsers(){rosterCache=rosterCache||await getRoster();const m=document.createElement('div');m.className='tmod users';m.innerHTML='<div class="sh"></div>';m.onclick=e=>{if(e.target===m)m.remove();};document.body.appendChild(m);renderUsers();}
// 名簿にいるのに、まだアカウントと結びついていない選手
function unregHtml(){
  const R=(rosterCache||[]);if(!R.length)return '';
  const linked=new Set(usersCache.filter(u=>NEEDPID.includes(u.role)&&u.pid).map(u=>u.pid));
  const req=new Set(usersCache.filter(u=>u.role==='pending'&&u.requestPid&&!u.requestStaff).map(u=>u.requestPid));
  const un=R.filter(p=>!linked.has(p.id)).sort((a,b)=>(b.grade||0)-(a.grade||0)||String(a.name).localeCompare(String(b.name),'ja'));
  const done=R.length-un.length;
  if(!un.length)return `<div class="unreg ok">選手の登録：<b>${done}/${R.length}人</b>　全員登録済みです</div>`;
  const gr={};un.forEach(p=>(gr[p.grade||0]||(gr[p.grade||0]=[])).push(p));
  const txt=un.filter(p=>!req.has(p.id)).map(p=>p.name).join('、');
  return `<details class="unreg"><summary>選手の登録：<b>${done}/${R.length}人</b>　<span class="tag">未登録 ${un.length}人</span></summary>
<p class="gh">名簿にいるのに、まだアプリに登録（承認）されていない選手です。「申請中」は承認待ちの中にいます。</p>
${Object.keys(gr).sort((a,b)=>b-a).map(g=>`<div class="ug"><small>${+g?g+'年':'学年なし'}</small><div>${gr[g].map(p=>`<span class="un${req.has(p.id)?' rq':''}">${esc(p.name)}${req.has(p.id)?'<i>申請中</i>':''}</span>`).join('')}</div></div>`).join('')}
${txt?`<button class="x" data-cpun data-txt="${esc('まだアプリに登録していない人：'+txt)}">名前をコピー（LINEで声かけ用）</button>`:''}</details>`;
}
function renderUsers(){
  const m=document.querySelector('.tmod.users');if(!m)return;const sh=m.querySelector('.sh');const R=rosterCache||[];
  const ord={pending:0,admin:1,staff:2,medical:3,leader:4,player:5,disabled:6};const L=usersCache.slice().sort((a,b)=>(ord[a.role]??9)-(ord[b.role]??9)||String(a.name).localeCompare(String(b.name),'ja'));
  const linked=new Set(usersCache.filter(u=>NEEDPID.includes(u.role)&&u.pid).map(u=>u.pid));
  const row=u=>{const self=u.uid===ME.uid;return `<div class="u" data-uid="${u.uid}"><div><b>${esc(u.name||'（名前なし）')}</b>${u.title&&NAMED.includes(u.role)?` <small>${esc(u.title)}</small>`:''} ${u.role==='pending'?'<span class="tag">承認待ち</span>':''}<br><small>${esc(u.email)}${u.role==='pending'&&u.requestName?`　申請：${u.requestStaff?'スタッフ（'+esc(u.requestTitle||'')+'）':'選手'} ${esc(u.requestName)}`:''}</small></div>
<div class="r"><select data-role ${self?'disabled':''}>${ROLE_ORDER.map(r=>`<option value="${r}" ${(u.role==='pending'&&u.requestStaff?r===(['トレーナー','マネージャー'].includes(u.requestTitle)?'medical':'staff'):u.role==='pending'&&u.requestPid?r==='player':u.role===r)?'selected':''}>${ROLE_LABEL[r]}</option>`).join('')}</select>
<input class="nm" data-nm value="${esc(u.role==='pending'&&u.requestStaff?u.requestName:(u.name||''))}" placeholder="名前" ${(u.role==='pending'&&u.requestStaff)||NAMED.includes(u.role)?'':'style="display:none"'} ${self?'disabled':''}>
<select data-ti ${(u.role==='pending'&&u.requestStaff)||NAMED.includes(u.role)?'':'style="display:none"'} ${self?'disabled':''}>${TITLES.map(t=>`<option ${(u.title||u.requestTitle)===t?'selected':''}>${t}</option>`).join('')}</select>
<select data-pid ${NEEDPID.includes(u.role)||(u.role==='pending'&&u.requestPid&&!u.requestStaff)?'':'style="display:none"'}><option value="">名簿の名前を選ぶ</option>${R.map(p=>`<option value="${esc(p.id)}" ${(u.pid||u.requestPid)===p.id?'selected':''}>${esc(p.name)}${linked.has(p.id)&&u.pid!==p.id?'（登録済み）':''}</option>`).join('')}</select>
<button class="sv" data-save ${self?'disabled':''}>保存</button>${self?'':'<button class="sv del" data-del>削除</button>'}</div></div>`;};
  const wasOpen=!!sh.querySelector('details.unreg[open]');
  sh.innerHTML=`<div class="hd">メンバー管理<button class="x" data-x>閉じる</button></div><p style="font-size:13px;color:var(--sub);margin:0">権限を選んで「保存」を押します。選手は名簿の名前と結びつけてください。</p>${unregHtml()}${L.map(row).join('')}`;
  sh.querySelector('[data-x]').onclick=()=>m.remove();
  if(wasOpen){const dt=sh.querySelector('details.unreg');if(dt)dt.open=true;}
  const cp=sh.querySelector('[data-cpun]');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(cp.dataset.txt);toast('コピーしました');}catch(e){toast('コピーできませんでした');}};
  sh.querySelectorAll('.u').forEach(el=>{const rs=el.querySelector('[data-role]'),ps=el.querySelector('[data-pid]');
    const ns=el.querySelector('[data-nm]'),ts=el.querySelector('[data-ti]');
    rs.onchange=()=>{ps.style.display=NEEDPID.includes(rs.value)?'':'none';const st=NAMED.includes(rs.value);ns.style.display=st?'':'none';ts.style.display=st?'':'none';};
    el.querySelector('[data-save]').onclick=async()=>{const role=rs.value,pid=NEEDPID.includes(role)?ps.value:'';if(NEEDPID.includes(role)&&!pid){toast('名簿の名前を選んでください');return;}
      const data={role,pid};if(NAMED.includes(role)){const nm=ns.value.trim();if(nm)data.name=nm;data.title=ts.value;}
      else if(NEEDPID.includes(role)){const p=(rosterCache||[]).find(x=>x.id===pid);if(p)data.name=p.name;}
      try{await setDoc(doc(db,'users',el.dataset.uid),data,{merge:true});toast('保存しました');}catch(e){toast('保存できませんでした（'+(e.code||'')+'）');}};
    const dl=el.querySelector('[data-del]');if(dl)dl.onclick=async()=>{const u=usersCache.find(x=>x.uid===el.dataset.uid)||{};if(!confirm(`${u.name||u.email||'このアカウント'}（${u.email||''}）をメンバーから削除しますか？\n\nアプリを使えなくなります。同じGoogleアカウントでまたログインすると、承認待ちから始まります。\nこれまでの入力（コンディションなど）は選手の記録として残ります。`))return;
      try{await deleteDoc(doc(db,'users',el.dataset.uid));toast('削除しました');}catch(e){toast('削除できませんでした（'+(e.code||'')+'）');}};});
}

// ---------- ポジション整理・メンバー選考（team/state） ----------
const KEY='tmu-pos-data';
let baseRev=0,baseJson=null,pushTimer=null,pushing=false,lastRoster='';
const stateRef=()=>doc(db,'team','state');
function rosterOf(st){return (st.players||[]).filter(p=>!p.out).map(p=>({id:p.id,name:p.name,grade:p.grade||0,team:p.team||'',p1:p.p1||''}));}
// 試合 → 振り返り（試合ごとの見出しだけを、全員が読める場所に置く）
async function pushGames(st){if(!FULL.includes(ME.role))return;let old={};try{old=JSON.parse(localStorage.getItem('tmu-rv-games')||'{}');}catch(e){}
  const now={};(st.games||[]).forEach(g=>{if(!g||!g.id||!g.date)return;now[g.id]=JSON.stringify({date:g.date,opp:g.opp||'',type:g.type==='official'?'official':'practice'});});
  for(const id of Object.keys(now)){if(old[id]===now[id])continue;try{await setDoc(doc(db,'reviews',id),{...JSON.parse(now[id]),upd:Date.now()},{merge:true});old[id]=now[id];}catch(e){console.error(e);return;}}
  try{localStorage.setItem('tmu-rv-games',JSON.stringify(old));}catch(e){}}
async function pushRoster(st){pushGames(st);const r=rosterOf(st);const j=JSON.stringify(r);if(j===lastRoster)return;try{await setDoc(doc(db,'team','roster'),{players:r,at:serverTimestamp()});lastRoster=j;}catch(e){}}
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
  onSnapshot(doc(db,'team','inj'),snap=>{if(!snap.exists())return;const m=snap.data().map||{};setTimeout(()=>applyInj(m).catch(e=>console.error(e)),window.__APP_STARTED?0:1500);},()=>{});
  onSnapshot(stateRef(),snap=>{if(!snap.exists())return;const d=snap.data();if(d.client===CLIENT||d.rev<=baseRev)return;
    if(pushing||pushTimer){return;}
    baseRev=d.rev;baseJson=d.json;localStorage.setItem(KEY,d.json);remoteChanged(d.by);},()=>{});
}
async function applyInj(map){let ch=false;await runTransaction(db,async tx=>{const s=await tx.get(stateRef());if(!s.exists())return;const d=s.data();const st=JSON.parse(d.json);
  (st.players||[]).forEach(pl=>{if(!(pl.id in map))return;const on=!!map[pl.id];if(!!pl.inj!==on&&(on||pl.injFromCond)){pl.inj=on;pl.injFromCond=on;ch=true;}});
  if(ch){const rev=d.rev+1;tx.set(stateRef(),{json:JSON.stringify(st),rev,client:CLIENT,by:'コンディション',at:serverTimestamp()});baseRev=rev;baseJson=JSON.stringify(st);}});
  if(ch){localStorage.setItem(KEY,baseJson);remoteChanged('コンディション');}}
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
let lastInj='';
function syncInj(map){if(!CONDS.includes(ME.role))return;clearTimeout(injTimer);injTimer=setTimeout(async()=>{const j=JSON.stringify(map);if(j!==lastInj){try{await setDoc(doc(db,'team','inj'),{map,at:serverTimestamp()});lastInj=j;}catch(e){console.error(e);}}if(!FULL.includes(ME.role))return;try{await runTransaction(db,async tx=>{const s=await tx.get(stateRef());if(!s.exists())return;const d=s.data();const st=JSON.parse(d.json);let ch=false;
  (st.players||[]).forEach(pl=>{if(!(pl.id in map))return;const on=!!map[pl.id];if(!!pl.inj!==on&&(on||pl.injFromCond)){pl.inj=on;pl.injFromCond=on;ch=true;}});
  if(ch)tx.set(stateRef(),{json:JSON.stringify(st),rev:d.rev+1,client:CLIENT,by:ME.email,at:serverTimestamp()});});}catch(e){console.error(e);}},800);}

// ---------- コンディション ----------
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
async function condInit(role,pid,roster){
  const staff=CONDS.includes(role);
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

// ---------- トレーニング ----------
async function trInit(roster){
  const T={},M={};let onRemote=null;
  const watch=(coll,store)=>new Promise((res,rej)=>{let first=true;onSnapshot(collection(db,coll),s=>{const seen=new Set();s.docs.forEach(d=>{seen.add(d.id);store[d.id]={...d.data(),id:d.id};});Object.keys(store).forEach(k=>{if(!seen.has(k))delete store[k];});
    if(first){first=false;res();}else if(onRemote)onRemote();},e=>{if(first){first=false;rej(e);}});});
  await Promise.all([watch('trainings',T),watch('menus',M)]);
  const put=(coll,o)=>{const data=clean(o);delete data.id;data.by=ME.email;data.at=serverTimestamp();return setDoc(doc(db,coll,o.id),data).catch(e=>{console.error(e);toast('保存できませんでした（'+(e.code||'エラー')+'）');});};
  async function loadDay(date){
    try{const [ab,inj,en]=await Promise.all([getDocs(query(collection(db,'absences'),where('date','==',date))),getDocs(collection(db,'injuries')),getDocs(query(collection(db,'entries'),where('ym','==',date.slice(0,7))))]);
      const ent={};en.docs.forEach(d=>{const x=d.data();if(x.d&&x.d[date])ent[x.pid]=x.d[date];});
      return {abs:ab.docs.map(d=>d.data()),inj:inj.docs.map(d=>d.data()).filter(j=>j.active&&j.stage<3&&(!j.date||j.date<=date)),ent};}
    catch(e){console.error(e);toast('コンディションを読み込めませんでした');return {abs:[],inj:[],ent:{}};}}
  return {roster,trainings:T,menus:M,me:ME,loadDay,
    saveTraining:t=>{T[t.id]=t;return put('trainings',t);},deleteTraining:id=>{delete T[id];return deleteDoc(doc(db,'trainings',id)).catch(e=>toast('削除できませんでした'));},
    saveMenu:m=>{M[m.id]=m;return put('menus',m);},deleteMenu:id=>{delete M[id];return deleteDoc(doc(db,'menus',id)).catch(e=>toast('削除できませんでした'));},
    setCount:(t,n)=>{if(n!=null&&t.cnt!==n){t.cnt=n;put('trainings',t);}},
    onRemote:f=>{onRemote=f;}};
}

// ---------- スケジュール ----------
async function schInit(roster){
  const E={},D={},N={},TR={};let onRemote=null;const d0=new Date();const T=dstr(d0);const back=dstr(new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()-7));
  const watch=(q,store,opt)=>new Promise(res=>{let first=true;onSnapshot(q,s=>{const seen=new Set();s.docs.forEach(d=>{seen.add(d.id);store[d.id]={...d.data(),id:d.id};});Object.keys(store).forEach(k=>{if(!seen.has(k))delete store[k];});
    if(first){first=false;res();}else if(onRemote)onRemote();},e=>{console.error(e);if(first){first=false;res();}});});
  const jobs=[watch(query(collection(db,'events'),where('date','>=',back)),E),watch(query(collection(db,'days'),where('date','>=',T)),D),watch(collection(db,'notices'),N)];
  const AB={},IJ={};const live=CONDS.includes(ME.role);
  if(live){jobs.push(watch(query(collection(db,'trainings'),where('date','>=',T)),TR));jobs.push(watch(query(collection(db,'absences'),where('date','>=',T)),AB));jobs.push(watch(collection(db,'injuries'),IJ));}
  await Promise.all(jobs);
  // スタッフはその場で計算（選手は15分ごとの自動処理の結果を見る）
  const calcDay=date=>{const r={date,join:[],late:[],partial:[],rehab:[],inj:[],off:[],absent:[]};const inj=Object.values(IJ).filter(j=>j.active&&j.stage<3);const abs=Object.values(AB);
    // トレーニング画面で手で振り分けた人（休み・ケガ・リハビリ・参加）はそれを優先
    const G={};Object.values(TR).filter(t=>t.date===date&&t.groups).forEach(t=>Object.assign(G,t.groups));
    roster.forEach(p=>{const j=inj.find(x=>x.pid===p.id&&(!x.date||x.date<=date));const a=abs.find(x=>x.pid===p.id&&x.date===date);const g=G[p.id];
      if(g==='X'){r.off.push(p.id);return;}if(g==='I'){r.inj.push(p.id);if(a)r.absent.push(p.id);return;}if(g==='R'){r.rehab.push(p.id);if(a)r.absent.push(p.id);return;}
      if(g){r.join.push(p.id);if(j&&j.stage===2)r.partial.push(p.id);if(a&&a.kind!=='欠席')r.late.push(p.id);return;}
      if(j&&j.stage<2&&a)r.absent.push(p.id);if(j&&j.stage===0)r.inj.push(p.id);else if(j&&j.stage===1)r.rehab.push(p.id);else if(a&&a.kind==='欠席')r.off.push(p.id);
      else{r.join.push(p.id);if(j&&j.stage===2)r.partial.push(p.id);if(a)r.late.push(p.id);}});return r;};
  const dayMap=new Proxy(D,{get:(o,k)=>{if(live&&typeof k==='string'&&k>=T&&k<=dstr(new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+6)))return calcDay(k);return Object.values(o).find(v=>v.date===k);}});
  return {roster,events:E,days:dayMap,notices:N,trainings:CONDS.includes(ME.role)?TR:null,me:ME,canPost:ME.role!=='player',
    saveNotice:async(x,isNew)=>{const data={text:x.text,date:x.date||'',important:!!x.important,byName:isNew?(ME.name||''):(x.byName||ME.name||''),by:isNew?ME.uid:(x.by||ME.uid),at:isNew?Date.now():(x.at||Date.now()),editedBy:ME.uid};N[x.id]={...data,id:x.id};try{await setDoc(doc(db,'notices',x.id),data);}catch(e){console.error(e);toast('保存できませんでした（'+(e.code||'')+'）');}},
    deleteNotice:async id=>{delete N[id];try{await deleteDoc(doc(db,'notices',id));}catch(e){toast('削除できませんでした');}},
    onRemote:f=>{onRemote=f;}};
}

// ---------- ホーム ----------
// 開いたときに今日の分だけを1回読む（ずっと見張らないので軽い）
async function hmInit(roster){
  const d0=new Date();const T=dstr(d0);const ym=T.slice(0,7);const isStaffR=CONDS.includes(ME.role);const pid=ME.pid||'';
  const safe=async(f,dflt)=>{try{return await f();}catch(e){console.error(e);return dflt;}};
  const docs=s=>s.docs.map(d=>({...d.data(),id:d.id}));
  const [ev,day,nt,rv,rooms]=await Promise.all([
    safe(async()=>docs(await getDocs(query(collection(db,'events'),where('date','==',T)))),[]),
    safe(async()=>{const s=await getDoc(doc(db,'days',T));return s.exists()?s.data():null;},null),
    safe(async()=>docs(await getDocs(query(collection(db,'notices'),orderBy('at','desc'),limit(6)))),[]),
    safe(async()=>docs(await getDocs(query(collection(db,'reviews'),orderBy('date','desc'),limit(4)))),[]),
    safe(async()=>docs(await getDocs(query(collection(db,'rooms'),where('members','array-contains',ME.uid)))),[])]);
  const out={roster,me:ME,T,events:ev,day,notices:nt,reviews:rv,rooms,isStaff:isStaffR,isFull:FULL.includes(ME.role),isPlayer:NEEDPID.includes(ME.role)&&!!pid,
    openUsers:ME.role==='admin'?()=>openUsers():null};
  if(out.isPlayer){const me=roster.find(p=>p.id===pid);out.myName=me?me.name:(ME.name||'');
    const [en,ab]=await Promise.all([safe(async()=>{const s=await getDoc(doc(db,'entries',pid+'_'+ym));return s.exists()?((s.data().d||{})[T]||{}):{};},{}),
      safe(async()=>docs(await getDocs(query(collection(db,'absences'),where('pid','==',pid),where('date','==',T)))),[])]);
    out.today=en;out.absence=ab[0]||null;}
  else out.myName=ME.name||'';
  if(isStaffR){const [rp,ens,tr]=await Promise.all([safe(async()=>docs(await getDocs(query(collection(db,'reports'),where('status','==','new')))),[]),
      safe(async()=>docs(await getDocs(query(collection(db,'entries'),where('ym','==',ym)))),[]),
      safe(async()=>docs(await getDocs(query(collection(db,'trainings'),where('date','==',T)))),[])]);
    out.newReports=rp;const done=new Set(ens.filter(e=>((e.d||{})[T]||{}).am).map(e=>e.pid));out.amMissing=roster.filter(p=>!done.has(p.id));out.trainings=tr;}
  if(ME.role==='admin')out.pending=await safe(async()=>(await getDocs(query(collection(db,'users'),where('role','==','pending')))).docs.length,0);
  return out;
}

// ---------- メッセージ（1対1） ----------
// メッセージの相手を選ぶための名簿（名前・学年・役割だけ）。監督の端末が、承認済みのメンバーから作る
let lastDir='';
async function pushDir(){try{rosterCache=rosterCache||await getRoster();}catch(e){}
  const R=rosterCache||[];const list=usersCache.filter(u=>['admin','staff','leader','medical','player'].includes(u.role)).map(u=>{const p=u.pid?R.find(x=>x.id===u.pid):null;
    return {uid:u.uid,name:p?p.name:(u.name||u.email||''),title:u.title||'',role:u.role,grade:p?p.grade||0:0,team:p?p.team||'':''};}).sort((a,b)=>a.uid.localeCompare(b.uid));
  const j=JSON.stringify(list);if(j===lastDir)return;try{await setDoc(doc(db,'team','dir'),{list,at:Date.now()});lastDir=j;}catch(e){console.error(e);}}
async function chInit(){
  let dir=[];try{const s=await getDoc(doc(db,'team','dir'));dir=(s.data()||{}).list||[];}catch(e){console.error(e);}
  const R={};let onRooms=null,unsubM=null;
  await new Promise(res=>{let first=true;onSnapshot(query(collection(db,'rooms'),where('members','array-contains',ME.uid)),s=>{const seen=new Set();s.docs.forEach(d=>{seen.add(d.id);R[d.id]={...d.data(),id:d.id};});Object.keys(R).forEach(k=>{if(!seen.has(k))delete R[k];});
    if(first){first=false;res();}else if(onRooms)onRooms();},e=>{console.error(e);if(first){first=false;res();}});});
  const me=dir.find(x=>x.uid===ME.uid);const myName=me?me.name:(ME.name||'');
  const ridOf=o=>[ME.uid,o].sort().join('_');
  const msgs=rid=>collection(db,'rooms',rid,'msgs');
  return {me:ME,dir:dir.filter(x=>x.uid!==ME.uid),rooms:R,myName,ridOf,
    onRooms:f=>{onRooms=f;},
    ensure:async o=>{const rid=ridOf(o.uid);const mem=[ME.uid,o.uid].sort();if(!R[rid])await setDoc(doc(db,'rooms',rid),{members:mem,names:{[ME.uid]:myName,[o.uid]:o.name},lastAt:0,read:{},block:[]},{merge:true});return rid;},
    open:(rid,n,cb)=>{if(unsubM)unsubM();unsubM=onSnapshot(query(msgs(rid),orderBy('at','desc'),limit(n)),s=>cb(s.docs.map(d=>({...d.data(),id:d.id})).reverse(),s.docs.length>=n),e=>{console.error(e);cb(null,false);});},
    close:()=>{if(unsubM){unsubM();unsubM=null;}},
    send:async(rid,text)=>{const at=Date.now();await setDoc(doc(msgs(rid)),{by:ME.uid,text,at});await updateDoc(doc(db,'rooms',rid),{lastAt:at,lastBy:ME.uid,lastText:text.slice(0,60),['read.'+ME.uid]:at,['names.'+ME.uid]:myName});},
    del:async(rid,id)=>{await deleteDoc(doc(db,'rooms',rid,'msgs',id));},
    read:async rid=>{try{await updateDoc(doc(db,'rooms',rid),{['read.'+ME.uid]:Date.now()});}catch(e){}},
    block:async(rid,on)=>{await updateDoc(doc(db,'rooms',rid),{block:on?arrayUnion(ME.uid):arrayRemove(ME.uid)});},
    // グループ
    createGroup:async(title,ps)=>{const rid='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);const at=Date.now();const names={[ME.uid]:myName};ps.forEach(p=>names[p.uid]=p.name);
      await setDoc(doc(db,'rooms',rid),{type:'group',title,owner:ME.uid,members:[ME.uid,...ps.map(p=>p.uid)],names,lastAt:at,lastBy:ME.uid,lastText:'グループを作りました',read:{[ME.uid]:at}});return rid;},
    addMembers:async(rid,ps)=>{const x={members:arrayUnion(...ps.map(p=>p.uid))};ps.forEach(p=>x['names.'+p.uid]=p.name);await updateDoc(doc(db,'rooms',rid),x);},
    removeMember:async(rid,uid)=>{await updateDoc(doc(db,'rooms',rid),{members:arrayRemove(uid)});},
    rename:async(rid,title)=>{await updateDoc(doc(db,'rooms',rid),{title});},
    leave:async(rid)=>{const r=R[rid];const x={members:arrayRemove(ME.uid)};if(r&&r.owner===ME.uid){const nx=(r.members||[]).find(u=>u!==ME.uid);if(nx)x.owner=nx;}await updateDoc(doc(db,'rooms',rid),x);}};
}

// ---------- 振り返り ----------
async function rvInit(roster){
  const M={};let onMeta=null,unsubT=null;
  // スタッフが開いたときは、試合の一覧を最新にしておく
  if(FULL.includes(ME.role)){try{const s=await getDoc(stateRef());if(s.exists())await pushGames(JSON.parse(s.data().json||'{}'));}catch(e){console.error(e);}}
  await new Promise(res=>{let first=true;onSnapshot(query(collection(db,'reviews'),orderBy('date','desc'),limit(60)),s=>{const seen=new Set();s.docs.forEach(d=>{seen.add(d.id);M[d.id]={...d.data(),id:d.id};});Object.keys(M).forEach(k=>{if(!seen.has(k))delete M[k];});
    if(first){first=false;res();}else if(onMeta)onMeta();},e=>{console.error(e);if(first){first=false;res();}});});
  const me=roster.find(p=>p.id===ME.pid);const title=(ME.raw&&ME.raw.title)||'';
  const myName=me?me.name:(ME.name||'スタッフ')+(title?'（'+title+'）':'');
  const posts=gid=>collection(db,'reviews',gid,'posts');
  const bump=async(gid,n)=>{try{await updateDoc(doc(db,'reviews',gid),{...(n?{n:increment(n)}:{}),last:Date.now()});}catch(e){}};
  return {roster,metas:M,me:ME,myName,myGrade:me?me.grade:0,myTeam:me?me.team:'',canMod:FULL.includes(ME.role),
    onMeta:f=>{onMeta=f;},
    open:(gid,n,cb)=>{if(unsubT)unsubT();unsubT=onSnapshot(query(posts(gid),orderBy('at','desc'),limit(n)),s=>cb(s.docs.map(d=>({...d.data(),id:d.id})),s.docs.length>=n),e=>{console.error(e);cb(null,false);});},
    close:()=>{if(unsubT){unsubT();unsubT=null;}},
    add:async(gid,x)=>{const ref=doc(posts(gid));await setDoc(ref,{...x,uid:ME.uid,name:myName,grade:me?me.grade:0,staff:!me,at:Date.now(),replies:[]});bump(gid,1);},
    edit:async(gid,id,x)=>{await updateDoc(doc(db,'reviews',gid,'posts',id),{...x,edited:Date.now()});},
    del:async(gid,id)=>{await deleteDoc(doc(db,'reviews',gid,'posts',id));bump(gid,-1);},
    reply:async(gid,id,text)=>{await updateDoc(doc(db,'reviews',gid,'posts',id),{replies:arrayUnion({id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),uid:ME.uid,name:myName,staff:!me,text,at:Date.now()})});bump(gid,0);},
    unreply:async(gid,id,r)=>{await updateDoc(doc(db,'reviews',gid,'posts',id),{replies:arrayRemove(r)});},
    setMeta:async(gid,x)=>{await setDoc(doc(db,'reviews',gid),x,{merge:true});}};
}

window.TMU={statePush,toast,get me(){return ME;}};
