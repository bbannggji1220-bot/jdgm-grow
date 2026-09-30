const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const app = $("#app");
let posts = [], cur = null; // cur = 편집 중인 게시물

function login() {
  app.innerHTML = `<div class="box" style="max-width:420px;margin:60px auto"><h1>관리자 로그인</h1><p class="note" style="margin-bottom:16px">성과를 등록·수정하려면 비밀번호를 입력하세요.</p>
  <div class="f"><input type="password" id="pw" placeholder="비밀번호" autofocus></div><button class="btn primary" id="go">로그인</button><p id="err" class="note" style="color:#e5484d;margin-top:10px"></p></div>`;
  const go = () => { if ($("#pw").value === ADMIN_PW) { sessionStorage.setItem(AUTH, "1"); panel(); } else $("#err").textContent = "비밀번호가 맞지 않습니다."; };
  $("#go").onclick = go; $("#pw").onkeydown = e => { if (e.key === "Enter") go(); };
}

const blank = () => ({ id: "n" + Date.now(), role: "student", s: 3, e: 3, title: "", desc: "", pts: [], kw: [], imgs: [] });
const monthOpts = v => [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => `<option value="${m}" ${m === v ? "selected" : ""}>${m}월</option>`).join("");

function panel() {
  posts = getPosts();
  const banners = getBanners();
  if (!cur) cur = blank();
  const c = cur;
  app.innerHTML = `<h1>성과 관리</h1><p class="note">등록한 내용은 이 브라우저에 임시 저장됩니다. 모든 방문자에게 보이려면 아래 <b>게시용 파일 내보내기</b> 후 폴더의 <code>posts.js</code>를 교체하세요.</p>
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
    <div class="f"><label>사진 (여러 장 가능 · 첫 번째 사진이 대표 사진 · 사진을 끌어서 순서 변경)</label><input type="file" id="files" accept="image/*" multiple><div class="thumbs" id="thumbs"></div></div>
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
      <div class="bnprev${b.img ? "" : " empty"}" style="${b.img ? `background-image:url('${b.img}');background-position:center ${b.pos == null ? 50 : b.pos}%` : `background:${ROLES[k].soft}`}">${b.img ? "" : "배너 사진 없음 (기본 색·이모티콘 표시)"}</div>
      <div class="bar2" style="align-items:center;flex-wrap:wrap">
        <label class="btn ghost" style="cursor:pointer">사진 ${b.img ? "변경" : "올리기"}<input type="file" accept="image/*" data-bf="${k}" hidden></label>
        ${b.img ? `<label class="note">세로 위치 <input type="range" min="0" max="100" value="${b.pos == null ? 50 : b.pos}" data-bp="${k}"></label>
        <label class="note">글자 <select data-bt="${k}">${[["below", "사진 아래에 (추천·항상 잘 보임)"], ["over", "사진 위에 겹치기 (어둡게 처리)"], ["none", "숨기기 (사진만)"]].map(o => `<option value="${o[0]}" ${bannerMode(b) === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></label>
        <button class="btn danger" data-bd="${k}">배너 삭제</button>` : ""}
      </div></div>`; }).join("")}</div>
  </div>
  <div class="box"><h2>게시 / 백업</h2><div class="bar2">
    <button class="btn primary" id="exp">게시용 파일 내보내기 (posts.js)</button>
    <button class="btn ghost" id="rst">작업본 초기화</button>
    <button class="btn ghost" id="out">로그아웃</button></div>
    <p class="note" style="margin-top:10px">내보낸 <code>posts.js</code>를 사이트 폴더의 기존 파일 위에 덮어쓰면 방문자 모두에게 반영됩니다. 사진은 자동으로 축소되어 파일에 포함됩니다.</p></div>`;

  const th = () => { $("#thumbs").innerHTML = c.imgs.map((s, i) => `<div draggable="true" data-i="${i}" title="끌어서 순서 바꾸기"><img src="${s}" draggable="false"><button class="rm" data-r="${i}">✕</button>${i === 0 ? '<span class="cv on">대표</span>' : `<button class="cv" data-c="${i}">대표로</button>`}</div>`).join(""); };
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
  $("#files").onchange = async e => { for (const f of e.target.files) c.imgs.push(await shrink(f)); e.target.value = ""; th(); };
  $("#save").onclick = () => {
    const s = +$("#s").value, e2 = +$("#e").value;
    if (!$("#title").value.trim()) return alert("제목을 입력하세요.");
    if (e2 < s) return alert("종료 월은 시작 월보다 빠를 수 없습니다.");
    Object.assign(c, { role: $("#role").value, s, e: e2, title: $("#title").value.trim(), desc: $("#desc").value,
      pts: $("#pts").value.split("\n").map(x => x.trim()).filter(Boolean), kw: $("#kw").value.split(",").map(x => x.trim()).filter(Boolean) });
    const i = posts.findIndex(p => p.id === c.id);
    if (i >= 0) posts[i] = c; else posts.push(c);
    if (savePosts(posts)) { cur = null; panel(); alert("저장되었습니다."); }
  };
  const bnSave = () => { if (saveBanners(banners)) panel(); };
  document.querySelectorAll("[data-bf]").forEach(inp => inp.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    banners[inp.dataset.bf] = Object.assign({ pos: 50, mode: "below" }, banners[inp.dataset.bf], { img: await shrink(f, 2000, .85) });
    bnSave();
  });
  document.querySelectorAll("[data-bp]").forEach(inp => {
    const prev = inp.closest(".bnitem").querySelector(".bnprev");
    inp.oninput = () => { prev.style.backgroundPosition = `center ${inp.value}%`; };
    inp.onchange = () => { banners[inp.dataset.bp].pos = +inp.value; saveBanners(banners); };
  });
  document.querySelectorAll("[data-bt]").forEach(inp => inp.onchange = () => { const b = banners[inp.dataset.bt]; b.mode = inp.value; delete b.text; saveBanners(banners); });
  document.querySelectorAll("[data-bd]").forEach(b => b.onclick = () => { if (confirm("이 배너를 삭제할까요?")) { delete banners[b.dataset.bd]; bnSave(); } });
  $("#new").onclick = () => { cur = null; panel(); };
  app.onclick = e => {
    const ed = e.target.closest("[data-e]"), de = e.target.closest("[data-d]");
    if (ed) { cur = JSON.parse(JSON.stringify(posts.find(p => p.id === ed.dataset.e))); panel(); scrollTo(0, 0); }
    if (de && confirm("정말 삭제할까요?")) { posts = posts.filter(p => p.id !== de.dataset.d); if (savePosts(posts)) { cur = null; panel(); } }
  };
  $("#exp").onclick = () => {
    const txt = "// 관리자 페이지에서 내보낸 게시본\nwindow.PUBLISHED_POSTS = " + JSON.stringify(posts) + ";\nwindow.PUBLISHED_BANNERS = " + JSON.stringify(banners) + ";\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/javascript" })); a.download = "posts.js"; a.click();
  };
  $("#rst").onclick = () => { if (confirm("이 브라우저의 작업본을 지우고 게시본(posts.js)으로 되돌릴까요?")) { resetDraft(); cur = null; panel(); } };
  $("#out").onclick = () => { sessionStorage.removeItem(AUTH); login(); };
}

function shrink(f, max = 1000, q = .8) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", q)); }; im.src = r.result; };
    r.readAsDataURL(f);
  });
}

isAdmin() ? panel() : login();
