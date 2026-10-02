// 성과 데이터 저장소 (게시물 = 타임라인의 압정 1개)
// 우선순위: 게시본(posts.js) > 기본값(data.js)
// 관리자 모드는 GitHub에 직접 저장합니다: 사진은 photos/ 폴더의 파일로, 글은 posts.js 로.
const ADMIN_PW = "1220";
const AUTH = "gs_admin_ok";
const GH_REPO = "bbannggji1220-bot/jdgm-grow", GH_BRANCH = "main";

function parseM(m) { const r = /(\d+)월(?:~(\d+)월)?/.exec(m); const s = +r[1]; return { s, e: r[2] ? +r[2] : s }; }
function mlabel(p) { return p.s === p.e ? p.s + "월" : p.s + "월~" + p.e + "월"; }
function seed() {
  const out = [];
  ORDER.forEach(k => ROLES[k].items.forEach((it, i) => {
    const { s, e } = parseM(it.m);
    out.push({ id: k + "-" + i, role: k, s, e, title: it.t, desc: it.d, pts: it.pts || [], kw: it.kw || [], imgs: [] });
  }));
  return out;
}
function getPosts() { return window.PUBLISHED_POSTS || seed(); }

// 분야별 상단 배너 { student: { img, pos(0~100, 세로 위치), mode(below|over|none) }, ... }
function getBanners() { return window.PUBLISHED_BANNERS || {}; }
// 예전 형식(text: false)도 읽을 수 있게 변환
function bannerMode(b) { return b.mode || (b.text === false ? "none" : "below"); }

// 대표 사진에서 보일 위치(0~100). 잘리는 방향(가로·세로)에만 적용됩니다.
const coverPos = v => `object-position:${v == null ? 50 : v}% ${v == null ? 50 : v}%`;

// 교사 페이지 탭 갤러리 두 가지
//  수업 사례 공유: [{ id, name(과목), posters: [{ img, title, teacher }] }, ...]
//  AI 코스웨어 활용: [{ id, name(코스웨어), desc, url, img(로고), posters: [...] }, ...]
const webUrl = u => /^https?:\/\//i.test(u) ? u : "https://" + u;
const seedCases = () => CASE_SUBJECTS.map((name, i) => ({ id: "c" + i, name, posters: [] }));
const seedTools = () => TOOL_NAMES.map((name, i) => ({ id: "t" + i, name, desc: "", url: "", posters: [] }));
function getCases() { return window.PUBLISHED_CASES || seedCases(); }
function getTools() { return window.PUBLISHED_TOOLS || seedTools(); }

// 교사 페이지 '디지털 튜터' 섹션: { intro, period, roles: [{ icon, title, desc }], stats: [{ n, label }], photos: [{ img, title }] }
const seedTutor = () => ({
  intro: "디지털 튜터 선생님이 학교의 디지털 기기·교구를 관리하고, AI·디지털 활용 수업에 보조 교사로 함께 들어와 디지털 역량 격차가 큰 학생들을 곁에서 돕습니다.",
  period: "",
  roles: [
    { icon: "🧰", title: "디지털 도구·교구 관리", desc: "태블릿·노트북 등 디지털 기기와 교구를 점검·정리하고, 수업 전에 미리 준비합니다." },
    { icon: "🤝", title: "AI 활용 수업 보조", desc: "AI·디지털 활용 수업에 보조 교사로 참여해 수업 운영과 기기 사용을 돕습니다." },
    { icon: "🎯", title: "학생 개별 지원", desc: "디지털 활용이 어려운 학생 곁에서 1:1로 도와 모든 학생이 수업에 참여할 수 있게 합니다." }
  ],
  stats: [],
  photos: []
});
function getTutor() { return window.PUBLISHED_TUTOR || seedTutor(); }

function postsJs(posts, banners, cases, tools, tutor) {
  return "// 관리자 페이지에서 저장한 게시본\nwindow.PUBLISHED_POSTS = " + JSON.stringify(posts, null, 1) +
    ";\nwindow.PUBLISHED_BANNERS = " + JSON.stringify(banners, null, 1) +
    ";\nwindow.PUBLISHED_CASES = " + JSON.stringify(cases, null, 1) +
    ";\nwindow.PUBLISHED_TOOLS = " + JSON.stringify(tools, null, 1) +
    ";\nwindow.PUBLISHED_TUTOR = " + JSON.stringify(tutor, null, 1) + ";\n";
}

// 예전 방식(브라우저 임시 저장)으로 남아 있는 작업본
const OLD_KEYS = ["gs_posts_v1", "gs_banners_v1"];
function oldDraft() {
  try {
    const p = localStorage.getItem(OLD_KEYS[0]), b = localStorage.getItem(OLD_KEYS[1]);
    return p || b ? { posts: p ? JSON.parse(p) : null, banners: b ? JSON.parse(b) : null } : null;
  } catch (e) { return null; }
}
function clearOldDraft() { try { OLD_KEYS.forEach(k => localStorage.removeItem(k)); } catch (e) {} }
function isAdmin() { try { return sessionStorage.getItem(AUTH) === "1"; } catch (e) { return false; } }
