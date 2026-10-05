const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const page = document.body.dataset.page;

/* ---------- 공통: 헤더 / 푸터 / 팝업 ---------- */
function header() {
  const tabs = ORDER.map(k => `<a href="${k}.html" class="${page === k ? "on " + k : ""}">${ROLES[k].name}</a>`).join("");
  $("#hdr").innerHTML = `<div class="wrap">
    <a class="brand" href="index.html"><img src="school-logo.png" alt="제주동여자중학교 로고"><div>${SITE.name}<small>${SITE.program}</small></div></a>
    <nav class="tabs"><a href="index.html" class="${page === "home" ? "on" : ""}">홈</a>${tabs}</nav></div>`;
  $("#ftr").innerHTML = `<div class="wrap"><div><b>${SITE.name}</b><br>${SITE.program} 성과 공유 사이트<br>교사·학생·학부모가 함께 GROW하는 학교<br><a href="admin.html" style="opacity:.6">관리자</a></div><img src="GROW 로고.png" alt="GROW"></div>`;
}

function modal() {
  document.body.insertAdjacentHTML("beforeend", `<div class="modal" id="modal"><div class="sheet"><button class="x" aria-label="닫기">✕</button><div id="mbody"></div></div></div>
    <div class="album" id="album"><button class="ax" aria-label="닫기">✕</button><button class="nav prev" aria-label="이전">‹</button><figure><img id="abig" alt=""><figcaption id="acnt"></figcaption></figure><button class="nav next" aria-label="다음">›</button><div class="astrip" id="astrip"></div></div>`);
  const m = $("#modal"), al = $("#album");
  m.addEventListener("click", e => {
    if (e.target === m || e.target.closest(".x")) m.classList.remove("open");
    if (e.target.closest(".albtn") || e.target.closest(".cover img")) openAlbum(0);
  });
  al.addEventListener("click", e => {
    if (e.target === al || e.target.closest(".ax")) return al.classList.remove("open");
    if (e.target.closest(".prev")) showAlbum(album.i - 1);
    if (e.target.closest(".next")) showAlbum(album.i + 1);
    const t = e.target.closest("[data-a]"); if (t) showAlbum(+t.dataset.a);
  });
  document.addEventListener("keydown", e => {
    if (al.classList.contains("open")) {
      if (e.key === "Escape") al.classList.remove("open");
      if (e.key === "ArrowLeft") showAlbum(album.i - 1);
      if (e.key === "ArrowRight") showAlbum(album.i + 1);
    } else if (e.key === "Escape") m.classList.remove("open");
  });
}
const album = { imgs: [], caps: [], descs: [], i: 0 }; // descs: 사진 아래 설명
function openAlbum(i) {
  if (!album.imgs.length) return;
  $("#astrip").innerHTML = album.imgs.map((s, k) => `<img src="${s}" data-a="${k}" alt="">`).join("");
  $("#album").classList.add("open");
  showAlbum(i);
}
function showAlbum(i) {
  const n = album.imgs.length;
  album.i = (i + n) % n;
  $("#abig").src = album.imgs[album.i];
  const cap = album.caps[album.i], d = album.descs[album.i];
  $("#acnt").innerHTML = esc((cap ? cap + "  ·  " : "") + `${album.i + 1} / ${n}`) + (d ? `<span class="adesc">${esc(d)}</span>` : "");
  $("#astrip").querySelectorAll("img").forEach((im, k) => im.classList.toggle("on", k === album.i));
  $("#album").classList.toggle("single", n < 2);
}
function openModal({ badge, title, desc, pts, imgs, color, wide, icon, cpos, cfit }) {
  const m = $("#modal");
  m.style.setProperty("--accent", color || "var(--brand)");
  album.imgs = imgs || []; album.caps = []; album.descs = [];
  const text = `<span class="badge">${esc(badge)}</span><h3>${esc(title)}</h3><p class="pre">${esc(desc)}</p>` +
    (pts && pts.length ? `<ul>${pts.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : "");
  const n = album.imgs.length;
  const side = n
    ? `<div class="cover${cfit ? " fit" : ""}"><img src="${album.imgs[0]}" alt="대표 사진" style="${cfit ? "" : coverPos(cpos)}"></div><button class="btn albtn">📷 사진첩 보기 <b>${n}</b></button>`
    : `<div class="cover empty"><span>${icon || "🖼️"}</span><small>사진이 업로드될 예정입니다</small></div>`;
  $(".sheet", m).classList.toggle("wide", !!wide);
  $("#mbody").innerHTML = wide ? `<div class="mgrid"><div class="mside">${side}</div><div class="mtext">${text}</div></div>` : text;
  m.classList.add("open");
}

/* ---------- 홈 ---------- */
function home() {
  const posts = getPosts();
  $("#logomap").addEventListener("click", e => {
    const b = e.target.closest(".hot"); if (!b) return;
    const g = SITE.grow[b.dataset.i];
    openModal({ badge: `${g.l} · ${g.t}`, title: g.k, desc: g.d, pts: g.pts });
  });

  const NOW = [
    ["01 · STUDENT", "학생의 변화", "배우는 AI → 만들어보는 AI → 활용하는 AI", "student"],
    ["02 · TEACHER", "교사의 변화", "함께 배우고 → 함께 나누고 → 수업으로 연결", "teacher"],
    ["03 · PARENT", "학부모의 변화", "알아가기 → 이해하기 → 함께하기", "parent"]
  ];
  $("#now3").innerHTML = NOW.map(n => `<a class="ncard" href="${n[3]}.html"><div class="k">${n[0]}</div><h3>${n[1]}</h3><p>${n[2]}</p><span class="go">핵심 활동 보기 →</span></a>`).join("");

  const FLOW = [
    [2, 3, "2–3월", "시작과 준비", "교육과정 협의 · 역량 강화 프로그램 · 학부모 설명회"],
    [4, 7, "4–7월", "배우고 공유하기", "AI 연수 · 디지털 콘텐츠 · 포트폴리오 · 상반기 사례 공유"],
    [8, 8, "8월", "밖으로 넓히기", "도외 워크숍 · AI 연수 · 학교 방문"],
    [9, 10, "9–10월", "직접 경험하기", "AI 페스타 · 학부모 특강 · 바이브 코딩 · 자기주도학습"],
    [11, 12, "11–12월", "성찰과 확산", "AI 연수 · 하반기 평가회 · 수업 사례 공유"]
  ];
  $("#flow5").innerHTML = FLOW.map((f, i) => `<button class="fcard" data-i="${i}"><div class="m">${f[2]}</div><h3>${f[3]}</h3><p>${f[4]}</p></button>`).join("");
  $("#flow5").addEventListener("click", e => {
    const b = e.target.closest(".fcard"); if (!b) return;
    const f = FLOW[b.dataset.i];
    const hit = posts.filter(p => p.s <= f[1] && p.e >= f[0]).sort((a, b) => a.s - b.s);
    openModal({ badge: f[2], title: f[3], desc: "이 시기에 운영한 활동입니다.",
      pts: hit.map(p => `[${ROLES[p.role].name}] ${mlabel(p)} · ${p.title}`) });
  });
}

/* ---------- 역할 페이지: 2월~12월 타임라인 ---------- */
function role(key) {
  const r = ROLES[key];
  document.documentElement.style.setProperty("--accent", r.color);
  document.documentElement.style.setProperty("--soft", r.soft);
  document.title = `${r.name} 성과 | ${SITE.name}`;
  const posts = getPosts().filter(p => p.role === key).sort((a, b) => a.s - b.s || a.e - b.e);
  const bn = getBanners()[key];
  const hero = $("#rhero");
  if (bn && bn.img) {
    // mode: below(사진 아래 글자) · over(사진 위 겹치기) · none(사진만)
    const mode = bannerMode(bn);
    const txt = `<div class="wrap"><div><span class="pill">${r.name}</span><h1>${r.slogan}</h1><p>${r.desc}</p></div></div>`;
    const img = `background-image:url('${bn.img}');background-position:center ${bn.pos == null ? 50 : bn.pos}%`;
    hero.className = "rhero banner " + mode;
    hero.innerHTML = `<div class="bnimg" style="${img}">${mode === "over" ? txt : ""}</div>${mode === "below" ? txt : ""}`;
  } else {
    hero.innerHTML = `<div class="wrap"><div><span class="pill">${r.name}</span><h1>${r.slogan}</h1><p>${r.desc}</p></div>
    <div class="emoji">${r.icon}</div></div>`;
  }

  const MS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const axis = MS.map(m => `<div class="mth">${m}월</div>`).join("");
  const lanes = posts.map((p, i) => {
    const col = `${p.s - 1} / ${p.e}`;
    const range = p.e > p.s;
    const right = 12 - p.e >= 3, left = p.s - 2 >= 3;
    let lab;
    if (right) lab = `<div class="lab" style="grid-column:${p.e} / 12;grid-row:1">${esc(p.title)}</div>`;
    else if (left) lab = `<div class="lab l" style="grid-column:1 / ${p.s - 1};grid-row:1">${esc(p.title)}</div>`;
    else lab = `<div class="lab u" style="grid-column:1 / -1;grid-row:2">${esc(p.title)}</div>`;
    const hasImg = p.imgs && p.imgs.length ? " 📷" : "";
    return `<div class="lane"><div class="pinwrap ${range ? "range" : ""}" style="grid-column:${col};grid-row:1"><button class="pin" data-id="${esc(p.id)}" title="${esc(p.title)}"><span>📌</span></button></div>${lab.replace("</div>", hasImg + "</div>")}</div>`;
  }).join("");
  $("#tl").innerHTML = posts.length
    ? `<div class="tl"><div class="axis">${axis}</div><div class="lanes">${lanes}</div></div>`
    : `<p style="text-align:center;color:var(--muted)">등록된 성과가 없습니다.</p>`;
  $("#tl").addEventListener("click", e => {
    const b = e.target.closest(".pin"); if (!b) return;
    const p = posts.find(x => x.id === b.dataset.id);
    openModal({ badge: mlabel(p), title: p.title, desc: p.desc, pts: p.pts, imgs: p.imgs, color: r.color, wide: true, icon: r.icon, cpos: p.cpos, cfit: p.cfit });
  });

  if ($("#cases-sec")) cases();
  if ($("#tutor-sec")) tutorSec();

  $("#others").innerHTML = ORDER.filter(k => k !== key).map(k => `<a class="btn ghost" href="${k}.html">${ROLES[k].icon} ${ROLES[k].name} 성과 보기</a>`).join("");
}

/* ---------- 교사 페이지: 탭 갤러리 (왼쪽 수업 사례 공유 · 오른쪽 AI 코스웨어 활용) ---------- */
function gallery(el, list, empty, info) {
  if (!list.length) return el.remove();
  let cur = (list.find(c => c.posters.length || c.desc) || list[0]).id;
  const tabs = $(".ctabs", el), body = $(".cbody", el);
  const draw = () => {
    const c = list.find(x => x.id === cur), n = c.posters.length;
    tabs.innerHTML = list.map(x => `<button class="ctab${x.id === cur ? " on" : ""}" role="tab" aria-selected="${x.id === cur}" data-c="${x.id}">${esc(x.name)}${x.posters.length ? ` <small>${x.posters.length}</small>` : ""}</button>`).join("");
    const intro = info && (c.desc || c.url || c.img)
      ? `<div class="ctool"><div class="ctop">${c.img ? `<img src="${c.img}" alt="">` : `<span class="clogo">🤖</span>`}<b>${esc(c.name)}</b></div>
        ${c.desc ? `<p>${esc(c.desc)}</p>` : ""}${c.url ? `<a class="btn ghost" href="${esc(webUrl(c.url))}" target="_blank" rel="noopener">사이트 바로가기 ↗</a>` : ""}</div>` : "";
    const grid = n
      ? `<div class="cgrid${n === 1 ? " one" : ""}">${c.posters.map((p, i) => `<button class="cpost" data-p="${i}"><span class="cimg"><img src="${p.img}" alt="${esc(p.title || c.name)}" loading="lazy"></span>
        ${p.title || p.teacher || p.desc ? `<span class="ccap">${p.title ? `<b>${esc(p.title)}</b>` : ""}${p.teacher ? `<small>${esc(p.teacher)}</small>` : ""}${p.desc ? `<span class="cdesc">${esc(p.desc)}</span>` : ""}</span>` : ""}</button>`).join("")}</div>`
      : intro ? "" : `<div class="cempty"><span>${info ? "🤖" : "🗂️"}</span>${esc(c.name)} ${empty}</div>`;
    body.innerHTML = intro + grid;
  };
  draw();
  tabs.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { cur = b.dataset.c; draw(); } });
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-p]"); if (!b) return;
    const c = list.find(x => x.id === cur);
    album.imgs = c.posters.map(p => p.img);
    album.caps = c.posters.map(p => [p.title, p.teacher].filter(Boolean).join(" · "));
    album.descs = c.posters.map(p => p.desc || "");
    openAlbum(+b.dataset.p);
  });
}
function cases() {
  gallery($("#gal-cases"), getCases(), "수업 사례 포스터가 곧 올라올 예정입니다.");
  gallery($("#gal-tools"), getTools(), "소개와 활용 사례가 곧 올라올 예정입니다.", true);
  if (!$("#cases-sec .cpanel")) $("#cases-sec").remove();
}

/* ---------- 교사 페이지: 디지털 튜터와 함께하는 수업 ---------- */
function tutorSec() {
  const t = getTutor(), el = $("#tutor-sec .tpanel");
  if (!t.intro && !t.roles.length && !t.photos.length) return $("#tutor-sec").remove();
  el.innerHTML = `<div class="tsplit">
    <div class="tintro"><span class="tbadge">DIGITAL TUTOR</span><h2>디지털 튜터와 함께하는 수업</h2>
      ${t.period ? `<p class="tperiod">${esc(t.period)}</p>` : ""}${t.intro ? `<p class="tdesc">${esc(t.intro)}</p>` : ""}
      ${t.stats.length ? `<div class="tstats">${t.stats.map(s => `<div><b>${esc(s.n)}</b><small>${esc(s.label)}</small></div>`).join("")}</div>` : ""}</div>
    <div class="troles">${t.roles.map((r, i) => `<div class="trole"><span class="ticon">${esc(r.icon || "✨")}</span><div><small>ROLE ${String(i + 1).padStart(2, "0")}</small><b>${esc(r.title)}</b><p>${esc(r.desc)}</p></div></div>`).join("")}</div>
  </div>
  ${t.photos.length ? `<h3 class="tph">📷 수업 지원 모습</h3><div class="cgrid tgrid">${t.photos.map((p, i) => `<button class="cpost" data-p="${i}"><span class="cimg"><img src="${p.img}" alt="${esc(p.title || "디지털 튜터 수업 지원")}" loading="lazy"></span>
    ${p.title ? `<span class="ccap"><b>${esc(p.title)}</b></span>` : ""}</button>`).join("")}</div>` : ""}`;
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-p]"); if (!b) return;
    album.imgs = t.photos.map(p => p.img); album.caps = t.photos.map(p => p.title); album.descs = [];
    openAlbum(+b.dataset.p);
  });
}

if (page) { header(); modal(); if (page === "home") home(); else role(page); }
