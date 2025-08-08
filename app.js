// 冷蔵庫ストック管理（カテゴリ版）
const CATEGORIES = [
  "調味料","乳製品・卵","野菜","果物","肉・魚","加工品","主食・パン・米","冷凍食品","飲料","その他"
];

const DEFAULT_ITEMS = [
  // 調味料
  {category:"調味料", name:"醤油"}, {category:"調味料", name:"味噌"}, {category:"調味料", name:"マヨネーズ"},
  {category:"調味料", name:"ケチャップ"}, {category:"調味料", name:"ソース"}, {category:"調味料", name:"砂糖"},
  {category:"調味料", name:"塩"}, {category:"調味料", name:"みりん"}, {category:"調味料", name:"料理酒"},
  {category:"調味料", name:"サラダ油"}, {category:"調味料", name:"オリーブオイル"}, {category:"調味料", name:"ごま油"},
  {category:"調味料", name:"だしパック"}, {category:"調味料", name:"めんつゆ"}, {category:"調味料", name:"ポン酢"},
  // 乳製品・卵
  {category:"乳製品・卵", name:"卵"}, {category:"乳製品・卵", name:"牛乳"}, {category:"乳製品・卵", name:"ヨーグルト"},
  {category:"乳製品・卵", name:"バター"}, {category:"乳製品・卵", name:"チーズ"},
  // 野菜
  {category:"野菜", name:"レタス"}, {category:"野菜", name:"トマト"}, {category:"野菜", name:"きゅうり"},
  {category:"野菜", name:"玉ねぎ"}, {category:"野菜", name:"じゃがいも"}, {category:"野菜", name:"にんじん"},
  {category:"野菜", name:"もやし"}, {category:"野菜", name:"ねぎ"}, {category:"野菜", name:"しめじ"},
  {category:"野菜", name:"えのき"}, {category:"野菜", name:"まいたけ"},
  // 果物
  {category:"果物", name:"バナナ"}, {category:"果物", name:"りんご"}, {category:"果物", name:"みかん"},
  // 肉・魚
  {category:"肉・魚", name:"鶏むね肉"}, {category:"肉・魚", name:"豚こま"}, {category:"肉・魚", name:"合い挽き肉"},
  {category:"肉・魚", name:"鮭切り身"}, {category:"肉・魚", name:"塩さば"},
  // 加工品
  {category:"加工品", name:"ハム"}, {category:"加工品", name:"ベーコン"}, {category:"加工品", name:"ウインナー"},
  {category:"加工品", name:"豆腐"}, {category:"加工品", name:"納豆"}, {category:"加工品", name:"キムチ"},
  // 主食・パン・米
  {category:"主食・パン・米", name:"食パン"}, {category:"主食・パン・米", name:"米"}, {category:"主食・パン・米", name:"うどん（乾麺）"},
  // 冷凍食品
  {category:"冷凍食品", name:"冷凍餃子"}, {category:"冷凍食品", name:"冷凍うどん"}, {category:"冷凍食品", name:"冷凍ご飯"},
  // 飲料
  {category:"飲料", name:"コーヒー"}, {category:"飲料", name:"紅茶"}, {category:"飲料", name:"炭酸水"}, {category:"飲料", name:"水"},
];

const STORAGE_KEY = "fridge-stock-v2";
let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const obj = JSON.parse(raw);
      if(obj.items && Array.isArray(obj.items)) return obj;
    }
  }catch{}
  // 初期化
  return {
    items: DEFAULT_ITEMS.map(i => ({ id: crypto.randomUUID(), category: i.category, name: i.name, qty: 0, date: null })),
    sort: { }, // category -> sortKey
    collapsed: {} // category -> boolean
  };
}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// DOM
const search = document.querySelector("#search");
const catFilter = document.querySelector("#catFilter");
const content = document.querySelector("#content");
const toc = document.querySelector("#toc");
const sectionTmpl = document.querySelector("#sectionTemplate");
const rowTmpl = document.querySelector("#rowTemplate");

// フィルタUI初期化
function initFilters(){
  catFilter.innerHTML = '<option value="">全カテゴリ</option>' + CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
}
initFilters();

// 目次
function renderToc(categories){
  toc.innerHTML = categories.map(c=>`<a href="#cat-${encodeURIComponent(c)}">${c}</a>`).join("");
}

// レンダリング
function render(){
  content.innerHTML = "";
  const q = (search.value||"").trim();
  const filterCat = catFilter.value;

  // カテゴリ順の集合
  const cats = CATEGORIES.filter(c => state.items.some(i => i.category === c));
  renderToc(cats);

  for(const cat of cats){
    if(filterCat && filterCat !== cat) continue;

    // 検索とカテゴリで絞り込み
    let items = state.items.filter(i => i.category === cat && (!q || i.name.includes(q)));
    // 並び替え
    const sortKey = state.sort[cat] || "name";
    items.sort((a,b)=>{
      switch(sortKey){
        case "qty": return (a.qty||0)-(b.qty||0) || a.name.localeCompare(b.name);
        case "date": return (toDateNum(a.date)-toDateNum(b.date)) || a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });

    // セクション生成
    const sec = sectionTmpl.content.firstElementChild.cloneNode(true);
    sec.id = `cat-${cat}`;
    sec.querySelector(".cat-title").textContent = cat;
    const tbody = sec.querySelector("tbody");

    // 折りたたみ状態
    if(state.collapsed[cat]) sec.classList.add("collapsed");

    // ボタン
    sec.querySelectorAll(".sort").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        state.sort[cat] = btn.dataset.sort;
        saveState();
        render();
      });
    });
    sec.querySelector(".collapse").addEventListener("click", ()=>{
      state.collapsed[cat] = !state.collapsed[cat];
      saveState();
      render();
    });

    for(const item of items){
      const row = rowTmpl.content.firstElementChild.cloneNode(true);
      row.dataset.id = item.id;
      row.querySelector(".name").textContent = item.name;

      const qtyEl = row.querySelector(".qty");
      qtyEl.value = item.qty ?? 0;
      qtyEl.addEventListener("input", ()=>{
        item.qty = Number(qtyEl.value || 0);
        updateRowState(row, item);
        saveState();
      });

      // date dropdowns
      const ySel = row.querySelector(".y");
      const mSel = row.querySelector(".m");
      const dSel = row.querySelector(".d");
      setupDateSelects(ySel, mSel, dSel, item.date);
      const onDateChange = ()=>{
        item.date = composeDate(ySel.value, mSel.value, dSel.value);
        updateRowState(row, item);
        saveState();
      };
      ySel.addEventListener("change", onDateChange);
      mSel.addEventListener("change", ()=>{ populateDays(dSel, ySel.value, mSel.value, dSel.value); onDateChange(); });
      dSel.addEventListener("change", onDateChange);
      row.querySelector(".today").addEventListener("click", ()=>{
        const t = new Date();
        ySel.value = String(t.getFullYear());
        mSel.value = String(t.getMonth()+1).padStart(2,"0"); 
        populateDays(dSel, ySel.value, mSel.value, String(t.getDate()).padStart(2,"0"));
        onDateChange();
      });

      // tools
      row.querySelector(".minus").addEventListener("click", ()=>{
        item.qty = Math.max(0, (item.qty||0) - 1);
        qtyEl.value = item.qty;
        updateRowState(row, item);
        saveState();
      });
      row.querySelector(".plus").addEventListener("click", ()=>{
        item.qty = (item.qty||0) + 1;
        qtyEl.value = item.qty;
        updateRowState(row, item);
        saveState();
      });
      row.querySelector(".remove").addEventListener("click", ()=>{
        if(confirm(`「${item.name}」を削除しますか？`)){
          state.items = state.items.filter(x => x.id !== item.id);
          saveState();
          render();
        }
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
  const now = new Date();
  const yNow = now.getFullYear();
  const years = [yNow-2, yNow-1, yNow, yNow+1];
  ySel.innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join("");
  const months = Array.from({length:12}, (_,i)=>String(i+1).padStart(2,"0"));
  mSel.innerHTML = months.map(m=>`<option value="${m}">${m}</option>`).join("");
  let y=yNow, m=String(now.getMonth()+1).padStart(2,"0"), d=String(now.getDate()).padStart(2,"0");
  if(iso){ const [Y,M,D] = iso.split("-"); y=Number(Y); m=M; d=D; }
  ySel.value = String(y); mSel.value = String(m);
  populateDays(dSel, String(y), String(m), String(d));
}
function daysInMonth(year, month){ return new Date(Number(year), Number(month), 0).getDate(); }
function populateDays(dSel, year, month, selected){
  const dim = daysInMonth(year, month);
  const days = Array.from({length:dim}, (_,i)=>String(i+1).padStart(2,"0"));
  dSel.innerHTML = days.map(d=>`<option value="${d}">${d}</option>`).join("");
  dSel.value = selected && days.includes(selected) ? selected : days[0];
}
function composeDate(y,m,d){ return `${y}-${m}-${d}`; }

// 追加ダイアログ
const addDialog = document.querySelector("#addDialog");
const newCatSel = document.querySelector("#newCat");
function initAddDialog(){
  newCatSel.innerHTML = CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
}
initAddDialog();
document.querySelector("#addItemBtn").addEventListener("click", ()=>{
  document.querySelector("#newName").value = "";
  addDialog.showModal();
});
document.querySelector("#addConfirm").addEventListener("click", (e)=>{
  e.preventDefault();
  const name = document.querySelector("#newName").value.trim();
  const cat = newCatSel.value;
  if(!name) return;
  state.items.push({ id: crypto.randomUUID(), category: cat, name, qty: 0, date: null });
  saveState(); addDialog.close(); render();
});

// CSV出力（カテゴリ含む）
document.querySelector("#exportBtn").addEventListener("click", ()=>{
  const rows = [["カテゴリ","項目","数量","日付"]];
  for(const it of state.items){ rows.push([it.category, it.name, it.qty ?? 0, it.date ?? ""]); }
  const csv = rows.map(r=>r.map(x=>String(x).replaceAll('"','""')).map(x=>`"${x}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fridge-stock.csv"; a.click();
  URL.revokeObjectURL(a.href);
});

// CSV読み込み（カテゴリ対応）
document.querySelector("#importInput").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(!lines.length){ alert("CSVが空です"); return; }
  // ヘッダ判定
  const header = lines[0].includes("カテゴリ") ? lines.shift() : null;
  const items = [];
  for(const line of lines){
    const cols = parseCsvLine(line);
    let [cat,name,qty,date] = cols;
    if(header == null){ // 旧フォーマット（項目,数量,日付）
      [name, qty, date] = cols; cat = "その他";
    }
    if(!name) continue;
    if(!CATEGORIES.includes(cat)) cat = "その他";
    items.push({ id: crypto.randomUUID(), category: cat, name, qty: Number(qty||0), date: date || null });
  }
  if(items.length){ state.items = items; saveState(); render(); }
  else alert("CSVの内容を読み取れませんでした。");
  e.target.value = "";
});

function parseCsvLine(line){
  const out = []; let cur = ""; let inQ = false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(inQ){ if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else inQ=false; } else cur+=c; }
    else{ if(c==='"') inQ=true; else if(c===','){ out.push(cur); cur=""; } else cur+=c; }
  }
  out.push(cur); return out;
}

// リセット
document.querySelector("#resetBtn").addEventListener("click", ()=>{
  if(!confirm("数量と日付をすべて空にします。よろしいですか？")) return;
  for(const it of state.items){ it.qty = 0; it.date = null; }
  saveState(); render();
});

// 起動
render();


// トップへ戻るボタン動作
const topBtn = document.querySelector("#topBtn");
window.addEventListener("scroll", () => {
  if (window.scrollY > 200) {
    topBtn.classList.add("show");
  } else {
    topBtn.classList.remove("show");
  }
});
topBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
