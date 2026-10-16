import './style.css';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set, update, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBjRZZr5uMPrKgysuUm0zWBikURiwQzC8M',
  authDomain: 'zikr-garden-mansoor-2026.firebaseapp.com',
  databaseURL: 'https://zikr-garden-mansoor-2026-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'zikr-garden-mansoor-2026',
  appId: '1:1028960015584:web:398aca050ac1d5bb00ec85'
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = (s) => document.querySelector(s);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const nextDate = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day + 1);
  return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
};
const niceDate = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('en-US', {day:'numeric',month:'short',year:'numeric'});
const number = (v) => Number(v || 0).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors = ['#e9f1e7','#f9eedc','#e7f0f5','#f4e8eb','#f0ebfa'];
const inks = ['#2a7656','#b18a40','#477e99','#b36f7f','#8671af'];
const icons = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5M15 12H3M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>'
};
let user = null, unsubscribe = null, data = {categories:{}, entries:{}, targets:{}};
let view = 'today', modal = null, authMode = 'login', filter = 'all', toastTimer;
let selectedColor = 0;
const cats = () => Object.entries(data.categories || {}).map(([id,v])=>({id,...v})).filter(x=>!x.archived).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
const entries = () => Object.entries(data.entries || {}).map(([id,v])=>({id,...v})).sort((a,b)=> b.date.localeCompare(a.date) || (b.createdAt||0)-(a.createdAt||0));
const latestEntryFor = (categoryId) => entries().find(entry => entry.categoryId === categoryId);
function suggestedEntry(categoryId) {
  const previous = latestEntryFor(categoryId);
  const next = previous && previous.date < today() ? nextDate(previous.date) : today();
  return { previous, date: next > today() ? today() : next, count: previous?.count ?? '', note: previous?.note ?? '' };
}
const targets = () => Object.entries(data.targets || {}).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
const category = (id) => data.categories?.[id];
const countFor = (id, since='0000-01-01') => entries().filter(e=>e.categoryId===id && e.date>=since).reduce((n,e)=>n+Number(e.count||0),0);
const progressFor = (t) => countFor(t.categoryId,t.startDate || '0000-01-01');
const iconBox = (c, mark='✦') => `<span class="cat-icon" style="background:${colors[c?.color||0]};color:${inks[c?.color||0]}">${mark}</span>`;
function notify(msg){$('.toast')?.remove(); const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),3200);}
function authMessage(error){const code=error?.code||'';return ({'auth/email-already-in-use':'This email already has an account. Please log in.','auth/invalid-email':'Please enter a valid email address.','auth/weak-password':'Password should have at least 6 characters.','auth/invalid-credential':'Email or password is incorrect.','auth/too-many-requests':'Too many attempts. Please try again later.'})[code] || 'Something went wrong. Please try again.';}
function renderAuth(){
  const signup=authMode==='signup',reset=authMode==='reset';
  $('#app').innerHTML=`<main class="auth-layout"><section class="auth-art"><div class="brand"><span class="brand-mark">✦</span>Noor<span style="color:#e2c581">.</span></div><div class="auth-copy"><div class="eyebrow">Your daily zikr companion</div><h1>Every zikr<br>is a step <em>closer.</em></h1><p>A peaceful space to record your daily recitations, stay consistent, and see how far you have come.</p></div><div class="auth-quote"><span></span>فَاذْكُرُونِي أَذْكُرْكُمْ</div></section><section class="auth-panel"><div class="auth-card"><div class="brand auth-mobile-brand"><span class="brand-mark">✦</span>Noor<span style="color:#c9a45c">.</span></div><span class="pill">✦ &nbsp; A little progress, every day</span><h2>${reset?'Reset password':signup?'Create your account':'Welcome back'}</h2><p class="muted auth-sub">${reset?'We will send a password reset link to your email.':signup?'Start your personal zikr journey today.':'Log in to continue your daily zikr journey.'}</p><form id="auth-form"><div class="field"><label for="email">Email address</label><input id="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>${reset?'':`<div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="At least 6 characters" minlength="6" required></div>`}<div id="auth-error"></div><button class="primary-btn full" type="submit">${reset?'Send reset link':signup?'Create account':'Log in'} <span>→</span></button></form><p class="auth-switch">${reset?'<button class="link-btn" data-auth="login">Back to log in</button>':signup?'Already have an account? <button class="link-btn" data-auth="login">Log in</button>':'New here? <button class="link-btn" data-auth="signup">Create an account</button>'}</p>${!reset&&!signup?'<p class="auth-switch" style="margin-top:9px"><button class="link-btn" data-auth="reset">Forgot password?</button></p>':''}<div class="auth-note"><span>🔒</span><span>Your entries are saved to your own private account. Only you can access them.</span></div></div></section></main>`;
  $('#auth-form').addEventListener('submit',async(e)=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;const email=$('#email').value.trim(),password=$('#password')?.value;try{if(reset){await sendPasswordResetEmail(auth,email);notify('Reset link sent. Check your email.');authMode='login';renderAuth();}else if(signup){await createUserWithEmailAndPassword(auth,email,password);}else{await signInWithEmailAndPassword(auth,email,password);}}catch(err){$('#auth-error').innerHTML=`<div class="auth-error">${esc(authMessage(err))}</div>`;}finally{btn.disabled=false;}});
  document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>{authMode=b.dataset.auth;renderAuth();});
}
function header(){const name=user.email?.split('@')[0]||'Friend',initial=name[0]?.toUpperCase()||'N';return `<aside class="sidebar"><div class="brand"><span class="brand-mark">✦</span>Noor<span style="color:#c9a45c">.</span></div><div class="side-label">Your space</div><nav class="nav">${navBtn('today',icons.home,'Overview')}${navBtn('activity',icons.book,'Activity log')}${navBtn('targets',icons.target,'My targets')}</nav><div class="side-bottom"><div class="side-card"><div class="arabic">الحمد لله</div><p>Small steps, taken with sincerity, can become a beautiful habit.</p></div><div class="user-tile"><div class="avatar">${esc(initial)}</div><div class="user-details"><strong>${esc(name)}</strong><span>Personal account</span></div><button class="icon-btn" id="logout" title="Log out" aria-label="Log out">${icons.logout}</button></div></div></aside><div class="main"><div class="mobile-top"><div class="brand"><span class="brand-mark">✦</span>Noor<span style="color:#c9a45c">.</span></div><button class="avatar" id="mobile-logout" title="Log out" aria-label="Log out">${esc(initial)}</button></div><div class="topbar"><div class="breadcrumb">Your space &nbsp;/&nbsp; <strong>${view==='today'?'Overview':view==='activity'?'Activity log':'My targets'}</strong></div><div class="top-actions"><span class="date-pill">${icons.calendar} ${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span><button class="primary-btn" data-modal="entry">${icons.plus} Add count</button></div></div><div class="content">`;
}
function navBtn(v,icon,label){return `<button class="nav-btn ${view===v?'active':''}" data-view="${v}">${icon}${label}</button>`;}
function footer(){return `</div></div><nav class="mobile-nav"><button data-view="today" class="${view==='today'?'active':''}">${icons.home}<span>Home</span></button><button data-view="activity" class="${view==='activity'?'active':''}">${icons.book}<span>Activity</span></button><button class="mobile-add" data-modal="entry" aria-label="Add count">${icons.plus}</button><button data-view="targets" class="${view==='targets'?'active':''}">${icons.target}<span>Targets</span></button><button data-modal="summary">${icons.grid}<span>Totals</span></button></nav>`;}
function stats(){const es=entries();const total=es.reduce((n,e)=>n+Number(e.count||0),0);const daily=es.filter(e=>e.date===today()).reduce((n,e)=>n+Number(e.count||0),0);const active=targets().filter(t=>t.status==='active').length;return `<div class="stat-grid"><div class="stat-card"><div><span class="stat-label">Today's count</span><strong>${number(daily)}</strong></div><div class="stat-icon">${icons.spark}</div></div><div class="stat-card"><div><span class="stat-label">All-time total</span><strong>${number(total)}</strong></div><div class="stat-icon gold">${icons.grid}</div></div><div class="stat-card"><div><span class="stat-label">Active targets</span><strong>${number(active)}</strong></div><div class="stat-icon blue">${icons.target}</div></div></div>`;}
function categoriesPanel(){const list=cats();return `<section class="panel"><div class="panel-head"><div><h2>Your zikr categories</h2><p>Everything you are keeping count of</p></div><button class="text-action" data-modal="summary">Calculate all →</button></div><div class="category-list">${list.length?list.map(c=>`<div class="category-row">${iconBox(c)}<div class="cat-info"><strong>${esc(c.name)}</strong><span>${number(countFor(c.id))} total recitations</span></div><div class="cat-count">${number(countFor(c.id))}</div><div class="row-actions"><button class="mini-action" data-modal="category:${esc(c.id)}" aria-label="Edit ${esc(c.name)}">Edit</button><button class="mini-action danger-text" data-modal="delete-category:${esc(c.id)}" aria-label="Delete ${esc(c.name)}">Delete</button></div></div>`).join(''):`<div class="empty"><div class="empty-symbol">✦</div>Create your first category, like Darood Shareef or Astaghfar.</div>`}</div><button class="add-inline" data-modal="category">＋ &nbsp; Add a category</button></section>`;}
function goalCard(t,withActions=false){const c=category(t.categoryId),done=progressFor(t),remaining=Math.max(0,Number(t.goal)-done),pct=Math.min(100,Math.round(done/Number(t.goal)*100));const badge=t.status==='archived'?'Archived':t.status==='paused'?'Paused':t.status==='completed'||pct>=100?'Goal reached':'In progress';return `<div class="goal-card"><div class="goal-top"><div><strong>${esc(c?.name||'Removed category')}</strong><p>${t.deadline?'Due '+niceDate(t.deadline):'Started '+niceDate(t.startDate||today())}</p></div><span class="badge ${badge==='Goal reached'?'done':t.status==='paused'?'paused':''}">${badge}</span></div><div class="goal-numbers"><strong>${number(done)} <span style="font-size:12px;color:#9aaa9d;font-weight:500">/ ${number(t.goal)}</span></strong><span>${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div><div class="goal-foot"><span>${remaining===0?'Target achieved ✓':`${number(remaining)} remaining`}</span><span>${t.status==='archived'?'Finished':t.status==='paused'?'On hold':pct>=100?'MashaAllah':'Keep going ✦'}</span></div>${withActions?`<div class="goal-actions">${t.status==='active'?`<button class="soft-btn" data-target-action="${pct>=100?'complete':'pause'}:${esc(t.id)}">${pct>=100?'Mark complete':'Pause'}</button>`:''}${t.status==='paused'?`<button class="soft-btn" data-target-action="resume:${esc(t.id)}">Resume</button>`:''}${t.status!=='archived'?`<button class="outline-btn" data-target-action="archive:${esc(t.id)}">Archive</button>`:`<button class="outline-btn" data-target-action="resume:${esc(t.id)}">Restore</button>`}<button class="outline-btn" data-modal="target:${esc(t.id)}">Edit</button><button class="danger-btn" data-modal="delete-target:${esc(t.id)}">Delete</button></div>`:''}</div>`;}
function goalsPanel(){const list=targets().filter(t=>t.status==='active').slice(0,2);return `<section class="panel"><div class="panel-head"><div><h2>Your targets</h2><p>A little closer, every day</p></div><button class="text-action" data-view="targets">View all →</button></div><div class="goal-list">${list.length?list.map(t=>goalCard(t)).join(''):`<div class="empty"><div class="empty-symbol">◎</div>Set a target and watch your progress grow.</div>`}</div><button class="add-inline" data-modal="target">＋ &nbsp; Set a target</button></section>`;}
function recentPanel(){const list=entries().slice(0,5);return `<section class="panel section-space"><div class="panel-head"><div><h2>Recent activity</h2><p>Your latest entries</p></div><button class="text-action" data-view="activity">View all →</button></div>${entryList(list)}</section>`;}
function entryList(list){return list.length?`<div class="activity-list">${list.map(e=>`<div class="entry-row">${iconBox(category(e.categoryId))}<div class="entry-main"><strong>${esc(category(e.categoryId)?.name||'Removed category')}</strong><p>${niceDate(e.date)}${e.note?' · '+esc(e.note):''}</p></div><span class="entry-count">+${number(e.count)}</span><div class="row-actions"><button class="mini-action" data-modal="entry:${esc(e.id)}" aria-label="Edit entry">Edit</button><button class="mini-action danger-text" data-modal="delete-entry:${esc(e.id)}" aria-label="Delete entry">Delete</button></div></div>`).join('')}</div>`:`<div class="empty"><div class="empty-symbol">✦</div>No entries yet. Add your first count whenever you are ready.</div>`;}
function overview(){return `<div class="page-head"><div><h1>Assalamu Alaikum ✦</h1><p>Here is a gentle look at your zikr journey.</p></div></div><section class="hero"><div class="hero-copy"><span class="eyebrow">Today is a fresh beginning</span><h2>Make today count.</h2><p>Every recitation matters. Record yours as you go.</p></div><div class="hero-arabic">بِسْمِ اللَّهِ</div></section>${stats()}<div class="two-cols">${categoriesPanel()}${goalsPanel()}</div>${recentPanel()}`;}
function activity(){const list=entries().filter(e=>filter==='all'||e.categoryId===filter);return `<div class="page-head"><div><h1>Activity log</h1><p>All your recitations, in one place.</p></div><button class="primary-btn" data-modal="entry">${icons.plus} Add count</button></div>${stats()}<div class="panel"><div class="panel-head"><div><h2>Entries</h2><p>${number(list.length)} recorded entries</p></div><button class="text-action" data-modal="summary">Calculate all →</button></div><div class="filter-row"><button class="chip ${filter==='all'?'active':''}" data-filter="all">All categories</button>${cats().map(c=>`<button class="chip ${filter===c.id?'active':''}" data-filter="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>${entryList(list)}</div><section class="panel section-space manage-panel"><div class="panel-head"><div><h2>Manage your data</h2><p>Choose what you want to clear from this account.</p></div></div><div class="manage-actions"><div><strong>Reset all counts</strong><p>Delete every count entry. Categories and targets stay; progress resets and completed targets reopen.</p></div><button class="outline-btn" data-modal="reset-entries">Reset counts</button></div><div class="manage-actions"><div><strong>Reset everything</strong><p>Delete all categories, count entries, and targets from this account.</p></div><button class="danger-btn" data-modal="reset-all">Reset all</button></div></section>`;}
function goals(){const all=targets(),active=all.filter(t=>t.status==='active'),other=all.filter(t=>t.status!=='active');return `<div class="page-head"><div><h1>My targets</h1><p>Set your intention. See your progress.</p></div><button class="primary-btn" data-modal="target">${icons.plus} New target</button></div><section class="panel"><div class="panel-head"><div><h2>Active targets</h2><p>${number(active.length)} targets in progress</p></div></div>${active.length?`<div class="wide-list">${active.map(t=>goalCard(t,true)).join('')}</div>`:`<div class="empty"><div class="empty-symbol">◎</div>No active targets yet. Start with a number that feels right for you.</div>`}</section>${other.length?`<section class="panel section-space"><div class="panel-head"><div><h2>Paused & archived</h2><p>Your previous targets stay here</p></div></div><div class="wide-list">${other.map(t=>goalCard(t,true)).join('')}</div></section>`:''}`;}
function render(){if(!user){renderAuth();return;}$('#app').innerHTML=`<div class="shell">${header()}${view==='today'?overview():view==='activity'?activity():goals()}${footer()}</div>`;wire();if(modal)renderModal();}
function wire(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;filter='all';render();window.scrollTo(0,0)});document.querySelectorAll('[data-modal]').forEach(b=>b.onclick=()=>{modal=b.dataset.modal;renderModal()});document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});document.querySelectorAll('[data-target-action]').forEach(b=>b.onclick=()=>targetAction(b.dataset.targetAction));$('#logout')?.addEventListener('click',()=>signOut(auth));$('#mobile-logout')?.addEventListener('click',()=>signOut(auth));}
function renderModal(){document.querySelector('.modal-backdrop')?.remove();if(!modal)return;const [kind,id]=modal.split(':');let html='';if(kind==='entry')html=entryModal(id);if(kind==='category')html=categoryModal(id);if(kind==='target')html=targetModal(id);if(kind==='summary')html=summaryModal();if(kind.startsWith('delete-')||kind.startsWith('reset-'))html=confirmModal(kind,id);const el=document.createElement('div');el.className='modal-backdrop';el.innerHTML=`<div class="modal" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target===el)closeModal()});el.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);el.querySelector('form')?.addEventListener('submit',kind.startsWith('delete-')||kind.startsWith('reset-')?confirmAction:saveModal);el.querySelectorAll('[data-switch-modal]').forEach(b=>b.onclick=()=>{modal=b.dataset.switchModal;renderModal()});el.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{selectedColor=Number(b.dataset.color);el.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('selected',Number(x.dataset.color)===selectedColor))});if(kind==='entry'&&!id){const form=el.querySelector('form');form?.elements.categoryId.addEventListener('change',()=>refreshEntrySuggestion(form));el.querySelector('#entry-today')?.addEventListener('click',()=>{form.elements.date.value=today()})}el.querySelector('input,select')?.focus();}
function modalHead(title,subtitle){return `<div class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-btn" data-close aria-label="Close">${icons.close}</button></div>`;}
function previousEntryText(previous) {
  if (!previous) return '<strong>No previous entry</strong><span>Enter your first count for this category.</span>';
  return `<strong>Previous entry: ${niceDate(previous.date)} · ${number(previous.count)}</strong><span>Count and note are copied below. You can change them before saving.</span>`;
}
function entryModal(id){
  const existing = id ? data.entries?.[id] : null;
  const available = cats();
  const latestActive = entries().find(entry => available.some(c => c.id === entry.categoryId));
  const selectedId = existing?.categoryId || latestActive?.categoryId || available[0]?.id || '';
  const suggestion = id ? null : suggestedEntry(selectedId);
  const count = existing?.count ?? suggestion?.count ?? '';
  const date = existing?.date || suggestion?.date || today();
  const note = existing?.note ?? suggestion?.note ?? '';
  return `${modalHead(id?'Edit count':'Add your count',id?'Correct this saved entry.':'Previous details are ready for your next entry.')}
    <form data-kind="entry" data-id="${esc(id||'')}">
      <div class="field"><label for="entry-category">Category</label><select id="entry-category" name="categoryId" required>
        <option value="">Choose a category</option>
        ${available.map(c=>`<option value="${esc(c.id)}" ${selectedId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
      </select></div>
      ${available.length?'':'<p class="inline-error">Create a category first, then add a count.</p>'}
      ${id?'':`<div class="previous-entry" id="previous-entry" aria-live="polite">${previousEntryText(suggestion?.previous)}</div>`}
      <div class="form-grid">
        <div class="field"><label for="entry-count">How many?</label><input id="entry-count" name="count" type="number" min="1" step="1" inputmode="numeric" placeholder="e.g. 100" value="${esc(count)}" required></div>
        <div class="field"><div class="field-label-row"><label for="entry-date">Date</label>${id?'':'<button type="button" class="link-btn date-shortcut" id="entry-today">Today</button>'}</div><input id="entry-date" name="date" type="date" value="${esc(date)}" max="${today()}" required></div>
      </div>
      <div class="field"><label for="entry-note">Note <span class="muted">(optional)</span></label><input id="entry-note" name="note" maxlength="120" placeholder="A small note for yourself" value="${esc(note)}"></div>
      <div class="actions"><button type="button" class="outline-btn" data-close>Cancel</button><button class="primary-btn" ${available.length?'':'disabled'} type="submit">${id?'Save changes':'Save new entry'}</button></div>
      ${id?`<button type="button" class="link-btn danger-text" style="margin-top:12px" data-switch-modal="delete-entry:${esc(id)}">Delete this entry</button>`:''}
    </form>`;
}
function refreshEntrySuggestion(form){
  const suggestion=suggestedEntry(form.elements.categoryId.value);
  form.elements.count.value=suggestion.count;
  form.elements.date.value=suggestion.date;
  form.elements.note.value=suggestion.note;
  form.querySelector('#previous-entry').innerHTML=previousEntryText(suggestion.previous);
}
function categoryModal(id){const c=id?data.categories?.[id]:null;selectedColor=c?.color||0;return `${modalHead(id?'Edit category':'New category','Give your zikr a name you will recognize.')}<form data-kind="category" data-id="${esc(id||'')}"><div class="field"><label for="category-name">Category title</label><input id="category-name" name="name" maxlength="50" placeholder="e.g. Darood Shareef" value="${esc(c?.name||'')}" required></div><div class="field"><label>Choose a color</label><div class="color-row">${colors.map((x,i)=>`<button type="button" class="color-choice ${selectedColor===i?'selected':''}" data-color="${i}" style="background:${x}" aria-label="Color ${i+1}"></button>`).join('')}</div></div><div class="actions"><button type="button" class="outline-btn" data-close>Cancel</button><button class="primary-btn" type="submit">${id?'Save changes':'Create category'}</button></div>${id?`<button type="button" class="link-btn danger-text" style="margin-top:12px" data-switch-modal="delete-category:${esc(id)}">Delete this category</button>`:''}</form>`;}
function targetModal(id){const t=id?data.targets?.[id]:null;return `${modalHead(id?'Edit target':'Set a target','Your progress will update as you add counts.')}<form data-kind="target" data-id="${esc(id||'')}"><div class="field"><label for="target-category">Category</label><select id="target-category" name="categoryId" required><option value="">Choose a category</option>${cats().map(c=>`<option value="${esc(c.id)}" ${t?.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>${cats().length?'':`<p class="inline-error">Create a category first, then set a target.</p>`}<div class="field"><label for="target-goal">Target count</label><input id="target-goal" name="goal" type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 1000" value="${esc(t?.goal||'')}" required></div><div class="form-grid"><div class="field"><label for="target-start">Count from</label><input id="target-start" name="startDate" type="date" value="${esc(t?.startDate||today())}" max="${today()}" required></div><div class="field"><label for="target-deadline">Finish by <span class="muted">(optional)</span></label><input id="target-deadline" name="deadline" type="date" value="${esc(t?.deadline||'')}"></div></div><div class="actions"><button type="button" class="outline-btn" data-close>Cancel</button><button class="primary-btn" ${cats().length?'':'disabled'} type="submit">${id?'Save changes':'Set target'}</button></div>${id?`<button type="button" class="link-btn danger-text" style="margin-top:12px" data-switch-modal="delete-target:${esc(id)}">Delete this target</button>`:''}</form>`;}
function summaryModal(){const total=entries().reduce((n,e)=>n+Number(e.count||0),0),daily=entries().filter(e=>e.date===today()).reduce((n,e)=>n+Number(e.count||0),0);return `${modalHead('Your totals','Everything you have recorded so far.')}<div class="sum-card"><p>All-time recitations</p><strong>${number(total)}</strong><p style="margin-top:5px">${number(daily)} added today</p></div><div class="panel-head" style="margin-bottom:7px"><h2>By category</h2></div>${cats().length?cats().map(c=>`<div class="sum-row"><span>${esc(c.name)}</span><strong>${number(countFor(c.id))}</strong></div>`).join(''):'<div class="empty">No categories yet.</div>'}<div class="actions"><button class="primary-btn full" data-close>Done</button></div>`;}
function confirmModal(kind,id){
  let title='',description='',label='Delete',typed=false;
  if(kind==='delete-entry'){
    const entry=data.entries?.[id];
    title='Delete this entry?';
    description=`The ${number(entry?.count)} count for ${esc(category(entry?.categoryId)?.name||'this category')} will be removed from your totals and targets.`;
  }else if(kind==='delete-category'){
    const linkedEntries=entries().filter(e=>e.categoryId===id).length;
    const linkedTargets=targets().filter(t=>t.categoryId===id).length;
    title='Delete this category?';
    description=`${esc(category(id)?.name||'This category')} and its ${number(linkedEntries)} count entries and ${number(linkedTargets)} targets will be deleted together.`;
  }else if(kind==='delete-target'){
    title='Delete this target?';
    description=`This target for ${esc(category(data.targets?.[id]?.categoryId)?.name||'this category')} will be removed. Your count entries will stay.`;
  }else if(kind==='reset-entries'){
    title='Reset all counts?';
    description=`This will delete all ${number(entries().length)} count entries. Categories and targets stay; progress returns to zero and completed targets reopen.`;
    label='Reset counts';typed=true;
  }else{
    title='Reset everything?';
    description=`This will delete ${number(cats().length)} categories, ${number(entries().length)} count entries, and ${number(targets().length)} targets from this account.`;
    label='Reset all data';typed=true;
  }
  return `${modalHead(title,'Please review this action carefully.')}<form data-kind="confirm" data-action="${esc(kind)}" data-id="${esc(id||'')}"><div class="warning-box"><strong>This cannot be undone.</strong><p>${description}</p></div>${typed?'<div class="field"><label for="confirm-word">Type RESET to continue</label><input id="confirm-word" name="confirmWord" autocomplete="off" placeholder="RESET" pattern="RESET" required></div>':''}<div class="actions"><button type="button" class="outline-btn" data-close>Cancel</button><button class="danger-btn" type="submit">${label}</button></div></form>`;
}
async function confirmAction(event){
  event.preventDefault();
  const form=event.currentTarget,action=form.dataset.action,id=form.dataset.id;
  if(action.startsWith('reset-')&&form.elements.confirmWord?.value!=='RESET')return notify('Please type RESET exactly.');
  const button=form.querySelector('[type=submit]');button.disabled=true;
  const base=`users/${user.uid}`;
  try{
    closeModal();
    if(action==='delete-entry')await remove(ref(db,`${base}/entries/${id}`));
    else if(action==='delete-target')await remove(ref(db,`${base}/targets/${id}`));
    else if(action==='delete-category'){
      const changes={ [`categories/${id}`]:null };
      entries().filter(e=>e.categoryId===id).forEach(e=>{changes[`entries/${e.id}`]=null});
      targets().filter(t=>t.categoryId===id).forEach(t=>{changes[`targets/${t.id}`]=null});
      await update(ref(db,base),changes);
      if(filter===id)filter='all';
    }else if(action==='reset-entries'){
      const changes={entries:null};
      targets().filter(t=>t.status==='completed').forEach(t=>{changes[`targets/${t.id}/status`]='active'});
      await update(ref(db,base),changes);
    }
    else if(action==='reset-all'){await remove(ref(db,base));filter='all';}
    notify(action==='reset-all'?'All data reset.':action==='reset-entries'?'All counts reset.':'Deleted successfully.');
  }catch(error){notify('Could not complete this action. Please try again.');}
}
function closeModal(){modal=null;document.querySelector('.modal-backdrop')?.remove();}
async function saveModal(e){e.preventDefault();const form=e.currentTarget,kind=form.dataset.kind,id=form.dataset.id;const fd=new FormData(form),base=`users/${user.uid}/${kind==='entry'?'entries':kind==='category'?'categories':'targets'}`;let item;if(kind==='entry'){const count=Number(fd.get('count'));if(!Number.isSafeInteger(count)||count<1)return notify('Enter a whole number above zero.');item={categoryId:fd.get('categoryId'),count,date:fd.get('date'),note:String(fd.get('note')||'').trim(),createdAt:data.entries?.[id]?.createdAt||Date.now()};}else if(kind==='category'){const name=String(fd.get('name')||'').trim();if(!name)return notify('Enter a category name.');item={name,color:selectedColor,createdAt:data.categories?.[id]?.createdAt||Date.now()};}else{const goal=Number(fd.get('goal')),startDate=fd.get('startDate'),deadline=fd.get('deadline');if(!Number.isSafeInteger(goal)||goal<1)return notify('Enter a whole target number above zero.');if(deadline&&deadline<startDate)return notify('Finish date must be after the start date.');item={categoryId:fd.get('categoryId'),goal,startDate,deadline:deadline||'',status:data.targets?.[id]?.status||'active',createdAt:data.targets?.[id]?.createdAt||Date.now()};}const btn=form.querySelector('[type=submit]');btn.disabled=true;try{if(id)await update(ref(db,`${base}/${id}`),item);else await set(push(ref(db,base)),item);closeModal();notify(kind==='entry'?'Count saved ✦':kind==='category'?'Category saved ✦':'Target saved ✦');}catch(err){notify('Could not save. Please check your connection.');btn.disabled=false;}}
async function targetAction(action){const [verb,id]=action.split(':');const status={complete:'completed',pause:'paused',resume:'active',archive:'archived'}[verb];if(!status)return;try{await update(ref(db,`users/${user.uid}/targets/${id}`),{status});notify(status==='archived'?'Target archived.':status==='completed'?'Target completed.':'Target updated.');}catch{notify('Could not update target. Please try again.');}}
$('#app').innerHTML='<div class="loading"><div><div class="spinner"></div>Preparing your space…</div></div>';
onAuthStateChanged(auth,(next)=>{if(unsubscribe){unsubscribe();unsubscribe=null;}user=next;data={categories:{},entries:{},targets:{}};if(next){unsubscribe=onValue(ref(db,`users/${next.uid}`),(snapshot)=>{data={categories:{},entries:{},targets:{},...(snapshot.val()||{})};render();},()=>{$('#app').innerHTML='<div class="loading"><div>Could not load your data. Please refresh and try again.</div></div>';});}else{view='today';modal=null;authMode='login';renderAuth();}});
