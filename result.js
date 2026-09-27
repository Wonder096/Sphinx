const PHOTO_KEY = "talse_runner_settle_photo_v1";
const PAYLOAD_KEY = "talse_runner_settle_payload_v3";
const THEME_KEY = "talse_runner_theme_v1";

const $ = (s)=>document.querySelector(s);

function setTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
}

function fmtKoreanTime(iso){
  const d = new Date(String(iso||"").replace(" ", "T"));
  const y = d.getFullYear();
  const mo = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  const h = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  const s = String(d.getSeconds()).padStart(2,"0");
  return `${y}년 ${mo}월 ${da}일 ${h}시 ${mi}분 ${s}초`;
}

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function loadPayload(){
  try{
    const raw = localStorage.getItem(PAYLOAD_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

function loadPhoto(){
  return localStorage.getItem(PHOTO_KEY) || "";
}

function showPhoto(dataUrl){
  const box = $("#photoBox");
  const img = $("#photoImg");
  if(!dataUrl){
    box.classList.add("hidden");
    img.src = "";
    return;
  }
  img.src = dataUrl;
  box.classList.remove("hidden");
}

function removePhoto(){
  localStorage.removeItem(PHOTO_KEY);
  showPhoto("");
  const input = $("#photo");
  if(input) input.value = "";
}

function render(payload){
  const timeEl = $("#settleTime");
  timeEl.textContent = payload?.at ? fmtKoreanTime(payload.at) : "";

  const wrap = $("#summary");
  if(!payload?.lines?.length){
    // 어투를 더 깔끔하게 수정
    wrap.innerHTML = `<div class="pill">정산 데이터가 없습니다. 메인 화면에서 30판을 완료한 뒤 다시 확인해주세요.</div>`;
    return;
  }

  const sorted = [...payload.lines].sort((a,b)=> (b.total||0) - (a.total||0));
  if(sorted[0]) sorted[0].isMvp = true;

  const cards = sorted.map((x)=>{
    const name = escapeHTML(x.name);
    const total = `${x.total}점`;
    const goal = `${x.goalCount}번`;
    const re = `${x.reCount}번`;
    const xs = `${x.xCount}번`;
    const ranks = escapeHTML(x.summary);
    const mvp = x.isMvp ? `<span class="mvpTag">👑 MVP</span>` : "";

    // CSS에 맞춰 텍스트 선(━━━━)을 제거하고 심플하게 변경
    return `
      <div class="finalCard ${x.isMvp ? "finalMvp" : ""}">
        <div class="finalHead">
          <div class="finalName">${name} ${mvp}</div>
          <div class="finalScore">${total}</div>
        </div>
        <div class="finalLine"></div>
        <div class="finalGrid">
          <div class="kv"><div class="k">골인 수</div><div class="v">${goal}</div></div>
          <div class="kv"><div class="k">리타 수</div><div class="v">${re}</div></div>
          <div class="kv"><div class="k">초사 수</div><div class="v">${xs}</div></div>
          <div class="kv kvWide"><div class="k">30판 등수</div><div class="v">${ranks}</div></div>
        </div>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `<div class="finalGridWrap">${cards}</div>`;
}

function bind(){
  $("#back").onclick = ()=>{ location.href = "index.html"; };
  $("#removePhoto").onclick = removePhoto;

  $("#photo").addEventListener("change",(e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const url = String(reader.result || "");
      localStorage.setItem(PHOTO_KEY, url);
      showPhoto(url);
    };
    reader.readAsDataURL(f);
  });
}

function init(){
  setTheme(localStorage.getItem(THEME_KEY) || "dark");
  bind();
  const payload = loadPayload();
  render(payload);
  showPhoto(loadPhoto());
}

init();

