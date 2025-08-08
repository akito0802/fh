// 冷蔵庫ストック管理（クラウド）
const CATEGORIES = [
  "調味料","乳製品・卵","野菜","果物","肉・魚","加工品","主食・パン・米","冷凍食品","飲料","その他"
];

const DEFAULT_ITEMS = [
  {category:"調味料", name:"醤油"}, {category:"調味料", name:"味噌"}, {category:"調味料", name:"マヨネーズ"},
  {category:"調味料", name:"ケチャップ"}, {category:"調味料", name:"ソース"}, {category:"調味料", name:"砂糖"},
  {category:"調味料", name:"塩"}, {category:"調味料", name:"みりん"}, {category:"調味料", name:"料理酒"},
  {category:"調味料", name:"サラダ油"}, {category:"調味料", name:"オリーブオイル"}, {category:"調味料", name:"ごま油"},
  {category:"調味料", name:"めんつゆ"}, {category:"調味料", name:"ポン酢"}, {category:"調味料", name:"だしパック"},
  {category:"乳製品・卵", name:"卵"}, {category:"乳製品・卵", name:"牛乳"}, {category:"乳製品・卵", name:"ヨーグルト"},
  {category:"乳製品・卵", name:"バター"}, {category:"乳製品・卵", name:"チーズ"},
  {category:"野菜", name:"レタス"}, {category:"野菜", name:"トマト"}, {category:"野菜", name:"きゅうり"},
  {category:"野菜", name:"玉ねぎ"}, {category:"野菜", name:"じゃがいも"}, {category:"野菜", name:"にんじん"},
  {category:"野菜", name:"もやし"}, {category:"野菜", name:"ねぎ"}, {category:"野菜", name:"しめじ"},
  {category:"野菜", name:"えのき"}, {category:"野菜", name:"まいたけ"},
  {category:"果物", name:"バナナ"}, {category:"果物", name:"りんご"}, {category:"果物", name:"みかん"},
  {category:"肉・魚", name:"鶏むね肉"}, {category:"肉・魚", name:"豚こま"}, {category:"肉・魚", name:"合い挽き肉"}, {category:"肉・魚", name:"鮭切り身"},
  {category:"加工品", name:"ハム"}, {category:"加工品", name:"ベーコン"}, {category:"加工品", name:"ウインナー"}, {category:"加工品", name:"豆腐"}, {category:"加工品", name:"納豆"}, {category:"加工品", name:"キムチ"},
  {category:"主食・パン・米", name:"食パン"}, {category:"主食・パン・米", name:"米"}, {category:"主食・パン・米", name:"うどん（乾麺）"},
  {category:"冷凍食品", name:"冷凍餃子"}, {category:"冷凍食品", name:"冷凍うどん"}, {category:"冷凍食品", name:"冷凍ご飯"},
  {category:"飲料", name:"コーヒー"}, {category:"飲料", name:"紅茶"}, {category:"飲料", name:"炭酸水"}, {category:"飲料", name:"水"}
];

// ---- Supabase ----
if(!window.ENV) { alert("env.js が読み込まれていません。SUPABASE_URL と ANON_KEY を設定してください。"); }
const supabase = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);

// ---- State ----
const STORAGE_KEY = "fridge-stock-cloud-v1";
let state = loadState();
let currentUser = null;
let isSyncing = false;

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const obj = JSON.parse(raw);
      if(obj.items && Array.isArray(obj.items)) return obj;
    }
  }catch{}
  return {
    items: DEFAULT_ITEMS.map(i => ({ id: crypto.randomUUID(), category: i.category, name: i.name, qty: 0, date: null })),
    sort: { }, collapsed: {}
  };
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// ---- DOM ----
const search = document.querySelector("#search");
const catFilter = document.querySelector("#catFilter");
const content = document.querySelector("#content");
const toc = document.querySelector("#toc");
const sectionTmpl = document.querySelector("#sectionTemplate");
const rowTmpl = document.querySelector("#rowTemplate");
const loginBtn = document.querySelector("#loginBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const userEmail = document.querySelector("#userEmail");
const loginDialog = document.querySelector("#loginDialog");
const emailInput = document.querySelector("#emailInput");
const loginConfirm = document.querySelector("#loginConfirm");
const syncBtn = document.querySelector("#syncBtn");
const syncStatus = document.querySelector("#syncStatus");

function initFilters(){
  catFilter.innerHTML = '<option value="">全カテゴリ</option>' + CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
}
initFilters();

function renderToc(categories){
  toc.innerHTML = categories.map(c=>`<a href="#cat-${encodeURIComponent(c)}">${c}</a>`).join("");
}

// ---- Render ----
function render(){
  content.innerHTML = "";
  const q = (search.value||"").trim();
  const filterCat = catFilter.value;

  const cats = CATEGORIES.filter(c => state.items.some(i => i.category === c));
  renderToc(cats);

  for(const cat of cats){
    if(filterCat && filterCat !== cat) continue;
    let items = state.items.filter(i => i.category === cat && (!q || i.name.includes(q)));
    const sortKey = state.sort[cat] || "name";
    items.sort((a,b)=>{
      switch(sortKey){
        case "qty": return (a.qty||0)-(b.qty||0) || a.name.localeCompare(b.name);
        case "date": return (toDateNum(a.date)-toDateNum(b.date)) || a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });

    const sec = sectionTmpl.content.firstElementChild.cloneNode(true);
    sec.id = `cat-${cat}`;
    sec.querySelector(".cat-title").textContent = cat;
    const tbody = sec.querySelector("tbody");

    if(state.collapsed[cat]) sec.classList.add("collapsed");

    sec.querySelectorAll(".sort").forEach(btn=>{
      btn.addEventListener("click", ()=>{ state.sort[cat] = btn.dataset.sort; saveState(); render(); });
    });
    sec.querySelector(".collapse").addEventListener("click", ()=>{
      state.collapsed[cat] = !state.collapsed[cat]; saveState(); render();
    });

    for(const item of items){
      const row = rowTmpl.content.firstElementChild.cloneNode(true);
      row.dataset.id = item.id;
      row.querySelector(".name").textContent = item.name;

      const qtyEl = row.querySelector(".qty"); qtyEl.value = item.qty ?? 0;
      qtyEl.addEventListener("input", ()=>{ item.qty = Number(qtyEl.value || 0); updateRowState(row, item); saveState(); queueSyncItem(item); });

      const ySel = row.querySelector(".y");
      const mSel = row.querySelector(".m");
      const dSel = row.querySelector(".d");
      setupDateSelects(ySel, mSel, dSel, item.date);
      const onDateChange = ()=>{
        item.date = composeDate(ySel.value, mSel.value, dSel.value);
        updateRowState(row, item); saveState(); queueSyncItem(item);
      };
      ySel.addEventListener("change", onDateChange);
      mSel.addEventListener("change", ()=>{ populateDays(dSel, ySel.value, mSel.value, dSel.value); onDateChange(); });
      dSel.addEventListener("change", onDateChange);
      row.querySelector(".today").addEventListener("click", ()=>{
        const t = new Date();
        ySel.value = String(t.getFullYear()); mSel.value = String(t.getMonth()+1).padStart(2,"0"); 
        populateDays(dSel, ySel.value, mSel.value, String(t.getDate()).padStart(2,"0")); onDateChange();
      });

      row.querySelector(".minus").addEventListener("click", ()=>{ item.qty = Math.max(0, (item.qty||0)-1); qtyEl.value=item.qty; updateRowState(row,item); saveState(); queueSyncItem(item); });
      row.querySelector(".plus").addEventListener("click", ()=>{ item.qty = (item.qty||0)+1; qtyEl.value=item.qty; updateRowState(row,item); saveState(); queueSyncItem(item); });
      row.querySelector(".remove").addEventListener("click", async ()=>{
        if(!confirm(`「${item.name}」を削除しますか？`)) return;
        state.items = state.items.filter(x => x.id !== item.id); saveState(); render();
        if(currentUser) await supabase.from("stocks").delete().eq("id", item.id).eq("user_id", currentUser.id);
      });

      updateRowState(row, item);
      tbody.appendChild(row);
    }

    content.appendChild(sec);
  }
}
search.addEventListener("input", render);
catFilter.addEventListener("change", render);

// 行の状態
function updateRowState(row, item){
  row.classList.toggle("empty", !item.qty);
  row.classList.toggle("low", item.qty > 0 && item.qty <= 1);
}
function toDateNum(iso){ return iso ? Number(iso.replaceAll("-","")) : 0; }
function setupDateSelects(ySel, mSel, dSel, iso){
  const now = new Date(); const yNow = now.getFullYear();
  const years = [yNow-2, yNow-1, yNow, yNow+1];
  ySel.innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join(""); 
  const months = Array.from({length:12}, (_,i)=>String(i+1).padStart(2,"0"));
  mSel.innerHTML = months.map(m=>`<option value="${m}">${m}</option>`).join(""); 
  let y=yNow, m=String(now.getMonth()+1).padStart(2,"0"), d=String(now.getDate()).padStart(2,"0"); 
  if(iso){ const [Y,M,D] = iso.split("-"); y=Number(Y); m=M; d=D; }
  ySel.value = String(y); mSel.value = String(m); populateDays(dSel, String(y), String(m), String(d));
}
function daysInMonth(year, month){ return new Date(Number(year), Number(month), 0).getDate(); }
function populateDays(dSel, year, month, selected){
  const dim = daysInMonth(year, month);
  const days = Array.from({length:dim}, (_,i)=>String(i+1).padStart(2,"0"));
  dSel.innerHTML = days.map(d=>`<option value="${d}">${d}</option>`).join(""); dSel.value = selected && days.includes(selected) ? selected : days[0];
}
function composeDate(y,m,d){ return `${y}-${m}-${d}`; }

// 追加ダイアログ
const addDialog = document.querySelector("#addDialog");
const newCatSel = document.querySelector("#newCat");
function initAddDialog(){ newCatSel.innerHTML = CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join(""); }
initAddDialog();
document.querySelector("#addItemBtn").addEventListener("click", ()=>{ document.querySelector("#newName").value = ""; addDialog.showModal(); });
document.querySelector("#addConfirm").addEventListener("click", (e)=>{
  e.preventDefault();
  const name = document.querySelector("#newName").value.trim();
  const cat = newCatSel.value; if(!name) return;
  const item = { id: crypto.randomUUID(), category: cat, name, qty: 0, date: null };
  state.items.push(item); saveState(); addDialog.close(); render(); queueSyncItem(item);
});

// CSV
document.querySelector("#exportBtn").addEventListener("click", ()=>{
  const rows = [["カテゴリ","項目","数量","日付"]];
  for(const it of state.items){ rows.push([it.category, it.name, it.qty ?? 0, it.date ?? ""]); }
  const csv = rows.map(r=>r.map(x=>String(x).replaceAll('"','""')).map(x=>`"${x}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fridge-stock.csv"; a.click(); URL.revokeObjectURL(a.href);
});
document.querySelector("#importInput").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const text = await file.text(); const lines = text.split(/\r?\n/).filter(Boolean);
  if(!lines.length){ alert("CSVが空です"); return; }
  const headerHasCat = lines[0].includes("カテゴリ"); if(headerHasCat) lines.shift();
  const items = [];
  for(const line of lines){
    const cols = parseCsvLine(line);
    let [cat,name,qty,date] = headerHasCat ? cols : ["その他", cols[0], cols[1], cols[2]];
    if(!name) continue;
    if(!CATEGORIES.includes(cat)) cat = "その他";
    items.push({ id: crypto.randomUUID(), category: cat, name, qty: Number(qty||0), date: date || null });
  }
  if(items.length){ state.items = items; saveState(); render(); if(currentUser) await pushAll(); }
  e.target.value = "";
});
function parseCsvLine(line){
  const out=[]; let cur=""; let inQ=false;
  for(let i=0;i<line.length;i++){ const c=line[i];
    if(inQ){ if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else inQ=false; } else cur+=c; }
    else{ if(c==='"') inQ=true; else if(c===','){ out.push(cur); cur=""; } else cur+=c; }
  } out.push(cur); return out;
}

// トップへ
const topBtn = document.querySelector("#topBtn");
const toggleTop = () => { if (window.scrollY > 200) topBtn.classList.add("show"); else topBtn.classList.remove("show"); };
window.addEventListener("scroll", toggleTop, {passive:true}); toggleTop();
topBtn.addEventListener("click", () => { try{ window.scrollTo({top:0,behavior:"smooth"});}catch{window.scrollTo(0,0);} });

// ---- Auth UI ----
loginBtn.addEventListener("click", ()=>{ document.querySelector("#loginHelp").style.display="none"; emailInput.value=""; loginDialog.showModal(); });
logoutBtn.addEventListener("click", async ()=>{ await supabase.auth.signOut(); currentUser=null; onAuthChanged(); });

loginConfirm.addEventListener("click", async (e)=>{
  e.preventDefault();
  const email = emailInput.value.trim();
  if(!email) return;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
  if(error){ alert("送信に失敗しました: "+error.message); return; }
  document.querySelector("#loginHelp").style.display="block";
  setTimeout(()=>loginDialog.close(), 1500);
});

supabase.auth.onAuthStateChange((_event, session)=>{
  currentUser = session?.user || null;
  onAuthChanged();
});

async function onAuthChanged(){
  if(currentUser){
    loginBtn.hidden = true; logoutBtn.hidden = false;
    userEmail.hidden = false; userEmail.textContent = currentUser.email || "ログイン中";
    syncBtn.disabled = false; syncStatus.textContent = "クラウド同期オン";
    await pullAll();
  }else{
    loginBtn.hidden = false; logoutBtn.hidden = true; userEmail.hidden = true; userEmail.textContent = "";
    syncBtn.disabled = true; syncStatus.textContent = "オフライン保存";
  }
  render();
}

syncBtn.addEventListener("click", async ()=>{ if(currentUser) await pushAll(); });

// ---- Cloud Sync ----
function toRow(it){
  return {
    id: it.id, user_id: currentUser.id, category: it.category, name: it.name,
    qty: it.qty ?? 0, date: it.date ? it.date : null, updated_at: new Date().toISOString()
  };
}

let syncQueue = new Map();
let syncTimer = null;
function queueSyncItem(item){
  if(!currentUser) return;
  syncQueue.set(item.id, item);
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(flushQueue, 600);
}
async function flushQueue(){
  if(!currentUser || isSyncing) return;
  isSyncing = true; syncBtn.textContent = "同期中...";
  try{
    const payload = Array.from(syncQueue.values()).map(toRow);
    syncQueue.clear();
    if(payload.length){
      const { error } = await supabase.from("stocks").upsert(payload, { onConflict: "id" });
      if(error) throw error;
    }
    syncBtn.textContent = "同期";
  }catch(err){
    console.error(err); syncBtn.textContent = "再試行";
  }finally{
    isSyncing = false;
  }
}

async function pullAll(){
  if(!currentUser) return;
  const { data, error } = await supabase.from("stocks").select("*").eq("user_id", currentUser.id).order("category").order("name");
  if(error){ console.error(error); return; }
  if(!data || !data.length){ await pushAll(); return; }
  const byId = new Map(data.map(r => [r.id, r]));
  // merge: keep unknown local items too
  for(const it of state.items){
    if(byId.has(it.id)){
      const r = byId.get(it.id);
      it.category = r.category; it.name = r.name; it.qty = r.qty; it.date = r.date;
      byId.delete(it.id);
    }
  }
  // add remaining from cloud
  for(const r of byId.values()){
    state.items.push({ id:r.id, category:r.category, name:r.name, qty:r.qty, date:r.date });
  }
  saveState(); render();
}

async function pushAll(){
  if(!currentUser) return;
  const payload = state.items.map(toRow);
  const { error } = await supabase.from("stocks").upsert(payload, { onConflict: "id" });
  if(error){ alert("同期エラー: "+error.message); return; }
  syncBtn.textContent = "同期";
}

// 初期レンダ
render();
