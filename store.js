// 성과 데이터 저장소 (게시물 = 타임라인의 압정 1개)
// 우선순위: 관리자 브라우저의 작업본(localStorage) > 게시본(posts.js) > 기본값(data.js)
const ADMIN_PW = "1220";
const KEY = "gs_posts_v1", AUTH = "gs_admin_ok";

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
function hasDraft() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
function getPosts() {
  try { const l = localStorage.getItem(KEY); if (l) return JSON.parse(l); } catch (e) {}
  if (window.PUBLISHED_POSTS) return window.PUBLISHED_POSTS;
  return seed();
}
function savePosts(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); return true; }
  catch (e) { alert("저장 공간이 부족합니다. 사진 수를 줄이거나 '게시용 파일 내보내기' 후 오래된 사진을 삭제하세요."); return false; }
}
function resetDraft() { try { localStorage.removeItem(KEY); localStorage.removeItem(BKEY); } catch (e) {} }

// 분야별 상단 배너 { student: { img, pos(0~100, 세로 위치), text(문구 표시 여부) }, ... }
const BKEY = "gs_banners_v1";
function getBanners() {
  try { const l = localStorage.getItem(BKEY); if (l) return JSON.parse(l); } catch (e) {}
  return window.PUBLISHED_BANNERS || {};
}
// 예전 형식(text: false)도 읽을 수 있게 변환
function bannerMode(b) { return b.mode || (b.text === false ? "none" : "below"); }
function saveBanners(b) {
  try { localStorage.setItem(BKEY, JSON.stringify(b)); return true; }
  catch (e) { alert("저장 공간이 부족합니다. 더 작은 사진을 사용해 주세요."); return false; }
}
function isAdmin() { try { return sessionStorage.getItem(AUTH) === "1"; } catch (e) { return false; } }
