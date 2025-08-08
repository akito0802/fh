// 冷蔵庫ストック管理
const DEFAULT_ITEMS = [
  "卵","牛乳","醤油","味噌","ヨーグルト","バター","チーズ","食パン","米",
  "豆腐","納豆","鶏むね肉","豚こま","合い挽き肉","ハム","ベーコン","ウインナー",
  "冷凍餃子","冷凍うどん","冷凍ご飯","レタス","トマト","きゅうり","もやし",
  "玉ねぎ","じゃがいも","にんじん","しめじ","えのき","まいたけ","ねぎ","キムチ",
  "海苔","マヨネーズ","ケチャップ","ソース","砂糖","塩","みりん","料理酒",
  "サラダ油","オリーブオイル","ごま油","コーヒー","紅茶","炭酸水","水"
];

const STORAGE_KEY = "fridge-stock-v1";
let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const obj = JSON.parse(raw);
      if(!obj.items || !Array.isArray(obj.items)) throw 0;
      return obj;
    }
  }catch{}
  return {
    items: DEFAULT_ITEMS.map(name => ({ id: crypto.randomUUID(), name, qty: 0, date: null })),
    sort: "name"
  };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const tbody = document.querySelector("#tbody");
const tmpl = document.querySelector("#rowTemplate");
const search = document.querySelector("#search");

function render(){
  tbody.innerHTML = "";
  let items = [...state.items];
  const q = (search.value || "").trim();
  if(q) items = items.filter(i => i.name.includes(q));

  items.sort((a,b)=>{
    switch(state.sort){
      case "qty": return (a.qty||0) - (b.qty||0) || a.name.localeCompare(b.name);
      case "date": return (toDateNum(a.date) - toDateNum(b.date)) || a.name.localeCompare(b.name);
      default: return a.name.localeCompare(b.name);
    }
  });

  for(const item of items){
    const row = tmpl.content.firstElementChild.cloneNode(true);
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
}

function updateRowState(row, item){
  row.classList.toggle("empty", !item.qty);
  row.classList.toggle("low", item.qty > 0 && item.qty <= 1);
}

function toDateNum(iso){
  if(!iso) return 0;
  return Number(iso.replaceAll("-",""));
}

function setupDateSelects(ySel, mSel, dSel, iso){
  // years: this year - 2 〜 this year + 1
  const now = new Date();
  const yNow = now.getFullYear();
  const years = [yNow-2, yNow-1, yNow, yNow+1];
  ySel.innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join("");

  const months = Array.from({length:12}, (_,i)=>String(i+1).padStart(2,"0"));
  mSel.innerHTML = months.map(m=>`<option value="${m}">${m}</option>`).join("");

  let y = yNow, m = String(now.getMonth()+1).padStart(2,"0"), d = String(now.getDate()).padStart(2,"0");
  if(iso){
    const [Y,M,D] = iso.split("-");
    y = Number(Y); m = M; d = D;
  }
  ySel.value = String(y);
  mSel.value = String(m);
  populateDays(dSel, String(y), String(m), String(d));
}

function daysInMonth(year, month){
  return new Date(Number(year), Number(month), 0).getDate();
}

function populateDays(dSel, year, month, selected){
  const dim = daysInMonth(year, month);
  const days = Array.from({length:dim}, (_,i)=>String(i+1).padStart(2,"0"));
  dSel.innerHTML = days.map(d=>`<option value="${d}">${d}</option>`).join("");
  dSel.value = selected && days.includes(selected) ? selected : days[0];
}

function composeDate(y, m, d){
  return `${y}-${m}-${d}`;
}

// search
search.addEventListener("input", render);

// sort buttons
document.querySelectorAll(".sort").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    state.sort = btn.dataset.sort;
    saveState();
    render();
  });
});

// add item dialog
const addDialog = document.querySelector("#addDialog");
document.querySelector("#addItemBtn").addEventListener("click", ()=>{
  document.querySelector("#newName").value = "";
  addDialog.showModal();
});
document.querySelector("#addConfirm").addEventListener("click", (e)=>{
  e.preventDefault();
  const name = document.querySelector("#newName").value.trim();
  if(!name) return;
  state.items.push({ id: crypto.randomUUID(), name, qty: 0, date: null });
  saveState();
  addDialog.close();
  render();
});

// export CSV
document.querySelector("#exportBtn").addEventListener("click", ()=>{
  const rows = [["項目","数量","日付"]];
  for(const it of state.items){
    rows.push([it.name, it.qty ?? 0, it.date ?? ""]);
  }
  const csv = rows.map(r=>r.map(x=>String(x).replaceAll('"','""')).map(x=>`"${x}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fridge-stock.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

// import CSV
document.querySelector("#importInput").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  const items = [];
  for(const line of lines){
    const cols = parseCsvLine(line);
    const [name, qty, date] = cols;
    if(!name) continue;
    items.push({ id: crypto.randomUUID(), name, qty: Number(qty||0), date: date || null });
  }
  if(items.length){
    state.items = items;
    saveState();
    render();
  }else{
    alert("CSVの内容を読み取れませんでした。");
  }
  e.target.value = "";
});

function parseCsvLine(line){
  // simple CSV parser for quoted fields
  const out = [];
  let cur = "";
  let inQ = false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(inQ){
      if(c === '"'){
        if(line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = false;
      }else cur += c;
    }else{
      if(c === '"') inQ = true;
      else if(c === ','){ out.push(cur); cur=""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

// reset
document.querySelector("#resetBtn").addEventListener("click", ()=>{
  if(!confirm("数量と日付をすべて空にします。よろしいですか？")) return;
  for(const it of state.items){
    it.qty = 0;
    it.date = null;
  }
  saveState();
  render();
});

// init
render();
