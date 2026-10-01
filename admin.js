const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const app = $("#app");
let posts = [], banners = {}, cases = [], cur = null; // cur = 편집 중인 게시물
let cc = null; // cc = 편집 중인 수업 사례 과목 (저장 전 작업본)

/* ---------- GitHub 저장 ---------- */
// 사진은 photos/ 폴더에 파일로, 글·배너 설정은 posts.js 에 한 번의 커밋으로 저장합니다.
const TK = "gs_gh_token";
const token = () => { try { return localStorage.getItem(TK) || ""; } catch (e) { return ""; } };
const shown = {}; // 방금 올린 사진: 사이트에 반영되기 전까지 미리보기용
const src = s => shown[s] || s;

async function api(path, opt = {}) {
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}${path}`, {
    method: opt.method || "GET", cache: "no-store",
    headers: { Authorization: "Bearer " + token(), Accept: opt.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json" },
    body: opt.body ? JSON.stringify(opt.body) : undefined
  });
  if (!r.ok) { const e = new Error(r.status + " " + (await r.text()).slice(0, 200)); e.status = r.status; throw e; }
  return opt.raw ? r.text() : r.json();
}
async function remote() {
  const head = (await api(`/git/ref/heads/${GH_BRANCH}`)).object.sha;
  const w = {}; new Function("window", await api(`/contents/posts.js?ref=${head}`, { raw: true }))(w);
  return { head, posts: w.PUBLISHED_POSTS || seed(), banners: w.PUBLISHED_BANNERS || {}, cases: w.PUBLISHED_CASES || seedCases() };
}
const imgsOf = d => [...d.posts.flatMap(p => p.imgs || []), ...Object.values(d.banners).map(b => b.img).filter(Boolean),
  ...d.cases.flatMap(c => c.posters.map(p => p.img))];
const newPath = () => `photos/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;

// op(d): 최신 게시본 d 에 이번 변경을 적용하는 함수. 그사이 다른 사람이 저장했으면 최신본에 다시 적용합니다.
async function commit(op, msg) {
  for (let t = 0; ; t++) {
    busy("GitHub에서 최신 내용을 확인하는 중…");
    const r = await remote();
    const d = { posts: r.posts, banners: r.banners, cases: r.cases };
    const before = new Set(imgsOf(d));
    op(d);
    const tree = [], total = imgsOf(d).filter(s => s.startsWith("data:")).length;
    let n = 0;
    const up = async s => {
      if (!s || !s.startsWith("data:")) return s;
      busy(`사진 올리는 중… (${++n} / ${total})`);
      const b = await api("/git/blobs", { method: "POST", body: { content: s.split(",")[1], encoding: "base64" } });
      const path = newPath();
      tree.push({ path, mode: "100644", type: "blob", sha: b.sha });
      shown[path] = s;
      return path;
    };
    for (const p of d.posts) { const a = []; for (const s of p.imgs || []) a.push(await up(s)); p.imgs = a; }
    for (const b of Object.values(d.banners)) b.img = await up(b.img);
    for (const c of d.cases) for (const p of c.posters) p.img = await up(p.img);
    const after = new Set(imgsOf(d));
    before.forEach(path => { if (path.startsWith("photos/") && !after.has(path)) tree.push({ path, mode: "100644", type: "blob", sha: null }); });
    tree.push({ path: "posts.js", mode: "100644", type: "blob", content: postsJs(d.posts, d.banners, d.cases) });
    busy("GitHub에 저장하는 중…");
    const base = (await api(`/git/commits/${r.head}`)).tree.sha;
    const nt = await api("/git/trees", { method: "POST", body: { base_tree: base, tree } });
    const c = await api("/git/commits", { method: "POST", body: { message: msg, tree: nt.sha, parents: [r.head] } });
    try {
      await api(`/git/refs/heads/${GH_BRANCH}`, { method: "PATCH", body: { sha: c.sha } });
      posts = d.posts; banners = d.banners; cases = d.cases;
      return;
    } catch (e) { if (e.status !== 422 || t >= 2) throw e; }
  }
}

function busy(msg) {
  let b = $("#busy");
  if (!b) { document.body.insertAdjacentHTML("beforeend", `<div class="busy" id="busy"><div><i></i><span></span></div></div>`); b = $("#busy"); }
  b.classList.toggle("on", !!msg);
  if (msg) $("span", b).textContent = msg;
}
function errMsg(e) {
  if (e.status === 401) return "GitHub 토큰이 올바르지 않거나 만료되었습니다. '연결 해제' 후 새 토큰으로 다시 연결해 주세요.";
  if (e.status === 403 || e.status === 404) return "토큰에 jdgm-grow 저장소 쓰기 권한이 없습니다. 토큰을 만들 때 저장소를 jdgm-grow 로, Contents 를 Read and write 로 골랐는지 확인해 주세요.";
  if (!e.status) return "인터넷 연결을 확인한 뒤 다시 시도해 주세요.";
  return "저장하지 못했습니다. (" + e.message + ")";
}
// 저장 작업 실행: 성공하면 화면을 다시 그리고 안내합니다.
async function save(op, msg, done) {
  if (!token()) return alert("먼저 위의 'GitHub 연결'을 완료해 주세요.");
  try { await commit(op, msg); busy(); if (done) done(); render(); alert("저장되었습니다. 1~2분 뒤 사이트에 반영됩니다."); }
  catch (e) { busy(); alert(errMsg(e)); }
}

/* ---------- 화면 ---------- */
function login() {
  app.innerHTML = `<div class="box" style="max-width:420px;margin:60px auto"><h1>관리자 로그인</h1><p class="note" style="margin-bottom:16px">성과를 등록·수정하려면 비밀번호를 입력하세요.</p>
  <div class="f"><input type="password" id="pw" placeholder="비밀번호" autofocus></div><button class="btn primary" id="go">로그인</button><p id="err" class="note" style="color:#e5484d;margin-top:10px"></p></div>`;
  const go = () => { if ($("#pw").value === ADMIN_PW) { sessionStorage.setItem(AUTH, "1"); load(); } else $("#err").textContent = "비밀번호가 맞지 않습니다."; };
  $("#go").onclick = go; $("#pw").onkeydown = e => { if (e.key === "Enter") go(); };
}

async function load() {
  if (!token()) { posts = getPosts(); banners = getBanners(); cases = getCases(); return render(); }
  busy("GitHub에서 내용을 불러오는 중…");
  try { const r = await remote(); posts = r.posts; banners = r.banners; cases = r.cases; busy(); render(); }
  catch (e) { busy(); posts = getPosts(); banners = getBanners(); cases = getCases(); render(); alert(errMsg(e)); }
}

const blank = () => ({ id: "n" + Date.now(), role: "student", s: 3, e: 3, title: "", desc: "", pts: [], kw: [], imgs: [] });
const monthOpts = v => [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => `<option value="${m}" ${m === v ? "selected" : ""}>${m}월</option>`).join("");
const clone = o => JSON.parse(JSON.stringify(o));

function ghBox() {
  if (token()) return `<div class="box ghok"><div><b>✅ GitHub 연결됨</b><p class="note">저장하면 사진과 글이 GitHub에 바로 올라가고, 1~2분 뒤 사이트에 반영됩니다.</p></div>
    <div class="bar2"><button class="btn ghost" id="disc">연결 해제</button><button class="btn ghost" id="out">로그아웃</button></div></div>`;
  return `<div class="box"><h2>GitHub 연결 (처음 한 번만)</h2>
    <p class="note" style="margin-bottom:10px">사진과 글을 사이트에 바로 저장하려면 GitHub '토큰'(저장용 열쇠)이 필요합니다.</p>
    <ol class="steps">
      <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub 토큰 만들기 페이지</a>를 엽니다. (<b>bbannggji1220-bot</b> 계정으로 로그인)</li>
      <li><b>Token name</b>: 아무 이름 (예: 성과사이트) · <b>Expiration</b>: 원하는 기간 (예: 1년)</li>
      <li><b>Repository access</b> → <b>Only select repositories</b> → <b>jdgm-grow</b> 선택</li>
      <li><b>Permissions</b> → <b>Add permissions</b> → 검색창에 <b>Contents</b> 입력 후 체크 → 추가된 Contents 줄에서 <b>Read and write</b> 선택 (Metadata 는 자동으로 붙으니 그대로 두기)</li>
      <li>맨 아래 <b>Generate token</b> → 나온 <code>github_pat_…</code> 를 복사해 아래에 붙여넣기</li>
    </ol>
    <div class="f"><input type="password" id="tk" placeholder="github_pat_로 시작하는 토큰"></div>
    <div class="bar2"><button class="btn primary" id="conn">연결</button><button class="btn ghost" id="out">로그아웃</button></div>
    <p class="note" style="margin-top:10px">토큰은 이 브라우저에만 저장됩니다. 공용 컴퓨터에서는 사용 후 '연결 해제'를 눌러 주세요.</p></div>`;
}

// 예전 작업본이 이미 게시된 내용과 같으면(사진은 장수만 비교) 조용히 정리합니다.
const sig = (ps, bs) => JSON.stringify([(ps || []).map(p => ({ ...p, imgs: (p.imgs || []).length })),
  Object.entries(bs || {}).map(([k, b]) => [k, !!b.img, b.pos, bannerMode(b)])]);
function pendingDraft() {
  const od = oldDraft(); if (!od) return null;
  if (sig(od.posts || posts, od.banners || banners) === sig(posts, banners)) { clearOldDraft(); return null; }
  return od;
}

function render() {
  if (!cur) cur = blank();
  const c = cur, od = token() && pendingDraft();
  app.innerHTML = `<h1>성과 관리</h1>${ghBox()}
  ${od ? `<div class="box"><h2>예전 방식으로 저장된 작업본</h2><p class="note" style="margin-bottom:10px">이 브라우저에 예전 방식(임시 저장)으로 저장된 내용이 남아 있습니다${od.posts ? ` (게시물 ${od.posts.length}개)` : ""}. 사이트에 올리면 지금 사이트의 게시물·배너를 이 내용으로 바꿉니다.</p>
    <div class="bar2"><button class="btn primary" id="odup">이 작업본을 사이트에 올리기</button><button class="btn ghost" id="oddel">버리기</button></div></div>` : ""}
  <div class="box"><h2>${posts.some(p => p.id === c.id) ? "성과 수정" : "새 성과 등록"}</h2>
    <div class="row">
      <div class="f"><label>분야</label><select id="role">${ORDER.map(k => `<option value="${k}" ${k === c.role ? "selected" : ""}>${ROLES[k].name}</option>`).join("")}</select></div>
      <div class="f"><label>시작 월</label><select id="s">${monthOpts(c.s)}</select></div>
      <div class="f"><label>종료 월 (한 달이면 같게)</label><select id="e">${monthOpts(c.e)}</select></div>
    </div>
    <div class="f"><label>제목</label><input id="title" value="${esc(c.title)}" placeholder="예) 바이브 코딩 캠프"></div>
    <div class="f"><label>내용</label><textarea id="desc" placeholder="활동 내용과 성과를 자유롭게 작성하세요">${esc(c.desc)}</textarea></div>
    <div class="f"><label>핵심 성과 (한 줄에 하나)</label><textarea id="pts" style="min-height:80px">${esc(c.pts.join("\n"))}</textarea></div>
    <div class="f"><label>키워드 (쉼표로 구분)</label><input id="kw" value="${esc(c.kw.join(", "))}"></div>
    <div class="f"><label>사진 (여러 장 가능 · 첫 번째 사진이 대표 사진 · 사진을 끌어서 순서 변경)</label><input type="file" id="files" accept="image/*" multiple><div class="thumbs" id="thumbs"></div><div id="cposBox"></div></div>
    <div class="bar2"><button class="btn primary" id="save">저장</button><button class="btn ghost" id="new">새로 작성</button></div>
  </div>
  <div class="box"><h2>등록된 성과 (${posts.length})</h2>
    ${ORDER.map(k => `<h3 style="margin:14px 0 8px;color:${ROLES[k].color}">${ROLES[k].icon} ${ROLES[k].name}</h3><div class="plist">${posts.filter(p => p.role === k).sort((a, b) => a.s - b.s).map(p =>
      `<div class="pitem"><div><b>${mlabel(p)}</b>${esc(p.title)} <small>${p.imgs.length ? "📷" + p.imgs.length : ""}</small></div><div class="bar2"><button class="btn ghost" data-e="${p.id}">수정</button><button class="btn danger" data-d="${p.id}">삭제</button></div></div>`).join("") || '<p class="note">없음</p>'}</div>`).join("")}
  </div>
  <div class="box"><h2>분야별 상단 배너</h2>
    <p class="note" style="margin-bottom:12px">각 분야 페이지 맨 위에 유튜브 채널 배너처럼 가로로 넓은 사진을 넣습니다. 권장 크기 가로 1920px 이상, 비율 약 6:1 (예: 2560×423). 바꾸면 바로 저장됩니다.</p>
    <div class="bnlist">${ORDER.map(k => { const b = banners[k] || {}; return `<div class="bnitem" data-k="${k}">
      <div class="bnhead"><b style="color:${ROLES[k].color}">${ROLES[k].icon} ${ROLES[k].name}</b><a href="${k}.html" target="_blank" class="note">페이지 보기 ↗</a></div>
      <div class="bnprev${b.img ? "" : " empty"}" style="${b.img ? `background-image:url('${src(b.img)}');background-position:center ${b.pos == null ? 50 : b.pos}%` : `background:${ROLES[k].soft}`}">${b.img ? "" : "배너 사진 없음 (기본 색·이모티콘 표시)"}</div>
      <div class="bar2" style="align-items:center;flex-wrap:wrap">
        <label class="btn ghost" style="cursor:pointer">사진 ${b.img ? "변경" : "올리기"}<input type="file" accept="image/*" data-bf="${k}" hidden></label>
        ${b.img ? `<label class="note">세로 위치 <input type="range" min="0" max="100" value="${b.pos == null ? 50 : b.pos}" data-bp="${k}"></label>
        <label class="note">글자 <select data-bt="${k}">${[["below", "사진 아래에 (추천·항상 잘 보임)"], ["over", "사진 위에 겹치기 (어둡게 처리)"], ["none", "숨기기 (사진만)"]].map(o => `<option value="${o[0]}" ${bannerMode(b) === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></label>
        <button class="btn danger" data-bd="${k}">배너 삭제</button>` : ""}
      </div></div>`; }).join("")}</div>
  </div>
  <div class="box" id="casesBox"></div>`;
  renderCases();

  // GitHub 연결
  if ($("#conn")) $("#conn").onclick = async () => {
    const v = $("#tk").value.trim(); if (!v) return alert("토큰을 붙여넣어 주세요.");
    try { localStorage.setItem(TK, v); } catch (e) { return alert("이 브라우저에서는 토큰을 저장할 수 없습니다."); }
    busy("GitHub 연결을 확인하는 중…");
    try {
      const j = await api("");
      if (j.permissions && !j.permissions.push) { const e = new Error("no push"); e.status = 403; throw e; }
      busy(); await load();
    } catch (e) { busy(); localStorage.removeItem(TK); alert(errMsg(e)); render(); }
  };
  if ($("#disc")) $("#disc").onclick = () => { if (confirm("이 브라우저에서 GitHub 연결을 해제할까요?")) { localStorage.removeItem(TK); render(); } };
  $("#out").onclick = () => { sessionStorage.removeItem(AUTH); login(); };
  if (od) {
    $("#odup").onclick = () => { if (confirm("지금 사이트의 게시물·배너를 이 작업본으로 바꿀까요?")) save(d => { if (od.posts) d.posts = od.posts; if (od.banners) d.banners = od.banners; }, "예전 작업본 올리기", clearOldDraft); };
    $("#oddel").onclick = () => { if (confirm("이 브라우저에 남은 예전 작업본을 지울까요? (사이트 내용은 그대로입니다)")) { clearOldDraft(); render(); } };
  }

  // 사진
  const th = () => { $("#thumbs").innerHTML = c.imgs.map((s, i) => `<div draggable="true" data-i="${i}" title="끌어서 순서 바꾸기"><img src="${src(s)}" draggable="false"><button class="rm" data-r="${i}">✕</button>${i === 0 ? '<span class="cv on">대표</span>' : `<button class="cv" data-c="${i}">대표로</button>`}</div>`).join(""); cp(); };
  // 대표 사진이 팝업에서 잘리는 위치 조절 (대표 사진이 바뀌면 가운데로 초기화)
  let lastCover = c.imgs[0];
  const cp = () => {
    const box = $("#cposBox");
    if (!c.imgs.length) { box.innerHTML = ""; return; }
    if (c.imgs[0] !== lastCover) { lastCover = c.imgs[0]; delete c.cpos; delete c.cfit; }
    const v = c.cpos == null ? 50 : c.cpos;
    box.innerHTML = `<div class="cpos"><div class="cover${c.cfit ? " fit" : ""}"><img src="${src(c.imgs[0])}" style="${c.cfit ? "" : coverPos(v)}" alt="대표 사진 미리보기"></div>
      <div><label class="note"><b>대표 사진 보이는 위치</b> · 팝업에서 잘리는 부분을 조절합니다</label>
      <input type="range" id="cp" min="0" max="100" value="${v}" ${c.cfit ? "disabled" : ""}>
      <div class="note" style="display:flex;justify-content:space-between"><span>위 / 왼쪽</span><span>가운데</span><span>아래 / 오른쪽</span></div>
      <label class="note" style="display:block;margin-top:10px"><input type="checkbox" id="cfit" ${c.cfit ? "checked" : ""}> 사진 전체 보이기 (잘리지 않게 · 포스터처럼 긴 사진에 추천)</label></div></div>`;
    const im = $("#cposBox img");
    $("#cp").oninput = e => { c.cpos = +e.target.value; im.style.cssText = coverPos(c.cpos); };
    $("#cfit").onchange = e => { if (e.target.checked) c.cfit = true; else delete c.cfit; cp(); };
  };
  th();
  $("#thumbs").onclick = e => {
    const b = e.target.closest("[data-r]"); if (b) { c.imgs.splice(+b.dataset.r, 1); th(); }
    const v = e.target.closest("[data-c]"); if (v) { c.imgs.unshift(c.imgs.splice(+v.dataset.c, 1)[0]); th(); }
  };
  // 사진 끌어다 놓아 순서 바꾸기
  let drag = null;
  $("#thumbs").ondragstart = e => { drag = e.target.closest("[data-i]"); if (!drag) return; drag.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ""); };
  $("#thumbs").ondragover = e => {
    if (!drag) return; e.preventDefault();
    const t = e.target.closest("[data-i]"); if (!t || t === drag) return;
    const r = t.getBoundingClientRect();
    t.parentNode.insertBefore(drag, e.clientX < r.left + r.width / 2 ? t : t.nextSibling);
  };
  $("#thumbs").ondrop = e => e.preventDefault();
  $("#thumbs").ondragend = () => {
    if (!drag) return; drag = null;
    c.imgs = [...$("#thumbs").children].map(d => c.imgs[+d.dataset.i]); th();
  };
  $("#files").onchange = async e => {
    const fs = [...e.target.files]; e.target.value = "";
    for (let i = 0; i < fs.length; i++) { busy(`사진 줄이는 중… (${i + 1} / ${fs.length})`); c.imgs.push(await shrink(fs[i])); }
    busy(); th();
  };

  // 게시물 저장·삭제
  $("#save").onclick = () => {
    const s = +$("#s").value, e2 = +$("#e").value;
    if (!$("#title").value.trim()) return alert("제목을 입력하세요.");
    if (e2 < s) return alert("종료 월은 시작 월보다 빠를 수 없습니다.");
    Object.assign(c, { role: $("#role").value, s, e: e2, title: $("#title").value.trim(), desc: $("#desc").value,
      pts: $("#pts").value.split("\n").map(x => x.trim()).filter(Boolean), kw: $("#kw").value.split(",").map(x => x.trim()).filter(Boolean) });
    save(d => { const i = d.posts.findIndex(p => p.id === c.id); if (i >= 0) d.posts[i] = clone(c); else d.posts.push(clone(c)); },
      "성과 저장: " + c.title, () => { cur = null; });
  };
  $("#new").onclick = () => { cur = null; render(); };
  app.onclick = e => {
    const ed = e.target.closest("[data-e]"), de = e.target.closest("[data-d]");
    if (ed) { cur = clone(posts.find(p => p.id === ed.dataset.e)); render(); scrollTo(0, 0); }
    if (de && confirm("정말 삭제할까요? 사진도 함께 삭제됩니다.")) {
      const t = posts.find(p => p.id === de.dataset.d);
      save(d => { d.posts = d.posts.filter(p => p.id !== de.dataset.d); }, "성과 삭제: " + (t ? t.title : ""), () => { if (cur && cur.id === de.dataset.d) cur = null; });
    }
  };

  // 배너
  document.querySelectorAll("[data-bf]").forEach(inp => inp.onchange = async e => {
    const f = e.target.files[0], k = inp.dataset.bf; if (!f) return;
    busy("사진 줄이는 중…"); const img = await shrink(f, 2000, .85); busy();
    save(d => { d.banners[k] = Object.assign({ pos: 50, mode: "below" }, d.banners[k], { img }); }, ROLES[k].name + " 배너 사진 변경");
  });
  document.querySelectorAll("[data-bp]").forEach(inp => {
    const prev = inp.closest(".bnitem").querySelector(".bnprev"), k = inp.dataset.bp;
    inp.oninput = () => { prev.style.backgroundPosition = `center ${inp.value}%`; };
    inp.onchange = () => save(d => { if (d.banners[k]) d.banners[k].pos = +inp.value; }, ROLES[k].name + " 배너 위치 변경");
  });
  document.querySelectorAll("[data-bt]").forEach(inp => inp.onchange = () => {
    const k = inp.dataset.bt;
    save(d => { const b = d.banners[k]; if (b) { b.mode = inp.value; delete b.text; } }, ROLES[k].name + " 배너 글자 위치 변경");
  });
  document.querySelectorAll("[data-bd]").forEach(b => b.onclick = () => {
    const k = b.dataset.bd;
    if (confirm("이 배너를 삭제할까요?")) save(d => { delete d.banners[k]; }, ROLES[k].name + " 배너 삭제");
  });
}

/* ---------- 교사 수업 사례 공유 (과목 탭 · 포스터) ---------- */
// 과목 추가·이름·순서·삭제는 바로 저장되고, 포스터는 고친 뒤 '이 과목 저장'을 눌러 한 번에 저장합니다.
let ccId = null;
const ccDirty = () => cc && JSON.stringify(cc) !== JSON.stringify(cases.find(x => x.id === cc.id) || null);
function renderCases() {
  const box = $("#casesBox");
  if (!cases.some(x => x.id === ccId)) ccId = cases.length ? cases[0].id : null;
  if (!cc || cc.id !== ccId) cc = ccId ? clone(cases.find(x => x.id === ccId)) : null;
  const c = cc, ci = cases.findIndex(x => x.id === ccId);
  box.innerHTML = `<h2>교사 수업 사례 공유</h2>
  <p class="note" style="margin-bottom:12px">교사 페이지 아래 '수업 사례 공유'에 과목 탭으로 표시됩니다. 과목을 고른 뒤 포스터를 올리고 <b>이 과목 저장</b>을 누르세요. 포스터 글자가 잘 보이도록 큰 사진(가로 1200px 이상)을 권장합니다.</p>
  <div class="ctabs">${cases.map(x => `<button class="ctab${x.id === ccId ? " on" : ""}" data-cs="${x.id}">${esc(x.name)} <small>${x.posters.length}</small></button>`).join("")}</div>
  <div class="bar2" style="margin:12px 0 18px"><button class="btn ghost" id="cadd">＋ 과목 추가</button>${c ? `<button class="btn ghost" id="cren">이름 바꾸기</button>
    <button class="btn ghost" data-cmv="-1" ${ci > 0 ? "" : "disabled"}>◀ 앞으로</button><button class="btn ghost" data-cmv="1" ${ci < cases.length - 1 ? "" : "disabled"}>뒤로 ▶</button>
    <button class="btn danger" id="cdel">과목 삭제</button>` : ""}</div>
  ${c ? `<div class="f"><label>${esc(c.name)} 포스터 올리기 (여러 장 가능 · 첫 번째 포스터가 맨 앞에 보입니다)</label><input type="file" id="cfiles" accept="image/*" multiple></div>
  <div class="cposters">${c.posters.map((p, i) => `<div class="cpitem"><img src="${src(p.img)}" alt="">
    <input data-ct="${i}" value="${esc(p.title)}" placeholder="수업 주제 (예: AI로 만드는 시)"><input data-ctc="${i}" value="${esc(p.teacher)}" placeholder="교사명 (선택)">
    <div class="bar2"><button class="btn ghost" data-cm="${i}" data-dir="-1" ${i ? "" : "disabled"}>◀</button><button class="btn ghost" data-cm="${i}" data-dir="1" ${i < c.posters.length - 1 ? "" : "disabled"}>▶</button><button class="btn danger" data-cx="${i}">삭제</button></div></div>`).join("") || '<p class="note">아직 올린 포스터가 없습니다.</p>'}</div>
  <div class="bar2" style="margin-top:16px"><button class="btn primary" id="csave">이 과목 저장</button><button class="btn ghost" id="creset">되돌리기</button>${ccDirty() ? '<span class="note" style="align-self:center;color:#e5484d">저장하지 않은 변경 내용이 있습니다</span>' : ""}</div>`
  : '<p class="note">과목이 없습니다. 과목을 추가해 주세요.</p>'}`;

  const clean = () => !ccDirty() || (alert("먼저 포스터 변경 내용을 '이 과목 저장'으로 저장하거나 '되돌리기'를 눌러 주세요."), false);
  box.onclick = e => {
    const t = e.target.closest("[data-cs]");
    if (t && t.dataset.cs !== ccId) {
      if (ccDirty() && !confirm("저장하지 않은 포스터 변경 내용이 있습니다. 버리고 다른 과목으로 갈까요?")) return;
      ccId = t.dataset.cs; cc = null; return renderCases();
    }
    const m = e.target.closest("[data-cm]");
    if (m) { const i = +m.dataset.cm, j = i + +m.dataset.dir; [c.posters[i], c.posters[j]] = [c.posters[j], c.posters[i]]; return renderCases(); }
    const x = e.target.closest("[data-cx]");
    if (x && confirm("이 포스터를 뺄까요? ('이 과목 저장'을 눌러야 사이트에 반영됩니다)")) { c.posters.splice(+x.dataset.cx, 1); return renderCases(); }
    const mv = e.target.closest("[data-cmv]");
    if (mv && clean()) {
      const dir = +mv.dataset.cmv;
      save(d => { const i = d.cases.findIndex(y => y.id === c.id), j = i + dir; if (i >= 0 && j >= 0 && j < d.cases.length) [d.cases[i], d.cases[j]] = [d.cases[j], d.cases[i]]; },
        "수업 사례 과목 순서 변경: " + c.name);
    }
  };
  box.oninput = e => {
    const t = e.target;
    if (t.dataset.ct != null) c.posters[+t.dataset.ct].title = t.value;
    if (t.dataset.ctc != null) c.posters[+t.dataset.ctc].teacher = t.value;
  };

  $("#cadd").onclick = () => {
    if (!clean()) return;
    const name = (prompt("추가할 과목 이름 (예: 진로)") || "").trim(); if (!name) return;
    const id = "c" + Date.now().toString(36);
    save(d => { d.cases.push({ id, name, posters: [] }); }, "수업 사례 과목 추가: " + name, () => { ccId = id; cc = null; });
  };
  if (!c) return;
  $("#cren").onclick = () => {
    if (!clean()) return;
    const name = (prompt("새 과목 이름", c.name) || "").trim(); if (!name || name === c.name) return;
    save(d => { const y = d.cases.find(y => y.id === c.id); if (y) y.name = name; }, `수업 사례 과목 이름 변경: ${c.name} → ${name}`, () => { cc = null; });
  };
  $("#cdel").onclick = () => {
    const n = (cases.find(y => y.id === c.id) || c).posters.length;
    if (!confirm(`'${c.name}' 과목${n ? `과 포스터 ${n}장` : ""}을 삭제할까요?`)) return;
    save(d => { d.cases = d.cases.filter(y => y.id !== c.id); }, "수업 사례 과목 삭제: " + c.name, () => { cc = null; });
  };
  $("#cfiles").onchange = async e => {
    const fs = [...e.target.files]; e.target.value = "";
    for (let i = 0; i < fs.length; i++) { busy(`포스터 줄이는 중… (${i + 1} / ${fs.length})`); c.posters.push({ img: await shrink(fs[i], 2400, .85), title: "", teacher: "" }); }
    busy(); renderCases();
  };
  $("#csave").onclick = () => save(d => {
    const y = d.cases.find(y => y.id === c.id);
    if (y) y.posters = clone(c.posters); else d.cases.push(clone(c));
  }, "수업 사례 저장: " + c.name, () => { cc = null; });
  $("#creset").onclick = () => { cc = null; renderCases(); };
}

function shrink(f, max = 1600, q = .82) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", q)); }; im.src = r.result; };
    r.readAsDataURL(f);
  });
}

isAdmin() ? load() : login();
