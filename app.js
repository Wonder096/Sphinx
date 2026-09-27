const THEME_KEY = "talse_runner_theme_v1";
const PHOTO_KEY = "talse_runner_settle_photo_v1";
const PAYLOAD_KEY = "talse_runner_settle_payload_v3";
const TABS_KEY = "tr_tabs_v2";
const ACTIVE_TAB_KEY = "tr_active_tab_v2";
const STATE_PREFIX = "tr_state_v2_";

const DEFAULT_SETTINGS = {
  totalGames: 30,
  maxPerGame: 1044,
  goalPoints: {1:288, 2:270, 3:252, 4:234, 5:216, 6:198, 7:180, 8:162},
  retaPoints: {1:144, 2:135, 3:126, 4:116, 5:108, 6:99, 7:90, 8:81},
  xPoints: 0
};

let SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

let tabs = [];
let activeTabId = null;

window.updateAddBtnState = function() {
  const state = window.__state;
  const btn = $("#addRound");
  if(!btn) return;
  if(!state || !isRegistered(state) || isFinished(state)) {
    btn.disabled = true;
    return;
  }
  const mapSelect = $("#mapSelect");
  const rMapSelect = $("#randomMapSelect");
  const inputs = $$("#scoreInputs input");
  if(!mapSelect || inputs.length === 0) return;
  
  const allFilled = inputs.every(i => i.value.trim() !== "");
  let mapSelected = mapSelect.value.trim() !== "";
  
  if (mapSelect.value === "랜덤") {
    mapSelected = rMapSelect && rMapSelect.value.trim() !== "";
  }
  
  btn.disabled = !(allFilled && mapSelected);
};

function loadCustomSettings() {
  const custom = localStorage.getItem("tr_custom_settings_v1");
  if(custom) {
    try {
      const parsed = JSON.parse(custom);
      SETTINGS.goalPoints = parsed.goalPoints || SETTINGS.goalPoints;
      SETTINGS.retaPoints = parsed.retaPoints || SETTINGS.retaPoints;
      SETTINGS.xPoints = parsed.xPoints !== undefined ? parsed.xPoints : SETTINGS.xPoints;
    } catch(e) {}
  }
}

function saveCustomSettings(newSet) {
  localStorage.setItem("tr_custom_settings_v1", JSON.stringify(newSet));
  loadCustomSettings();
  if(window.__state && window.__state.history && window.__state.history.length > 0) {
    recalculateHistory();
  }
}

function getModeConfig(mode) {
  if(mode === "civil") return { rosterSize: 8, isTeam: true };
  return { rosterSize: 4, isTeam: false };
}

function getDefaultState(mode) {
  const conf = getModeConfig(mode);
  const players = Array(conf.rosterSize).fill("");
  return { mode: mode || "occ", players, totals: {}, history: [] };
}

function initTabs() {
  loadCustomSettings();
  let savedTabs;
  try {
    savedTabs = JSON.parse(localStorage.getItem(TABS_KEY));
    if(!Array.isArray(savedTabs)) savedTabs = null;
  } catch(e) { savedTabs = null; }

  if (savedTabs && savedTabs.length > 0) {
    tabs = savedTabs;
    activeTabId = localStorage.getItem(ACTIVE_TAB_KEY);
    if(!tabs.find(t => t.id === activeTabId)) activeTabId = null;

    if (activeTabId) {
      showApp();
      loadCurrentTab();
    } else {
      renderTabs();
      showLanding();
    }
  } else {
    tabs = [];
    activeTabId = null;
    renderTabs();
    showLanding();
  }
}

function showLanding() {
  const l = $("#landingView");
  const m = $("#mainAppView");
  if(l) l.classList.remove("hidden");
  if(m) m.classList.add("hidden");
}

function showApp() {
  const l = $("#landingView");
  const m = $("#mainAppView");
  if(l) l.classList.add("hidden");
  if(m) m.classList.remove("hidden");
}

function createTab(mode) {
  const newId = "tab_" + Date.now();
  const title = mode === "civil" ? "내전 점수판" : "점령 점수판";
  const newName = (tabs.length + 1) + "번째 " + title;
  
  tabs.push({ id: newId, name: newName, mode: mode });
  activeTabId = newId;
  saveTabs();
  
  window.__state = getDefaultState(mode);
  saveCurrentTab();
  
  showApp();
  renderTabs();
  render();
}

function saveTabs() {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  if(activeTabId) localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
  else localStorage.removeItem(ACTIVE_TAB_KEY);
}

function loadCurrentTab() {
  if(!activeTabId) return;
  const raw = localStorage.getItem(STATE_PREFIX + activeTabId);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const mode = activeTab ? activeTab.mode : "occ";
  const conf = getModeConfig(mode);
  
  if (raw) {
    try {
      const d = JSON.parse(raw);
      const out = getDefaultState(mode);
      if(Array.isArray(d.players)) out.players = d.players.map(x=>String(x ?? "")).slice(0, conf.rosterSize);
      while(out.players.length < conf.rosterSize) out.players.push("");
      if(typeof d.totals === "object" && d.totals) out.totals = d.totals;
      if(Array.isArray(d.history)) out.history = d.history;
      window.__state = out;
    } catch {
      window.__state = getDefaultState(mode);
    }
  } else {
    window.__state = getDefaultState(mode);
  }
  
  renderTabs();
  render();
}

function saveCurrentTab() {
  if(activeTabId) localStorage.setItem(STATE_PREFIX + activeTabId, JSON.stringify(window.__state));
}

function save(state) {
  window.__state = state;
  saveCurrentTab();
}

function renderTabs() {
  const container = $("#tabsContainer");
  if(!container) return;
  container.innerHTML = "";
  
  const homeBtn = document.createElement("button");
  homeBtn.className = "tab-home";
  homeBtn.innerHTML = "🏠 처음으로";
  homeBtn.onclick = showLanding;
  container.appendChild(homeBtn);

  tabs.forEach(tab => {
    const div = document.createElement("div");
    div.className = `tab ${tab.id === activeTabId ? "active" : ""}`;
    
    const nameSpan = document.createElement("span");
    nameSpan.className = "tab-name";
    nameSpan.textContent = tab.name;
    nameSpan.title = "더블클릭하여 이름 변경";
    
    nameSpan.onclick = () => {
      if(tab.id !== activeTabId) {
        activeTabId = tab.id;
        saveTabs();
        showApp();
        loadCurrentTab();
      }
    };
    
    nameSpan.ondblclick = () => {
      const newName = prompt("새로운 점수판 이름을 입력해주세요:", tab.name);
      if (newName && newName.trim()) {
        tab.name = newName.trim();
        saveTabs();
        renderTabs();
      }
    };
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`'${tab.name}' 탭을 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) {
        localStorage.removeItem(STATE_PREFIX + tab.id);
        tabs = tabs.filter(t => t.id !== tab.id);
        if (activeTabId === tab.id) activeTabId = tabs.length > 0 ? tabs[0].id : null;
        saveTabs();
        if(activeTabId) { showApp(); loadCurrentTab(); } 
        else { renderTabs(); showLanding(); }
      }
    };
    
    div.appendChild(nameSpan);
    div.appendChild(closeBtn);
    container.appendChild(div);
  });
  
  const addBtn = document.createElement("button");
  addBtn.className = "tab-add";
  addBtn.textContent = "➕ 추가";
  addBtn.onclick = () => {
    activeTabId = null;
    saveTabs();
    renderTabs();
    showLanding();
  };
  container.appendChild(addBtn);
}

function safeInt(v, d=0){
  const parsed = parseInt(v, 10);
  return isNaN(parsed) ? d : parsed;
}

function nowISO(){
  const d = new Date();
  const p = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function setTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  setTheme(saved || "dark");
}

function normalizeNames(state){
  const conf = getModeConfig(state.mode);
  return state.players.map(x=>String(x||"").trim()).slice(0, conf.rosterSize);
}

function isRegistered(state){
  const names = normalizeNames(state);
  const conf = getModeConfig(state.mode);
  return names.length === conf.rosterSize && names.every(Boolean) && new Set(names).size === names.length;
}

function ensureTotals(state){
  const names = normalizeNames(state);
  const t = {};
  for(const n of names){
    if(!n) continue;
    t[n] = safeInt(state.totals?.[n], 0);
  }
  state.totals = t;
}

function parseToken(token) {
  const t = String(token || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!t) throw new Error("입력이 비어 있어요");
  const m = t.match(/^(\d+)(.*)$/);
  if (!m) throw new Error("등수 숫자가 필요해요");
  const rank = typeof safeInt === "function" ? safeInt(m[1], 0) : parseInt(m[1], 10) || 0;
  if (rank < 1 || rank > 8) throw new Error("등수는 1~8만 가능해요");
  const rest = m[2] || "";
  const re = rest.includes("ㄹ") || rest.includes("리") || rest.includes("리타");
  const x = rest.includes("ㅊ") || rest.includes("초") || rest.includes("초사");
  return { rank, re, x };
}

function scoreFrom(p){
  if(p.x) return safeInt(SETTINGS.xPoints, 0);
  if(p.re) return safeInt(SETTINGS.retaPoints[p.rank], 0);
  return safeInt(SETTINGS.goalPoints[p.rank], 0);
}

function fmtSignedPretty(n){
  if(n === 0) return "±0점";
  return (n > 0 ? `+${n}점` : `${n}점`);
}

function isFinished(state){
  return (state.history?.length || 0) >= SETTINGS.totalGames;
}

function escapeHTML(s){
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function computePerPlayerStats(state){
  const names = normalizeNames(state);
  const out = {};
  for(const name of names){
    out[name] = { bestRank:99, bestCount:0, reCount:0, xCount:0, goalCount:0, totalRank:0, validRanks:0, matches:[] };
  }
  (state.history||[]).forEach((h, idx) => {
    const mapName = h.map || "미지정";
    names.forEach((name, pIdx) => {
      const p = h.parsed[pIdx];
      if(!p) return;
      const rk = safeInt(p.rank, 0);
      if(rk < 1 || rk > 8) return;
      const st = out[name];
      st.totalRank += rk;
      st.validRanks += 1;
      if(rk < st.bestRank){ st.bestRank = rk; st.bestCount = 1; }
      else if(rk === st.bestRank){ st.bestCount += 1; }
      if(p.x) st.xCount += 1;
      else if(p.re) st.reCount += 1;
      else st.goalCount += 1;
      st.matches.push({
        matchNum: idx + 1,
        map: mapName,
        rank: rk,
        re: p.re,
        x: p.x
      });
    });
  });
  for(const name of names){
    if(out[name].bestRank === 99) out[name].bestRank = 0;
    out[name].avgRank = out[name].validRanks > 0 ? (out[name].totalRank / out[name].validRanks).toFixed(1) : 0;
  }
  return out;
}

window.showPlayerProfile = function(name) {
  const state = window.__state;
  const perStats = computePerPlayerStats(state);
  const st = perStats[name];
  if(!st) return;

  const score = safeInt(state.totals[name], 0);
  const names = normalizeNames(state);
  const isMvp = names.reduce((max, n) => Math.max(max, safeInt(state.totals[n], 0)), 0) === score;
  
  const recent30 = st.matches.slice(-30);
  let recentHTML = "";
  if(recent30.length === 0){
    recentHTML = `<div style="color:var(--muted); font-size:13px;">기록 없음</div>`;
  } else {
    recentHTML = `<ul class="profile-match-list">` + recent30.map(m => {
      let rankStr = `${m.rank}등`;
      if (m.x) rankStr = `${m.rank}등 초사`;
      else if (m.re) rankStr = `${m.rank}등 리타`;
      return `<li>${m.matchNum}번째 판 - (${m.map}) - ${rankStr}</li>`;
    }).reverse().join("") + `</ul>`;
  }

  const html = `
    <div class="profile-header">
      <h2 class="profile-name">${escapeHTML(name)} ${isMvp ? '<span class="mvp-badge">👑 MVP</span>' : ''}</h2>
    </div>
    <div class="profile-grid">
      <div class="profile-box">
        <div class="profile-t">총 획득 점수</div>
        <div class="profile-v" style="color:#a5b4fc;">${score}점</div>
      </div>
      <div class="profile-box">
        <div class="profile-t">평균 순위</div>
        <div class="profile-v">${st.avgRank}등</div>
      </div>
      <div class="profile-box">
        <div class="profile-t">1등 횟수</div>
        <div class="profile-v">${st.bestRank === 1 ? st.bestCount : 0}회</div>
      </div>
      <div class="profile-box">
        <div class="profile-t">완주 / 리타 / 초사</div>
        <div class="profile-v">${st.goalCount} / <span style="color:var(--danger)">${st.reCount}</span> / ${st.xCount}</div>
      </div>
    </div>
    <div class="profile-recent">
      <div class="profile-t" style="margin-bottom:12px;">최근 경기 폼 (최대 30판)</div>
      ${recentHTML}
    </div>
  `;

  $("#profileContent").innerHTML = html;
  $("#profileModal").classList.remove("hidden");
};

function buildBoard(state){
  ensureTotals(state);
  const conf = getModeConfig(state.mode);
  const games = state.history.length;
  const remain = Math.max(0, SETTINGS.totalGames - games);
  const names = normalizeNames(state).filter(Boolean);

  let kpi = "";
  if(conf.isTeam) {
    let redTotal = 0, blueTotal = 0;
    for(let i=0; i<4; i++) redTotal += safeInt(state.totals[names[i]], 0);
    for(let i=4; i<8; i++) blueTotal += safeInt(state.totals[names[i]], 0);
    
    kpi = `
      <div class="kpi team-kpi">
        <div class="box red-box">
          <div class="t">레드팀 점수</div>
          <div class="v"><span class="v-main">${redTotal}점</span></div>
        </div>
        <div class="box vs-box">
          <div class="t">남은 판 수</div>
          <div class="v"><span class="v-main">${remain}판</span></div>
        </div>
        <div class="box blue-box">
          <div class="t">블루팀 점수</div>
          <div class="v"><span class="v-main">${blueTotal}점</span></div>
        </div>
      </div>
    `;
  } else {
    const currentTotal = Object.values(state.totals).reduce((a,b)=>a+safeInt(b,0),0);
    const maxTotal = SETTINGS.maxPerGame * SETTINGS.totalGames;
    const maxPossibleFinal = currentTotal + (remain * SETTINGS.maxPerGame);
    const diff = maxPossibleFinal - maxTotal;
    
    kpi = `
      <div class="kpi">
        <div class="box">
          <div class="t">현재 점령 점수</div>
          <div class="v"><span class="v-main">${currentTotal}점</span></div>
        </div>
        <div class="box">
          <div class="t">남은 판 수</div>
          <div class="v"><span class="v-main">${remain}판</span></div>
        </div>
        <div class="box">
          <div class="t">최대 가능 점수</div>
          <div class="v">
            <span class="v-main">${maxPossibleFinal}점</span>
            <span class="diff">(${fmtSignedPretty(diff)})</span>
          </div>
        </div>
      </div>
    `;
  }

  const rows = names.map((n, idx)=>({name: n, score: safeInt(state.totals[n],0), isRed: idx<4})).sort((a,b)=>b.score-a.score);
  
  const table = `
    <table class="table">
      <thead><tr><th>순위</th><th>이름</th><th>점수</th></tr></thead>
      <tbody>
        ${rows.map((r,i)=>`
          <tr class="${conf.isTeam ? (r.isRed ? 'row-red' : 'row-blue') : ''}">
            <td>${i+1}</td>
            <td><span class="player-link" onclick="showPlayerProfile('${escapeHTML(r.name)}')">${escapeHTML(r.name)}</span></td>
            <td class="score-cell">${r.score}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  return kpi + table;
}

function clearScoreInputs(){
  $$("#scoreInputs input").forEach(i=>{ i.value = ""; });
  const first = $("#scoreInputs input");
  if(first) first.focus();
  if(window.updateAddBtnState) window.updateAddBtnState();
}

function applyFinishedLock(){
  const done = isFinished(window.__state);
  $$("#scoreInputs input").forEach(i=>{ i.disabled = done; });
  $("#clearInputs").disabled = done;
  if($("#mapSelect")) $("#mapSelect").disabled = done;
  if($("#randomMapSelect")) $("#randomMapSelect").disabled = done;
}

function renderPlayerInputFields(wrapId, state, isScore = false) {
  const wrap = $(wrapId);
  wrap.innerHTML = "";
  const conf = getModeConfig(state.mode);
  const names = normalizeNames(state);
  
  if (conf.isTeam) {
    wrap.className = "grid-team";
    const redGroup = document.createElement("div"); redGroup.className = "team-group team-red";
    const blueGroup = document.createElement("div"); blueGroup.className = "team-group team-blue";
    
    const redTitle = document.createElement("div"); redTitle.className = "team-title"; redTitle.textContent = "레드팀";
    const blueTitle = document.createElement("div"); blueTitle.className = "team-title"; blueTitle.textContent = "블루팀";
    redGroup.appendChild(redTitle);
    blueGroup.appendChild(blueTitle);

    for(let i=0; i<8; i++) {
      const g = document.createElement("div");
      g.className = "input-wrap";
      
      if(isScore) {
        const lab = document.createElement("div");
        lab.className = "label big-label";
        lab.textContent = names[i] || (i<4 ? `레드 ${i+1}` : `블루 ${i-3}`);
        g.appendChild(lab);
      }
      
      const inp = document.createElement("input");
      if(!isScore) {
        inp.placeholder = i<4 ? `레드 ${i+1} 닉네임` : `블루 ${i-3} 닉네임`;
        inp.value = state.players[i] || "";
      } else {
        inp.addEventListener("input", window.updateAddBtnState);
        inp.addEventListener("keydown",(e)=>{
          if(e.key === "Enter"){
            e.preventDefault();
            const list = $$("#scoreInputs input");
            if(i < list.length - 1) list[i+1].focus();
            else if(!$("#addRound").disabled) addRound();
          }
          if(e.key === "Escape"){
            e.preventDefault();
            clearScoreInputs();
          }
        });
      }
      g.appendChild(inp);
      
      if(i<4) redGroup.appendChild(g);
      else blueGroup.appendChild(g);
    }
    wrap.appendChild(redGroup);
    wrap.appendChild(blueGroup);
  } else {
    wrap.className = "grid";
    for(let i=0; i<4; i++){
      const g = document.createElement("div");
      g.className = "input-wrap";
      
      if(isScore) {
        const lab = document.createElement("div");
        lab.className = "label big-label";
        lab.textContent = names[i] || `첫번째 선수`;
        g.appendChild(lab);
      }
      
      const inp = document.createElement("input");
      if(!isScore) {
        inp.placeholder = `${["첫번째","두번째","세번째","네번째"][i]} 닉네임`;
        inp.value = state.players[i] || "";
      } else {
        inp.addEventListener("input", window.updateAddBtnState);
        inp.addEventListener("keydown",(e)=>{
          if(e.key === "Enter"){
            e.preventDefault();
            const list = $$("#scoreInputs input");
            if(i < list.length - 1) list[i+1].focus();
            else if(!$("#addRound").disabled) addRound();
          }
          if(e.key === "Escape"){
            e.preventDefault();
            clearScoreInputs();
          }
        });
      }
      g.appendChild(inp);
      wrap.appendChild(g);
    }
  }
}

function render(){
  if(!activeTabId) return;
  const state = window.__state;
  const conf = getModeConfig(state.mode);
  
  $("#registerHint").textContent = conf.isTeam ? "레드팀 4명, 블루팀 4명 · 닉네임 중복 불가" : "인원 4명 고정 · 닉네임 중복 불가";
  
  renderPlayerInputFields("#playerInputs", state, false);
  
  const registered = isRegistered(state);
  $("#registerCard").classList.toggle("hidden", registered);
  $("#mainBoard").classList.toggle("hidden", !registered);
  $("#editPlayers").classList.toggle("hidden", !registered);

  renderPlayerInputFields("#scoreInputs", state, true);

  if(registered){
    ensureTotals(state);
    const games = state.history.length;
    const remain = Math.max(0, SETTINGS.totalGames - games);
    
    const playStatus = $("#playStatus");
    if(playStatus) {
        playStatus.textContent = isFinished(state) ? "30판 완료했어요 🎉" : `진행: ${games}판 · 남은 판 ${remain}판`;
        playStatus.className = isFinished(state) ? "pill success-pill" : "pill";
    }
    
    $("#board").innerHTML = buildBoard(state);
    
    const logEl = $("#gameLog");
    if(logEl) {
        if(state.history.length > 0) {
            const logs = state.history.map((h, idx) => {
              let vsText = "";
              const mapName = h.map || "맵 미지정";
              if (conf.isTeam) {
                let rSum = 0, bSum = 0;
                for(let i=0; i<4; i++) rSum += safeInt(h.delta[state.players[i]], 0);
                for(let i=4; i<8; i++) bSum += safeInt(h.delta[state.players[i]], 0);
                vsText = `<div class="log-vs"><span class="log-red">🔴 ${rSum}</span> <span style="color:var(--muted);margin:0 4px;">vs</span> <span class="log-blue">🔵 ${bSum}</span></div>`;
              }

              const linesData = state.players.map((p, pIdx) => {
                const parsed = h.parsed[pIdx];
                return { p, pIdx, rank: parsed.rank, re: parsed.re, x: parsed.x, delta: h.delta[p] };
              });

              linesData.sort((a, b) => a.rank - b.rank);

              const lines = linesData.map(obj => {
                let rankStr = `${obj.rank}등`;
                let failMark = "";
                if(obj.re) { rankStr = `${obj.rank}등 리타`; failMark = ` <span style="font-size:12px; margin-left:4px;">❌</span>`; }
                else if(obj.x) { rankStr = `${obj.rank}등 초사`; failMark = ` <span style="font-size:12px; margin-left:4px;">❌</span>`; }
                const c = conf.isTeam ? (obj.pIdx < 4 ? "log-red" : "log-blue") : "";
                return `<span class="${c}">${obj.p} ㅣ ${rankStr} ㅣ ${obj.delta}점${failMark}</span>`;
              }).join("<br>");

              return `
              <div class="log-entry">
                <div class="log-head">
                  <div class="log-title-group">
                    <div class="log-badge">${idx + 1}판 [ ${mapName} ]</div>
                    ${vsText}
                  </div>
                  <button class="del-btn" onclick="deleteRound(${idx})">삭제</button>
                </div>
                <div class="log-body">${lines}</div>
              </div>`;
            }).reverse().join("");
            logEl.innerHTML = logs;
        } else {
            logEl.innerHTML = `<div class="empty-log">아직 기록이 없습니다.</div>`;
        }
    }

    applyFinishedLock();
    if(window.updateAddBtnState) window.updateAddBtnState();
    
    const settleBtn = $("#settle");     if(settleBtn){       if(state.history.length > 0){         settleBtn.classList.add("primary","settleReady");         settleBtn.classList.remove("ghost");       }else{         settleBtn.classList.remove("primary","settleReady");         if(!settleBtn.classList.contains("ghost")) settleBtn.classList.add("ghost");       }     }   } }  function registerPlayers(){   const state = window.__state;   const conf = getModeConfig(state.mode);   const inputs = $$("#playerInputs input");
  const names = inputs.map(i=>i.value.trim()).slice(0, conf.rosterSize);

  if(names.some(n=>!n)) return alert("닉네임을 모두 입력해주세요.");
  if(new Set(names).size !== names.length) return alert("중복된 닉네임이 있습니다. 다르게 설정해주세요.");

  const hasProgress = (state.history || []).length > 0;
  if(!hasProgress){
    state.players = names;
    state.totals = Object.fromEntries(names.map(n=>[n,0]));
    state.history = [];
    save(state);
    render();
    return;
  }

  const prevNames = normalizeNames(state).filter(Boolean);
  const prevTotals = state.totals || {};
  const map = {};
  for(let i=0;i<Math.min(prevNames.length, names.length);i++){ map[prevNames[i]] = names[i]; }

  const newTotals = {};
  for(const oldName of prevNames){
    const nn = map[oldName] || oldName;
    newTotals[nn] = (newTotals[nn] || 0) + safeInt(prevTotals[oldName], 0);
  }
  for(const nn of names){ if(newTotals[nn] == null) newTotals[nn] = 0; }

  const newHistory = (state.history || []).map(r=>{
    const delta = r?.delta || {};
    const nd = {};
    for(const oldName of Object.keys(delta)){
      const nn = map[oldName] || oldName;
      nd[nn] = (nd[nn] || 0) + safeInt(delta[oldName],0);
    }
    return { ...r, delta: nd };
  });

  state.players = names;
  state.totals = newTotals;
  state.history = newHistory;
  save(state);
  render();
}

function editPlayers(){
  $("#registerCard").classList.remove("hidden");
  $("#mainBoard").classList.add("hidden");
  $("#editPlayers").classList.add("hidden");
  const first = $("#playerInputs input");
  if(first) first.focus();
}

function addRound(){
  const state = window.__state;
  const conf = getModeConfig(state.mode);
  if(!isRegistered(state)) return alert("먼저 선수를 등록해주세요.");
  if(isFinished(state)) return alert("30판이 모두 종료되었습니다.");

  const mapSelect = $("#mapSelect");
  const rMapSelect = $("#randomMapSelect");      if(mapSelect && !mapSelect.value) {     alert("맵을 먼저 골라주세요!");     mapSelect.focus();     return;   }   if(mapSelect && mapSelect.value === "랜덤") {     if(rMapSelect && !rMapSelect.value) {       alert("랜덤으로 나온 맵을 선택해주세요!");       rMapSelect.focus();       return;     }   }    const inputs = $$("#scoreInputs input");
  const tokens = inputs.map(i=>i.value.trim());

  let parsed;
  try{ parsed = tokens.map(parseToken); }
  catch(e){ return alert(`입력값을 확인해주세요: ${e.message}`); }

  const byRank = {};
  for(let i=0;i<parsed.length;i++){
    const rk = parsed[i].rank;
    byRank[rk] = byRank[rk] || [];
    byRank[rk].push(state.players[i]);
  }
  const dup = Object.entries(byRank).filter(([_,arr])=>arr.length >= 2);
  if(dup.length){
    const msg = dup.map(([rk,arr])=>`${rk}등: ${arr.join(", ")}`).join("\n");
    return alert("등수가 중복되었습니다!\n" + msg);
  }

  ensureTotals(state);
  const delta = {};
  for(let i=0;i<conf.rosterSize;i++){
    const name = state.players[i];
    delta[name] = scoreFrom(parsed[i]);
  }
  for(const name of state.players){
    state.totals[name] = safeInt(state.totals[name],0) + safeInt(delta[name],0);
  }

  let finalMap = mapSelect ? mapSelect.value : "";
  if (finalMap === "랜덤") {
    finalMap = `랜덤 - ${rMapSelect.value}`;
  }

  state.history.push({
    ts: nowISO(),
    map: finalMap,
    tokens,
    parsed: parsed.map(p=>({rank:p.rank,re:p.re,x:p.x})),
    delta
  });

  if(mapSelect) {
    mapSelect.value = "";
  }
  if(rMapSelect) {
    rMapSelect.value = "";
    rMapSelect.classList.add("hidden");
  }
  
  clearScoreInputs();
  save(state);
  render();
}

function undoRound(){
  const state = window.__state;
  if(!state.history.length) return alert("되돌릴 기록이 없습니다.");
  if(!confirm("마지막 1판의 기록을 삭제하시겠습니까?")) return;

  ensureTotals(state);
  const last = state.history.pop();
  const delta = last?.delta || {};

  for(const name of state.players){
    state.totals[name] = safeInt(state.totals[name],0) - safeInt(delta[name],0);
  }
  save(state);
  render();
}

window.deleteRound = function(idx) {
  const state = window.__state;
  if(!confirm(`${idx+1}판 기록을 삭제하시겠습니까?`)) return;
  state.history.splice(idx, 1);
  recalculateHistory();
};

function recalculateHistory() {
  const state = window.__state;
  const conf = getModeConfig(state.mode);
  const newTotals = {};
  for(const n of state.players) newTotals[n] = 0;
  
  for(const row of state.history){
    const newDelta = {};
    for(let i=0; i<conf.rosterSize; i++){
      const name = state.players[i];
      const p = row.parsed[i];
      const s = scoreFrom(p);
      newDelta[name] = s;
      newTotals[name] += s;
    }
    row.delta = newDelta;
  }
  state.totals = newTotals;
  save(state);
  render();
}

function resetAll(){
  if(!confirm("현재 점수판의 모든 데이터를 초기화하시겠습니까?")) return;
  window.__state = getDefaultState(window.__state.mode);
  save(window.__state);
  render();
}

function buildReceiptHTML(state, perStats, names, conf) {
  const currentTabName = tabs.find(t => t.id === activeTabId)?.name || "점수판";
  const rows = names.map(name => ({ name, score: safeInt(state.totals[name],0) })).sort((a,b)=>b.score-a.score);
  const leader = rows[0]?.score ?? 0;
  const d = new Date();
  const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  let contentHTML = "";

  if(conf.isTeam) {
    let redTotal = 0, blueTotal = 0;
    for(let i=0; i<4; i++) redTotal += safeInt(state.totals[names[i]], 0);
    for(let i=4; i<8; i++) blueTotal += safeInt(state.totals[names[i]], 0);
    
    const isRedWin = redTotal > blueTotal;
    const isBlueWin = blueTotal > redTotal;

    const redRows = names.slice(0,4).map(n => ({name: n, score: safeInt(state.totals[n],0)})).sort((a,b)=>b.score-a.score);
    const blueRows = names.slice(4,8).map(n => ({name: n, score: safeInt(state.totals[n],0)})).sort((a,b)=>b.score-a.score);

    contentHTML = `
      <div class="receipt-team-score">
        <div class="r-team ${isRedWin?'win':''}">
          <div class="r-team-name" style="color:var(--danger)">RED TEAM</div>
          <div class="r-team-val">${redTotal}</div>
        </div>
        <div class="r-vs">VS</div>
        <div class="r-team ${isBlueWin?'win':''}">
          <div class="r-team-name" style="color:var(--blue)">BLUE TEAM</div>
          <div class="r-team-val">${blueTotal}</div>
        </div>
      </div>
      <div class="receipt-grid-team">
        <div class="r-col">
          ${redRows.map((r,i) => `
            <div class="r-row">
              <div class="r-rank">${i+1}</div>
              <div class="r-name">${escapeHTML(r.name)}${r.score === leader ? '<span class="r-mvp">MVP</span>' : ''}</div>
              <div class="r-score">${r.score}</div>
            </div>
          `).join("")}
        </div>
        <div class="r-col">
          ${blueRows.map((r,i) => `
            <div class="r-row">
              <div class="r-rank">${i+1}</div>
              <div class="r-name">${escapeHTML(r.name)}${r.score === leader ? '<span class="r-mvp">MVP</span>' : ''}</div>
              <div class="r-score">${r.score}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } else {
    contentHTML = `
      <div class="receipt-list">
        ${rows.map((r,i) => `
          <div class="r-row ${i===0?'r-first':''}">
            <div class="r-rank">${i+1}</div>
            <div class="r-name">${escapeHTML(r.name)}${i===0 ? '<span class="r-mvp">MVP</span>' : ''}</div>
            <div class="r-score">${r.score}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  return `
    <div class="receipt-inner">
      <div class="receipt-header">
        <div class="r-title">Match Result</div>
        <div class="r-subtitle">${currentTabName} · ${dateStr}</div>
      </div>
      ${contentHTML}
      <div class="receipt-footer">Generated by Hall of Glory · 제작: Xesi</div>
    </div>
  `;
}

function settle(){
  const state = window.__state;
  if(!isRegistered(state)) return alert("선수 등록을 먼저 진행해주세요.");
  if((state.history?.length || 0) === 0) return alert("기록이 최소 1판 이상 있어야 합니다.");

  ensureTotals(state);
  const conf = getModeConfig(state.mode);
  const names = normalizeNames(state);
  const perStats = computePerPlayerStats(state);

  $("#receiptArea").innerHTML = buildReceiptHTML(state, perStats, names, conf);
  $("#resultModal").classList.remove("hidden");
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    alert("팀 배정 결과가 복사되었습니다!\n디스코드나 카카오톡에 바로 붙여넣기(Ctrl+V) 하세요.");
  } catch (err) {
    alert("복사에 실패했습니다.");
  }
  document.body.removeChild(textArea);
}

function copyPinballResult() {
  if(!window.__tempPinballResult || window.__tempPinballResult.length !== 8) return;
  const r = window.__tempPinballResult.slice(0,4);
  const b = window.__tempPinballResult.slice(4,8);
  
  let txt = `🎲 내전 팀 배정 결과 🎲\n\n`;
  txt += `🔴 RED TEAM\n${r.map((x,i)=>`${i+1}.${x}`).join('\n')}\n\n`;
  txt += `🔵 BLUE TEAM\n${b.map((x,i)=>`${i+1}.${x}`).join('\n')}`;
  
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(txt);
    return;
  }
  navigator.clipboard.writeText(txt).then(() => {
    alert("팀 배정 결과가 복사되었습니다!\n디스코드나 카카오톡에 바로 붙여넣기(Ctrl+V) 하세요.");
  }).catch(() => fallbackCopyTextToClipboard(txt));
}

function copyReceiptText() {
  const state = window.__state;
  const conf = getModeConfig(state.mode);
  const names = normalizeNames(state);
  const currentTabName = tabs.find(t => t.id === activeTabId)?.name || "점수판";
  const rows = names.map(n => ({ name: n, score: safeInt(state.totals[n],0) })).sort((a,b)=>b.score-a.score);
  const leader = rows[0]?.score ?? 0;

  let txt = `[ Hall of Glory - ${currentTabName} ]\n\n`;

  if (conf.isTeam) {
    let redTotal = 0, blueTotal = 0;
    for(let i=0; i<4; i++) redTotal += safeInt(state.totals[names[i]], 0);
    for(let i=4; i<8; i++) blueTotal += safeInt(state.totals[names[i]], 0);

    txt += `🔴 RED TEAM : ${redTotal}점 ${redTotal > blueTotal ? "👑" : ""}\n`;
    txt += `🔵 BLUE TEAM : ${blueTotal}점 ${blueTotal > redTotal ? "👑" : ""}\n\n`;
    txt += `[ 개인 점수 ]\n`;
  } else {
    txt += `[ 개인전 점수 ]\n`;
  }

  rows.forEach((r, i) => {
    const mvp = (r.score === leader) ? " 👑 MVP" : "";
    let teamMarker = "";
    if(conf.isTeam) {
        const idx = names.indexOf(r.name);
        teamMarker = idx < 4 ? "🔴 " : "🔵 ";
    }
    txt += `${i+1}위. ${teamMarker}${r.name} (${r.score}점)${mvp}\n`;
  });

  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(txt);
    return;
  }
  navigator.clipboard.writeText(txt).then(() => {
    alert("결과가 복사되었습니다!\n디스코드나 카카오톡에 바로 붙여넣기(Ctrl+V) 하세요.");
  }).catch(() => fallbackCopyTextToClipboard(txt));
}

function exportReceiptImage() {
  const el = $("#receiptArea");
  html2canvas(el, { backgroundColor: '#11141d', scale: 2 }).then(canvas => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `HallOfGlory_Result_${Date.now()}.png`;
    a.click();
  });
}

function exportData(){
  const state = window.__state;
  const currentTabName = tabs.find(t => t.id === activeTabId)?.name || "점수판";
  const pack = {
    app: "Hall of Glory",
    tabName: currentTabName,
    savedAt: nowISO(),
    theme: localStorage.getItem(THEME_KEY) || "dark",
    state,
    settlePhoto: localStorage.getItem(PHOTO_KEY) || ""
  };
  const blob = new Blob([JSON.stringify(pack)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hall_of_glory_${currentTabName}_${pack.savedAt.replaceAll(":","").replaceAll(" ","_")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(){
  const input = $("#importFile");
  if(!input) return;
  input.value = "";
  try{ if(typeof input.showPicker === "function"){ input.showPicker(); return; } }catch(e){}
  input.click();
}

function handleImportFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const pack = JSON.parse(String(reader.result || "{}"));
      const theme = pack?.theme === "light" ? "light" : "dark";
      const state = pack?.state;

      if(!state || !Array.isArray(state.players) || !Array.isArray(state.history) || typeof state.totals !== "object"){
        alert("잘못된 형식의 파일입니다.");
        return;
      }
      if(!state.mode) state.mode = "occ";

      const currentTab = tabs.find(t => t.id === activeTabId);
      const currentMode = currentTab ? currentTab.mode : "occ";

      if (state.mode !== currentMode) {
        const curName = currentMode === "civil" ? "내전(8인)" : "점령(4인)";
        const impName = state.mode === "civil" ? "내전(8인)" : "점령(4인)";
        alert(`불러오기 실패!\n현재 탭은 [${curName}] 모드인데, 불러오려는 파일은 [${impName}] 모드입니다.\n알맞은 모드의 탭에서 불러와주세요.`);
        return;
      }

      localStorage.setItem(THEME_KEY, theme);
      if(typeof pack?.settlePhoto === "string") localStorage.setItem(PHOTO_KEY, pack.settlePhoto);
      else localStorage.removeItem(PHOTO_KEY);

      setTheme(theme);
      window.__state = state;
      saveCurrentTab();
      render();
      alert("데이터를 성공적으로 불러왔습니다.");
    }catch(e){ alert("데이터 불러오기에 실패했습니다."); }
  };
  reader.readAsText(file, "utf-8");
}

function checkAdminAuth() {
  const pwd = prompt("임시 비밀번호를 입력해주세요.");
  if(pwd === "0814") return true;
  if(pwd !== null) alert("비밀번호가 일치하지 않습니다.");
  return false;
}

function openSettingsModal() {
  const tb = $("#setTbody");
  tb.innerHTML = "";
  for(let i=1; i<=8; i++) {
    tb.innerHTML += `
      <tr>
        <td style="text-align:center; font-weight:bold;">${i}등</td>
        <td><input type="number" id="setG_${i}" value="${SETTINGS.goalPoints[i]}" class="set-inp" /></td>
        <td><input type="number" id="setR_${i}" value="${SETTINGS.retaPoints[i]}" class="set-inp" /></td>
      </tr>
    `;
  }
  $("#setXPoints").value = SETTINGS.xPoints;
  $("#settingsModal").classList.remove("hidden");
}

function saveSettingsAction() {
  const newSet = { goalPoints:{}, retaPoints:{}, xPoints:0 };
  for(let i=1; i<=8; i++) {
    newSet.goalPoints[i] = safeInt($(`#setG_${i}`).value, 0);
    newSet.retaPoints[i] = safeInt($(`#setR_${i}`).value, 0);
  }
  newSet.xPoints = safeInt($("#setXPoints").value, 0);
  saveCustomSettings(newSet);
  alert("설정이 저장되었으며, 기존 기록이 새 점수에 맞게 재계산되었습니다.");
  $("#settingsModal").classList.add("hidden");
}

function openPinballModal() {
  $("#pinballInput").value = "";
  $("#pinballInputArea").style.display = "block";
  $("#pbCanvasWrap").style.display = "none";
  $("#pinballResultArea").style.display = "none";
  $("#pinballModal").classList.remove("hidden");
}

let pinballAnimId = null;
let pinballSpeed = 1;
let pinballSkip = false;
let pendingNames = [];
let redTeamResult = [];
let blueTeamResult = [];

function runPinballAction() {
  const text = $("#pinballInput").value;
  const names = text.split(/,|\n/).map(s=>s.trim()).filter(Boolean);
  if(names.length !== 8) return alert(`정확히 8명의 닉네임을 입력해주세요. (현재 ${names.length}명)`);
  
  pendingNames = [...names];
  for(let i = pendingNames.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [pendingNames[i], pendingNames[j]] = [pendingNames[j], pendingNames[i]];
  }
  
  redTeamResult = [];
  blueTeamResult = [];
  window.__tempPinballResult = [];

  $("#pinballInputArea").style.display = "none";
  $("#pbCanvasWrap").style.display = "block";
  $("#pinballResultArea").style.display = "none";

  const cvs = $("#pbCanvas");
  const ctx = cvs.getContext("2d");
  const cw = 460;
  const ch = 650;
  cvs.width = cw;
  cvs.height = ch;

  pinballSpeed = 1;
  pinballSkip = false;
  const speedBtn = $("#speedPinballAnim");
  if(speedBtn) speedBtn.textContent = "⏩ 1배속";

  const lines = [
      {x1: 230, y1: 530, x2: 230, y2: 650} 
  ];

  const pegs = [];
  for(let i=0; i<12; i++){
      let cols = (i%2===0) ? 10 : 9;
      let spacing = 46;
      let offset = (i%2===0) ? 23 : 46;
      for(let j=0; j<cols; j++){
          pegs.push({x: j*spacing + offset, y: 80 + i*35, r: 4});
      }
  }

  const balls = [];
  const roles = ['red','red','red','red','blue','blue','blue','blue'];
  for(let i = roles.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  for (let i = 0; i < 8; i++) {
    balls.push({
        x: 230 + (Math.random() - 0.5) * 150, 
        y: -30 - (i * 45), 
        vx: (Math.random() - 0.5) * 5,
        vy: 2,
        r: 10,
        settled: false,
        revealed: false,
        color: '#64748b', 
        name: '',
        targetSide: roles[i]
    });
  }

  let frame = 0;
  if(pinballAnimId) cancelAnimationFrame(pinballAnimId);

  function draw() {
    if(pinballSkip) {
        finishPinball();
        return;
    }

    ctx.clearRect(0, 0, cw, ch);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
    ctx.fillRect(0, ch - 120, cw/2, 120);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(cw/2, ch - 120, cw/2, 120);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    lines.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
    });

    ctx.fillStyle = '#0ea5e9';
    pegs.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    });

    let allSettled = true;

    for(let step = 0; step < pinballSpeed; step++) {
        balls.forEach(b => {
            if(!b.settled) {
                allSettled = false;
                b.vy += 0.4; 
                b.x += b.vx;
                b.y += b.vy;

                if (b.y > 450 && b.y < 530) {
                    const tx = b.targetSide === 'red' ? 115 : 345;
                    b.vx += (tx - b.x) * 0.015;
                }

                b.vx *= 0.98; 
                b.vy *= 0.98;

                pegs.forEach(p => {
                    const dx = b.x - p.x;
                    const dy = b.y - p.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < (b.r + p.r)*(b.r + p.r)) {
                        const dist = Math.sqrt(distSq);
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const overlap = (b.r + p.r) - dist;

                        b.x += nx * overlap;
                        b.y += ny * overlap;

                        const dot = b.vx*nx + b.vy*ny;
                        b.vx = (b.vx - 2 * dot * nx) * 0.75;
                        b.vy = (b.vy - 2 * dot * ny) * 0.75;
                        b.vx += (Math.random() - 0.5); 
                    }
                });

                if (b.y > 530) {
                    if (b.targetSide === 'red' && b.x > 215) { b.x = 215; b.vx = -Math.abs(b.vx) * 0.5; }
                    if (b.targetSide === 'blue' && b.x < 245) { b.x = 245; b.vx = Math.abs(b.vx) * 0.5; }
                }

                if (b.x < b.r) { b.x = b.r; b.vx *= -0.8; }
                if (b.x > cw - b.r) { b.x = cw - b.r; b.vx *= -0.8; }

                if (b.y > 540 && !b.revealed) {
                    b.revealed = true;
                    b.color = b.targetSide === 'red' ? '#ef4444' : '#3b82f6';
                    b.name = pendingNames.pop();
                    if(b.targetSide === 'red') redTeamResult.push(b.name);
                    else blueTeamResult.push(b.name);
                }

                if (b.y > ch - b.r - 35) {
                    b.y = ch - b.r - 35;
                    b.vy *= -0.4;
                    b.vx *= 0.6;
                    if(Math.abs(b.vy) < 1 && Math.abs(b.vx) < 1) {
                        b.settled = true;
                    }
                }
            }
        });
    }

    balls.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = b.revealed ? '#fff' : '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (b.revealed) {
            ctx.fillStyle = '#fff';
            ctx.font = '800 11px Pretendard';
            ctx.fillText(b.name.substring(0,3), b.x, b.y - 14);
        }
    });

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 16px Pretendard';
    ctx.textAlign = 'center';
    ctx.fillText('RED TEAM', cw*0.25, ch - 10);
    ctx.fillText('BLUE TEAM', cw*0.75, ch - 10);

    if (!allSettled && frame < 1500) {
        frame++;
        pinballAnimId = requestAnimationFrame(draw);
    } else {
        finishPinball();
    }
  }

  function finishPinball() {
    cancelAnimationFrame(pinballAnimId);
    $("#pbCanvasWrap").style.display = "none";
    
    while(pendingNames.length > 0) {
        if(redTeamResult.length < 4) redTeamResult.push(pendingNames.pop());
        else blueTeamResult.push(pendingNames.pop());
    }
    
    window.__tempPinballResult = [...redTeamResult, ...blueTeamResult];
    
    $("#pbRed").innerHTML = redTeamResult.join("<br>");
    $("#pbBlue").innerHTML = blueTeamResult.join("<br>");
    $("#pinballResultArea").style.display = "block";
  }

  draw();
}

function applyPinballResult() {
  if(!window.__tempPinballResult || window.__tempPinballResult.length !== 8) return;
  
  createTab("civil");
  const st = window.__state;
  st.players = [...window.__tempPinballResult];
  st.totals = Object.fromEntries(window.__tempPinballResult.map(n=>[n,0]));
  st.history = [];
  save(st);

  $("#pinballModal").classList.add("hidden");
  showApp();
  render();
  
  alert("🎉 새로운 [내전 점수판] 탭이 생성되고 8명의 팀원이 자동 등록되었습니다!");
}

function bind() {
  const click = (sel, fn) => { const el = $(sel); if(el) el.onclick = fn; };

  click("#btnOccMode", () => createTab("occ"));
  click("#btnCivilMode", () => createTab("civil"));

  click("#btnLandingSettings", () => { if(checkAdminAuth()) openSettingsModal(); });
  click("#btnLandingPinball", () => { if(checkAdminAuth()) openPinballModal(); });
  
  click("#themeToggle", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });

  click("#savePlayers", registerPlayers);
  click("#editPlayers", editPlayers);
  click("#addRound", addRound);
  click("#clearInputs", clearScoreInputs);
  click("#undoRound", undoRound);
  click("#resetAll", resetAll);
  click("#settle", settle);
  click("#exportData", exportData);
  click("#importData", importData);
  
  const fileInp = $("#importFile");
  if(fileInp) {
    fileInp.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if(!f) return;
      e.target.value = "";
      handleImportFile(f);
    });
  }

  click("#openTermsBtn", (e) => { e.preventDefault(); $("#termsModal").classList.remove("hidden"); });
  click("#closeTermsBtn", () => $("#termsModal").classList.add("hidden"));

  click("#closeResult", () => $("#resultModal").classList.add("hidden"));
  click("#btnExportImage", exportReceiptImage);
  click("#btnCopyText", copyReceiptText);
  click("#closeProfile", () => $("#profileModal").classList.add("hidden"));

  click("#openSettings", openSettingsModal);
  click("#closeSettingsBtn", () => $("#settingsModal").classList.add("hidden"));
  click("#saveSettingsBtn", saveSettingsAction);

  click("#runPinballBtn", runPinballAction);
  
  click("#speedPinballAnim", () => {
    pinballSpeed = pinballSpeed === 1 ? 2 : (pinballSpeed === 2 ? 3 : 1);
    const btn = $("#speedPinballAnim");
    if(btn) btn.textContent = `⏩ ${pinballSpeed}배속`;
  });
  
  click("#skipPinballAnim", () => { pinballSkip = true; });

  click("#closePinballBtn1", () => { if(pinballAnimId) cancelAnimationFrame(pinballAnimId); $("#pinballModal").classList.add("hidden"); });
  click("#closePinballBtn2", () => { $("#pinballModal").classList.add("hidden"); });
  click("#applyPinballBtn", applyPinballResult);
  click("#copyPinballBtn", copyPinballResult);
  
  const mapSel = document.getElementById("mapSelect");
  const rMapSel = document.getElementById("randomMapSelect");
  
  if(mapSel) {
    mapSel.onchange = function(e) {
      if(e.target.value === "랜덤") {
        if(rMapSel) rMapSel.classList.remove("hidden");
      } else {
        if(rMapSel) {
          rMapSel.classList.add("hidden");
          rMapSel.value = "";
        }
      }
      if(window.updateAddBtnState) window.updateAddBtnState();
    };
  }
  
  if(rMapSel) {
    rMapSel.onchange = function() {
      if(window.updateAddBtnState) window.updateAddBtnState();
    };
  }
}

window.onload = function() {
  try {
    initTheme();
    bind();
    initTabs();
  } catch(e) {
    const lv = document.getElementById("landingView");
    if(lv) lv.classList.remove("hidden");
  }
};
