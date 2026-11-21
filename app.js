/* =============================================================
   CLUTCH — app.js
   data.js 의 window.CLUTCH_DATA 를 읽어 화면을 그립니다.

   화면 구성
   · 홈        — 종목을 고르는 화면(축구/야구/농구/배구 타일 4개). 해시 없음.
   · 일정 목록  — 고른 종목의 경기를 날짜·시간·리그·대진만 한 줄씩 (해시 #soccer)
   · 클러치 상황 — 줄 오른쪽의 '클러치 상황' 버튼을 누르면 그 줄 바로 밑에
                   네모 박스가 펼쳐지고 경기 정보가 나온다(한 번에 한 경기만).
                   접힌 상태에서는 박스 내용이 DOM 에도 없다.

   · 로고(CLUTCH)나 '종목 선택' 칩을 누르면 홈으로
   · 날짜 버튼: 데이터에 있는 날짜만 표시
   · 종목별 빈 상태
   외부 라이브러리 없음. index.html 을 그냥 열어도 동작합니다.
   ============================================================= */
(function () {
  "use strict";

  var DATA = window.CLUTCH_DATA;
  var KST = "Asia/Seoul";

  /* ── DOM ───────────────────────────────────────────── */
  var elDates = document.getElementById("dates");
  var elWeekTitle = document.getElementById("weekTitle");
  var elWeek = document.querySelector(".week");
  var elWeekPrev = document.getElementById("weekPrev");
  var elWeekNext = document.getElementById("weekNext");
  var elTabs = document.getElementById("tabs");
  var elList = document.getElementById("list");
  var elPanel = document.getElementById("panel");
  var elEmpty = document.getElementById("empty");
  var elEmptyIco = document.getElementById("emptyIco");
  var elEmptyTitle = document.getElementById("emptyTitle");
  var elEmptyDesc = document.getElementById("emptyDesc");
  var elEmptyCta = document.getElementById("emptyCta");
  var elTitle = document.getElementById("listTitle");
  var elBrandDate = document.getElementById("brandDate");
  var elDataNote = document.getElementById("dataNote");
  var elDataChip = document.getElementById("dataChip");
  var elHomeLink = document.getElementById("homeLink");
  var elHomeLead = document.getElementById("homeLead");
  var elBack = document.getElementById("backBtn");
  var elLiveBar = document.getElementById("livebar");
  var elLivePill = document.getElementById("lbPill");
  var elLiveText = document.getElementById("lbText");
  var elLiveTime = document.getElementById("lbTime");
  var elLiveRefresh = document.getElementById("lbRefresh");

  if (!DATA || !Array.isArray(DATA.days) || !DATA.days.length) {
    elList.innerHTML = '<div class="empty"><h2>데이터를 찾지 못했습니다</h2>' +
      '<p>data.js 파일이 index.html 과 같은 폴더에 있는지 확인하세요.</p></div>';
    return;
  }

  var SPORTS = Array.isArray(DATA.sports) && DATA.sports.length ? DATA.sports : [
    { id: "soccer", name: "축구", icon: "⚽" },
    { id: "baseball", name: "야구", icon: "⚾" },
    { id: "basketball", name: "농구", icon: "🏀" },
    { id: "volleyball", name: "배구", icon: "🏐" }
  ];

  var DAYS = DATA.days.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

  // 경기 id → { g: 경기, date: 날짜 } 색인. 해시(#soccer/<id>)로 바로 열 때 씁니다.
  var GAMES = [];
  DAYS.forEach(function (d) {
    (Array.isArray(d.games) ? d.games : []).forEach(function (g) { GAMES.push({ g: g, date: d.date }); });
  });
  function gameEntry(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].g.id === id) return GAMES[i];
    return null;
  }

  /* ── 날짜 유틸 (모두 KST 기준) ─────────────────────── */
  function parts(iso) {
    var f = new Intl.DateTimeFormat("en-GB", {
      timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
    var o = {};
    f.formatToParts(new Date(iso)).forEach(function (p) { o[p.type] = p.value; });
    return {
      y: o.year, m: o.month, d: o.day,
      hh: o.hour === "24" ? "00" : o.hour, mm: o.minute
    };
  }

  function todayStr() {
    var p = parts(new Date());
    return p.y + "-" + p.m + "-" + p.d;
  }

  function addDays(dateStr, n) {
    var d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function weekdayOf(dateStr) {
    var d = new Date(dateStr + "T12:00:00+09:00");
    return new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(d);
  }

  function shortDate(dateStr) {
    return Number(dateStr.slice(5, 7)) + "/" + Number(dateStr.slice(8, 10));
  }

  function longDate(dateStr) {
    return shortDate(dateStr) + " (" + weekdayOf(dateStr) + ")";
  }

  function dayTag(dateStr) {
    var t = todayStr();
    if (dateStr === t) return "오늘 · " + weekdayOf(dateStr);
    if (dateStr === addDays(t, 1)) return "내일 · " + weekdayOf(dateStr);
    if (dateStr === addDays(t, -1)) return "어제 · " + weekdayOf(dateStr);
    return weekdayOf(dateStr) + "요일";
  }

  /* ── 데이터 조회 ───────────────────────────────────── */
  function gamesOf(dateStr) {
    var day = DAYS.filter(function (d) { return d.date === dateStr; })[0];
    if (!day || !Array.isArray(day.games)) return [];
    return day.games.slice().sort(function (a, b) {
      return new Date(a.start) - new Date(b.start);
    });
  }

  function sportMeta(id) {
    return SPORTS.filter(function (s) { return s.id === id; })[0] || { id: id, name: id, icon: "🏅" };
  }

  function gamesIn(dateStr, sportId) {
    return gamesOf(dateStr).filter(function (g) { return g.sport === sportId; });
  }

  function isSport(id) {
    return SPORTS.some(function (s) { return s.id === id; });
  }

  var FAVORITES_KEY = "clutch.favTeams.v1";

  function readFavorites() {
    try {
      var raw = window.localStorage.getItem(FAVORITES_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (item, index) {
        if (!item || !isSport(item.sport) || typeof item.name !== "string" || !item.name.trim()) return false;
        return parsed.findIndex(function (other) {
          return other && other.sport === item.sport && other.name === item.name;
        }) === index;
      }).map(function (item) { return { sport: item.sport, name: item.name.trim() }; });
    } catch (e) {
      return [];
    }
  }

  var FAVORITES = readFavorites();
  var NOTIFY_ENABLED_KEY = "clutch.favoriteNotifications.enabled.v1";
  var NOTIFY_SEEN_KEY = "clutch.favoriteNotifications.seen.v1";
  var NOTIFY_MESSAGE = "";
  var NOTIFY_ENABLED_MEMORY = false;
  var NOTIFY_SEEN_MEMORY = {};

  function isFavorite(sport, name) {
    return FAVORITES.some(function (item) { return item.sport === sport && item.name === name; });
  }

  function favoriteNotificationsEnabled() {
    try { return window.localStorage.getItem(NOTIFY_ENABLED_KEY) === "1"; }
    catch (e) { return NOTIFY_ENABLED_MEMORY; }
  }

  function favoriteNotificationControlHTML() {
    var supported = "Notification" in window;
    var permission = supported ? window.Notification.permission : "unsupported";
    var enabled = supported && permission === "granted" && favoriteNotificationsEnabled();
    var disabled = !supported || permission === "denied";
    var label = !supported ? "알림 미지원" :
      (permission === "denied" ? "설정 필요" : (enabled ? "알림 끄기" : "경기 알림 켜기"));
    var defaultMessage = !supported ? "이 브라우저는 알림을 지원하지 않습니다." : (permission === "denied"
      ? "브라우저의 사이트 설정에서 VS 알림을 허용해 주세요."
      : "페이지를 열어 둔 동안 경기 시작·득점·종료를 알려 드립니다.");
    var message = NOTIFY_MESSAGE || defaultMessage;
    return '<div class="notify-control"><div class="notify-copy"><b>관심팀 경기 알림</b><small>' + esc(message) +
      '</small></div><button class="notify-btn" type="button" data-favorite-notify' +
      (disabled ? " disabled" : "") + ' aria-pressed="' + enabled + '">' + esc(label) + "</button></div>";
  }

  function setFavoriteNotifications(enabled) {
    NOTIFY_ENABLED_MEMORY = !!enabled;
    try { window.localStorage.setItem(NOTIFY_ENABLED_KEY, enabled ? "1" : "0"); }
    catch (e) { /* 저장할 수 없어도 현재 페이지에서만 계속 동작 */ }
  }

  function favoriteNotificationSeen(gameId, eventKey) {
    var seen = NOTIFY_SEEN_MEMORY;
    try {
      var stored = JSON.parse(window.localStorage.getItem(NOTIFY_SEEN_KEY) || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) seen = stored;
    } catch (e) { /* 세션 안의 메모리 기록으로 중복을 막는다 */ }
    if (seen[gameId] === eventKey) return true;
    seen[gameId] = eventKey;
    NOTIFY_SEEN_MEMORY = seen;
    var ids = Object.keys(seen);
    if (ids.length > 300) ids.slice(0, ids.length - 300).forEach(function (id) { delete seen[id]; });
    try { window.localStorage.setItem(NOTIFY_SEEN_KEY, JSON.stringify(seen)); }
    catch (e) { /* 세션 안의 메모리 기록을 유지 */ }
    return false;
  }

  function sendFavoriteNotification(g, eventKey, title, body) {
    if (!g || !(isFavorite(g.sport, g.away && g.away.name) || isFavorite(g.sport, g.home && g.home.name))) return;
    if (!favoriteNotificationsEnabled() || !("Notification" in window) || window.Notification.permission !== "granted") return;
    if (favoriteNotificationSeen(g.id, eventKey)) return;
    try {
      new window.Notification(title, { body: body, tag: "clutch-" + g.id + "-" + eventKey, icon: "icon.png" });
    } catch (e) { /* 알림 차단은 실시간 점수 표시를 막지 않음 */ }
  }

  function notifyFavoriteGameChange(g, previous, next) {
    if (!g || !next) return;
    var sport = sportMeta(g.sport);
    var score = String(next.awayScore == null ? "-" : next.awayScore) + " : " +
      String(next.homeScore == null ? "-" : next.homeScore);
    var prefix = sport.icon + " " + sport.name + " · ";
    if (next.state === "final" && previous && previous.state !== "final") {
      sendFavoriteNotification(g, "final", prefix + "경기 종료", score + " · " + (g.away && g.away.name || "원정") + " vs " + (g.home && g.home.name || "홈"));
      return;
    }
    if (next.state === "live" && (!previous || previous.state !== "live")) {
      if (!previous) {
        var startMs = Date.parse(g.start);
        if (!isFinite(startMs) || Math.abs(Date.now() - startMs) > 2 * 60 * 1000) return;
      }
      sendFavoriteNotification(g, "start", prefix + "경기 시작", score + " · " + (g.away && g.away.name || "원정") + " vs " + (g.home && g.home.name || "홈"));
      return;
    }
    if (next.state !== "live" || !previous || g.sport === "volleyball") return;
    var awayChanged = Number(next.awayScore) !== Number(previous.awayScore);
    var homeChanged = Number(next.homeScore) !== Number(previous.homeScore);
    if (!awayChanged && !homeChanged) return;
    var scorer = awayChanged ? (g.away && g.away.name || "원정") : (g.home && g.home.name || "홈");
    sendFavoriteNotification(g, "score-" + score, prefix + "득점", scorer + " 득점 · " + score);
  }

  function requestFavoriteNotifications() {
    if (!("Notification" in window)) {
      NOTIFY_MESSAGE = "이 브라우저는 알림을 지원하지 않습니다.";
      if (state.favorites) renderFavorites();
      return;
    }
    if (favoriteNotificationsEnabled()) {
      setFavoriteNotifications(false);
      NOTIFY_MESSAGE = "관심팀 경기 알림을 껐습니다.";
      if (state.favorites) renderFavorites();
      return;
    }
    if (window.Notification.permission === "denied") {
      NOTIFY_MESSAGE = "브라우저 사이트 설정에서 알림을 허용한 뒤 다시 시도해 주세요.";
      if (state.favorites) renderFavorites();
      return;
    }
    window.Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        setFavoriteNotifications(true);
        NOTIFY_MESSAGE = "알림을 켰습니다. 페이지를 열어 둔 동안 관심팀 경기를 알려 드립니다.";
      } else {
        NOTIFY_MESSAGE = "알림 권한이 허용되지 않았습니다.";
      }
      if (state.favorites) renderFavorites();
    }).catch(function () {
      NOTIFY_MESSAGE = "알림 권한을 확인하지 못했습니다.";
      if (state.favorites) renderFavorites();
    });
  }

  function favoriteButtonHTML(sport, name) {
    var on = isFavorite(sport, name);
    var action = on ? "해제" : "추가";
    return '<button class="fav-toggle' + (on ? " on" : "") + '" type="button"' +
      ' data-fav-sport="' + esc(sport) + '" data-fav-team="' + esc(name) + '"' +
      ' aria-pressed="' + on + '" aria-label="' + esc(name + " 즐겨찾기 " + action) + '" title="즐겨찾기 ' + action + '">' +
      '<span aria-hidden="true">' + (on ? "★" : "☆") + "</span></button>";
  }

  function saveFavorites() {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(FAVORITES));
    } catch (e) { /* 저장을 사용할 수 없는 환경에서도 현재 화면 조작은 유지 */ }
  }

  function toggleFavorite(sport, name) {
    if (isFavorite(sport, name)) {
      FAVORITES = FAVORITES.filter(function (item) { return !(item.sport === sport && item.name === name); });
    } else {
      FAVORITES.push({ sport: sport, name: name });
    }
    saveFavorites();
    renderTabs();
    if (state.favorites) renderFavorites();
    else {
      Array.prototype.forEach.call(elList.querySelectorAll(".fav-toggle"), function (button) {
        var on = isFavorite(button.dataset.favSport, button.dataset.favTeam);
        button.classList.toggle("on", on);
        button.setAttribute("aria-pressed", String(on));
        button.setAttribute("aria-label", button.dataset.favTeam + " 즐겨찾기 " + (on ? "해제" : "추가"));
        button.title = "즐겨찾기 " + (on ? "해제" : "추가");
        if (button.firstElementChild) button.firstElementChild.textContent = on ? "★" : "☆";
      });
    }
  }

  /* ── 주소(해시) ↔ 화면 ───────────────────────────────── */
  // #             → 홈
  // #all          → 선택 날짜의 전체 종목 경기 목록
  // #all/<id>     → 전체 목록 + 그 경기 박스 펼침
  // #soccer       → 축구 일정 목록
  // #soccer/<id>  → 축구 일정 목록 + 그 경기 박스 펼침
  function parseRoute() {
    var raw = (location.hash || "").replace(/^#/, "").split("?")[0];
    if (!raw) return { sport: null, openId: null };
    var seg = raw.split("/");
    if (seg[0] === "favorites") {
      var favoriteOpenId = seg[1] ? decodeURIComponent(seg[1]) : null;
      if (favoriteOpenId && !gameEntry(favoriteOpenId)) favoriteOpenId = null;
      return { sport: null, openId: favoriteOpenId, favorites: true };
    }
    if (seg[0] === "all") {
      var allOpenId = seg[1] ? decodeURIComponent(seg[1]) : null;
      if (allOpenId && !gameEntry(allOpenId)) allOpenId = null;
      return { sport: null, openId: allOpenId, favorites: false, allSports: true };
    }
    var sport = seg[0];
    if (!isSport(sport)) return { sport: null, openId: null };
    var openId = seg[1] ? decodeURIComponent(seg[1]) : null;
    if (openId && !gameEntry(openId)) openId = null;
    return { sport: sport, openId: openId, favorites: false };
  }

  function routeKey(r) {
    return (r.favorites ? "favorites" : (r.allSports ? "all" : (r.sport || ""))) + "|" + (r.openId || "");
  }

  function stateRoute() {
    return { sport: state.sport, openId: state.openId, favorites: state.favorites, allSports: state.allSports };
  }

  function stateRoutePrefix() {
    return state.favorites ? "favorites" : (state.allSports ? "all" : (state.sport || ""));
  }

  // file:// 에서 history API 가 막히는 브라우저가 있어 실패하면 해시만 바꾼다.
  // 화면 이동은 pushState, 박스 펼침/접힘은 replaceState(뒤로가기가 화면 이동이 되도록).
  function writeHash(id, replace) {
    var url = location.pathname + location.search + (id ? "#" + id : "");
    try {
      if (replace) history.replaceState(null, "", url);
      else history.pushState(null, "", url);
      return;
    } catch (e) { /* file:// origin null */ }
    try { location.hash = id ? id : ""; } catch (e2) { /* noop */ }
  }

  /* ── 상태 ──────────────────────────────────────────── */
  var today = todayStr();
  var state = {
    // 기본 날짜: 오늘 브리핑이 있으면 오늘, 없으면 가장 가까운(첫) 브리핑 날짜
    day: DAYS.filter(function (d) { return d.date >= today; })[0] ?
      DAYS.filter(function (d) { return d.date >= today; })[0].date : DAYS[DAYS.length - 1].date,
    sport: null,   // 종목 미선택 상태에서 홈 또는 전체 경기 목록을 표시
    favorites: false,
    allSports: false,
    league: null,   // 리그 필터(그날·그 종목 안에서만 유효)
    openId: null,  // 펼친 경기 id
    weekStart: null // 날짜 스트립에 보이는 주의 월요일(YYYY-MM-DD)
  };
  state.weekStart = mondayOf(state.day);

  /* ── 텍스트 헬퍼 ───────────────────────────────────── */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // **굵게** 만 허용하는 최소 마크업
  function md(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  function toneClass(tone, allowed, fallback) {
    return allowed.indexOf(tone) >= 0 ? tone : fallback;
  }

  /* ── 선수 얼굴 사진 ───────────────────────────────────
     ESPN CDN 의 선수 사진은 선수마다 있을 수도 없을 수도 있다(축구는 대부분 없음).
     그래서 이니셜 원을 깔아 두고 그 위에 사진을 얹는다. 사진이 404 면 브라우저
     onerror 로 <img> 만 지워져 이니셜이 그대로 남고, 크기는 고정이라 레이아웃이 흔들리지 않는다. */
  function initialsOf(name) {
    var s = String(name || "").trim();
    if (!s) return "?";
    if (/[\uac00-\ud7a3]/.test(s)) return s.slice(0, 1);  // 한글 이름은 첫 글자
    var parts = s.replace(/[^A-Za-z0-9 .'-]/g, "").split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  }

  function faceHTML(name, photo, small) {
    var src = typeof photo === "string" && /^https:\/\//i.test(photo) ? photo : "";
    return '<span class="pl-face' + (small ? " sm" : "") + '" aria-hidden="true">' +
      '<span class="pl-ini">' + esc(initialsOf(name)) + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' +
        ' onerror="this.remove()">' : "") +
      "</span>";
  }

  // 데이터에 사진이 없을 때: 팀 블록의 주요 선수 목록에서 이름으로 찾아 쓴다.
  function photoOf(g, name) {
    var teams = g && g.details && Array.isArray(g.details.teams) ? g.details.teams : [];
    var want = String(name || "").trim().toLowerCase();
    if (!want) return "";
    for (var i = 0; i < teams.length; i++) {
      var list = Array.isArray(teams[i].players) ? teams[i].players : [];
      for (var j = 0; j < list.length; j++) {
        if (String(list[j].name || "").trim().toLowerCase() === want) return list[j].photo || "";
      }
    }
    return "";
  }

  /* ── 팀 크레스트 ───────────────────────────────
     팀 로고는 team-logos.js(window.TEAM_LOGOS)에서 리그·약어 → 팀 이름 순서로 찾는다.
     로고가 없는 팀(데이터에 없는 신생팀 등)은 약어를 적은 작은 칩으로 대신해서,
     화면에 빈 원형·깨진 이미지가 남지 않게 한다. */
  function logoOf(g, side) {
    var t = g && g[side];
    if (!t) return "";
    var map = window.TEAM_LOGOS || {};
    var byLg = (map.byLeague || {})[String(g.league || "").toUpperCase()] || {};
    var by = byLg[String(t.abbr || "").toUpperCase()] || (map.byName || {})[String(t.name || "")] || "";
    return typeof by === "string" && /^https:\/\//i.test(by) ? by : "";
  }

  function crestHTML(g, side, small) {
    var t = (g && g[side]) || {};
    var abbr = String(t.abbr || "").toUpperCase() || initialsOf(t.name);
    var src = logoOf(g, side);
    return '<span class="crest' + (small ? " sm" : "") + '" aria-hidden="true"><span class="crest-t">' +
      esc(abbr.slice(0, 3)) + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : "") +
      "</span>";
  }

  /* ── 주 단위 날짜 스트립 (월요일 시작 7칸) ───────────────
     주차 규칙: 그 달 1일이 들어 있는 7일 묶음(1~7일)을 1주차로 센다.
       예) 2026-11-01(일) → 11/1~11/7 = 1주차, 11/16~11/22 = 3주차, 11/23~11/29 = 4주차
     스트립은 월요일부터 7칸이라, 셋째 주 칸은 11/16(월)~11/22(일) 입니다. */
  var WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
  var WEEK_ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째"];

  function mondayOf(dateStr) {
    var wd = new Date(dateStr + "T00:00:00Z").getUTCDay();
    var back = (wd + 6) % 7; // 월=0 … 일=6
    return addDays(dateStr, -back);
  }

  function weekLabel(mondayStr) {
    var mid = addDays(mondayStr, 3); // 목요일 기준으로 그 주의 달·주차를 정한다
    var m = Number(mid.slice(5, 7));
    var n = Math.floor((Number(mid.slice(8, 10)) - 1) / 7) + 1;
    return m + "월 " + (WEEK_ORDINAL[n - 1] || n + "째") + " 주";
  }

  function renderWeek() {
    var monday = state.weekStart || mondayOf(state.day);
    if (elWeekTitle) elWeekTitle.textContent = weekLabel(monday);

    var cells = [];
    for (var i = 0; i < 7; i++) {
      var ds = addDays(monday, i);
      var on = ds === state.day;
      var past = ds < todayStr();
      cells.push('<button class="day-cell' + (on ? " on" : "") + (past ? " past" : "") + '" type="button"' +
        ' data-date="' + ds + '" aria-pressed="' + on + '" aria-label="' + longDate(ds) + '">' +
        '<span class="w">' + WEEKDAY_LABELS[i] + "</span>" +
        '<span class="d">' + Number(ds.slice(8, 10)) + "</span>" +
        "</button>");
    }
    elDates.innerHTML = cells.join("");

    Array.prototype.forEach.call(elDates.querySelectorAll(".day-cell"), function (btn) {
      btn.addEventListener("click", function () {
        if (state.day === btn.dataset.date && state.allSports && !state.favorites) return;
        state.day = btn.dataset.date;
        state.weekStart = mondayOf(state.day);
        state.sport = null;
        state.favorites = false;
        state.allSports = true;
        state.league = null;
        state.openId = null;
        writeHash("all", true);
        render();
      });
    });
  }

  // 주 이동: 그 주에서 경기가 있는 첫 날(없으면 월요일)로 선택을 옮긴다.
  function shiftWeek(delta) {
    var monday = addDays(state.weekStart || mondayOf(state.day), delta * 7);
    state.weekStart = monday;
    var pick = null;
    for (var i = 0; i < 7 && !pick; i++) {
      var ds = addDays(monday, i);
      if (gamesOf(ds).length) pick = ds;
    }
    state.day = pick || monday;
    state.league = null;
    state.openId = null;
    writeHash(stateRoutePrefix(), true);
    render();
  }

  /* ── 종목 탭 ───────────────────────────────────────── */
  function renderTabs() {
    var games = gamesOf(state.day);
    var home = state.sport === null && !state.favorites && !state.allSports;
    var favoriteCount = FAVORITES.length;

    // 홈은 종목을 고르는 화면이라 종목 탭 줄은 숨긴다(같은 선택지를 두 번 보여주지 않도록).
    elTabs.hidden = home;

    elTabs.innerHTML = '<button class="tab" type="button" role="tab" id="tab-all" data-all="true"' +
      ' aria-selected="' + !!state.allSports + '" aria-controls="panel"' +
      ' aria-label="전체 ' + games.length + '경기" tabindex="' + (state.allSports ? "0" : (home ? "0" : "-1")) + '">' +
      '<span class="em" aria-hidden="true">🗓️</span>전체' +
      (games.length ? '<span class="cnt">' + games.length + "</span>" : "") +
      "</button>" +
      SPORTS.map(function (s) {
      var n = games.filter(function (g) { return g.sport === s.id; }).length;
      var on = s.id === state.sport;
      return '<button class="tab" type="button" role="tab" id="tab-' + esc(s.id) + '"' +
        ' data-sport="' + esc(s.id) + '" aria-selected="' + on + '" aria-controls="panel"' +
        ' aria-label="' + esc(s.name) + (n ? " " + n + "경기" : " 경기 없음") + '"' +
        ' tabindex="' + (on || home ? "0" : "-1") + '">' +
        '<span class="em" aria-hidden="true">' + esc(s.icon) + "</span>" + esc(s.name) +
        (n > 0 ? '<span class="cnt">' + n + "</span>" : "") +
        "</button>";
    }).join("") +
      '<button class="tab" type="button" role="tab" id="tab-favorites" data-favorites="true"' +
      ' aria-selected="' + !!state.favorites + '" aria-controls="panel"' +
      ' aria-label="즐겨찾기 ' + favoriteCount + '개 팀" tabindex="' + (state.favorites ? "0" : (home ? "0" : "-1")) + '">' +
      '<span class="em" aria-hidden="true">★</span>즐겨찾기' +
      (favoriteCount ? '<span class="cnt">' + favoriteCount + "</span>" : "") +
      "</button>";

    Array.prototype.forEach.call(elTabs.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () {
        if (tab.dataset.all) selectAll();
        else if (tab.dataset.favorites) selectFavorites();
        else selectSport(tab.dataset.sport);
      });
      tab.addEventListener("keydown", function (e) {
        var tabs = Array.prototype.slice.call(elTabs.querySelectorAll(".tab"));
        var i = tabs.indexOf(tab);
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        if (next.dataset.all) selectAll();
        else if (next.dataset.favorites) selectFavorites();
        else selectSport(next.dataset.sport);
        elTabs.querySelector('.tab[aria-selected="true"]').focus();
      });
    });
  }

  /* ── 화면 이동 ─────────────────────────────────────── */
  function selectSport(id) {
    if (!isSport(id)) return;
    var same = state.sport === id && !state.openId && !state.favorites && !state.allSports;
    state.sport = id;
    state.favorites = false;
    state.allSports = false;
    state.league = null;
    state.openId = null;
    if (!same) writeHash(id, false);
    render();
    window.scrollTo(0, 0);
    // 배구 탭을 열면 KOVO 세트 스코어를 바로 한 번 확인한다
    if (id === "volleyball") pollKovoLive(false);
  }

  function selectAll() {
    var same = state.allSports && !state.openId;
    state.sport = null;
    state.favorites = false;
    state.allSports = true;
    state.league = null;
    state.openId = null;
    if (!same) writeHash("all", false);
    render();
    window.scrollTo(0, 0);
  }

  function selectFavorites() {
    var same = state.favorites && !state.openId;
    state.sport = null;
    state.favorites = true;
    state.allSports = false;
    state.league = null;
    state.openId = null;
    if (!same) writeHash("favorites", false);
    render();
    window.scrollTo(0, 0);
  }

  function goHome() {
    var same = state.sport === null && !state.favorites && !state.allSports;
    state.sport = null;
    state.favorites = false;
    state.allSports = false;
    state.league = null;
    state.openId = null;
    if (!same) writeHash("", false);
    render();
    window.scrollTo(0, 0);
  }

  // 뒤로가기·해시 직접 입력 등으로 주소만 바뀌었을 때 화면을 맞춘다.
  function syncFromHash() {
    var r = parseRoute();
    if (routeKey(r) === routeKey(stateRoute())) return;

    state.sport = r.sport;
    state.favorites = !!r.favorites;
    state.allSports = !!r.allSports;
    state.league = null;
    state.openId = r.openId;
    if (r.openId) {
      var e = gameEntry(r.openId);
      if (e) state.day = e.date;
    }
    state.weekStart = mondayOf(state.day);
    render();
    if (state.openId) {
      var item = itemOf(state.openId);
      if (item) item.scrollIntoView({ block: "nearest" });
    }
  }

  /* ── 상태 배지 ─────────────────────────────────────── */
  function statusHTML(status) {
    var s = String(status || "").toUpperCase();
    if (s === "OUT") return '<span class="st out">OUT</span>';
    if (s === "DOUBTFUL") return '<span class="st doubt">DOUBTFUL</span>';
    if (s === "DAY-TO-DAY" || s === "DTD") return '<span class="st dtd">DAY-TO-DAY</span>';
    return '<span class="st none">' + esc(status || "—") + "</span>";
  }

  /* ── 경기 박스 내용 (펼쳤을 때만 DOM 에 들어간다) ─────── */
  // 박스 안 두 팀 한 줄: 원정/홈 · 팀명 · 전적 · 배지
  function formRow(side, team, g) {
    if (!team) return "";
    var badges = (team.badges || []).map(function (b) {
      return '<span class="badge ' + toneClass(b.tone, ["hot", "rank"], "") + '">' + esc(b.text) + "</span>";
    }).join("");
    // 그 팀 승리 배당을 리그 순위 배지 옆에 붙인다.
    var ml2 = (g && g.odds && g.odds.moneyline) || {};
    var tOdds = side === "home" ? ml2.home : ml2.away;
    if (tOdds != null && isFinite(Number(tOdds))) {
      badges += '<span class="badge odds">배당 ' + decText(tOdds) + "</span>";
    }
    return "<li>" +
      '<span class="f-side ' + side + '">' + (side === "home" ? "홈" : "원정") + "</span>" +
      (g ? favoriteButtonHTML(g.sport, team.name) : "") +
      '<a class="f-name" href="team.html?team=' + encodeURIComponent(team.name) + '" title="' + esc(team.name + " 팀 페이지") + '" style="color:inherit;text-decoration:none">' + esc(team.name) + "</a>" +
      '<span aria-hidden="true" style="flex:0 0 auto;color:#9CA3AF;font-weight:800;font-size:11px;line-height:1">›</span>' +
      (team.record ? '<span class="f-rec">' + esc(team.record) + "</span>" : "") +
      streakChip(team) +
      badges +
      "</li>";
  }

  // 최근 결과의 연속 기록 (연승·연패). last5Detail[0] 이 가장 최근 경기다.
  function streakOf(t) {
    var d = (t && Array.isArray(t.last5Detail)) ? t.last5Detail : [];
    if (!d.length) return null;
    var r0 = String(d[0].res || "").trim();
    if (r0 !== "승" && r0 !== "패" && r0 !== "무") return null;
    var n = 0;
    for (var i = 0; i < d.length; i++) {
      if (String(d[i].res || "").trim() !== r0) break;
      n++;
    }
    var cls = r0 === "승" ? "win" : (r0 === "패" ? "loss" : "draw");
    var text = r0 === "무" ? n + "무" : n + "연" + r0;
    return { text: text, cls: cls };
  }

  // 최근 흐름 값(예: "무-승-패-패-패")을 색 입힌 글자로.
  function formSeqHTML(t, raw) {
    var res = [];
    if (t && Array.isArray(t.last5Detail) && t.last5Detail.length) {
      res = t.last5Detail.slice(0, 5).map(function (r) { return String(r.res || "").trim(); });
    } else {
      res = String(raw || "").split(/[-·\s]+/);
    }
    res = res.filter(function (r) { return r === "승" || r === "패" || r === "무"; });
    if (!res.length) return esc(raw || "");
    return res.map(function (r) {
      var cls = r === "승" ? "win" : (r === "패" ? "loss" : "draw");
      return '<span class="fs ' + cls + '">' + esc(r) + "</span>";
    }).join("");
  }

  function streakChip(t) {
    var st = streakOf(t);
    if (!st) return "";
    return '<span class="streak ' + st.cls + '">' + esc(st.text) + "</span>";
  }

  function injRowsHTML(list, withTeam) {
    return (list || []).map(function (i) {
      return '<li>' + (withTeam ? '<span class="tt">' + esc(i.team || "") + "</span>" : "") +
        '<span class="pl">' + esc(i.player) +
        (i.note ? "<small>" + esc(i.note) + "</small>" : "") + "</span>" +
        statusHTML(i.status) + "</li>";
    }).join("");
  }

  // 팀별 정보 블록 하나
  //  · 제목: [원정] 팀명 · 약어 / 이어서 전적칸·수치칸·주요 선수·최근 5경기·부상·관전 포인트
  // 축구 핵심 선수(details.keyPlayers)를 팀 블록의 주요 선수로 옮긴다. 같은 선수의 골·도움은 한 줄로 합친다.
  function statKo(s) {
    var t = String(s || "").trim();
    var m = t.match(/^득점\s*(\d+)$/);
    if (m) return m[1] + "골";
    m = t.match(/^도움\s*(\d+)$/);
    if (m) return m[1] + "도움";
    return t;
  }

  function keyPlayersFor(g, t) {
    var d = (g && g.details) || {};
    var groups = Array.isArray(d.keyPlayers) ? d.keyPlayers.filter(Boolean) : [];
    if (!groups.length) return [];
    var g2 = groups.filter(function (k) { return k.side === t.side; })[0] ||
      groups.filter(function (k) { return k.team && t.name && k.team === t.name; })[0];
    if (!g2 || !Array.isArray(g2.players)) return [];
    var byName = {}, order = [];
    g2.players.forEach(function (p) {
      var nm = String((p && p.name) || "").trim();
      if (!nm) return;
      var st = Array.isArray(p.stats) ? p.stats : (p.stat ? [p.stat] : []);
      if (!byName[nm]) { byName[nm] = { name: nm, photo: p.photo, stats: [] }; order.push(nm); }
      st.forEach(function (x) { if (byName[nm].stats.indexOf(x) < 0) byName[nm].stats.push(x); });
    });
    return order.map(function (nm) {
      var p = byName[nm];
      return { name: p.name, photo: p.photo, stat: p.stats.map(statKo).join(" · ") };
    });
  }

  function teamBlockHTML(t, g) {
    if (!t || !g) return "";
    var side = t.side === "home" ? "home" : "away";

    // 전적 칸
    var cellPairs = [];
    if (Array.isArray(t.cells) && t.cells.length) {
      cellPairs = t.cells.map(function (c) { return [c && c.label, c && c.value]; });
    } else {
      var venueRec = t.venueRecord ? String(t.venueRecord).replace(/^(홈|원정)\s*/, "") : null;
      cellPairs = [
        ["시즌 전적", t.record],
        [side === "home" ? "홈 전적" : "원정 전적", venueRec],
        ["최근 5경기", t.last5],
        ["직전 경기", t.lastGame]
      ];
    }
    var cells = cellPairs.filter(function (c) {
      return c[1] != null && c[1] !== "";
    }).map(function (c) {
      var isRecent = /최근/.test(String(c[0]));
      var chip = isRecent ? streakChip(t) : "";
      var dd = isRecent ? formSeqHTML(t, c[1]) : esc(c[1]);
      return '<div class="tb-cell' + (isRecent ? " recent" : "") + '"><dt>' + esc(c[0]) + "</dt><dd>" + dd + chip + "</dd></div>";
    }).join("");

    // 수치 칸
    var numHTML;
    if (Array.isArray(t.nums) && t.nums.length) {
      numHTML = t.nums.filter(function (n) { return n && n.value != null && n.value !== ""; })
        .map(function (n) {
          return '<span class="num"><b>' + esc(n.value) + "</b><small>" + esc(n.label) + "</small></span>";
        }).join("");
    } else {
      numHTML = [
        ["평균 득점", t.ppg, "점"],
        ["리바운드", t.rpg, ""],
        ["3점 성공률", t.tp, "%"]
      ].filter(function (n) { return n[1] != null && n[1] !== "" && isFinite(Number(n[1])); })
        .map(function (n) {
          var v = Number(n[1]);
          return '<span class="num"><b>' + (Math.round(v * 10) / 10).toFixed(1) + n[2] +
            "</b><small>" + esc(n[0]) + "</small></span>";
        }).join("");
    }

    // 주요 선수 2~3명
    var playersHTML = "";
    var tPlayers = (Array.isArray(t.players) && t.players.length) ? t.players : keyPlayersFor(g, t);
    if (tPlayers.length) {
      playersHTML = '<h4 class="tb-sub">주요 선수</h4><ul class="pl-list">' +
        tPlayers.slice(0, 3).map(function (p) {
          return '<li>' +
            '<span class="pl-top">' + faceHTML(p.name, p.photo) +
            '<b>' + esc(p.name) + "</b>" +
            (p.pos ? '<i class="pl-pos">' + esc(p.pos) + "</i>" : "") + "</span>" +
            (p.stat ? '<span class="pl-stat">' + esc(p.stat) + "</span>" : "") +
            (p.sub ? '<span class="pl-sub">' + esc(p.sub) + "</span>" : "") +
            (p.recent ? '<span class="pl-recent">' + esc(p.recent) + "</span>" : "") +
            (p.last ? '<span class="pl-last">' + esc(p.last) + "</span>" : "") +
            "</li>";
        }).join("") + "</ul>";
    }

    // 최근 5경기 상세
    var l5HTML = "";
    if (Array.isArray(t.last5Detail) && t.last5Detail.length) {
      l5HTML = '<h4 class="tb-sub">최근 ' + t.last5Detail.length + "경기</h4>" +
        '<ul class="l5-list">' + t.last5Detail.map(function (r) {
          var cls = r.res === "승" || r.res === "W" ? "w" : (r.res === "패" || r.res === "L" ? "l" : "d");
          return "<li>" +
            '<span class="l5-date">' + esc((r.date || "").slice(5).replace("-", ".")) + "</span>" +
            '<span class="l5-ha">' + esc(r.ha || "") + "</span>" +
            '<span class="l5-opp">' + esc(r.opp || "") + "</span>" +
            '<span class="l5-sc">' + esc(r.score || "") + "</span>" +
            '<span class="l5-res ' + cls + '">' + esc(r.res || "") + "</span>" +
            "</li>";
        }).join("") + "</ul>";
    }

    // 부상 — 인원 요약 + 선수별 상세
    var ins = Array.isArray(t.injuries) ? t.injuries : [];
    var injHTML = "";
    if (Array.isArray(t.injuries) || t.injuryNote) {
      var head = t.injurySummary
        ? '<b class="inj-sum">' + esc(t.injurySummary) + "</b>"
        : "";
      var body = ins.length
        ? '<ul class="inj-list solo">' + ins.map(function (i) {
            return "<li>" +
              '<span class="pl">' + esc(i.player) +
              (i.pos ? '<small class="pos">' + esc(i.pos) + "</small>" : "") +
              (i.line ? "<small>" + esc(i.line) + "</small>" : "") + "</span>" +
              statusHTML(i.status) + "</li>";
          }).join("") + "</ul>"
        : '<p class="tb-none">' + esc(t.injuryNote || (t.injurySummary === "결장 없음" ? "결장 명단에 올라온 선수가 없습니다" : "부상 정보 없음")) + "</p>";
      injHTML = '<h4 class="tb-sub">부상 · 결장</h4>' + head + body;
    }

    var focusHTML = t.focus ? '<h4 class="tb-sub">관전 포인트</h4><p class="tb-focus">' + md(t.focus) + "</p>" : "";

    return '<section class="tblock ' + side + '" data-team-name="' + esc(t.name || "") + '">' +
      '<div class="tb-head">' +
        '<span class="tb-side">' + (side === "home" ? "홈" : "원정") + "</span>" +
        crestHTML(g, side) +
        '<a class="tb-name" href="team.html?team=' + encodeURIComponent(t.name || t.abbr || "") + '" title="' + esc((t.name || t.abbr || "") + " 팀 페이지") + '" style="color:inherit;text-decoration:none">' + esc(t.name || t.abbr || "") + "</a>" +
        '<span aria-hidden="true" style="flex:0 0 auto;color:#9CA3AF;font-weight:800;font-size:12px;line-height:1;margin-top:-1px">›</span>' +
        (t.abbr ? '<span class="tb-abbr">' + esc(t.abbr) + "</span>" : "") +
        (t.streak ? '<span class="tb-streak">' + esc(t.streak) + "</span>" : "") +
      "</div>" +
      (cells ? '<dl class="tb-grid">' + cells + "</dl>" : "") +
      (numHTML ? '<div class="tb-nums">' + numHTML + "</div>" : "") +
      playersHTML +
      l5HTML +
      injHTML +
      focusHTML +
      "</section>";
  }

  // 배당 — 소수 배당(1.67배)만 보여 준다. 미국식 표기는 빼서 읽기 쉽게.
  function amText(v) {
    if (v == null || !isFinite(Number(v))) return "—";
    var n = Number(v);
    return (n > 0 ? "+" : "") + n;
  }
  function decText(v) {
    if (v == null || !isFinite(Number(v)) || Number(v) === 0) return "—";
    var n = Number(v);
    var d = n > 0 ? (n / 100 + 1) : (100 / Math.abs(n) + 1);
    return d.toFixed(2);
  }
  function oddsRowHTML(label, ml) {
    return '<li><span class="o-lab">' + esc(label) + "</span>" +
      '<span class="o-val"><b>' + decText(ml) + "배</b></span></li>";
  }
  function oddsHTML(g) {
    var o = g.odds;
    if (!o) {
      var why = g.status === "final"
        ? "경기가 끝나 ESPN이 배당을 내렸습니다."
        : "이 경기의 배당이 ESPN 응답에 아직 없습니다.";
      if (g.sport === "volleyball") why = "KOVO 공식 데이터에는 배당 정보가 없습니다.";
      if (g.sport === "baseball") why = "야구는 비시즌이라 실제 경기가 없습니다.";
      return '<section class="obox none"><div class="o-head"><b>배당</b></div>' +
        '<p class="o-none">배당 정보 없음 — ' + esc(why) + "</p></section>";
    }
    var ml = o.moneyline || {};
    var rows = "";
    if (ml.away != null || ml.home != null || ml.draw != null) {
      // 홈을 먼저, 그다음 무승부, 원정 순.
      rows += oddsRowHTML((g.home && g.home.name ? g.home.name : "홈") + " 승", ml.home);
      if (ml.draw != null) rows += oddsRowHTML("무승부", ml.draw);
      rows += oddsRowHTML((g.away && g.away.name ? g.away.name : "원정") + " 승", ml.away);
    }
    var lines = [];
    if (o.spread && (o.spread.homeLine || o.spread.awayLine)) {
      var sp = "핸디캡 홈 " + (o.spread.homeLine || "—") +
        (o.spread.home != null ? " " + decText(o.spread.home) + "배" : "") +
        " · 원정 " + (o.spread.awayLine || "—") +
        (o.spread.away != null ? " " + decText(o.spread.away) + "배" : "");
      lines.push(sp);
    }
    if (o.total && (o.total.line || o.total.over != null)) {
      lines.push("총점 " + (o.total.line || "—") +
        (o.total.over != null ? " · 오버 " + decText(o.total.over) + "배" : "") +
        (o.total.under != null ? " · 언더 " + decText(o.total.under) + "배" : ""));
    }
    var imp = o.implied;
    var impLine = "";
    if (imp) {
      var bits = [];
      if (imp.away != null) bits.push("원정 " + imp.away + "%");
      if (imp.draw != null) bits.push("무 " + imp.draw + "%");
      if (imp.home != null) bits.push("홈 " + imp.home + "%");
      impLine = '<p class="o-imp">내재 확률 ' + bits.join(" · ") + "</p>";
    }
    var at = o.at ? String(o.at).slice(5, 16).replace("T", " ") : "";
    return '<section class="obox">' +
      '<div class="o-head"><b>배당</b>' +
        (o.provider ? '<span class="o-prov">' + esc(o.provider) + "</span>" : "") +
        (at ? '<span class="o-at">' + esc(at) + " 기준</span>" : "") +
      "</div>" +
      (rows ? '<ul class="o-list">' + rows + "</ul>" : "") +
      (lines.length ? lines.map(function (l) { return '<p class="o-line">' + esc(l) + "</p>"; }).join("") : "") +
      '<p class="o-note">소수 배당이에요. 1만원을 걸면 그 배당만큼 돌려받습니다(1.67배 → 1만 6,700원). 해외 배당이라 국내 배트맨·프로토와 다를 수 있어요.</p>' +
      "</section>";
  }

  // 결과 — 끝난 경기만. 경기 전 분석은 위에 그대로 두고 결과만 덧붙인다.
  // 결과 상태 문구에 곁들일 설명: 'Final'·'종료' 같은 중복은 빼고 '연장'·'승부차기'만 남긴다
  function resultDetailText(detail) {
    var d = String(detail || "").trim();
    if (!d) return "";
    if (/^종료$/i.test(d)) return "";
    if (/^final\s*\/\s*ot$/i.test(d)) return "연장";
    if (/^final$/i.test(d)) return "";
    return d;
  }

  function resultHTML(g) {
    var r = g.result;
    if (!r) {
      return '<section class="rbox pre"><div class="r-head"><b>결과</b>' +
        '<span class="r-state">경기 전</span></div>' +
        '<p class="r-none">아직 시작하지 않은 경기입니다.</p></section>';
    }
    var state = r.state === "final" ? "종료" : "진행 중";
    var rDetail = resultDetailText(r.detail);
    var top = Array.isArray(r.top) ? r.top : [];
    var linesHTML = linesTableHTML(g, r);
    var topNone = r.state === "live"
      ? (g.sport === "volleyball" ? "공개 실시간 데이터에는 선수별 득점이 포함되지 않습니다." : "실시간 주요 선수 기록은 경기 종료 후 반영됩니다.")
      : "주요 선수 기록을 받지 못했습니다.";
    var topHTML = top.length
      ? '<ul class="r-top">' + top.map(function (p) {
          var bits = [];
          if (p.pts != null) bits.push(p.pts + "점");
          if (p.reb != null) bits.push(p.reb + "리바운드");
          if (p.ast != null) bits.push(p.ast + "어시스트");
          return "<li><span class=\"r-team\">" + esc(p.team || "") + "</span>" +
            faceHTML(p.name, p.photo || photoOf(g, p.name), true) +
            "<b>" + esc(p.name || "") + "</b><span class=\"r-stat\">" + esc(bits.join(" · ")) + "</span></li>";
        }).join("") + "</ul>"
      : '<p class="r-none">' + esc(topNone) + "</p>";
    var win = r.winner === "away" ? (g.away ? g.away.name : "원정") :
      (r.winner === "home" ? (g.home ? g.home.name : "홈") : null);
    return '<section class="rbox">' +
      '<div class="r-head"><b>결과</b><span class="r-state ' + (r.state === "final" ? "final" : "live") + '">' +
        esc(state) + (rDetail ? " · " + esc(rDetail) : "") + "</span>" +
        (win ? '<span class="r-win">' + esc(win) + " 승</span>" : "") +
      "</div>" +
      '<p class="r-score"><b>' + esc(g.away ? g.away.abbr : "원정") + " " + esc(String(r.awayScore != null ? r.awayScore : "-")) + "</b>" +
        ' <span class="r-vs">:</span> <b>' + esc(String(r.homeScore != null ? r.homeScore : "-")) + " " + esc(g.home ? g.home.abbr : "홈") + "</b></p>" +
      linesHTML +
      // 축구는 ESPN 공개 데이터에 선수별 기록이 없어 '주요 선수 기록' 칸을 비워 둔다
      (top.length || g.sport !== "soccer" ? '<h4 class="tb-sub">주요 선수 기록</h4>' + topHTML : "") +
      "</section>";
  }

  /* ── 경기 후 브리핑 'SNS 반응' ────────────────────────────
     reactions.js 의 window.CLUTCH_REACTIONS["<경기 id>|<선수 이름>"] 를 읽는다.
     반응이 없으면 빈 문자열을 돌려주고 카드 레이아웃은 그대로 둔다. */
  function snsReactionOf(gameId, playerName) {
    var all = window.CLUTCH_REACTIONS;
    if (!all || !gameId || !playerName) return null;
    var r = all[String(gameId) + "|" + String(playerName).trim()];
    if (!r || !r.text) return null;
    if (!/^https?:\/\//i.test(String(r.url || ""))) return null;
    return r;
  }

  function snsReactionHTML(gameId, playerName) {
    var r = snsReactionOf(gameId, playerName);
    if (!r) return "";
    var when = "";
    var t = Date.parse(r.at);
    if (isFinite(t)) {
      try {
        when = new Date(t).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });
      } catch (e) { when = ""; }
    }
    var who = r.handle ? "@" + esc(r.handle) : "";
    if (r.author) who += (who ? " · " : "") + esc(r.author);
    if (when) who += " · " + esc(when);
    /* 원문은 그대로 두고, ko 가 있으면 그 아래에 한국어 한 줄을 작게 붙인다. */
    var ko = typeof r.ko === "string" && r.ko.trim()
      ? '<p class="pg-sns-ko">' + esc(r.ko.trim()) + "</p>"
      : "";
    return '<div class="pg-sns">' +
      '<b class="pg-sns-label">SNS 반응</b>' +
      '<p class="pg-sns-text">\u201C' + esc(r.text) + '\u201D</p>' + ko +
      '<a class="pg-sns-src" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + who +
        '<span class="pg-sns-ext" aria-hidden="true">↗</span></a></div>';
  }

  /* ── 경기 후 브리핑 ──────────────────────────────────────────
     기준은 "이 경기의 승패에 누가 가장 큰 영향을 줬나"다.
     점수만 비교하는 문장("A가 B보다 몇 점 못 넣었다")은 쓰지 않는다.

     쓰는 값
       · 박스스코어(ESPN summary): 득점·리바운드·어시스트·스틸·블록·턴오버·
         야투·3점·자유투·±(코트에 있는 동안 팀 득실 마진)·쿼터별 득점
       · 시즌 평균(data.js 주요 선수): stat("38.8점 · 7.2리바운드"),
         sub("야투 47.6% · 3점 39.8% · 팀 내 1옵션")

     영향력(influence)
       prod      = 득점 + 0.7×어시스트 + 0.3×리바운드 + 스틸 + 0.7×블록 - 턴오버
                   (Hollinger Game Score 에서 이 화면이 받는 항목만 남긴 식)
       gap       = prod - (평균 득점 + 0.7×평균 어시스트 + 0.3×평균 리바운드)
                   → 시즌 평균으로 본 '제 몫' 대비 얼마나 했는지. 보조 근거.
       rel       = ± - 팀 최종 마진
                   → 그 선수가 코트에 있던 동안 팀이 팀 전체보다 얼마나 더 앞섰나
       clutch    = 4쿼터 마지막 5분·연장에서 그 선수가 넣은 점수
       influence = prod + 0.8×clamp(rel, -12, 12) + 1.2×clutch
       cost      = max(0, -gap) + 0.8×max(0, -rel)   (진 팀 쪽 부정 영향)

     · 이긴 팀 '캐리한 선수' = influence 최대(20분 이상 출전)
     · 진 팀 '아쉬웠던 선수' = cost 최대(18분 이상, cost 5 미만이면 비워 둔다)
     ±는 코트에 있던 동안의 팀 득실이라 같은 팀 안에서만 비교한다. */
  function pgShot(v) {
    var m = String(v == null ? "" : v).match(/^(\d+)\s*[-/]\s*(\d+)$/);
    return m ? { m: Number(m[1]), a: Number(m[2]) } : null;
  }
  function pgShotText(s) {
    return s ? s.m + "-" + s.a + "(" + Math.round(s.m / s.a * 100) + "%)" : "";
  }
  function pgPct(made, att) { return att > 0 ? Math.round(made / att * 100) : null; }
  function pgAvg(text, unit) {
    var m = String(text || "").match(new RegExp("(\\d+(?:\\.\\d+)?)\\s*" + unit));
    return m ? Number(m[1]) : null;
  }
  function pgSubPct(sub, label) {
    var m = String(sub || "").match(new RegExp(label + "\\s*(\\d+(?:\\.\\d+)?)\\s*%"));
    return m ? Number(m[1]) : null;
  }
  function pgRole(sub) {
    var m = String(sub || "").match(/팀 내\s*([0-9]+옵션)/);
    return m ? m[1] : "";
  }
  function pgSigned(n) { return (n > 0 ? "+" : "") + n; }
  // 점수(숫자) 뒤 조사. 끝자리 0·3·6·7·8(십·삼·육·칠·팔)만 받침이 있다.
  function pgNumJosa(n, withFinal, withoutFinal) {
    var d = String(Math.abs(Number(n) || 0)).slice(-1);
    return /[03678]/.test(d) ? withFinal : withoutFinal;
  }
  function pgNumCopula(n) { return pgNumJosa(n, "이었습니다", "였습니다"); }
  // 팀·선수 이름 뒤 조사(받침 유무). 예) 재즈 → 가 / 너기츠 → 가 / 썬더 → 가
  function pgJosa(word, withFinal, withoutFinal) {
    var s = String(word || "");
    var c = s.charCodeAt(s.length - 1);
    var has = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
    return s + (has ? withFinal : withoutFinal);
  }

  function postgameHTML(g) {
    if (!g || !g.result || g.result.state !== "final") return "";
    if (g.sport === "basketball") return pgBasketballHTML(g);
    if (g.sport === "soccer") return pgSoccerHTML(g);
    return pgPlainHTML(g);
  }

  // 농구·축구가 아닌 종목(배구 등): 결과와 세트 흐름만. 선수 기록이 없으면 개인 평가는 쓰지 않는다.
  function pgPlainHTML(g) {
    if (g.result.awayScore == null || g.result.homeScore == null) return "";
    var finalAway = Number(g.result.awayScore), finalHome = Number(g.result.homeScore);
    if (!isFinite(finalAway) || !isFinite(finalHome)) return "";
    var unit = g.sport === "volleyball" ? "세트" : "점";
    var line;
    if (finalAway === finalHome) {
      line = "양 팀이 " + finalAway + "대 " + finalHome + "으로 비겼습니다.";
    } else {
      var w = finalAway > finalHome ? g.away : g.home;
      line = pgJosa(w.name, "이", "가") + " " + Math.abs(finalAway - finalHome) + unit + " 차로 이겼습니다.";
    }
    var flow = "";
    var ls = g.result.lines;
    if (ls && ls.away && ls.home && ls.away.length) {
      var parts = [];
      for (var i = 0; i < Math.min(ls.away.length, ls.home.length); i++) {
        parts.push((i + 1) + (g.sport === "volleyball" ? "세트 " : "Q ") + ls.away[i] + "-" + ls.home[i]);
      }
      if (parts.length) flow = " 세트 흐름은 " + parts.join(", ") + "입니다.";
    }
    var note = g.sport === "volleyball"
      ? "KOVO 공개 결과에는 선수별 기록(공격·블로킹·서브)이 없어 개인 활약 평가는 표시하지 않습니다."
      : "이 경기의 선수별 기록이 연결되지 않아 개인 활약 평가는 표시하지 않습니다.";
    return '<section class="postgame"><div class="postgame-head"><b>경기 후 브리핑</b><span>결과 요약</span></div>' +
      '<p class="pg-game-line">' + esc(line + flow) + "</p>" +
      '<p class="postgame-note">' + esc(note) + "</p></section>";
  }

  /* ── 농구: 흐름 + 승패 원인 + 영향력 1위/최악 + 팀 지표 ── */
  function pgBasketballHTML(g) {
    var entry = summaryEntry(g);
    var boxes = entry && entry.data && Array.isArray(entry.data.box) ? entry.data.box : [];
    if (!boxes.length) {
      return '<section class="postgame"><div class="postgame-head"><b>경기 후 브리핑</b></div>' +
        '<p class="postgame-note">' +
        (entry && entry.err ? "선수별 박스스코어를 불러오지 못했습니다." : "최종 선수 기록을 불러오는 중입니다.") +
        "</p></section>";
    }

    var r = g.result;
    var awayPts = toNum(r.awayScore), homePts = toNum(r.homeScore);
    var winSide = awayPts > homePts ? "away" : (homePts > awayPts ? "home" : null);
    var margin = Math.abs(awayPts - homePts);
    var winTeam = winSide ? g[winSide] : null;
    var loseTeam = winSide ? g[winSide === "away" ? "home" : "away"] : null;

    // ESPN 약어가 우리 표기와 다른 팀이 있다(뉴욕 NY, 골든스테이트 GS 등). 약어가 안 맞으면 순서로 찾는다.
    var ABBR_ALIAS = { NY: "NYK", GS: "GSW", SA: "SAS", NO: "NOP", WSH: "WAS", PHO: "PHX", UTAH: "UTA" };
    function resolveTeam(teamBox, idx) {
      var list = (g.details && Array.isArray(g.details.teams) ? g.details.teams : []);
      var a = String((teamBox && teamBox.abbr) || "").toUpperCase();
      if (ABBR_ALIAS[a]) a = ABBR_ALIAS[a];
      var byAbbr = list.filter(function (t) { return String(t.abbr || "").toUpperCase() === a; })[0];
      if (byAbbr) return byAbbr;
      var side = idx === 0 ? g.away : (idx === 1 ? g.home : null);
      var sideAbbr = String((side && side.abbr) || "").toUpperCase();
      if (!sideAbbr) return null;
      return list.filter(function (t) { return String(t.abbr || "").toUpperCase() === sideAbbr; })[0] || null;
    }

    var sides = boxes.map(function (b, i) {
      var t = resolveTeam(b, i);
      return t && (t.side === "away" || t.side === "home") ? t.side : (i === 0 ? "away" : "home");
    });
    var boxOf = {};   // side → 그 팀 박스(팀 지표 포함)
    boxes.forEach(function (b, i) { boxOf[sides[i]] = b; });

    function statNum(side, key) {
      var b = boxOf[side];
      var v = b && b.stats ? b.stats[key] : null;
      var n = Number(String(v == null ? "" : v).trim());
      return isFinite(n) ? n : null;
    }

    /* ── 후보: 코트에 1분이라도 뛴 모든 선수(주요 선수 목록에 없는 선수도 포함) ── */
    var cands = [];
    boxes.forEach(function (teamBox, idx) {
      var team = resolveTeam(teamBox, idx);
      var season = team && Array.isArray(team.players) ? team.players : [];
      var side = sides[idx];
      var tm = winSide ? (side === winSide ? margin : -margin) : 0;
      (teamBox.rows || []).forEach(function (p) {
        var min = toNum(p.min);
        if (min < 1) return;
        var pts = toNum(p.pts);
        if (pts < 0) return;
        var nameKey = String(p.name || "").trim().toLowerCase();
        var sp = null;
        for (var i = 0; i < season.length; i++) {
          if (String(season[i].name || "").trim().toLowerCase() === nameKey) { sp = season[i]; break; }
        }
        var fg = pgShot(p.fg), tp = pgShot(p.three), ft = pgShot(p.ft);
        var reb = Math.max(0, toNum(p.reb)), ast = Math.max(0, toNum(p.ast));
        var stl = Math.max(0, toNum(p.stl)), blk = Math.max(0, toNum(p.blk)), tov = Math.max(0, toNum(p.turnovers));
        var pmText = String(p.pm == null ? "" : p.pm).trim();
        var pm = /^[-+]?\d+$/.test(pmText) ? Number(pmText) : null;
        var avgPts = sp ? pgAvg(sp.stat, "점") : null;
        var avgReb = sp ? pgAvg(sp.stat, "리바운드") : null;
        var avgAst = sp ? pgAvg(sp.stat, "어시스트") : null;
        var avgFg = sp ? pgSubPct(sp.sub, "야투") : null;
        var prod = pts + 0.7 * ast + 0.3 * reb + stl + 0.7 * blk - tov;
        var expProd = avgPts == null ? null : avgPts + 0.7 * (avgAst || 0) + 0.3 * (avgReb || 0);
        var clutch = (entry.data.clutch && entry.data.clutch[String(p.id)]) || 0;
        var rel = pm == null ? null : pm - tm;
        cands.push({
          name: p.name, photo: p.photo || photoOf(g, p.name), id: String(p.id || ""),
          team: teamBox.name || teamBox.abbr, side: side, teamMargin: tm,
          isWin: !!winSide && side === winSide,
          min: min, pts: pts, reb: reb, ast: ast, stl: stl, blk: blk, tov: tov,
          fg: fg, tp: tp, ft: ft, fgPct: fg ? pgPct(fg.m, fg.a) : null,
          pm: pm, clutch: clutch, rel: rel,
          avgPts: avgPts, avgReb: avgReb, avgAst: avgAst, avgFg: avgFg,
          role: sp ? pgRole(sp.sub) : "", seasonStat: sp ? sp.stat : "",
          prod: prod, expProd: expProd, gap: expProd == null ? null : prod - expProd
        });
      });
    });

    if (!cands.length) {
      return '<section class="postgame"><div class="postgame-head"><b>경기 후 브리핑</b></div>' +
        '<p class="postgame-note">선수 기록은 받았지만 비교할 시즌 평균이 없어 개인 평가를 만들지 못했습니다.</p></section>';
    }

    // 팀 안에서 ± 최고/최저(15분 이상)를 표시용으로 기억해 둔다
    ["away", "home"].forEach(function (side) {
      var pool = cands.filter(function (p) { return p.side === side && p.pm != null && p.min >= 15; });
      if (!pool.length) return;
      var hi = pool.slice().sort(function (a, b) { return b.pm - a.pm; })[0];
      var lo = pool.slice().sort(function (a, b) { return a.pm - b.pm; })[0];
      hi.pmBest = true;
      lo.pmWorst = true;
    });

    function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
    function influence(p) {
      return p.prod + 0.8 * (p.rel == null ? 0 : clamp(p.rel, -12, 12)) + 1.2 * p.clutch;
    }

    // ① 이긴 팀을 이끈 선수: 영향력 최대
    var carryPool = cands.filter(function (p) { return p.isWin && p.min >= 20; });
    if (!carryPool.length) carryPool = cands.filter(function (p) { return p.isWin; });
    var carry = carryPool.slice().sort(function (a, b) { return influence(b) - influence(a); })[0] || null;

    // ② 진 팀에서 가장 아쉬웠던 선수
    //    ① 시즌 평균 대비 뚜렷하게 못한 선수 → ② 기록은 괜찮아도 그가 뛴 구간에 팀이 크게 밀린 선수
    //    → ③ 22분 이상 뛰고도 생산이 아주 얇은 선수 순으로 찾는다. 셋 다 없으면 비워 둔다.
    function lowCost(p) {
      return Math.max(0, -(p.gap == null ? 0 : p.gap)) + 0.8 * Math.max(0, -(p.rel == null ? 0 : p.rel));
    }
    var lowPool = cands.filter(function (p) { return !p.isWin && p.min >= 22; });
    var low = null;
    var byGap = lowPool.filter(function (p) { return p.gap != null && p.gap <= -4; })
      .sort(function (a, b) { return lowCost(b) - lowCost(a); });
    if (byGap.length) { low = byGap[0]; low.kind = "gap"; }
    if (!low) {
      var byPm = lowPool.filter(function (p) { return p.rel != null && p.rel <= -8; })
        .sort(function (a, b) { return a.rel - b.rel; });
      if (byPm.length) { low = byPm[0]; low.kind = "pm"; }
    }
    if (!low) {
      var byThin = lowPool.filter(function (p) { return p.prod <= 10; })
        .sort(function (a, b) { return a.prod - b.prod; });
      if (byThin.length) { low = byThin[0]; low.kind = "thin"; }
    }

    // 화면 맨 위에 '누구 때문에 이겼고 누구 때문에 무너졌는지'를 한 줄로 쓴다
    function verdictLine(c, l) {
      var bits = [];
      if (c) {
        // 그 선수를 '왜' 캐리로 뽑았는지가 한눈에 보이는 근거를 고른다
        var cHow;
        if (c.pts >= 10 && c.reb >= 10 && c.ast >= 10) {
          cHow = "트리플더블 " + c.pts + "점·" + c.reb + "리바운드·" + c.ast + "어시스트";
        } else if (c.pts >= 25) {
          cHow = c.pts + "점";
        } else if (c.clutch >= 5) {
          cHow = "4쿼터 " + c.clutch + "점";
        } else if (c.ast >= 8) {
          cHow = c.pts + "점·" + c.ast + "어시스트";
        } else if (c.reb >= 12) {
          cHow = c.pts + "점·" + c.reb + "리바운드";
        } else if (c.pts >= 18) {
          cHow = c.pts + "점";
        } else if (c.pm != null && c.pm > 0) {
          cHow = "코트 마진 " + pgSigned(c.pm);
        } else {
          cHow = c.pts + "점";
        }
        bits.push(pgJosa(winTeam.name, "은", "는") + " " + c.name + "(" + cHow + ") 덕분에 이겼습니다");
      }
      if (l) {
        var lHow;
        if (l.kind === "gap" && l.avgPts != null) lHow = "시즌 평균 " + l.avgPts.toFixed(1) + "점 → " + l.pts + "점";
        else if (l.kind === "thin") lHow = l.pts + "점·야투 " + (l.fg ? pgShotText(l.fg) : "-");
        else lHow = l.pm != null ? ("코트 마진 " + pgSigned(l.pm)) : (l.pts + "점");
        bits.push(pgJosa(loseTeam.name, "은", "는") + " " + l.name + "(" + lHow + ")에서 흐름이 끊겼습니다");
      }
      return bits.length ? bits.join(". ") + "." : "";
    }

    function statLine(p) {
      var bits = [p.pts + "점"];
      if (p.reb > 0) bits.push(p.reb + "리바운드");
      if (p.ast > 0) bits.push(p.ast + "어시스트");
      return bits.join("·");
    }
    function effText(p) {
      var out = [];
      if (p.fg) out.push("야투 " + pgShotText(p.fg));
      if (p.tp && p.tp.a >= 3) out.push("3점 " + pgShotText(p.tp));
      return out.join("·");
    }

    function carryNote(p) {
      if (!p) return "이긴 팀 선수 기록을 확인하지 못했습니다.";
      var line = statLine(p), eff = effText(p);
      var out = [];
      var bestPts = 0;
      cands.forEach(function (q) { if (q.side === p.side && q.pts > bestPts) bestPts = q.pts; });
      if (p.avgPts != null) {
        var head = p.name + ", " + (p.role ? "팀 내 " + p.role : "주요 선수") + "으로 시즌 평균 " +
          p.avgPts.toFixed(1) + "점을 넣던 선수가 이 경기에서는 " + line + (eff ? "에 " + eff : "") + "로 ";
        if (p.gap != null && p.gap >= 3) head += "기대 이상의 몫을 해냈습니다.";
        else if (p.gap != null && p.gap <= -4) {
          head += (p.pts >= bestPts ? "평균에는 못 미쳤지만 팀에서 가장 많은 " + p.pts + "점을 올렸습니다." : "평균에는 못 미쳤습니다.");
        } else head += "제 몫을 해냈습니다.";
        out.push(head);
      } else {
        var verb = p.pts >= 20 ? "팀 공격을 이끌었습니다."
          : (p.ast >= 8 ? "동료 득점을 만들며 흐름을 이끌었습니다."
            : (p.reb >= 10 ? "골밑에서 힘을 보탰습니다." : "팀 흐름을 앞세웠습니다."));
        out.push(p.name + ", 이 경기 " + line + (eff ? "(" + eff + ")" : "") + "로 " + verb);
      }
      if (p.pm != null && (p.pm > 0 || (p.rel != null && p.rel > 0))) {
        out.push("팀이 " + margin + "점 이긴 경기에서 그가 코트에 있던 " + p.min + "분 동안 팀 마진은 " +
          pgSigned(p.pm) + (p.pmBest ? "(팀 최고)" : "") + "이었습니다.");
      }
      if (p.clutch >= 5) {
        out.push("4쿼터 마지막 5분에 " + p.clutch + "점을 넣으며 승부를 닫았습니다.");
      }
      return out.join(" ");
    }

    function lowNote(p) {
      if (!p) return "이 경기 진 팀에서 기대를 크게 밑돈 선수는 없었습니다.";
      var line = statLine(p), eff = effText(p);
      var out = [];
      var shortOfRole = p.gap != null && p.gap <= -4 && p.avgPts != null;
      if (shortOfRole) {
        out.push(p.name + ", " + (p.role ? "팀 내 " + p.role : "주요 선수") + "으로 시즌 평균 " +
          p.avgPts.toFixed(1) + "점을 넣던 선수가 이 경기에서는 " + line + (eff ? "에 " + eff : "") + "로 " +
          (p.gap <= -8 ? "기대에 크게 못 미쳤습니다." : "제 몫을 다하지 못했습니다."));
      } else if (p.prod <= 10) {
        out.push(p.name + ", " + p.min + "분을 뛰고 " + line + (eff ? "(" + eff + ")" : "") + "에 그쳤습니다.");
      } else {
        out.push(p.name + ", 이 경기 " + line + (eff ? "(" + eff + ")" : "") + "로 기록 자체는 나쁘지 않았습니다.");
      }
      var why = [];
      if (p.pm != null && p.rel != null && p.rel < 0) {
        why.push((shortOfRole ? "그가" : "그러나 그가") + " 코트에 있던 " + p.min + "분 동안 팀 마진은 " +
          pgSigned(p.pm) + (p.pmWorst ? "(팀 최저)" : "") + "이었습니다.");
      }
      if (p.fg && p.avgFg != null && p.fg.a >= 8 && p.avgFg - p.fgPct >= 8) {
        why.push("야투 성공률은 시즌 " + p.avgFg + "%에서 " + p.fgPct + "%로 떨어졌습니다.");
      } else if (p.tov >= 4) {
        why.push("턴오버 " + p.tov + "개로 공격 기회를 잃었습니다.");
      }
      if (!why.length && shortOfRole) {
        why.push("득점·리바운드·어시스트를 합친 생산이 시즌 평균에 못 미쳤습니다.");
      }
      return out.concat(why.slice(0, 2)).join(" ");
    }

    function chipsFor(p, under) {
      var out = [statLine(p)];
      if (p.fg) out.push("야투 " + pgShotText(p.fg));
      if (p.tp && p.tp.a >= 3) out.push("3점 " + pgShotText(p.tp));
      if (under) {
        if (p.tov >= 3) out.push("턴오버 " + p.tov + "개");
      } else if (p.stl + p.blk >= 3) {
        out.push(p.stl > 0 && p.blk > 0 ? "스틸 " + p.stl + "·블록 " + p.blk : (p.stl > 0 ? "스틸 " + p.stl : "블록 " + p.blk));
      }
      if (!under && p.clutch > 0) out.push("클러치 " + p.clutch + "점");
      if (p.avgPts != null) out.push("시즌 평균 " + p.avgPts.toFixed(1) + "점");
      return out;
    }

    function highlightHTML(p, type, title) {
      if (!p) {
        return '<article class="pg-highlight quiet"><b>' + title + '</b><p>' +
          esc(type === "down" ? lowNote(null) : "이긴 팀 선수 기록을 확인하지 못했습니다.") + "</p></article>";
      }
      var under = type === "down";
      var chips = chipsFor(p, under).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
      if (p.pm != null) {
        chips += '<span class="pg-pm ' + (p.pm > 0 ? "up" : (p.pm < 0 ? "down" : "zero")) + '">± ' +
          esc(pgSigned(p.pm)) + "</span>";
      }
      var body = under ? lowNote(p) : carryNote(p);
      return '<article class="pg-highlight ' + type + '"><div class="pg-line"><b>' + title + '</b><span class="pg-tag ' + type + '">' +
        esc(p.team) + '</span></div>' +
        '<strong class="pg-name">' + faceHTML(p.name, p.photo) + esc(p.name) + '</strong><p>' + esc(body) + "</p>" +
        '<div class="pg-facts">' + chips + "</div>" +
        "<small>" + esc(String(p.min)) + "분 출전</small>" + snsReactionHTML(g.id, p.name) + "</article>";
    }

    /* ── 흐름: 결과 + 리드를 뒤집은 구간 ── */
    var flowSentences = [];
    if (!winSide) {
      flowSentences.push("양 팀이 " + awayPts + "-" + homePts + "로 비겼습니다.");
    } else {
      flowSentences.push(pgJosa(winTeam.name, "이", "가") + " " + Math.max(awayPts, homePts) + "-" +
        Math.min(awayPts, homePts) + pgNumJosa(Math.min(awayPts, homePts), "으로", "로") + " 이겼습니다.");
    }
    var quarterRows = [];
    var ls = r.lines;
    if (winSide && ls && ls.away && ls.home && ls.away.length) {
      var wArr = winSide === "away" ? ls.away : ls.home;
      var lArr = winSide === "away" ? ls.home : ls.away;
      var wc = 0, lc = 0, big = 0;
      for (var qi = 0; qi < Math.min(wArr.length, lArr.length); qi++) {
        var qw = Number(wArr[qi]), ql = Number(lArr[qi]);
        if (!isFinite(qw) || !isFinite(ql)) continue;
        wc += qw; lc += ql;
        quarterRows.push({ w: qw, l: ql, wc: wc, lc: lc, d: qw - ql });
        if (Math.abs(qw - ql) > Math.abs(quarterRows[big].d)) big = quarterRows.length - 1;
      }
      if (quarterRows.length) {
        var behind = -1;
        for (var bj = 0; bj < quarterRows.length; bj++) if (quarterRows[bj].wc < quarterRows[bj].lc) behind = bj;
        var otGame = quarterRows.length > 4 && /OT/i.test(String(r.detail || ""));
        var beforeOt = quarterRows.length > 4 ? quarterRows[quarterRows.length - 2] : null;
        if (otGame && beforeOt && beforeOt.wc === beforeOt.lc) {
          flowSentences.push((behind + 1) + "Q까지 " + quarterRows[behind].wc + "-" + quarterRows[behind].lc +
            "로 뒤졌지만 4Q에서 " + beforeOt.w + "-" + beforeOt.l + pgNumJosa(beforeOt.l, "으로", "로") +
            " 따라붙어 연장으로 끌고 갔습니다.");
        } else if (behind >= 0 && behind < quarterRows.length - 1) {
          flowSentences.push((behind + 1) + "Q까지 " + quarterRows[behind].wc + "-" + quarterRows[behind].lc +
            "로 뒤졌지만 " + (behind + 2) + "Q에서는 " + quarterRows[behind + 1].w + "-" + quarterRows[behind + 1].l +
            pgNumJosa(quarterRows[behind + 1].l, "으로", "로") + " 뒤집었습니다.");
        } else {
          var q1 = quarterRows[0];
          flowSentences.push(q1.w === q1.l
            ? ("1Q를 " + q1.w + "-" + q1.l + "로 맞선 뒤 쿼터가 끝날 때마다 뒤지지 않았습니다.")
            : ("1Q " + q1.w + "-" + q1.l + pgNumJosa(q1.l, "으로", "로") + " 앞선 뒤 쿼터가 끝날 때마다 뒤지지 않았습니다."));
        }
      }
    }
    if (/OT/i.test(String(r.detail || "")) && !flowSentences.some(function (x) { return x.indexOf("연장") >= 0; })) {
      flowSentences.push("연장까지 간 접전이었습니다.");
    }
    if (statNum(winSide || "away", "leadChanges") != null && statNum(winSide || "away", "leadChanges") >= 8) {
      flowSentences.push("리드는 모두 " + statNum(winSide || "away", "leadChanges") + "번 바뀌었습니다.");
    }

    /* ── 승패 원인: 팀 지표에서 이긴 팀 쪽으로 벌어진 항목만 2~3개 ── */
    var causes = [];
    if (winSide && boxOf[winSide] && boxOf[winSide === "away" ? "home" : "away"]) {
      var loseSide = winSide === "away" ? "home" : "away";
      var wName = winTeam.name, lName = loseTeam.name;
      var wS = boxOf[winSide].stats || {}, lS = boxOf[loseSide].stats || {};
      var wFg = pgShot(wS["fieldGoalsMade-fieldGoalsAttempted"]) || { m: 0, a: 0 };
      var lFg = pgShot(lS["fieldGoalsMade-fieldGoalsAttempted"]) || { m: 0, a: 0 };
      var wTp = pgShot(wS["threePointFieldGoalsMade-threePointFieldGoalsAttempted"]) || { m: 0, a: 0 };
      var lTp = pgShot(lS["threePointFieldGoalsMade-threePointFieldGoalsAttempted"]) || { m: 0, a: 0 };
      var wFt = pgShot(wS["freeThrowsMade-freeThrowsAttempted"]) || { m: 0, a: 0 };
      var lFt = pgShot(lS["freeThrowsMade-freeThrowsAttempted"]) || { m: 0, a: 0 };
      var wFgP = statNum(winSide, "fieldGoalPct"), lFgP = statNum(loseSide, "fieldGoalPct");
      var wTpP = statNum(winSide, "threePointFieldGoalPct"), lTpP = statNum(loseSide, "threePointFieldGoalPct");
      var wReb = statNum(winSide, "totalRebounds"), lReb = statNum(loseSide, "totalRebounds");
      var wOreb = statNum(winSide, "offensiveRebounds"), lOreb = statNum(loseSide, "offensiveRebounds");
      var wAst = statNum(winSide, "assists"), lAst = statNum(loseSide, "assists");
      var wTo = statNum(winSide, "turnovers"), lTo = statNum(loseSide, "turnovers");
      var wToPts = statNum(winSide, "turnoverPoints"), lToPts = statNum(loseSide, "turnoverPoints");
      var wPitp = statNum(winSide, "pointsInPaint"), lPitp = statNum(loseSide, "pointsInPaint");
      var wFb = statNum(winSide, "fastBreakPoints"), lFb = statNum(loseSide, "fastBreakPoints");

      // 슈팅: 야투 성공률 차이와 3점으로 얻은 득점 차를 한 항목으로 묶는다
      var fgDiff = (wFgP != null && lFgP != null) ? wFgP - lFgP : 0;
      var tpPts = 3 * (wTp.m - lTp.m);
      if (wFg.a && lFg.a && (fgDiff > 0 || tpPts > 0)) {
        var shoot = "";
        if (fgDiff > 0) {
          shoot += pgJosa(wName, "은", "는") + " 야투 " + wFg.m + "-" + wFg.a + "(" + wFgP + "%), " +
            pgJosa(lName, "은", "는") + " " + lFg.m + "-" + lFg.a + "(" + lFgP + "%)였습니다.";
        }
        if ((wTp.a || lTp.a) && tpPts >= 6) {
          if (shoot) shoot += " 3점은 ";
          else shoot = "3점은 ";
          shoot += wName + " " + wTp.m + "-" + wTp.a + (wTpP != null ? "(" + wTpP + "%)" : "") + ", " +
            lName + " " + lTp.m + "-" + lTp.a + (lTpP != null ? "(" + lTpP + "%)" : "") +
            "로 " + pgJosa(wName, "이", "가") + " " + tpPts + "점 더 넣었습니다";
        }
        if (shoot) causes.push({ strength: Math.max(Math.max(0, fgDiff) * 1.6, Math.max(0, tpPts)), text: shoot.replace(/\.+$/, "") + "." });
      }
      // 턴오버: 개수와 '그로 인한 실점'
      if (wTo != null && lTo != null) {
        var toPtsEdge = (wToPts != null && lToPts != null) ? wToPts - lToPts : 0;
        if (toPtsEdge > 0) {
          var toText = "턴오버는 " + wName + " " + wTo + "개, " + lName + " " + lTo + "개" +
            (wTo > lTo ? "로 더 많았지만" : "였습니다.");
          if (wToPts != null && lToPts != null && toPtsEdge !== 0) {
            toText += " 상대 턴오버에서 얻은 점수는 " + wName + " " + wToPts + "점, " + lName + " " + lToPts + "점이었습니다.";
          }
          causes.push({ strength: Math.max(Math.max(0, lTo - wTo) * 1.2, Math.max(0, toPtsEdge) * 0.9), text: toText });
        }
      }
      // 리바운드(공격 리바운드는 이긴 팀이 더 잡았을 때만 덧붙인다)
      if (wReb != null && lReb != null && (wReb > lReb || (wOreb != null && lOreb != null && wOreb - lOreb >= 3))) {
        var orebGap = (wOreb == null || lOreb == null) ? 0 : wOreb - lOreb;
        var rebText = "리바운드는 " + wName + " " + wReb + "개, " + lName + " " + lReb + "개였습니다.";
        if (wOreb != null && lOreb != null && orebGap > 0) {
          rebText = "리바운드는 " + wName + " " + wReb + "개, " + lName + " " + lReb + "개" +
            (wReb > lReb ? "였고" : "로 밀렸지만") + " 공격 리바운드는 " + wOreb + "-" + lOreb +
            "로 세컨드찬스 기회를 더 가져갔습니다.";
        }
        causes.push({ strength: Math.max(0, wReb - lReb) * 1.1 + Math.max(0, orebGap) * 0.8, text: rebText });
      }
      // 자유투
      if (wFt.a && lFt.a && wFt.m - lFt.m >= 3) {
        causes.push({
          strength: (wFt.m - lFt.m) * 0.9,
          text: "자유투는 " + wName + " " + wFt.m + "-" + wFt.a + ", " + lName + " " + lFt.m + "-" + lFt.a +
            "로 " + pgJosa(wName, "이", "가") + " " + (wFt.m - lFt.m) + "점 더 넣었습니다."
        });
      }
      // 페인트존
      if (wPitp != null && lPitp != null && wPitp - lPitp >= 8) {
        causes.push({
          strength: (wPitp - lPitp) * 0.7,
          text: "페인트존 득점은 " + wName + " " + wPitp + "점, " + lName + " " + lPitp + "점이었습니다."
        });
      }
      // 속공
      if (wFb != null && lFb != null && wFb - lFb >= 6) {
        causes.push({
          strength: (wFb - lFb) * 0.6,
          text: "속공 득점은 " + wName + " " + wFb + "점, " + lName + " " + lFb + "점이었습니다."
        });
      }
      // 어시스트
      if (wAst != null && lAst != null && wAst - lAst >= 6) {
        causes.push({
          strength: (wAst - lAst) * 0.5,
          text: "어시스트는 " + wName + " " + wAst + "개, " + lName + " " + lAst + "개로 " +
            pgJosa(wName, "이", "가") + " 패스로 만든 득점이 더 많았습니다."
        });
      }
    }
    var ranked = causes.slice().sort(function (a, b) { return b.strength - a.strength; });
    var topCauses = ranked.filter(function (c) { return c.strength >= 5; }).slice(0, 3);
    if (topCauses.length < 2) topCauses = ranked.slice(0, Math.min(3, Math.max(2, topCauses.length)));
    var whyText;
    if (topCauses.length) {
      whyText = topCauses.map(function (c) { return c.text; }).join(" ");
    } else if (winSide) {
      whyText = "팀 지표에서 한쪽으로 크게 기울어진 항목이 없었고, " + margin + "점 차 접전이었습니다.";
    } else {
      whyText = "팀 지표에서 승부를 가른 항목을 찾지 못했습니다.";
    }

    /* ── 더 보기: 쿼터 흐름 · 팀 지표 ── */
    var detailBits = [];
    if (quarterRows.length) {
      var bigRow = quarterRows[0];
      quarterRows.forEach(function (q) { if (Math.abs(q.d) > Math.abs(bigRow.d)) bigRow = q; });
      var bigIdx = quarterRows.indexOf(bigRow);
      detailBits.push("가장 크게 갈린 쿼터는 " + (bigIdx + 1) + "Q로 " +
        (bigRow.d > 0 ? pgJosa(winTeam.name, "이", "가") : pgJosa(loseTeam.name, "이", "가")) + " " +
        Math.abs(bigRow.d) + "점 앞섰습니다.");
    }
    var biggest = statNum(winSide || "away", "largestLead");
    if (winSide && biggest != null) {
      detailBits.push("이긴 팀의 최대 리드는 " + biggest + "점이었습니다.");
    }
    var teamStatRows = [];
    if (winSide && boxOf[winSide] && boxOf[winSide === "away" ? "home" : "away"]) {
      var lsid = winSide === "away" ? "home" : "away";
      var wAbbr = String(boxOf[winSide].abbr || ""), lAbbr = String(boxOf[lsid].abbr || "");
      function pair(label, wv, lv) {
        if (wv == null || lv == null || wv === "") return;
        teamStatRows.push('<div class="pg-stat-row"><i>' + esc(label) + "</i><span>" +
          esc(wAbbr + " " + wv + " · " + lAbbr + " " + lv) + "</span></div>");
      }
      var wS2 = boxOf[winSide].stats || {}, lS2 = boxOf[lsid].stats || {};
      function both(key, fmt) {
        var a = wS2[key], b = lS2[key];
        if (a == null || b == null) return;
        pair(fmt.label, fmt.f(a), fmt.f(b));
      }
      both("fieldGoalsMade-fieldGoalsAttempted", { label: "야투", f: function (v) { var s = pgShot(v); return s ? pgShotText(s) : v; } });
      both("threePointFieldGoalsMade-threePointFieldGoalsAttempted", { label: "3점", f: function (v) { var s = pgShot(v); return s ? pgShotText(s) : v; } });
      both("freeThrowsMade-freeThrowsAttempted", { label: "자유투", f: function (v) { var s = pgShot(v); return s ? pgShotText(s) : v; } });
      both("totalRebounds", { label: "리바운드", f: function (v) { return v + "개"; } });
      both("offensiveRebounds", { label: "공격 리바운드", f: function (v) { return v + "개"; } });
      both("assists", { label: "어시스트", f: function (v) { return v + "개"; } });
      both("turnovers", { label: "턴오버", f: function (v) { return v + "개"; } });
      both("turnoverPoints", { label: "턴오버 실점", f: function (v) { return v + "점"; } });
      both("pointsInPaint", { label: "페인트존", f: function (v) { return v + "점"; } });
      both("fastBreakPoints", { label: "속공", f: function (v) { return v + "점"; } });
    }

    var morePieces = "";
    if (detailBits.length) morePieces += "<p>" + esc(detailBits.join(" ")) + "</p>";
    if (teamStatRows.length) {
      morePieces += '<div class="pg-stat-grid" aria-label="팀 지표 비교">' + teamStatRows.join("") + "</div>";
    }

    return '<section class="postgame"><div class="postgame-head"><b>경기 후 브리핑</b><span>승패 원인 · 활약</span></div>' +
      '<p class="pg-game-line">' + esc(flowSentences.join(" ")) + "</p>" +
      (winSide ? '<p class="pg-verdict">' + esc(verdictLine(carry, low)) + "</p>" : "") +
      '<div class="pg-why"><b>승부가 갈린 이유</b><p>' + esc(whyText) + "</p></div>" +
      '<div class="pg-highlights">' + highlightHTML(carry, "up", "캐리한 선수") + highlightHTML(low, "down", "아쉬웠던 선수") + "</div>" +
      (morePieces ? '<details class="pg-more"><summary>경기 흐름 · 팀 지표 더 보기</summary>' + morePieces + "</details>" : "") +
      '<p class="postgame-note">선수 평가는 시즌 평균과 박스스코어(득점·리바운드·어시스트·야투·턴오버·±)를 바탕으로 한 자동 요약입니다. ±는 그 선수가 코트에 있던 동안의 팀 득실 마진입니다.</p></section>';
  }

  /* ── 축구: 결과·흐름 + 승패 원인(점유율·슈팅·선방) + 득점 장면 ──
     ESPN 축구 요약에는 선수별 시즌 평균이 없어 개인 평가는 하지 않고, 팀 지표와 득점자만 쓴다. */
  function pgSoccerHTML(g) {
    var r = g.result;
    var away = Number(r.awayScore), home = Number(r.homeScore);
    if (!isFinite(away) || !isFinite(home)) return "";
    var winSide = away > home ? "away" : (home > away ? "home" : null);
    var winTeam = winSide ? g[winSide] : null;
    var loseTeam = winSide ? g[winSide === "away" ? "home" : "away"] : null;
    var out = [];

    if (!winSide) {
      out.push("양 팀이 " + away + "-" + home + pgNumJosa(home, "으로", "로") + " 비겼습니다.");
    } else {
      out.push(pgJosa(winTeam.name, "이", "가") + " " + Math.max(away, home) + "-" + Math.min(away, home) +
        pgNumJosa(Math.min(away, home), "으로", "로") + " 이겼습니다.");
    }
    var ls = r.lines;
    if (ls && ls.away && ls.home && ls.away.length) {
      var halves = [];
      for (var i = 0; i < Math.min(ls.away.length, ls.home.length); i++) {
        var wv = winSide === "away" ? ls.away[i] : (winSide === "home" ? ls.home[i] : ls.away[i]);
        var lv = winSide === "away" ? ls.home[i] : (winSide === "home" ? ls.away[i] : ls.home[i]);
        halves.push((i === 0 ? "전반" : "후반") + " " + wv + "-" + lv);
      }
      out.push(halves.join(", ") + pgNumCopula(ls.home[ls.home.length - 1] || 0) + ".");
    }

    var entry = summaryEntry(g);
    var data = entry && entry.data;
    var boxes = data && Array.isArray(data.box) ? data.box : [];
    if (!boxes.length) {
      return '<section class="postgame"><div class="postgame-head"><b>경기 후 브리핑</b></div>' +
        '<p class="postgame-note">' +
        (entry && entry.err ? "경기 기록을 불러오지 못했습니다." : "경기 기록을 불러오는 중입니다.") +
        "</p></section>";
    }

    function sideIdx(side) {
      var want = String((g[side] && g[side].abbr) || "").toUpperCase();
      for (var i = 0; i < boxes.length; i++) {
        if (String(boxes[i].abbr || "").toUpperCase() === want) return i;
      }
      return side === "away" ? 0 : 1;
    }
    function sn(stats, key) {
      var v = Number(String(stats[key] == null ? "" : stats[key]).trim());
      return isFinite(v) ? v : null;
    }
    function f1(v) { return Math.round(v * 10) / 10; }
    function shotsText(name, shots, on) {
      return name + " " + (shots == null ? "-" : shots) + "개(유효 " + (on == null ? "-" : on) + ")";
    }

    var why = "팀 지표가 비슷해 한쪽으로 기울어진 항목이 없었습니다.";
    var whyLabel = winSide ? "승부가 갈린 이유" : "경기 양상";
    if (boxes.length >= 2) {
      var wIdx = winSide ? sideIdx(winSide) : sideIdx("away");
      var lIdx = winSide ? sideIdx(winSide === "away" ? "home" : "away") : sideIdx("home");
      var wS = boxes[wIdx].stats || {}, lS = boxes[lIdx].stats || {};
      var wName = winSide ? winTeam.name : g.away.name;
      var lName = winSide ? loseTeam.name : g.home.name;
      var wShots = sn(wS, "totalShots"), lShots = sn(lS, "totalShots");
      var wOn = sn(wS, "shotsOnTarget"), lOn = sn(lS, "shotsOnTarget");
      var wSaves = sn(wS, "saves"), lSaves = sn(lS, "saves");
      var wPoss = sn(wS, "possessionPct"), lPoss = sn(lS, "possessionPct");
      var wCorners = sn(wS, "wonCorners"), lCorners = sn(lS, "wonCorners");
      var facts = [];
      var wShotsT = shotsText(wName, wShots, wOn), lShotsT = shotsText(lName, lShots, lOn);

      if (!winSide) {
        // 무승부: 누가 밀어붙였고 누가 효율로 버텼는지
        if (wShots != null && lShots != null && wShots !== lShots) {
          var domW = wShots > lShots ? wName : lName;
          var domShots = Math.max(wShots, lShots), subShots = Math.min(wShots, lShots);
          var domOn = wShots > lShots ? wOn : lOn, subOn = wShots > lShots ? lOn : wOn;
          var domPoss = wShots > lShots ? wPoss : lPoss;
          var t = pgJosa(domW, "이", "가") + " " + (domPoss != null ? "점유율 " + f1(domPoss) + "%, " : "") + "슈팅 " +
            domShots + "-" + subShots + "로 밀어붙였지만 " + away + "-" + home + " 무승부였습니다.";
          if (domOn != null && subOn != null && subOn > domOn) {
            t += " 유효 슈팅은 " + pgJosa(wShots > lShots ? lName : wName, "이", "가") + " " + subOn + "-" + domOn + "로 더 날카로웠습니다.";
          }
          facts.push(t);
        }
      } else if (wShots != null && lShots != null && wShots < lShots) {
        // 슈팅 수에서 밀렸는데 이긴 경기: 골키퍼 선방 차이
        if (wSaves != null && lSaves != null && wSaves > lSaves) {
          facts.push("슈팅은 " + wShotsT + ", " + lShotsT + "로 밀렸지만 " + wName + " 골키퍼가 선방 " +
            wSaves + "개로 " + lName + "(" + lSaves + "개)보다 많았고, 그 차이가 " +
            Math.max(away, home) + "-" + Math.min(away, home) + " 승부를 지켰습니다.");
        } else {
          facts.push("슈팅은 " + wShotsT + ", " + lShotsT + "였습니다.");
        }
      } else if (wShots != null && lShots != null) {
        facts.push("슈팅은 " + wShotsT + ", " + lShotsT + "로 " + pgJosa(wName, "이", "가") + " 더 많이 때렸습니다.");
      }
      if (winSide && wOn != null && lOn != null && wOn - lOn >= 3) {
        facts.push("유효 슈팅은 " + wOn + "-" + lOn + "였습니다.");
      }
      if (wPoss != null && lPoss != null && Math.abs(wPoss - lPoss) >= 10 && !(!winSide && wShots !== lShots)) {
        facts.push("점유율은 " + wName + " " + f1(wPoss) + "%, " + lName + " " + f1(lPoss) + "%였습니다.");
      }
      if (wCorners != null && lCorners != null && Math.abs(wCorners - lCorners) >= 5) {
        facts.push("코너킥은 " + wCorners + "-" + lCorners + "였습니다.");
      }
      if (facts.length) why = facts.slice(0, 3).join(" ");
    }

    var more = "";
    var goals = (data && Array.isArray(data.goals)) ? data.goals : [];
    if (goals.length) {
      var koTeam = {};
      boxes.forEach(function (b, i) {
        var ab = String(b.abbr || "").toUpperCase();
        var side = (g.away && String(g.away.abbr || "").toUpperCase() === ab) ? "away" :
          ((g.home && String(g.home.abbr || "").toUpperCase() === ab) ? "home" : "");
        if (side) koTeam[String(b.id || "")] = g[side].name;
      });
      more = '<div class="pg-stat-grid">' + goals.map(function (x) {
        var text = x.text;
        var ko = koTeam[x.teamId];
        if (ko && x.teamName) text = text.replace("(" + x.teamName + ")", "(" + ko + ")");
        return '<div class="pg-stat-row"><i>' + esc(x.minute) + '</i><span>' + esc(text) + "</span></div>";
      }).join("") + "</div>";
    }
    var note = "축구는 ESPN 공개 데이터에 선수별 시즌 평균이 없어 개인 평가는 표시하지 않습니다. 팀 지표와 득점 장면만 정리했습니다.";

    return '<section class="postgame"><div class="postgame-head"><b>경기 후 브리핑</b><span>승패 원인</span></div>' +
      '<p class="pg-game-line">' + esc(out.join(" ")) + "</p>" +
      '<div class="pg-why"><b>' + whyLabel + '</b><p>' + esc(why) + "</p></div>" +
      (more ? '<details class="pg-more"><summary>득점 장면 더 보기</summary>' + more + "</details>" : "") +
      '<p class="postgame-note">' + esc(note) + "</p></section>";
  }

  function flowRowHTML(row, g) {
    var text = String(row && row.text || "");
    var pastAt = text.indexOf(". 직전 경기(");
    var current = pastAt >= 0 ? text.slice(0, pastAt) : text;
    // 팀 흐름도 홈 팀을 먼저 보여 준다.
    var homeName = g && g.home ? String(g.home.name || "") : "";
    var awayName = g && g.away ? String(g.away.name || "") : "";
    var sideRank = function (name) {
      var n = String(name || "");
      if (!n) return 2;
      if (homeName && (homeName.indexOf(n) >= 0 || n.indexOf(homeName) >= 0)) return 0;
      if (awayName && (awayName.indexOf(n) >= 0 || n.indexOf(awayName) >= 0)) return 1;
      return 2;
    };
    var summaries = current.split(/, (?=\*\*)/);
    var cards = summaries.map(function (part) {
      var m = part.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (!m) return null;
      return { name: m[1], body: m[2] };
    }).filter(Boolean).sort(function (a, b) {
      return sideRank(a.name) - sideRank(b.name);
    }).map(function (item) {
      return '<div class="flow-team"><b>' + esc(item.name) + '</b><p>' + md(item.body) + "</p></div>";
    }).join("");
    var last = [];
    var re = /직전 경기\(([^)]+)\)\s+\*\*(.+?)\*\*는\s+([\s\S]*?)(?=\. 직전 경기\(|$)/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      var detail = match[3].replace(/\s*기록했습니다\.?\s*$/, "").trim();
      last.push({ name: match[2], html: '<div class="flow-last"><span>' + esc(match[1]) + " · " + esc(match[2]) + '</span><p>' + md(detail) + "</p></div>" });
    }
    last.sort(function (a, b) { return sideRank(a.name) - sideRank(b.name); });
    last = last.map(function (item) { return item.html; });
    if (!cards && !last.length) {
      return '<div class="srow flow"><dt>' + esc(row.label || "흐름") + '</dt><dd>' + md(text) + "</dd></div>";
    }
    return '<section class="flow-card"><h3>팀 흐름</h3>' +
      (cards ? '<div class="flow-teams">' + cards + "</div>" : "") +
      (last.length ? '<div class="flow-recent"><h4>직전 경기</h4>' + last.join("") + "</div>" : "") +
      "</section>";
  }

  function gameTagsHTML(g) {
    var tags = Array.isArray(g.tags) ? g.tags.slice() : [];
    var hasInjuryTotal = tags.some(function (tag) {
      return /^(결장|부상)\s+\d+명$/.test(tag.text || "");
    });
    var teams = g.details && Array.isArray(g.details.teams) ? g.details.teams : [];
    if (hasInjuryTotal && teams.length) {
      var teamTags = [];
      teams.forEach(function (team) {
        var injuries = Array.isArray(team.injuries) ? team.injuries : [];
        if (!injuries.length) return;
        var outs = injuries.filter(function (injury) { return String(injury.status || "").toUpperCase() === "OUT"; }).length;
        var label = outs ? "결장 " + outs + "명" : "부상 " + injuries.length + "명";
        teamTags.push({ text: (team.abbr || team.name || "팀") + " " + label, tone: "warn" });
      });
      if (teamTags.length) {
        tags = tags.filter(function (tag) { return !/^(결장|부상)\s+\d+명$/.test(tag.text || ""); }).concat(teamTags);
      }
    }
    // 평균 득점 칩만 숨기고, 결장은 팀별 칩으로 구분해 보여 준다.
    tags = tags.filter(function (tag) {
      var text = String(tag.text || "");
      return !/^평균(?:\s|$)/.test(text);
    });
    return tags.map(function (tag) {
      return '<span class="tag ' + toneClass(tag.tone, ["warn", "hot", "info"], "") + '">' + esc(tag.text) + "</span>";
    }).join("");
  }

  // 핵심 선수(축구) — details.keyPlayers. 홈 팀을 먼저, 데이터가 없으면 블록 자체를 그리지 않는다.
  function keyPlayersHTML(d) {
    var groups = d && Array.isArray(d.keyPlayers) ? d.keyPlayers.filter(function (k) {
      return k && Array.isArray(k.players) && k.players.length;
    }) : [];
    if (!groups.length) return "";
    var ordered = groups.slice().sort(function (a, b) {
      var rank = function (t) { return t.side === "home" ? 0 : 1; };
      return rank(a) - rank(b);
    });
    var body = ordered.map(function (k) {
      var side = k.side === "home" ? "home" : "away";
      return '<div class="kp-team">' +
        '<div class="kp-head"><span class="kp-side ' + side + '">' +
          (side === "home" ? "홈" : "원정") + "</span><b>" + esc(k.team || "") + "</b></div>" +
        '<ul class="kp-list">' + k.players.map(function (p) {
          var stats = Array.isArray(p.stats) ? p.stats : (p.stat ? [p.stat] : []);
          return "<li>" + faceHTML(p.name, p.photo) +
            (stats.length ? '<span class="kp-stat">' + esc(stats.join(" · ")) + "</span>" : "") +
            '<b class="kp-name">' + esc(p.name || "") + "</b></li>";
        }).join("") + "</ul></div>";
    }).join("");
    return '<h3 class="p-title">핵심 선수</h3><div class="kp-teams">' + body + "</div>";
  }

  // 처음 화면에 남길 '주요 선수' 한 줄 — 팀별 2~3명, 얼굴·이름·기록.
  function lineupHTML(g, d) {
    var teams = Array.isArray(d.teams) ? d.teams.filter(Boolean) : [];
    if (!teams.length) return "";
    var ordered = teams.slice().sort(function (a, b) {
      var rank = function (t) { return t.side === "home" ? 0 : 1; };
      return rank(a) - rank(b);
    });
    var blocks = ordered.map(function (t) {
      var ps = (Array.isArray(t.players) && t.players.length) ? t.players : keyPlayersFor(g, t);
      ps = (ps || []).slice(0, 3);
      if (!ps.length) return "";
      var side = t.side === "away" ? "away" : "home";
      var list = ps.map(function (p) {
        return '<li>' + faceHTML(p.name, p.photo) +
          '<b class="lu-pname">' + esc(p.name || "") + "</b>" +
          (p.stat ? '<span class="lu-stat">' + esc(p.stat) + "</span>" : "") + "</li>";
      }).join("");
      return '<div class="lu-team"><span class="lu-side ' + side + '">' +
        (side === "home" ? "홈" : "원정") + '</span><b class="lu-tname">' + esc(t.name || "") + "</b>" +
        '<ul class="lu-list">' + list + "</ul></div>";
    }).filter(Boolean);
    if (!blocks.length) return "";
    return '<h4 class="tb-sub">주요 선수</h4><div class="lu-teams">' + blocks.join("") + "</div>";
  }

  function boxHTML(g) {
    var d = g.details || {};
    var injuries = Array.isArray(d.injuries) ? d.injuries : [];
    var checks = Array.isArray(d.checkpoints) ? d.checkpoints : [];
    var rows = Array.isArray(g.rows) ? g.rows : [];
    var tags = gameTagsHTML(g);

    var liveNow = g.result && g.result.state === "live";
    var finalNow = g.result && g.result.state === "final";

    // 경기 전 프리뷰(팀 상태·배당·맞대결·체크포인트)
    var preview = '<div class="box-head">' +
      '<span class="ch-badge">경기 전 브리핑</span>' +
      '<span class="ch-sub">' + (liveNow ? "경기 전 기준 정보 · 팀 비교 · 결장" :
        (finalNow ? "경기 당시 팀 정보 · 부상자 · 체크포인트" : "팀 비교 · 부상자 · 체크포인트")) + "</span>" +
      (g.venue ? '<span class="ch-venue">' + esc(g.venue) + "</span>" : "") +
      "</div>" +
      '<ul class="form-list">' + formRow("home", g.home, g) + formRow("away", g.away, g) + "</ul>";

    if (tags) preview += '<div class="tags">' + tags + "</div>";

    var extraRows = rows.filter(function (r) { return r.kind !== "flow"; });
    if (extraRows.length) {
      preview += '<dl class="summary">' + extraRows.map(function (r) {
        var kind = toneClass(r.kind, ["flow", "inj", "watch"], "");
        return '<div class="srow ' + kind + '"><dt>' + esc(r.label) + "</dt><dd>" + md(r.text) + "</dd></div>";
      }).join("") + "</dl>";
    }
    rows.filter(function (r) { return r.kind === "flow"; }).forEach(function (r) { preview += flowRowHTML(r, g); });

    // 축구 핵심 선수는 각 팀 블록 안 '주요 선수'로 들어간다.
    // 접히지 않는 위쪽에는 팀별 주요 선수만 한 줄로 보여 준다.
    preview += lineupHTML(g, d);

    // 접어 두는 아래쪽: 팀 블록·맞대결·체크포인트
    var more = "";

    // 팀별 정보: 원정 먼저, 홈 다음. 두 블록 사이는 넉넉히 띄운다.
    var teams = Array.isArray(d.teams) ? d.teams.filter(Boolean) : [];
    if (teams.length) {
      // 홈 팀 블록을 먼저 보여 준다.
      var ordered = teams.slice().sort(function (a, b) {
        var rank = function (t) { return t.side === "home" ? 0 : 1; };
        return rank(a) - rank(b);
      });
      more += '<div class="team-blocks">' + ordered.map(function (team) { return teamBlockHTML(team, g); }).join("") + "</div>";
    } else if (injuries.length) {
      more += '<h3 class="p-title">부상 리포트</h3><ul class="inj-list">' + injRowsHTML(injuries, true) + "</ul>";
    }

    preview += oddsHTML(g);

    if (d.h2h && (d.h2h.summary || (d.h2h.games && d.h2h.games.length))) {
      var hg = (d.h2h.games || []).slice(0, 5).map(function (m) {
        return "<li><span class=\"h-date\">" + esc((m.date || "").replace(/-/g, ".")) + "</span>" +
          "<span class=\"h-teams\">" + esc(m.home || "") + " " + esc(m.score || "") + " " + esc(m.away || "") + "</span></li>";
      }).join("");
      more += '<h3 class="p-title">맞대결</h3>' +
        (d.h2h.summary ? '<p class="h-sum">' + esc(d.h2h.summary) + "</p>" : "") +
        (hg ? '<ul class="h-list">' + hg + "</ul>" : "");
    }

    if (checks.length) {
      more += '<h3 class="p-title">체크포인트</h3><ol class="checks">' +
        checks.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("") + "</ol>";
    }

    if (d.note) more += '<p class="note">' + esc(d.note) + "</p>";

    // 경기 전에는 프리뷰만 보여준다. 진행 중에는 라이브 상황을 위에 두고,
    // 종료 후에는 결과를 위로 올린 뒤 경기 전 프리뷰를 아래에 보존한다.
    var body;
    if (liveNow) {
      body = liveSectionHTML(g) + '<details class="pregame"><summary>경기 전 브리핑</summary><div class="pregame-body">' + preview + "</div></details>";
    } else if (finalNow) {
      body = resultHTML(g) + postgameHTML(g) + '<details class="pregame"><summary>경기 전 브리핑</summary><div class="pregame-body">' + preview + "</div></details>";
    } else {
      body = preview + (more ? '<details class="more"><summary>팀 정보 · 부상 · 맞대결 더 보기</summary><div class="more-body">' + more + "</div></details>" : "");
    }

    return '<div class="cbox-outer"><div class="cbox">' + body + "</div></div>";
  }

  /* ── 일정 목록: 한 줄 = 한 경기 ────────────────────── */
  function rowHTML(g) {
    var p = parts(g.start);
    var dateStr = p.y + "-" + p.m + "-" + p.d;
    var when = shortDate(dateStr) + " (" + weekdayOf(dateStr) + ")";
    var sm = sportMeta(g.sport);
    var league = g.league || sm.name;
    var away = g.away ? g.away.name : "—";
    var home = g.home ? g.home.name : "—";
    var label = sm.name + " " + when + " " + p.hh + ":" + p.mm + ", 원정 " + away + " 대 홈 " + home +
      " — VS 상황 보기";

    var oddsChip = g.odds ? '<span class="mchip odds">배당</span>' : "";

    return '<li class="mrow-item" data-id="' + esc(g.id) + '">' +
      '<div class="mrow">' +
        '<span class="mrow-meta">' +
          '<span class="mwhen">' + esc(when) + " · <b>" + p.hh + ":" + p.mm + "</b></span>" +
          '<span class="mlg">' + esc(league) + "</span>" +
            '<span class="mpill" data-pill="' + esc(g.id) + '">' + livePillHTML(g) + "</span>" +
        "</span>" +
        '<button class="cbtn" type="button" aria-expanded="false" aria-controls="box-' + esc(g.id) + '"' +
        ' aria-label="' + esc(label) + '" data-id="' + esc(g.id) + '">' +
          '<span class="cbtn-label">VS 상황</span>' +
          '<svg class="chev" width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
          '<path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        '<span class="mtms">' +
          '<span class="tm away">' + favoriteButtonHTML(g.sport, away) + '<button class="team-link" type="button" data-team-focus="' + esc(away) + '" aria-label="' + esc(away + " 팀 현황 보기") + '">' + crestHTML(g, "away") + '<span class="tm-name">' + esc(away) + "</span></button></span>" +
          '<span class="mslot" data-slot="' + esc(g.id) + '">' + scoreSlotHTML(g) + "</span>" +
          '<span class="tm home">' + favoriteButtonHTML(g.sport, home) + '<button class="team-link" type="button" data-team-focus="' + esc(home) + '" aria-label="' + esc(home + " 팀 현황 보기") + '">' + crestHTML(g, "home") + '<span class="tm-name">' + esc(home) + "</span></button></span>" +
        "</span>" +
      "</div>" +
      '<div class="cbox-wrap" id="box-' + esc(g.id) + '"></div>' +
      "</li>";
  }

  // 한 줄의 점수 칸: 결과가 있으면 점수, 없으면 vs
  function scoreSlotHTML(g) {
    var r = g.result;
    if (r && (r.state === "final" || r.state === "live")) {
      return '<span class="mscore ' + (r.state === "final" ? "final" : "live") + '">' +
        "<b>" + esc(String(r.awayScore != null ? r.awayScore : "-")) + "</b>" +
        "<i>:</i>" +
        "<b>" + esc(String(r.homeScore != null ? r.homeScore : "-")) + "</b>" +
        "</span>";
    }
    return '<span class="vs" aria-hidden="true">vs</span>';
  }

  // 한 줄의 상태 칸: 진행 중이면 🔴 LIVE + 쿼터/남은 시간
  function livePillHTML(g) {
    var r = g.result;
    if (r && r.state === "live") {
      return '<span class="mlive">' +
        '<span class="lv"><span class="lv-dot" aria-hidden="true"></span>LIVE</span>' +
        (r.detail ? '<b class="mlive-t">' + esc(r.detail) + "</b>" : "") +
        "</span>";
    }
    if (g.id && LIVE.ended[g.id]) return '<span class="mend">종료</span>';
    return "";
  }

  function itemOf(id) {
    var items = elList.querySelectorAll(".mrow-item");
    for (var i = 0; i < items.length; i++) if (items[i].dataset.id === id) return items[i];
    return null;
  }

  function openItem(item) {
    var entry = gameEntry(item.dataset.id);
    if (!entry) return;
    var id = item.dataset.id;
    var wrap = item.querySelector(".cbox-wrap");
    var btn = item.querySelector(".cbtn");
    var label = btn.querySelector(".cbtn-label");

    window.clearTimeout(wrap._timer);
    wrap.innerHTML = boxHTML(entry.g);
    // 진행 중인 경기면 선수 기록·최근 플레이를 바로 받아 채운다
    if (entry.g.result && entry.g.result.state === "live") refreshLiveSummary(item, entry.g, false);
    else if (entry.g.result && entry.g.result.state === "final" &&
      (entry.g.sport === "basketball" || entry.g.sport === "soccer")) refreshPostgameSummary(item, entry.g, false);
    item.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    label.textContent = "접기";

    wrap.style.height = "0px";
    void wrap.offsetHeight;
    wrap.style.height = wrap.scrollHeight + "px";
    wrap.style.opacity = "1";
    wrap._timer = window.setTimeout(function () {
      if (item.classList.contains("open")) wrap.style.height = "auto";
    }, 360);
  }

  function closeItem(item) {
    var wrap = item.querySelector(".cbox-wrap");
    var btn = item.querySelector(".cbtn");
    var label = btn.querySelector(".cbtn-label");

    item.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    label.textContent = "VS 상황";

    window.clearTimeout(wrap._timer);
    if (!wrap.firstChild) { wrap.style.height = "0px"; wrap.style.opacity = "0"; return; }

    wrap.style.height = wrap.scrollHeight + "px";
    void wrap.offsetHeight;
    wrap.style.height = "0px";
    wrap.style.opacity = "0";
    wrap._timer = window.setTimeout(function () {
      if (!item.classList.contains("open")) wrap.innerHTML = "";
    }, 380);
  }

  // 한 번에 한 경기만 펼친다.
  function toggleItem(item) {
    var id = item.dataset.id;
    var willOpen = !item.classList.contains("open");

    Array.prototype.forEach.call(elList.querySelectorAll(".mrow-item.open"), function (other) {
      if (other !== item) closeItem(other);
    });

    if (willOpen) {
      openItem(item);
      state.openId = id;
      writeHash(stateRoutePrefix() + "/" + id, true);
    } else {
      closeItem(item);
      state.openId = null;
      writeHash(stateRoutePrefix(), true);
    }
  }

  function bindRows() {
    Array.prototype.forEach.call(elList.querySelectorAll(".mrow-item"), function (item) {
      item.querySelector(".mrow").addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".fav-toggle, .team-link")) return;
        toggleItem(item);
      });
    });
  }

  /* ── 빈 상태 ───────────────────────────────────────── */
  function emptyState(day, sport) {
    var games = gamesOf(day);
    var meta = sport ? sportMeta(sport) : { id: null, name: "전체", icon: "🗓️" };
    var label = longDate(day);

    // 야구는 비시즌이라 실제 경기가 없다. 배구는 V리그 일정을 받은 날만 보여준다.
    if (sport === "baseball") {
      return {
        ico: "⚾",
        title: "비시즌 — 실제 경기 없음",
        desc: "KBO 정규시즌·포스트시즌이 끝나 " + label + "에는 실제 경기가 없습니다. 시즌 일정이 나오면 실제 데이터로 채웁니다.",
        cta: null
      };
    }
    if (sport === "volleyball" && !GAMES.some(function (e) { return e.g.sport === "volleyball"; })) {
      return {
        ico: "🏐",
        title: "V리그 일정 정보를 아직 못 가져왔습니다",
        desc: "KOVO 공식 일정 연동이 아직 되지 않아 " + label + " 배구 경기를 채우지 못했습니다. 확인되는 대로 실제 일정으로 채웁니다.",
        cta: null
      };
    }

    if (day < todayStr()) {
      var upcoming = DAYS.filter(function (d) {
        return d.date >= todayStr() && gamesOf(d.date).length > 0;
      })[0];
      return {
        ico: "🗓️",
        title: label + "은 지난 날짜예요",
        desc: "지난 날짜의 브리핑은 제공하지 않습니다. 오늘이나 그 이후 날짜를 골라 주세요.",
        cta: upcoming ? { type: "day", id: upcoming.date, label: longDate(upcoming.date) + " 브리핑 보기" } : null
      };
    }

    if (!games.length) {
      var next = DAYS.filter(function (d) {
        return d.date > day && gamesOf(d.date).length > 0;
      })[0];
      var prev = DAYS.slice().reverse().filter(function (d) {
        return d.date < day && gamesOf(d.date).length > 0;
      })[0];
      var target = next || prev;
      return {
        ico: "🗓️",
        title: "이 날짜 브리핑은 아직이에요",
        desc: label + " 경기 브리핑이 아직 올라오지 않았습니다. 브리핑은 보통 경기 당일 아침에 정리됩니다.",
        cta: target ? {
          type: "day", id: target.date,
          label: longDate(target.date) + " 브리핑 보기"
        } : null
      };
    }

    var others = SPORTS.filter(function (s) {
      return s.id !== sport && games.some(function (g) { return g.sport === s.id; });
    });

    return {
      ico: meta.icon || "🗓️",
      title: label + "엔 " + meta.name + " 경기가 없어요",
      desc: others.length
        ? "다른 종목은 준비되어 있습니다. " + others.map(function (s) { return s.name; }).join(" · ") + " 탭에서 확인하세요."
        : "이 날은 등록된 " + meta.name + " 경기가 없습니다. 다음 브리핑에서 확인하세요.",
      cta: others.length ? { type: "sport", id: others[0].id, label: others[0].name + " 경기 보기" } : null
    };
  }

  function showEmpty(e) {
    elEmptyIco.textContent = e.ico;
    elEmptyTitle.textContent = e.title;
    elEmptyDesc.textContent = e.desc;
    if (e.cta) {
      elEmptyCta.hidden = false;
      elEmptyCta.textContent = e.cta.label;
      elEmptyCta.dataset.ctaType = e.cta.type;
      elEmptyCta.dataset.ctaId = e.cta.id;
    } else {
      elEmptyCta.hidden = true;
      elEmptyCta.removeAttribute("data-cta-type");
      elEmptyCta.removeAttribute("data-cta-id");
    }
    elEmpty.hidden = false;
  }

  /* ── 홈: 종목 선택 타일 ─────────────────────────────── */
  // 홈(종목 선택) 첫 화면의 정체성 — 무엇을 해 주는 사이트인지 한 줄로 먼저 읽히게.
  function homeLeadHTML() {
    var names = SPORTS.map(function (s) { return s.name; }).join("·");
    return '<span class="hl-title"><b>' + esc(names) + '</b> 오늘 경기의 두 팀 상태와 변수를 30초로 정리합니다.</span>' +
      '<span class="hl-sub">승자 예측 없이 두 팀을 같은 무게로 · 아래에서 종목을 고르면 그날 일정이 열립니다.</span>';
  }

  // 종목 타일의 한 줄 요약: 그 날짜·그 종목 경기의 리그명을 모아 보여준다.
  function leagueLine(gs) {
    if (!gs.length) return "이 날짜엔 경기가 없어요";
    var names = [];
    gs.forEach(function (g) {
      var n = g.league || sportMeta(g.sport).name;
      if (names.indexOf(n) < 0) names.push(n);
    });
    return names.length > 2
      ? names.slice(0, 2).join(" · ") + " 외 " + (names.length - 2)
      : names.join(" · ");
  }

  // 경기 카드의 출처: espn / kovo = 실제 데이터
  function isReal(g) { return g && (g.source === "espn" || g.source === "kovo" || g.source === "thesportsdb"); }

  function sourceBadge(gs) {
    if (!gs.length) return "";
    return '<span class="tile-src real">실제</span>';
  }

  function tileHTML(s, gs) {
    var n = gs.length;
    var count = n ? n + "경기" : "경기 없음";
    var sub = leagueLine(gs);
    if (s.id === "baseball") { count = "비시즌"; sub = "실제 경기 없음"; }
    else if (s.id === "volleyball" && !GAMES.some(function (e) { return e.g.sport === "volleyball"; })) {
      sub = "V리그 일정 연동 전";
    }
    var src = sourceBadge(gs);
    var srcText = !n ? "" : " 실제 데이터";
    return '<button class="tile' + (n ? "" : " none") + '" type="button" data-sport="' + esc(s.id) + '"' +
      ' aria-label="' + esc(s.name) + " " + count + ", " + esc(sub) + esc(srcText) + '">' +
      '<span class="tile-ico" aria-hidden="true">' + esc(s.icon) + "</span>" +
      '<span class="tile-body">' +
        '<span class="tile-top">' +
          '<b class="tile-name">' + esc(s.name) + "</b>" +
          src +
          '<span class="tile-live" hidden></span>' +
          '<span class="tile-cnt">' + count + "</span>" +
        "</span>" +
        '<span class="tile-sub">' + esc(sub) + "</span>" +
      "</span>" +
      '<span class="tile-go" aria-hidden="true">›</span>' +
      "</button>";
  }

  function renderHome() {
    var all = gamesOf(state.day);

    if (!all.length) {
      elHomeLead.hidden = true;
      elList.innerHTML = "";
      showEmpty(emptyState(state.day, null));
      return;
    }

    elHomeLead.innerHTML = homeLeadHTML();
    elHomeLead.hidden = false;
    elEmpty.hidden = true;

    elList.innerHTML = '<div class="tiles">' + SPORTS.map(function (s) {
      return tileHTML(s, all.filter(function (g) { return g.sport === s.id; }));
    }).join("") + "</div>";

    Array.prototype.forEach.call(elList.querySelectorAll(".tile"), function (tile) {
      tile.addEventListener("click", function () { selectSport(tile.dataset.sport); });
    });
  }

  /* ── 리그 필터 ─────────────────────────────────────
     같은 날 한 종목에 리그가 여럿이면(축구 4~5개) 목록 위에 리그 칩을 둔다.
     칩은 그날 그 종목의 경기만 대상으로 하고, 다른 날·다른 종목으로 옴기면 풀린다. */
  function leagueOf(g) {
    return String((g && g.league) || (g ? sportMeta(g.sport).name : ""));
  }

  function leagueFullName(key, games) {
    for (var i = 0; i < games.length; i++) {
      if (leagueOf(games[i]) === key && games[i].leagueFull) return games[i].leagueFull;
    }
    return key;
  }

  // 지금 화면(종목·전체)의 그날 경기 전체
  function scopedGames() {
    return state.allSports ? gamesOf(state.day) : (state.sport ? gamesIn(state.day, state.sport) : []);
  }

  // 리그 필터를 적용한 목록 — 그 리그에 경기가 없으면 필터를 풀고 전체를 돌려준다.
  function visibleGames() {
    var all = scopedGames();
    if (!state.league) return all;
    var out = all.filter(function (g) { return leagueOf(g) === state.league; });
    if (!out.length) { state.league = null; return all; }
    return out;
  }

  function leagueChipsHTML(games) {
    var keys = [];
    games.forEach(function (g) {
      var k = leagueOf(g);
      if (keys.indexOf(k) < 0) keys.push(k);
    });
    if (keys.length < 2) return "";

    var html = '<div class="lg-chips" role="group" aria-label="리그 선택">' +
      '<button type="button" class="lchip' + (state.league ? "" : " on") + '" data-league="" ' +
      'aria-pressed="' + (state.league ? "false" : "true") + '">전체 <span class="n">' + games.length + "</span></button>";
    keys.forEach(function (k) {
      var n = games.filter(function (g) { return leagueOf(g) === k; }).length;
      var on = state.league === k;
      var full = leagueFullName(k, games);
      html += '<button type="button" class="lchip' + (on ? " on" : "") + '" data-league="' + esc(k) + '" ' +
        'aria-pressed="' + (on ? "true" : "false") + '" title="' + esc(full) + '">' +
        (full.length > 10 ? esc(k) : esc(full)) + ' <span class="n">' + n + "</span></button>";
    });
    return html + "</div>";
  }

  function bindLeagueChips() {
    Array.prototype.forEach.call(elList.querySelectorAll(".lchip"), function (chip) {
      chip.addEventListener("click", function () {
        var k = chip.dataset.league || null;
        state.league = (!k || state.league === k) ? null : k;
        render();
      });
    });
  }

  /* ── 일정 목록 화면 ─────────────────────────────────── */
  function renderSchedule() {
    var all = scopedGames();
    var games = visibleGames();
    var chips = leagueChipsHTML(all);

    if (!games.length) {
      elList.innerHTML = "";
      showEmpty(emptyState(state.day, state.allSports ? null : state.sport));
      return;
    }

    elEmpty.hidden = true;
    elList.innerHTML = chips +
      '<p class="list-hint">경기 줄 오른쪽 <b>VS 상황</b>을 누르면 그 경기의 브리핑이 열립니다.</p>' +
      '<ul class="rows">' + games.map(rowHTML).join("") + "</ul>";
    bindLeagueChips();
    bindRows();

    if (state.openId) {
      var item = itemOf(state.openId);
      if (item) openItem(item);
    }
  }

  function favoriteGames() {
    var today = todayStr();
    return GAMES.filter(function (entry) {
      if (entry.date < today) return false;
      var g = entry.g;
      if (!g || !g.sport) return false;
      return isFavorite(g.sport, g.away && g.away.name) || isFavorite(g.sport, g.home && g.home.name);
    }).sort(function (a, b) {
      var aLive = a.g.result && a.g.result.state === "live";
      var bLive = b.g.result && b.g.result.state === "live";
      if (aLive !== bLive) return aLive ? -1 : 1;
      return new Date(a.g.start) - new Date(b.g.start);
    });
  }

  function renderFavorites() {
    var entries = favoriteGames();
    if (!FAVORITES.length) {
      state.openId = null;
      elList.innerHTML = "";
      showEmpty({
        ico: "★",
        title: "아직 즐겨찾기한 팀이 없습니다",
        desc: "경기 카드를 열고 팀 이름 옆 별을 눌러 추가하세요.",
        cta: null
      });
      return;
    }
    if (!entries.length) {
      state.openId = null;
      elList.innerHTML = favoriteNotificationControlHTML();
      showEmpty({
        ico: "🗓️",
        title: "오늘 이후 즐겨찾기 팀 경기가 없습니다",
        desc: "새 일정이 등록되면 이 화면에 표시됩니다.",
        cta: null
      });
      return;
    }

    elEmpty.hidden = true;
    elList.innerHTML = favoriteNotificationControlHTML() +
      '<p class="list-hint">즐겨찾기 팀 경기 · 진행 중인 경기가 먼저 표시됩니다.</p>' +
      '<ul class="rows">' + entries.map(function (entry) { return rowHTML(entry.g); }).join("") + "</ul>";
    bindRows();

    if (state.openId) {
      var item = itemOf(state.openId);
      if (item) openItem(item);
      else state.openId = null;
    }
  }

  /* ── 데이터 출처 칩 ────────────────────────────────── */
  // 지금 화면에 놓인 경기가 모두 ESPN 실제 데이터면 그렇게 표시하고,
  // 지금 화면에 놓인 경기의 출처를 표시한다.
  function renderDataChip() {
    var scope = state.favorites
      ? favoriteGames().map(function (entry) { return entry.g; })
      : (state.sport ? gamesIn(state.day, state.sport) : gamesOf(state.day));
    var sources = {};
    scope.forEach(function (g) { if (g.source) sources[g.source] = 1; });
    var label;
    if (!scope.length) label = "데이터 없음";
    else if (Object.keys(sources).length === 1) {
      label = sources.espn ? "ESPN 실제 데이터" : (sources.kovo ? "KOVO 실제 데이터" : "실제 데이터");
    } else label = "실제 데이터";
    elDataChip.textContent = label;
    elDataChip.classList.toggle("real", scope.length > 0);
  }

  /* ── 렌더 ──────────────────────────────────────────── */
  function render() {
    var isFavorites = !!state.favorites;
    var isAll = !!state.allSports;
    var isHome = state.sport === null && !isFavorites && !isAll;

    if (elWeek) elWeek.hidden = isFavorites;

    elBrandDate.textContent = state.day.replace(/-/g, ".") + " " + weekdayOf(state.day);
    renderDataChip();

    renderWeek();
    renderTabs();

    // 패널의 이름표(접근성): 홈 = 종목 선택 영역, 목록 = 선택된 탭
    var active = elTabs.querySelector('.tab[aria-selected="true"]');
    if (!isHome && active) {
      elPanel.setAttribute("role", "tabpanel");
      elPanel.setAttribute("aria-labelledby", active.id);
      elPanel.removeAttribute("aria-label");
    } else {
      elPanel.setAttribute("role", "region");
      elPanel.removeAttribute("aria-labelledby");
      elPanel.setAttribute("aria-label", "종목 선택");
    }

    if (isHome) {
      elBack.hidden = true;
      elTitle.innerHTML = "<em>" + longDate(state.day) + "</em> 종목 선택";
      renderHome();
    } else if (isFavorites) {
      elBack.hidden = false;
      elTitle.textContent = "즐겨찾기";
      elHomeLead.hidden = true;
      renderFavorites();
    } else if (isAll) {
      elBack.hidden = false;
      elTitle.innerHTML = "<em>" + longDate(state.day) + "</em> 전체 · " + visibleGames().length + "경기";
      elHomeLead.hidden = true;
      renderSchedule();
    } else {
      elBack.hidden = false;
      elTitle.innerHTML = "<em>" + longDate(state.day) + "</em> " + esc(sportMeta(state.sport).name) +
        " · " + visibleGames().length + "경기";
      elHomeLead.hidden = true;
      renderSchedule();
    }

    paintLive();
  }

  /* ── 실시간 점수(ESPN 공개 스코어보드) ───────────────
     · 페이지를 열 때와 30초마다 오늘·어제 경기의 ESPN 스코어보드를 받아
       data.js 의 경기(result)에 덮어쓴 뒤, 화면의 점수 자리만 다시 그립니다.
     · 탭이 백그라운드면 요청하지 않고, 다시 보일 때 바로 한 번 받습니다.
     · 실패(CORS·네트워크·응답 형식)하면 기존 정적 data.js 표시를 그대로 두고
       실시간 줄에만 살짝 알려 줍니다.
     · 배구(KOVO)·야구는 ESPN 에 없어 건드리지 않습니다. */
  var ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/";
  var LIVE_MS = 30000;          // 자동 갱신 간격
  var LIVE_TIMEOUT = 9000;      // 요청 하나의 제한 시간
  var LIVE_STALE_MS = 60000;    // 마지막 성공 이후 1분 넘게 오류면 연결 지연을 표시
  var DATED_TTL = 5 * 60 * 1000;
  var LIVE_SUM_TTL = 12000;     // 펼친 박스의 선수 기록·최근 플레이 캐시

  // data.js 의 league 값 → ESPN 경로
  var SOCCER_PATH = {
    EPL: "eng.1", PREMIERLEAGUE: "eng.1",
    LALIGA: "esp.1", LIGA: "esp.1",
    UCL: "uefa.champions", CHAMPIONSLEAGUE: "uefa.champions",
    BUNDES: "ger.1", BUNDESLIGA: "ger.1", SERIEA: "ita.1", LIGUE1: "fra.1",
    UEL: "uefa.europa", EUROPALEAGUE: "uefa.europa"
  };

  var LIVE = {
    ended: {},        // 이 화면에서 진행 중→종료로 바뀐 경기 id
    timer: null,
    busy: false,
    lastOk: null,
    err: null,
    dated: {},        // "path|YYYYMMDD" → { at, events }
    sum: {},          // "path|id" → { at, data:{plays,box}, err }  (선수 기록·최근 플레이)
    sumBusy: {},      // 같은 키의 summary 요청이 진행 중인지
    kovoBusy: false,
    kovoRetry: null,
    kovoRelay: {}   // KOVO 경기번호 → { at, set, plays:[], homeCode, err }  (배구 랠리 중계)
  };

  var KOVO_API = "https://user-api.kovo.co.kr";
  var KOVO_RELAY_TTL = 20000;   // 랠리 중계 캐시(같은 세트면 20초 재사용)

  function espnPathOf(g) {
    if (!g || !g.espnId) return null;
    var lg = String(g.league || "").toUpperCase().replace(/\s+/g, "");
    if (g.sport === "basketball") return lg === "NBA" ? "basketball/nba" : null;
    if (g.sport === "soccer") return SOCCER_PATH[lg] ? "soccer/" + SOCCER_PATH[lg] : null;
    return null;
  }

  // 오늘·어제(KST) 중 ESPN 에 있는 경기만 갱신 대상
  function liveCandidates() {
    var t = todayStr(), y = addDays(t, -1);
    var out = [];
    GAMES.forEach(function (e) {
      if (e.date !== t && e.date !== y) return;
      var path = espnPathOf(e.g);
      if (path) out.push({ g: e.g, date: e.date, path: path });
    });
    return out;
  }

  function sportOfPath(path) {
    return path.indexOf("basketball") === 0 ? "basketball" : "soccer";
  }

  function fetchJSON(url) {
    if (typeof fetch !== "function") return Promise.reject(new Error("fetch 없음"));
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var t = window.setTimeout(function () { if (ctl) ctl.abort(); }, LIVE_TIMEOUT);
    return fetch(url, { mode: "cors", cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        window.clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }, function (e) { window.clearTimeout(t); throw e; });
  }

  function fetchKovoJSON(path) {
    if (typeof fetch !== "function") return Promise.reject(new Error("fetch 없음"));
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var t = window.setTimeout(function () { if (ctl) ctl.abort(); }, LIVE_TIMEOUT);
    return fetch(KOVO_API + path, {
      mode: "cors", cache: "no-store", signal: ctl ? ctl.signal : undefined,
      headers: {
        "X-Service-Name": "user",
        "X-Site-Origin": location.origin,
        "Accept-Language": "ko"
      }
    }).then(function (r) {
      window.clearTimeout(t);
      if (!r.ok) throw new Error("KOVO HTTP " + r.status);
      return r.json();
    }, function (e) {
      window.clearTimeout(t);
      throw e;
    }).then(function (j) {
      if (!j || !j.result || Number(j.result.status) !== 200 || !Array.isArray(j.payload)) {
        throw new Error("KOVO 응답 형식 오류");
      }
      return j.payload;
    });
  }

  // KOVO 랠리 중계(/stat/real-time)는 payload 가 배열이 아니라 객체라 따로 받는다.
  function fetchKovoPayload(path) {
    if (typeof fetch !== "function") return Promise.reject(new Error("fetch 없음"));
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var t = window.setTimeout(function () { if (ctl) ctl.abort(); }, LIVE_TIMEOUT);
    return fetch(KOVO_API + path, {
      mode: "cors", cache: "no-store", signal: ctl ? ctl.signal : undefined,
      headers: {
        "X-Service-Name": "user",
        "X-Site-Origin": location.origin,
        "Accept-Language": "ko"
      }
    }).then(function (r) {
      window.clearTimeout(t);
      if (!r.ok) throw new Error("KOVO HTTP " + r.status);
      return r.json();
    }, function (e) {
      window.clearTimeout(t);
      throw e;
    }).then(function (j) {
      if (!j || !j.result || Number(j.result.status) !== 200 || !j.payload) {
        throw new Error("KOVO 응답 형식 오류");
      }
      return j.payload;
    });
  }

  // KOVO 랠리 중계 주소. rset(세트)을 넣으면 그 세트 기록만 온다.
  // sort[] 파라미터를 넣으면 서버가 400 으로 거절하므로 넣지 않는다.
  function kovoRelayPath(m) {
    var q = [
      "season=" + encodeURIComponent(String((m.season && m.season.value) || "")),
      "round=" + encodeURIComponent(String(m.round == null ? 0 : m.round)),
      "gnum=" + encodeURIComponent(String(m.number)),
      "gcode=" + encodeURIComponent(String(m.match || "001")),
      "hcode=" + encodeURIComponent(String(m.homeTeam.code)),
      "acode=" + encodeURIComponent(String(m.awayTeam.code)),
      "rset=" + encodeURIComponent(String(Number(m.currentSet) || 1)),
      "page=0", "size=1000"
    ];
    return "/stat/real-time?" + q.join("&");
  }

  // KOVO 기록 코드 → 한국어 설명 (KOVO 공식 사이트 문자중계와 같은 표기)
  var KOVO_ERR = {
    er0: "기타범실", er1: "아웃", er2: "로테이션범실", er3: "아웃", er4: "포히트",
    er5: "라인오버", er6: "네트터치", er7: "드리블", er8: "아웃오브포지션", er9: "스크린",
    era: "기타범실", erb: "아웃", erc: "로테이션", erd: "네트걸림", ere: "포히트",
    erf: "라인오버", erg: "네트터치", erh: "더블컨텍트", eri: "아웃오브포지션",
    erj: "스크린", erk: "캐치볼", erl: "오버네트"
  };
  var KOVO_ACT = {
    DF: "디그", RR: "리시브", SS: "세트",
    VV: "서브", VS: "스파이크서브", AA: "오픈", AC: "퀵오픈", AT: "시간차",
    AE: "이동", AQ: "속공", AW: "백어택", AZ: "백어택",
    BB: "블로킹", BA: "블로킹어시스트", BT: "유효블로킹",
    TO: "팀실패", OP: "팀",
    CY: "벌칙", CR: "세트퇴장", CO: "교체", CI: "투입", CT: "타임", CW: "경고", CC: "경기퇴장"
  };
  var KOVO_SIMPLE = { CY: 1, CR: 1, CO: 1, CI: 1, CT: 1, CW: 1, CC: 1 };

  function livePlayMarkerHTML(sport, play) {
    var isError = !!play.error;
    var isScore = !!(play.scoring || play.score);
    var icon = isError ? "💀" : (isScore ? (sport === "basketball" ? "🏀" : (sport === "volleyball" ? "🏐" : "")) : "");
    if (!icon) return "";
    var label = isError ? (sport === "volleyball" ? "배구 범실" : "농구 턴오버") :
      (sport === "volleyball" ? "배구 득점" : "농구 득점");
    return '<span class="bp-mark" role="img" aria-label="' + label + '">' + icon + "</span>";
  }

  function kovoRelayLabel(action, result, grade) {
    var a = String(action || ""), r = String(result || ""), g = String(grade == null ? "" : grade);
    if (a === "ST") return "세트 시작";
    if (a === "ET") return "세트 종료";
    var base = KOVO_ACT[a];
    if (!base) return "";
    if (KOVO_SIMPLE[a]) return base;              // 벌칙·교체·타임 등은 결과 표기를 붙이지 않는다
    if (a === "TO" || a === "OP") {              // 팀 단위 득점·실점
      if (r === "suc") return base + "득점";
      if (KOVO_ERR[r]) return base + " " + KOVO_ERR[r];
      if (r === "tot") return base + " 시도";
      return base;
    }
    var out = base;
    if (r === "tot") return out + " 시도";
    if (KOVO_ERR[r]) return out + " " + KOVO_ERR[r];
    if (r === "exc") return out + (a === "RR" ? " 정확" : (a === "SS" ? " 성공" : ""));
    if (r === "fal") return out + " 실패";
    if (r === "suc") out += " 성공";
    else if (r === "blk") out += " 시도";
    if (g === "1") return out + " 득점";
    if (g === "2") return out + " 2득점";
    return out;
  }

  // 랠리 기록을 화면용 목록으로. 점수가 난 랠리와 타임·교체 같은 사건만 남긴다.
  function parseKovoRelay(p, m) {
    var feed = (p && Array.isArray(p.feed)) ? p.feed : [];
    var homeCode = String((m.homeTeam && m.homeTeam.code) || "");
    var home = 0, away = 0, all = [];
    feed.forEach(function (x) {
      var grade = Number(x.rgrade) || 0;
      var label = kovoRelayLabel(x.raction, x.raresult, x.rgrade);
      if (!label) {
        if (!grade) return;
        label = grade === 2 ? "2득점" : "득점";
      }
      var mine = String(x.rtcode) === homeCode;
      if (grade === 1 || grade === 2) {
        if (mine) home += grade; else away += grade;
      }
      var who = (Number(x.rbnum) > 0 && x.rpname) ? (x.rbnum + ". " + x.rpname + " ") : "";
      all.push({
        text: who + label,
        home: mine,
        score: grade > 0,
        error: !!KOVO_ERR[String(x.raresult || "").toLowerCase()] || /실패|범실/.test(label),
        hs: home,
        as: away,
        set: Number((p.game && p.game.setIng) || m.currentSet) || 0
      });
    });
    // 점수 랠리 + 작전타임·교체·경고·세트 시작/종료만 화면에 남긴다
    var keep = all.filter(function (x) {
      return x.score || /타임|교체|투입|경고|벌칙|퇴장|세트 시작|세트 종료/.test(x.text);
    });
    return {
      at: Date.now(),
      // 라벨은 요청한 세트(rset)를 따른다. 경기 상태의 setIng 는 세트가 바뀐 직후 먼저 올라가서
      // 아직 이전 세트 기록을 받은 경우와 어긋난다.
      set: Number(m.currentSet) || Number(p.game && p.game.setIng) || 0,
      homeCode: homeCode,
      plays: keep.slice(-40).reverse(),
      hs: home,
      as: away,
      err: null
    };
  }

  function notifyFavoriteVolleyballPoint(number, previous, next) {
    if (!previous || !Array.isArray(previous.plays) || !previous.plays.length || !next) return;
    var awayBefore = Number(previous.as) || 0, homeBefore = Number(previous.hs) || 0;
    var awayNow = Number(next.as) || 0, homeNow = Number(next.hs) || 0;
    if (awayBefore === awayNow && homeBefore === homeNow) return;
    var entry = GAMES.filter(function (item) {
      return item.g && item.g.sport === "volleyball" &&
        String((item.g.result && item.g.result.kovoNumber) || item.g.id.replace("vball-kovo-", "")) === String(number);
    })[0];
    if (!entry) return;
    var homeScored = homeNow > homeBefore;
    var team = homeScored ? entry.g.home : entry.g.away;
    var score = awayNow + "-" + homeNow;
    sendFavoriteNotification(entry.g, "point-" + next.set + "-" + score,
      "🏐 배구 득점", (team && team.name || (homeScored ? "홈팀" : "원정팀")) + " 득점 · " + next.set + "세트 " + score);
  }

  // 진행 중 배구 경기의 현재 세트 랠리 중계를 받아 둔다(30초 주기 안에서 20초 캐시).
  function loadKovoRelay(m, force) {
    var num = String(m.number);
    var cur = LIVE.kovoRelay[num] || null;
    var set = Number(m.currentSet) || 0;
    if (!force && cur && !cur.err && cur.set === set && Date.now() - cur.at < KOVO_RELAY_TTL) {
      return Promise.resolve(cur);
    }
    if (cur && cur.busy) return Promise.resolve(cur);
    var mark = cur || { at: 0, set: set, plays: [], hs: 0, as: 0, err: null };
    mark.busy = true;
    LIVE.kovoRelay[num] = mark;
    return fetchKovoPayload(kovoRelayPath(m)).then(function (p) {
      var next = parseKovoRelay(p, m);
      notifyFavoriteVolleyballPoint(num, cur, next);
      LIVE.kovoRelay[num] = next;
      return next;
    }, function (e) {
      LIVE.kovoRelay[num] = {
        at: Date.now(), set: set, homeCode: mark.homeCode,
        plays: mark.set === set ? (mark.plays || []) : [],
        hs: mark.set === set ? (mark.hs || 0) : 0, as: mark.set === set ? (mark.as || 0) : 0,
        err: String((e && e.message) || e)
      };
      return LIVE.kovoRelay[num];
    });
  }

  // 배구 카드의 '최근 랠리' 목록
  function kovoRelayHTML(g) {
    if (g.sport !== "volleyball") return "";
    var num = g.result && g.result.kovoNumber;
    var r = num ? LIVE.kovoRelay[String(num)] : null;
    var head = '<h4 class="lb-sub">최근 랠리 <span class="lb-sub-note">' +
      (r && r.set ? esc(r.set + "세트") + " · " : "") + "KOVO 문자중계</span></h4>";
    if (!r) return head + '<p class="lb-none">랠리 중계를 불러오는 중…</p>';
    var plays = r.plays || [];
    if (!plays.length) {
      var kovoLink = '<a href="https://kovo.co.kr/games/v-leagues/schedules?season=023&amp;gender=all&amp;league=201" target="_blank" rel="noopener noreferrer">KOVO 공식 일정</a>';
      return head + '<p class="lb-none">' +
        (r.err
          ? "랠리 중계를 받지 못했습니다. 세트 스코어는 위에 표시됩니다. 자세한 중계는 " + kovoLink + "에서 확인할 수 있습니다."
          : "아직 표시할 랠리가 없습니다.") +
        "</p>";
    }
    return head + '<ul class="lb-plays">' + plays.slice(0, 12).map(function (p) {
      var sc = p.score ? (p.as + "-" + p.hs) : "";
      var side = p.home ? (g.home && g.home.abbr ? g.home.abbr : "홈") : (g.away && g.away.abbr ? g.away.abbr : "원정");
      return "<li" + (p.score ? ' class="sc"' : "") + ">" +
        '<span class="bp-t">' + esc(side) + "</span>" +
        '<span class="bp-x">' + livePlayMarkerHTML("volleyball", p) + esc(p.text) + "</span>" +
        (sc ? '<span class="bp-s">' + esc(sc) + "</span>" : "") +
        "</li>";
    }).join("") + "</ul>";
  }

  // KOVO 공식 일정 API의 세트 점수를 오늘 카드에 반영한다.
  // 같은 응답의 랠리 중계(/stat/real-time)로 현재 세트의 랠리별 중계도 함께 받아 둔다.
  function pollKovoLive(manual) {
    if (LIVE.kovoBusy) return;
    var day = todayStr();
    var targets = GAMES.filter(function (e) {
      return e.date === day && e.g && e.g.sport === "volleyball" && /^vball-kovo-\d+$/.test(e.g.id || "");
    });
    if (!targets.length) return;

    LIVE.kovoBusy = true;
    if (LIVE.kovoDay !== day) { LIVE.kovoDay = day; LIVE.kovoRelay = {}; }
    if (manual) setRefreshBusy(true);
    Promise.all([
      fetchKovoJSON("/mains/games/schedules"),
      fetchKovoJSON("/mains/games/schedules/ended")
    ]).then(function (groups) {
      var entries = (groups[0] || []).concat(groups[1] || []);
      var byNumber = {}, relayJobs = [];
      entries.forEach(function (m) {
        if (m && m.match === "001" && m.gameDate === day) byNumber[String(m.number)] = m;
      });
      targets.forEach(function (entry) {
        var number = String(entry.g.id).replace("vball-kovo-", "");
        var m = byNumber[number];
        if (!m || !m.homeTeam || !m.awayTeam) return;
        var isFinal = !!m.endTime;
        var isLive = !isFinal && Number(m.currentSet) > 0;
        if (!isFinal && !isLive) return;
        var away = Number(m.awayTeam.score), home = Number(m.homeTeam.score);
        if (!isFinite(away) || !isFinite(home)) return;
        var previousResult = entry.g.result || null;
        var before = JSON.stringify(previousResult);
        entry.g.result = {
          state: isFinal ? "final" : "live",
          detail: isFinal ? "경기 종료" : (Number(m.currentSet) + "세트 진행 중 · 세트 스코어"),
          awayScore: away,
          homeScore: home,
          winner: isFinal ? (away > home ? "away" : "home") : null,
          top: null,
          kovoNumber: number
        };
        entry.g.status = isFinal ? "final" : "live";
        notifyFavoriteGameChange(entry.g, previousResult, entry.g.result);
        if (before !== JSON.stringify(entry.g.result)) LIVE.kovoChanged = true;
        if (isLive) relayJobs.push(loadKovoRelay(m, !!manual));
      });
      return Promise.all(relayJobs).then(function () {
        LIVE.lastOk = new Date();
        LIVE.kovoErr = null;
        paintLive();
      });
    }).catch(function (e) {
      LIVE.kovoErr = String((e && e.message) || e);
      paintLive();
      // 한 번 실패하면 5초 뒤에 스스로 한 번 더 시도한다(일시적 네트워크 오류 대비)
      if (!LIVE.kovoRetry) {
        LIVE.kovoRetry = window.setTimeout(function () {
          LIVE.kovoRetry = null;
          pollKovoLive(false);
        }, 5000);
      }
    }).then(function () {
      LIVE.kovoBusy = false;
      if (manual) setRefreshBusy(false);
    });
  }

  // ESPN 경기 하나 → 화면에 쓸 값
  //   { id, path, date, state:'pre'|'in'|'post', period, clock, typeName, awayAbbr, homeAbbr,
  //     awayScore, homeScore, lines:{away,home}|null, top:[{name,team,pts,reb,ast}] }
  function parseEvent(ev, sport, path) {
    var c = ev && ev.competitions && ev.competitions[0];
    if (!c) return null;
    var st = c.status || {};
    var tt = st.type || {};
    var state = tt.state === "in" ? "in" : (tt.state === "post" || tt.completed === true ? "post" : "pre");

    var away = null, home = null;
    (c.competitors || []).forEach(function (x) {
      if (x.homeAway === "home") home = x;
      else if (x.homeAway === "away") away = x;
    });
    if (!away || !home) return null;

    function num(x) {
      var v = Number(x && x.score);
      return isFinite(v) ? v : null;
    }

    var lines = null;
    var al = (away.linescores || []).map(function (l) { return l.displayValue; }).filter(function (v) { return v != null && v !== ""; });
    var hl = (home.linescores || []).map(function (l) { return l.displayValue; }).filter(function (v) { return v != null && v !== ""; });
    if (al.length > 1 || hl.length > 1) lines = { away: al, home: hl };

    return {
      id: String(ev.id),
      path: path,
      date: ev.date || (c.date || null),
      sport: sport,
      state: state,
      period: Number(st.period || 0),
      clock: st.displayClock || "",
      typeName: String(tt.name || ""),
      desc: String(tt.description || ""),
      awayAbbr: (away.team && away.team.abbreviation) || "",
      homeAbbr: (home.team && home.team.abbreviation) || "",
      awayScore: num(away),
      homeScore: num(home),
      lines: lines,
      top: sport === "basketball" ? topOf([away, home]) : null
    };
  }

  // 진행 중인 농구 경기의 주요 선수(득점·리바운드·어시스트 리더)
  function topOf(comps) {
    var rows = [], seen = {};
    comps.forEach(function (comp) {
      var abbr = (comp.team && comp.team.abbreviation) || "";
      var mine = {}, order = [];
      (comp.leaders || []).forEach(function (grp) {
        var l = (grp.leaders || [])[0];
        if (!l || !l.athlete) return;
        var nm = l.athlete.displayName || l.athlete.fullName;
        if (!nm) return;
        if (!mine[nm]) { mine[nm] = { name: nm, team: abbr, photo: (l.athlete.headshot && l.athlete.headshot.href) || "" }; order.push(nm); }
        var v = l.value != null ? l.value : Number(l.displayValue);
        if (!isFinite(v)) return;
        if (grp.name === "points") mine[nm].pts = v;
        else if (grp.name === "rebounds") mine[nm].reb = v;
        else if (grp.name === "assists") mine[nm].ast = v;
      });
      order.slice(0, 1).forEach(function (nm) {
        var row = mine[nm];
        var key = row.team + "|" + row.name;
        if (seen[key]) return;
        seen[key] = 1;
        rows.push(row);
      });
    });
    return rows.slice(0, 4);
  }

  // ESPN 상태 → 화면 문구 (예: 2Q 04:12 / 하프타임 / 전반 38' / 종료)
  function liveDetail(ev) {
    if (!ev) return "";
    var sport = ev.sport;
    var name = String(ev.typeName || "").toUpperCase();
    var desc = String(ev.desc || "");
    if (ev.state === "post") {
      if (sport === "basketball" && ev.period > 4) return "연장";
      if (sport === "soccer" && (name.indexOf("SHOOTOUT") >= 0 || /penalt/i.test(desc))) return "승부차기";
      return "";
    }
    if (ev.state !== "in") return "";
    var clock = String(ev.clock || "").replace(/\s+/g, " ").trim();
    if (name.indexOf("HALFTIME") >= 0 || /half.?time/i.test(desc)) return "하프타임";
    if (sport === "basketball") {
      if (ev.period > 4) return "연장 " + clock;
      if (ev.period >= 1) {
        // 쿼터가 끝난 직후(클록 0.0)는 'NQ 종료'로
        if (/^0(\.0+)?$/.test(clock) || /end of/i.test(desc)) return ev.period + "Q 종료";
        return ev.period + "Q " + clock;
      }
      return clock;
    }
    if (name.indexOf("SHOOTOUT") >= 0) return "승부차기";
    if (ev.period === 1) return "전반 " + clock;
    if (ev.period === 2) return "후반 " + clock;
    if (ev.period === 3) return "연장 전반 " + clock;
    if (ev.period >= 4) return "연장 후반 " + clock;
    return clock;
  }

  /* ── 진행 중 경기: 박스 맨 위 '지금 상황' ────────────────
     · 현재 스코어·쿼터·남은 시간·쿼터별 점수표는 30초 폴링 값으로 그립니다.
     · 최근 플레이와 선수별 기록은 ESPN summary API 에서 받습니다.
       (펼칠 때 한 번 + 펼쳐 둔 동안 30초마다)
     · summary 를 못 받아도 스코어·쿼터표는 그대로 나오고 그 자리에만 안내를 둡니다. */

  // 이 경기의 ESPN summary 위치 { path, id }
  function liveTargetOf(g) {
    if (!g) return null;
    var r = g.result || {};
    if (r.espnPath && r.espnId) return { path: r.espnPath, id: String(r.espnId) };
    if (g.espnId) {
      var path = espnPathOf(g);
      if (path) return { path: path, id: String(g.espnId) };
    }
    return null;
  }

  function toNum(v) {
    var n = Number(v);
    return isFinite(n) ? n : -1;
  }

  function dash(v) {
    var s = v == null ? "" : String(v).trim();
    return s === "" || s === "--" ? "-" : s;
  }

  /* ── 최근 플레이 한국어 표기 ───────────────────────────────
     ESPN summary 의 plays[].text 는 영어 중계 문장이다. 그대로 두면 읽기
     어려워서, 선수·팀 이름은 원문 그대로 두고 동작·상황 부분만 한국어
     중계 표현으로 바꾼다.
     예) "Luka Doncic makes driving layup (Austin Reaves assists)"
         → "Luka Doncic, 돌파 레이업 성공 (Austin Reaves 어시스트)"
     표에 없는 표현은 koLoose() 에서 단어별로 바꿔 본다. */

  var KO_TEAM = {
    hawks: "호크스", celtics: "셀틱스", nets: "네츠", hornets: "호넷츠", bulls: "불스",
    cavaliers: "캐벌리어스", cavs: "캐벌리어스", mavericks: "매버릭스", mavs: "매버릭스",
    nuggets: "너기츠", pistons: "피스톤스", warriors: "워리어스", rockets: "로키츠",
    pacers: "페이서스", clippers: "클리퍼스", lakers: "레이커스", grizzlies: "그리즐리스",
    heat: "히트", bucks: "벅스", timberwolves: "팀버울브스", pelicans: "펠리컨스",
    knicks: "닉스", thunder: "선더", magic: "매직", "76ers": "식서스", sixers: "식서스",
    suns: "선즈", blazers: "블레이저스", kings: "킹스", spurs: "스퍼스", raptors: "랩터스",
    jazz: "재즈", wizards: "위저즈"
  };

  /* 슛 종류 (ESPN 표기 → 한국 중계 표현). 거리(foot)는 떼고 동작만 살린다. */
  var KO_SHOT = {
    "two point shot": "2점슛",
    "three point shot": "3점슛",
    "three point jumper": "3점슛",
    "three pointer": "3점슛",
    "three point pullup jump shot": "3점 풀업 점퍼",
    "three point step back jumpshot": "3점 스텝백 점퍼",
    "jumper": "점프슛",
    "jump shot": "점프슛",
    "jumpshot": "점프슛",
    "pullup jump shot": "풀업 점퍼",
    "pullup jumpshot": "풀업 점퍼",
    "running pullup jump shot": "러닝 풀업 점퍼",
    "step back jumpshot": "스텝백 점퍼",
    "step back jump shot": "스텝백 점퍼",
    "fade away jump shot": "페이드어웨이 점퍼",
    "fadeaway jump shot": "페이드어웨이 점퍼",
    "turnaround jump shot": "턴어라운드 점퍼",
    "running jump shot": "러닝 점프슛",
    "floating jump shot": "플로터",
    "driving floating jump shot": "돌파 플로터",
    "layup": "레이업",
    "driving layup": "돌파 레이업",
    "running layup": "러닝 레이업",
    "reverse layup": "리버스 레이업",
    "finger roll layup": "핑거롤 레이업",
    "dunk": "덩크",
    "driving dunk": "돌파 덩크",
    "running dunk": "러닝 덩크",
    "alley oop dunk": "앨리웁 덩크",
    "alley oop layup": "앨리웁 레이업",
    "reverse dunk": "리버스 덩크",
    "tip in dunk": "팁인 덩크",
    "tip shot": "팁인 슛",
    "hook shot": "훅슛",
    "jump bank shot": "뱅크슛",
    "bank shot": "뱅크슛",
    "heave jump shot": "하프라인 슛",
    "technical free throw": "테크니컬 자유투",
    "free throw": "자유투"
  };

  /* 파울 종류 */
  var KO_FOUL = {
    "shooting foul": "슈팅 파울",
    "personal foul": "개인 파울",
    "personal take foul": "테이크 파울",
    "transition take foul": "트랜지션 테이크 파울",
    "loose ball foul": "루즈볼 파울",
    "offensive foul": "공격자 파울",
    "offensive charge": "공격자 파울 (차징)",
    "technical foul": "테크니컬 파울",
    "technical": "테크니컬 파울",
    "flagrant foul type 1": "플래그런트 파울 1",
    "flagrant foul type 2": "플래그런트 파울 2",
    "away from play foul": "오프더볼 파울",
    "flopping technical foul": "플로핑 테크니컬 파울",
    "hanging techfoul": "림 행 테크니컬 파울",
    "delay techfoul": "지연 테크니컬 파울",
    "defensive 3-seconds (technical foul)": "수비 3초 바이얼레이션 (테크니컬)",
    "double personal foul": "더블 개인 파울",
    "double technical foul": "더블 테크니컬 파울"
  };

  /* 턴오버·바이얼레이션 종류 */
  var KO_TURN = {
    "traveling": "트래블링",
    "back court": "백코트 바이얼레이션",
    "double dribble": "더블 드리블",
    "discontinue dribble": "드리블 중단",
    "palming": "캐링 더 볼",
    "inbound": "인바운드 실책",
    "steps out of bounds": "스텝 아웃오브바운즈",
    "out of bounds bad pass": "패스 미스 아웃오브바운즈",
    "out of bounds lost ball": "볼 소실 아웃오브바운즈",
    "bad pass": "패스 미스",
    "lost ball": "볼 소실",
    "offensive goaltending": "공격 골텐딩",
    "defensive goaltending": "수비 골텐딩",
    "kicked ball": "킥볼 바이얼레이션",
    "3 second": "3초 바이얼레이션",
    "8 second": "8초 바이얼레이션",
    "shot clock": "샷클락 바이얼레이션",
    "lane": "레인 바이얼레이션",
    "delay of game": "지연 경기",
    "offensive foul": "공격자 파울 (턴오버)"
  };

  var KO_SHOT_WORDS = [
    ["alley oop", "앨리웁"], ["finger roll", "핑거롤"], ["step back", "스텝백"],
    ["fade away", "페이드어웨이"], ["fadeaway", "페이드어웨이"], ["turnaround", "턴어라운드"],
    ["jump bank", "뱅크"], ["pullup", "풀업"], ["pull up", "풀업"], ["driving", "돌파"],
    ["running", "러닝"], ["reverse", "리버스"], ["floating", "플로터"], ["tip in", "팁인"],
    ["tip", "팁"], ["heave", "하프라인"], ["hook", "훅"], ["three point", "3점"],
    ["three pointer", "3점"], ["two point", "2점"], ["jumpshot", "점프슛"],
    ["jump shot", "점프슛"], ["jumper", "점퍼"], ["layup", "레이업"], ["dunk", "덩크"],
    ["free throw", "자유투"], ["shot", "슛"]
  ];

  /* 문장 안의 여러 칸 공백·줄바꿈을 한 칸으로 */
  function koSquash(s) {
    var t = String(s == null ? "" : s).split("\n").join(" ").split("\t").join(" ");
    while (t.indexOf("  ") >= 0) t = t.split("  ").join(" ");
    return t.trim();
  }

  /* 표의 표현을 정규식에 넣기 전에 괄호만 막아 준다 */
  function koEscKey(s) {
    return String(s).split("(").join("[(]").split(")").join("[)]");
  }

  /* 팀 이름 → 한국어 (모르는 팀은 원문 유지) */
  function koTeam(s) {
    var t = koSquash(s);
    var k = t.toLowerCase();
    if (KO_TEAM[k]) return KO_TEAM[k];
    var w = k.split(" ");
    for (var i = w.length - 1; i >= 0; i--) if (KO_TEAM[w[i]]) return KO_TEAM[w[i]];
    return t;
  }

  /* 슛 표현 → 한국어. 자유투는 "1/2" 같은 시도 표기를 살린다. */
  function koShot(phrase) {
    var s = koSquash(phrase).toLowerCase();
    s = s.replace(/^[0-9]+-foot /, "");
    var m = s.match(/^free throw( flagrant)? ([0-9]) of ([0-9])$/);
    if (m) {
      var pre = m[1] ? "플래그런트 자유투" : "자유투";
      return (m[2] === "1" && m[3] === "1") ? pre : pre + " " + m[2] + "/" + m[3];
    }
    if (KO_SHOT[s]) return KO_SHOT[s];
    var t = " " + s + " ";
    for (var i = 0; i < KO_SHOT_WORDS.length; i++) {
      t = t.split(" " + KO_SHOT_WORDS[i][0] + " ").join(" " + KO_SHOT_WORDS[i][1] + " ");
    }
    t = t.replace(/[0-9]+-foot/g, " ");
    return koSquash(t);
  }

  /* 파울·턴오버 표에 있는 표현을 문장 끝에서 찾아 이름과 분리한다 */
  function koByTable(t, table, rule, allowSuffix) {
    var keys = Object.keys(table).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      var suffix = allowSuffix ? "(?: (turnover|violation))?$" : "$";
      var m = t.match(new RegExp("^(.+?) " + koEscKey(keys[i]) + suffix, "i"));
      if (m) return { rule: rule, text: m[1] + ", " + table[keys[i]] };
    }
    return null;
  }

  /* 표에 없는 문장: 아는 낱말만 바꿔 본다(마지막 안전망) */
  function koLoose(t) {
    var s = " " + koSquash(t).toLowerCase() + " ";
    s = s.replace(/[0-9]+-foot/g, " ");
    var pairs = [["bad pass", "패스 미스"], ["lost ball", "볼 소실"], ["jump shot", "점프슛"],
      ["jumpshot", "점프슛"], ["jumper", "점퍼"], ["layup", "레이업"], ["dunk", "덩크"],
      ["three point", "3점"], ["two point", "2점"], ["free throw", "자유투"],
      ["rebound", "리바운드"], ["assists", "어시스트"], ["steals", "스틸"], ["steal", "스틸"],
      ["blocks", "블록"], ["makes", "성공"], ["misses", "실패"], ["turnover", "턴오버"],
      ["foul", "파울"], ["timeout", "타임아웃"], ["violation", "바이얼레이션"],
      ["driving", "돌파"], ["running", "러닝"], ["step back", "스텝백"], ["pullup", "풀업"]];
    for (var i = 0; i < pairs.length; i++) {
      s = s.split(" " + pairs[i][0] + " ").join(" " + pairs[i][1] + " ");
    }
    return koSquash(s);
  }

  /* ESPN 영어 중계 문장 → { rule, text } */
  function koTranslate(raw) {
    var t = koSquash(raw);
    if (!t) return { rule: "empty", text: "" };
    var m, hit;

    /* 쿼터·연장·경기 구간 */
    m = t.match(/^(start|end) of the ([0-9])(?:st|nd|rd|th) quarter$/i);
    if (m) return { rule: "period", text: m[2] + "쿼터 " + (/^start$/i.test(m[1]) ? "시작" : "종료") };
    m = t.match(/^(start|end) of the ([0-9])(?:st|nd|rd|th) overtime$/i);
    if (m) return { rule: "period", text: m[2] + "차 연장 " + (/^start$/i.test(m[1]) ? "시작" : "종료") };
    if (/^start of (?:the )?overtime$/i.test(t)) return { rule: "period", text: "연장전 시작" };
    if (/^end of (?:the )?regulation$/i.test(t)) return { rule: "period", text: "정규시간 종료" };
    if (/^end of (?:the )?game$/i.test(t)) return { rule: "period", text: "경기 종료" };
    if (/^halftime$/i.test(t)) return { rule: "period", text: "하프타임" };

    /* 팀 단위 챌린지 요청 */
    m = t.match(/^(.+?) coach'?s challenge$/i);
    if (m) return { rule: "review", text: koTeam(m[1]) + ", 코치 챌린지" };

    /* 비디오 판독·코치 챌린지
       (00:25.4) [Celtics] COACH'S CHALLENGE (CALL OVERTURNED) [Celtics] retain their timeout
       시간은 행 앞 라벨에 있으니 문장에서는 뗀다. */
    var rv = t.replace(/^[(][0-9:.]+[)] /, "");
    var rvU = rv.toUpperCase();
    var isReview = rvU.indexOf("COACH'S CHALLENGE") >= 0 || rvU.indexOf("REF-INITIATED REVIEW") >= 0;
    if (isReview) {
      var teamKo = "";
      if (rv.charAt(0) === "[") {
        var rb = rv.indexOf("]");
        if (rb > 0) teamKo = koTeam(rv.substring(1, rb));
      }
      var verdict = /REPLAY ?CENTER/i.test(rv) ? "리플레이 센터 판독"
        : /OVERTURNED/i.test(rv) ? "판정 번복" : "판정 유지";
      var tail = /retain their timeout/i.test(rv) ? " · 타임아웃 유지"
        : /charged with a timeout/i.test(rv) ? " · 타임아웃 차감" : "";
      return {
        rule: "review",
        text: (teamKo ? "[" + teamKo + "] " : "") +
          (rvU.indexOf("COACH'S CHALLENGE") >= 0 ? "코치 챌린지" : "비디오 판독") + " — " + verdict + tail
      };
    }

    /* 점프볼 */
    m = t.match(/^(.+?) vs[.] (.+?) [(]([^)]+) gains possession[)]$/i);
    if (m) return { rule: "jumpball", text: "점프볼 " + m[1] + " · " + m[2] + " → " + m[3] + " 볼" };

    /* 선수 교체 */
    m = t.match(/^(.+?) enters the game for (.+)$/i);
    if (m) return { rule: "sub", text: m[1] + " 투입 · " + m[2] + " 아웃" };

    /* 블록 */
    m = t.match(/^(.+?) blocks (.+?) *['’]s (.+)$/i);
    if (m) return { rule: "block", text: m[1] + ", " + m[2] + "의 " + koShot(m[3]) + " 블록" };
    m = t.match(/^(.+?) blocks (.+)$/i);
    if (m) return { rule: "block", text: m[1] + ", " + koShot(m[2]) + " 블록" };

    /* 슛 성공·실패 (+ 어시스트) */
    m = t.match(/^(.+?) (makes|misses) (.+?)(?: [(]([^)]+) assists?[)])?$/i);
    if (m) {
      var ast = m[4] ? " (" + m[4] + " 어시스트)" : "";
      return { rule: "shot", text: m[1] + ", " + koShot(m[3]) + (/^makes$/i.test(m[2]) ? " 성공" : " 실패") + ast };
    }

    /* 리바운드 (선수·팀) */
    m = t.match(/^(.+?) (offensive|defensive) (team )?rebound$/i);
    if (m) {
      return {
        rule: "rebound",
        text: (m[3] ? koTeam(m[1]) : m[1]) + ", " + (m[3] ? "팀 " : "") +
          (/^offensive$/i.test(m[2]) ? "공격" : "수비") + " 리바운드"
      };
    }

    /* 타임아웃 */
    m = t.match(/^(.+?) (full|short|official|20-second) timeout$/i);
    if (m) {
      var kind = m[2].toLowerCase();
      return {
        rule: "timeout",
        text: koTeam(m[1]) + ", " +
          (kind === "full" ? "작전 타임" : (kind === "official" ? "공식 타임아웃" : "20초 타임아웃"))
      };
    }

    /* 턴오버: 패스 미스·볼 소실 (+ 스틸, 아웃오브바운즈) */
    m = t.match(/^(.+?) (bad pass|lost ball) turnover(?: [(]([^)]+) steals?[)])?$/i);
    if (m) {
      var oob = / out of bounds$/i.test(m[1]);
      var who = oob ? m[1].replace(/ out of bounds$/i, "") : m[1];
      return {
        rule: "turnover",
        text: who + ", " + (/^bad/i.test(m[2]) ? "패스 미스" : "볼 소실") + (oob ? " 아웃오브바운즈" : "") +
          (m[3] ? " (" + m[3] + " 스틸)" : "")
      };
    }

    /* 파울 유도 표기: A loose ball foul (B draws the foul) */
    m = t.match(/^(.+?) [(]([^)]+) draws the foul[)]$/i);
    if (m) {
      var fk = Object.keys(KO_FOUL).sort(function (a, b) { return b.length - a.length; });
      for (var fi = 0; fi < fk.length; fi++) {
        var suf = " " + fk[fi];
        if (m[1].toLowerCase().slice(-suf.length) === suf) {
          return {
            rule: "foul",
            text: m[1].slice(0, m[1].length - suf.length) + ", " + KO_FOUL[fk[fi]] + " (" + m[2] + " 파울 유도)"
          };
        }
      }
    }

    /* 더블 테크니컬: A and B */
    m = t.match(/^double technical foul: (.+) and (.+)$/i);
    if (m) return { rule: "foul", text: "더블 테크니컬 파울: " + m[1] + " · " + m[2] };

    /* 파울·턴오버 종류 표 */
    hit = koByTable(t, KO_FOUL, "foul", false) || koByTable(t, KO_TURN, "turnover", true);
    if (hit) return hit;

    /* 이름 없는 바이얼레이션·테크니컬 */
    if (/^shot clock turnover$/i.test(t)) return { rule: "violation", text: "샷클락 바이얼레이션" };
    if (/^delay of game violation$/i.test(t)) return { rule: "violation", text: "지연 경기" };
    if (/^5 second violation$/i.test(t)) return { rule: "violation", text: "5초 바이얼레이션" };
    if (/^8 second turnover$/i.test(t)) return { rule: "violation", text: "8초 바이얼레이션" };
    if (/^lane violation$/i.test(t)) return { rule: "violation", text: "레인 바이얼레이션" };
    if (/^delay techfoul$/i.test(t)) return { rule: "foul", text: "지연 테크니컬 파울" };
    if (/^hanging techfoul$/i.test(t)) return { rule: "foul", text: "림 행 테크니컬 파울" };

    /* 퇴장 */
    m = t.match(/^(.+?) ejected$/i);
    if (m) return { rule: "eject", text: m[1] + ", 퇴장" };

    /* 표에 없는 표현: 낱말별 치환. 하나도 못 바꿨으면 원문을 그대로 둔다. */
    var loose = koLoose(t);
    return { rule: "loose", text: /[가-힣]/.test(loose) ? loose : t };
  }

  function koPlay(raw) { return koTranslate(raw).text; }

  // "6:12" → 372초. 해석할 수 없으면 null.
  function clockSecs(text) {
    var m = String(text == null ? "" : text).match(/^(\d+):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  // ESPN summary 응답 → 최근 플레이 5개 + 팀별 출전 선수 기록 + 팀 지표
  // box[i].stats 는 그 팀의 박스스코어 팀 지표(야투·3점·자유투·리바운드·턴오버 등)이고,
  // out.clutch 는 4쿼터 마지막 5분·연장에서 그 선수가 넣은 득점이다(승부처 기여).
  function parseLiveSummary(j) {
    var out = { plays: [], box: [], clutch: {}, goals: [] };

    // 축구 득점 장면: keyEvents 의 goal 을 시간·득점자·도움으로 줄인다
    var keyEvents = j && Array.isArray(j.keyEvents) ? j.keyEvents : [];
    out.goals = keyEvents.filter(function (e) {
      return e && (e.scoringPlay === true || (e.type && e.type.type === "goal"));
    }).map(function (e) {
      var parts = e.participants || [];
      var scorer = (parts[0] && parts[0].athlete && parts[0].athlete.displayName) || "";
      var assist = (parts[1] && parts[1].athlete && parts[1].athlete.displayName) || "";
      var team = (e.team && e.team.displayName) || "";
      var teamId = String((e.team && e.team.id) || "");
      var clock = (e.clock && e.clock.displayValue) || "";
      var text = scorer ? scorer + "(" + team + ")" : String(e.shortText || "");
      if (assist) text += " · " + assist + " 어시스트";
      return { minute: clock, text: text, teamId: teamId, teamName: team };
    }).filter(function (x) { return !!x.text; });

    // 승부처 득점: ESPN play 의 scoringPlay·scoreValue·period·clock 으로 센다
    var rawPlays = j && Array.isArray(j.plays) ? j.plays : [];
    rawPlays.forEach(function (p) {
      if (!p || !p.scoringPlay) return;
      var val = Number(p.scoreValue);
      if (!isFinite(val) || val <= 0) return;
      var per = p.period && p.period.number ? Number(p.period.number) : null;
      var secs = clockSecs(p.clock && p.clock.displayValue);
      var clutch = per != null && (per >= 5 || (per === 4 && secs != null && secs <= 300));
      if (!clutch) return;
      var who = p.participants && p.participants[0] && p.participants[0].athlete;
      if (!who || !who.id) return;
      out.clutch[String(who.id)] = (out.clutch[String(who.id)] || 0) + val;
    });

    var plays = j && Array.isArray(j.plays) ? j.plays : [];
    out.plays = plays.slice(-5).reverse().map(function (p) {
      var per = p && p.period && p.period.number ? p.period.number + "Q" : "";
      var clk = (p && p.clock && p.clock.displayValue) || "";
      var ko = koTranslate(String((p && (p.text || p.shortDescription)) || ""));
      return {
        // '2쿼터 종료'처럼 문장 자체가 시점을 말하는 줄은 앞 시간 칸을 비운다
        label: ko.rule === "period" ? "" : [per, clk].filter(Boolean).join(" "),
        text: ko.text,
        away: p && p.awayScore != null ? p.awayScore : null,
        home: p && p.homeScore != null ? p.homeScore : null,
        scoring: !!(p && p.scoringPlay),
        error: ko.rule === "turnover" || ko.rule === "violation"
      };
    }).filter(function (p) { return !!p.text; });

    var teams = j && j.boxscore && j.boxscore.players;
    if (Array.isArray(teams)) {
      teams.forEach(function (t) {
        var st = (t.statistics || [])[0];
        if (!st) return;
        var labels = (st.labels || []).map(function (l) { return String(l).toUpperCase(); });
        var idx = {};
        labels.forEach(function (l, i) { idx[l] = i; });
        if (idx.MIN == null || idx.PTS == null) return;
        var rows = [];
        (st.athletes || []).forEach(function (a) {
          if (!a || a.didNotPlay) return;
          var s = a.stats || [];
          var min = s[idx.MIN];
          if (min == null || min === "" || min === "--" || toNum(min) <= 0) return;
          rows.push({
            id: (a.athlete && a.athlete.id) || "",
            name: (a.athlete && (a.athlete.displayName || a.athlete.fullName || a.athlete.shortName)) || "",
            photo: (a.athlete && a.athlete.headshot && a.athlete.headshot.href) || "",
            min: min,
            pts: s[idx.PTS],
            reb: idx.REB != null ? s[idx.REB] : null,
            ast: idx.AST != null ? s[idx.AST] : null,
            fg: idx.FG != null ? s[idx.FG] : null,
            three: idx["3PT"] != null ? s[idx["3PT"]] : (idx["3P"] != null ? s[idx["3P"]] : null),
            ft: idx.FT != null ? s[idx.FT] : null,
            turnovers: idx.TO != null ? s[idx.TO] : null,
            stl: idx.STL != null ? s[idx.STL] : null,
            blk: idx.BLK != null ? s[idx.BLK] : null,
            oreb: idx.OREB != null ? s[idx.OREB] : null,
            dreb: idx.DREB != null ? s[idx.DREB] : null,
            pf: idx.PF != null ? s[idx.PF] : null,
            pm: idx["+/-"] != null ? s[idx["+/-"]] : null
          });
        });
        out.box.push({
          id: (t.team && t.team.id) || "",
          abbr: (t.team && t.team.abbreviation) || "",
          name: (t.team && (t.team.shortDisplayName || t.team.displayName)) || "",
          rows: rows,
          stats: {}
        });
      });
    }

    // 팀 지표(박스스코어 teams)는 players 와 같은 순서(원정·홈)로 온다
    var statTeams = j && j.boxscore && j.boxscore.teams;
    if (Array.isArray(statTeams)) {
      statTeams.forEach(function (t, i) {
        var box = out.box[i];
        if (!box) return;
        (t.statistics || []).forEach(function (s) {
          if (!s || !s.name) return;
          box.stats[s.name] = s.displayValue;
        });
      });
    }

    // 축구는 boxscore.players 가 비어 있고 로스터(rosters)에 경기 기록이 온다
    var rosterTeams = j && Array.isArray(j.rosters) ? j.rosters : [];
    if (!out.box.length && rosterTeams.length) {
      rosterTeams.forEach(function (t) {
        var rows = [];
        (t.roster || []).forEach(function (pl) {
          var st = {};
          (pl.stats || []).forEach(function (s) { if (s && s.name) st[s.name] = s.displayValue; });
          if (!pl.athlete) return;
          rows.push({
            id: pl.athlete.id || "",
            name: pl.athlete.displayName || pl.athlete.fullName || "",
            photo: (pl.athlete.headshot && pl.athlete.headshot.href) || "",
            starter: !!pl.starter,
            pos: (pl.position && pl.position.abbreviation) || "",
            stats: st
          });
        });
        out.box.push({
          id: (t.team && t.team.id) || "",
          abbr: (t.team && t.team.abbreviation) || "",
          name: (t.team && (t.team.shortDisplayName || t.team.displayName)) || "",
          rows: rows,
          stats: {}
        });
      });
      statTeams = j && j.boxscore && j.boxscore.teams;
      if (Array.isArray(statTeams)) {
        statTeams.forEach(function (t, i) {
          var box = out.box[i];
          if (!box) return;
          (t.statistics || []).forEach(function (s) {
            if (!s || !s.name) return;
            box.stats[s.name] = s.displayValue;
          });
        });
      }
    }
    return out;
  }

  function summaryEntry(g) {
    var t = liveTargetOf(g);
    return t ? (LIVE.sum[t.path + "|" + t.id] || null) : null;
  }

  // summary 받기. force 면 캐시를 건너뜁니다. cb 는 받은 뒤(실패 포함) 부릅니다.
  function loadLiveSummary(g, force, cb) {
    var t = liveTargetOf(g);
    if (!t) { if (cb) cb(null); return; }
    var key = t.path + "|" + t.id;
    var cur = LIVE.sum[key] || null;
    if (!force && cur && Date.now() - cur.at < LIVE_SUM_TTL) { if (cb) cb(cur.data); return; }
    if (LIVE.sumBusy[key]) return;
    LIVE.sumBusy[key] = true;
    fetchJSON(ESPN_BASE + t.path + "/summary?event=" + encodeURIComponent(t.id)).then(function (j) {
      LIVE.sum[key] = { at: Date.now(), data: parseLiveSummary(j), err: null };
    }, function (e) {
      // 실패하면 이전에 받아 둔 값을 그대로 두고 오류만 남긴다
      LIVE.sum[key] = {
        at: cur ? cur.at : Date.now(),
        data: cur ? cur.data : { plays: [], box: [] },
        err: String((e && e.message) || e)
      };
    }).then(function () {
      LIVE.sumBusy[key] = false;
      if (cb) cb(LIVE.sum[key] ? LIVE.sum[key].data : null);
    });
  }

  // 쿼터별 점수표(진행 중·종료 모두 같은 표)
  function linesTableHTML(g, r) {
    if (!r || !r.lines) return "";
    var al = r.lines.away || [], hl = r.lines.home || [];
    if (!al.length && !hl.length) return "";
    var n = Math.max(al.length, hl.length);
    var head = "", ar = "", hr = "";
    for (var i = 0; i < n; i++) {
      head += "<th scope=\"col\">" + (i + 1) + "Q</th>";
      ar += "<td>" + esc(al[i] || "-") + "</td>";
      hr += "<td>" + esc(hl[i] || "-") + "</td>";
    }
    return '<table class="r-lines"><thead><tr><th></th>' + head + '<th scope="col">합</th></tr></thead><tbody>' +
      '<tr><th scope="row">' + esc(g.away ? g.away.abbr : "원정") + "</th>" + ar +
        "<td>" + esc(String(r.awayScore != null ? r.awayScore : "-")) + "</td></tr>" +
      '<tr><th scope="row">' + esc(g.home ? g.home.abbr : "홈") + "</th>" + hr +
        "<td>" + esc(String(r.homeScore != null ? r.homeScore : "-")) + "</td></tr>" +
      "</tbody></table>";
  }

  function liveHeadHTML(g) {
    var r = g.result || {};
    var s = summaryEntry(g);
    var relay = (g.sport === "volleyball" && r.kovoNumber) ? LIVE.kovoRelay[String(r.kovoNumber)] : null;
    var at = (s && s.at) ? s.at : (relay && relay.plays && relay.plays.length ? relay.at : 0);
    var upd = at ? hhmm(new Date(at)) : "";
    return '<div class="lb-head">' +
      '<span class="lv"><span class="lv-dot" aria-hidden="true"></span>LIVE</span>' +
      '<b class="lb-phase">' + esc(r.detail || "진행 중") + "</b>" +
      (upd ? '<span class="lb-upd">' + esc(upd) + " 갱신</span>" : "") +
      "</div>";
  }

  function liveScoreHTML(g) {
    var r = g.result || {};
    var a = r.awayScore, h = r.homeScore;
    function side(cls, abbr, name, pts, other) {
      var lead = pts != null && other != null && toNum(pts) > toNum(other) ? " lead" : "";
      return '<div class="lb-side ' + cls + lead + '">' +
        '<span class="lb-abbr">' + esc(abbr) + "</span>" +
        '<b class="lb-pts">' + esc(pts != null ? pts : "-") + "</b>" +
        '<span class="lb-nm">' + esc(name) + "</span>" +
        "</div>";
    }
    return '<div class="lb-score">' +
      side("away", g.away ? g.away.abbr : "원정", g.away ? g.away.name : "원정", a, h) +
      '<span class="lb-col" aria-hidden="true">:</span>' +
      side("home", g.home ? g.home.abbr : "홈", g.home ? g.home.name : "홈", h, a) +
      "</div>";
  }

  function livePlaysHTML(g) {
    if (g.sport !== "basketball") return "";   // 배구는 kovoRelayHTML 이 랠리 중계를 그린다
    var head = '<h4 class="lb-sub">최근 플레이</h4>';
    var s = summaryEntry(g);
    if (!s) return head + '<p class="lb-none">최근 플레이를 불러오는 중…</p>';
    var plays = (s.data && s.data.plays) || [];
    if (!plays.length) {
      return head + '<p class="lb-none">' +
        (s.err ? "최근 플레이를 받지 못했습니다." : "아직 표시할 플레이가 없습니다.") + "</p>";
    }
    return head + '<ul class="lb-plays">' + plays.map(function (p) {
      var sc = (p.away != null && p.home != null) ? (p.away + "-" + p.home) : "";
      return "<li" + (p.scoring ? ' class="sc"' : "") + ">" +
        '<span class="bp-t">' + esc(p.label) + "</span>" +
        '<span class="bp-x">' + livePlayMarkerHTML("basketball", p) + esc(p.text) + "</span>" +
        (sc ? '<span class="bp-s">' + esc(sc) + "</span>" : "") +
        "</li>";
    }).join("") + "</ul>";
  }

  function liveTeamTableHTML(g, t) {
    var ab = String(t.abbr || "").toUpperCase();
    var side = g.away && ab === String(g.away.abbr || "").toUpperCase() ? "away" :
      (g.home && ab === String(g.home.abbr || "").toUpperCase() ? "home" : "");
    var name = (side === "away" && g.away) ? g.away.name :
      (side === "home" && g.home) ? g.home.name : (t.name || t.abbr || "팀");
    var rows = (t.rows || []).slice().sort(function (a, b) {
      return (toNum(b.pts) - toNum(a.pts)) || (toNum(b.min) - toNum(a.min));
    }).slice(0, 6);
    if (!rows.length) return "";
    var head = '<div class="lb-team-h">' +
      (side ? '<span class="lbt-side ' + side + '">' + (side === "away" ? "원정" : "홈") + "</span>" : "") +
      "<b>" + esc(name) + "</b>" +
      '<span class="lbt-abbr">' + esc(t.abbr || "") + "</span></div>";
    return '<div class="lb-team-box">' + head +
      '<table class="lb-tbl"><thead><tr>' +
        '<th scope="col" class="c-nm">선수</th>' +
        '<th scope="col">시간</th>' +
        '<th scope="col" class="c-pts">득점</th>' +
        '<th scope="col">리바</th>' +
        '<th scope="col">어시</th>' +
      "</tr></thead><tbody>" +
      rows.map(function (p) {
        return '<tr><th scope="row" class="c-nm"><span class="nm-wrap">' +
          faceHTML(p.name, p.photo, true) + "<b>" + esc(p.name) + "</b></span></th>" +
          '<td class="c-min">' + esc(dash(p.min)) + "</td>" +
          '<td class="c-pts">' + esc(dash(p.pts)) + "</td>" +
          "<td>" + esc(dash(p.reb)) + "</td>" +
          "<td>" + esc(dash(p.ast)) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function liveRosterHTML(g) {
    if (g.sport !== "basketball") return "";
    var head = '<h4 class="lb-sub">현재 선수 기록 <span class="lb-sub-note">득점 많은 순 6명</span></h4>';
    var s = summaryEntry(g);
    if (!s) return head + '<p class="lb-none">선수 기록을 불러오는 중…</p>';
    var teams = (s.data && s.data.box) || [];
    var awayAbbr = g.away ? String(g.away.abbr || "").toUpperCase() : "";
    var homeAbbr = g.home ? String(g.home.abbr || "").toUpperCase() : "";
    var ordered = teams.slice().sort(function (a, b) {
      var rank = function (t) {
        var ab = String(t.abbr || "").toUpperCase();
        return ab === homeAbbr ? 0 : (ab === awayAbbr ? 1 : 2);
      };
      return rank(a) - rank(b);
    });
    var tables = ordered.map(function (t) { return liveTeamTableHTML(g, t); }).join("");
    if (!tables) {
      return head + '<p class="lb-none">' +
        (s.err ? "선수 기록을 받지 못했습니다." : "아직 선수 기록이 없습니다.") + "</p>";
    }
    return head + tables;
  }

  // 박스 맨 위에 붙는 실시간 상황 한 덩이
  function liveSectionHTML(g) {
    var r = g.result || {};
    var volleyballNote = g.sport === "volleyball"
      ? kovoRelayHTML(g)
      : "";
    return '<section class="lbox" aria-label="지금 경기 상황">' +
      liveHeadHTML(g) +
      liveScoreHTML(g) +
      volleyballNote +
      linesTableHTML(g, r) +
      livePlaysHTML(g) +
      liveRosterHTML(g) +
      "</section>";
  }

  // 펼쳐 둔 진행 중 경기의 실시간 부분만 다시 그리고, 안쪽은 높이 auto 로 둔다
  function refreshLiveSummary(item, g, force) {
    loadLiveSummary(g, !!force, function () {
      var it = itemOf(g.id);
      if (!it || !it.classList.contains("open")) return;
      var box = it.querySelector(".lbox");
      if (!box) return;
      var tpl = document.createElement("div");
      tpl.innerHTML = liveSectionHTML(g);
      if (tpl.firstChild) box.parentNode.replaceChild(tpl.firstChild, box);
    });
  }

  function refreshPostgameSummary(item, g, force) {
    loadLiveSummary(g, !!force, function () {
      var it = itemOf(g.id);
      if (!it || !it.classList.contains("open")) return;
      var old = it.querySelector(".postgame");
      if (!old) return;
      var tpl = document.createElement("div");
      tpl.innerHTML = postgameHTML(g);
      if (tpl.firstChild) old.parentNode.replaceChild(tpl.firstChild, old);
    });
  }

  function indexEvents(j, sport, path) {
    var out = {};
    ((j && j.events) || []).forEach(function (ev) {
      var p = parseEvent(ev, sport, path);
      if (p) out[p.id] = p;
    });
    return out;
  }

  // 스코어보드 한 번 받기. dates 는 시도할 YYYYMMDD 목록(없으면 기본=오늘).
  function fetchBoard(path, dates) {
    var list = dates && dates.length ? dates : [null];
    var events = {}, ok = false, errs = [];
    var chain = Promise.resolve();
    list.forEach(function (dd) {
      chain = chain.then(function () {
        if (ok && dd !== list[0]) return; // 첫 응답에 이미 들어 있으면 날짜 조회는 건너뜁니다
        var url = ESPN_BASE + path + "/scoreboard" + (dd ? "?dates=" + dd + "&limit=100" : "");
        return fetchJSON(url).then(function (j) {
          ok = true;
          var m = indexEvents(j, sportOfPath(path), path);
          Object.keys(m).forEach(function (k) { events[k] = m[k]; });
        }, function (e) {
          errs.push(String((e && e.message) || e));
        });
      });
    });
    return chain.then(function () {
      return { ok: ok, path: path, events: events, err: errs.join(" / ") };
    });
  }

  // espnId 우선, 없으면 팀 약어·시작 시각으로 보조 매칭
  function findEvent(g, map, path) {
    if (g.espnId && map[g.espnId]) return map[g.espnId];
    var a = String((g.away && g.away.abbr) || "").toUpperCase();
    var h = String((g.home && g.home.abbr) || "").toUpperCase();
    if (!a || !h) return null;
    var t = new Date(g.start).getTime();
    var hit = null;
    Object.keys(map).forEach(function (id) {
      var ev = map[id];
      if (path && ev.path !== path) return;
      if (String(ev.awayAbbr).toUpperCase() !== a) return;
      if (String(ev.homeAbbr).toUpperCase() !== h) return;
      if (ev.date && isFinite(t) && Math.abs(new Date(ev.date).getTime() - t) > 30 * 3600 * 1000) return;
      hit = ev;
    });
    return hit;
  }

  // 받은 값을 data.js 경기에 덮어쓴다. 바뀌었으면 true.
  function updateGame(g, ev) {
    if (!ev || ev.state === "pre") return false;
    if (ev.awayScore == null || ev.homeScore == null) return false;
    var prev = g.result || null;
    var before = JSON.stringify(prev);

    if (ev.state === "post") {
      if (prev && prev.state === "final") return false;   // 이미 받아 둔 최종 결과는 그대로 둔다
      if (prev && prev.state === "live") LIVE.ended[g.id] = true;
      g.result = {
        state: "final",
        detail: liveDetail(ev),
        awayScore: ev.awayScore,
        homeScore: ev.homeScore,
        lines: ev.lines || (prev && prev.lines) || null,
        top: (ev.top && ev.top.length ? ev.top : (prev && prev.top)) || null,
        espnPath: ev.path,
        espnId: String(ev.id)
      };
      g.status = "final";
    } else {
      g.result = {
        state: "live",
        detail: liveDetail(ev),
        awayScore: ev.awayScore,
        homeScore: ev.homeScore,
        lines: ev.lines || null,
        top: (ev.top && ev.top.length) ? ev.top : null,
        espnPath: ev.path,
        espnId: String(ev.id)
      };
      g.status = "live";
    }
    var changed = before !== JSON.stringify(g.result);
    if (changed) notifyFavoriteGameChange(g, prev, g.result);
    return changed;
  }

  function setRefreshBusy(on) {
    if (!elLiveRefresh) return;
    elLiveRefresh.disabled = !!on;
    elLiveRefresh.textContent = on ? "확인 중…" : "새로고침";
  }

  function hhmm(d) {
    if (!d) return "";
    var p = parts(d);
    return p.hh + ":" + p.mm;
  }

  function liveNowCount() {
    var t = todayStr(), y = addDays(t, -1), n = 0;
    GAMES.forEach(function (e) {
      if (e.date !== t && e.date !== y) return;
      if (e.g.result && e.g.result.state === "live") n++;
    });
    return n;
  }

  function paintLiveBar() {
    if (!elLiveBar) return;
    var n = liveNowCount();
    var cands = liveCandidates();
    var kovoFail = !!LIVE.kovoErr;
    if (!cands.length && !n && !kovoFail) { elLiveBar.hidden = true; return; }
    elLiveBar.hidden = false;
    elLiveBar.classList.toggle("live", n > 0);
    var failed = !!LIVE.err && (!LIVE.lastOk || Date.now() - LIVE.lastOk.getTime() > LIVE_STALE_MS);
    elLiveBar.classList.toggle("err", failed);
    if (elLiveText) {
      elLiveText.textContent = failed
        ? (LIVE.lastOk ? "실시간 연결 지연 · 저장 데이터 표시" : "실시간 정보를 못 받았습니다 · 저장 데이터 표시")
        : (n ? "지금 " + n + "경기 진행 중"
          : (kovoFail ? "KOVO 실시간 연결 실패 · 새로고침을 눌러 주세요" : "지금 진행 중인 경기 없음"));
    }
    if (elLiveTime) elLiveTime.textContent = LIVE.lastOk ? "확인 " + hhmm(LIVE.lastOk) : "";
  }

  function paintTiles() {
    Array.prototype.forEach.call(elList.querySelectorAll(".tile"), function (tile) {
      var chip = tile.querySelector(".tile-live");
      if (!chip) return;
      var n = gamesOf(state.day).filter(function (g) {
        return g.sport === tile.dataset.sport && g.result && g.result.state === "live";
      }).length;
      chip.hidden = !n;
      chip.textContent = n ? "LIVE " + n : "";
    });
  }

  // 화면의 점수 자리만 다시 그린다(줄·펼친 박스·타일·실시간 줄)
  function paintLive() {
    Array.prototype.forEach.call(elList.querySelectorAll(".mrow-item"), function (item) {
      var e = gameEntry(item.dataset.id);
      if (!e) return;
      var slot = item.querySelector(".mslot");
      if (slot) {
        var sh = scoreSlotHTML(e.g);
        if (slot.innerHTML !== sh) slot.innerHTML = sh;
      }
      var pill = item.querySelector(".mpill");
      if (pill) {
        var ph = livePillHTML(e.g);
        if (pill.innerHTML !== ph) pill.innerHTML = ph;
      }
    });

    // 즐겨찾기 화면에서는 경기 상태가 바뀌면 LIVE 경기를 맨 위로 이동한다.
    if (state.favorites) {
      var rows = elList.querySelector(".rows");
      if (rows) favoriteGames().forEach(function (entry) {
        var item = itemOf(entry.g.id);
        if (item && item.parentNode === rows) rows.appendChild(item);
      });
    }

    // 펼쳐 둔 박스만 다시 그린다(높이는 auto 라 애니메이션에 영향 없음)
    var open = elList.querySelector(".mrow-item.open");
    if (open) {
      var oe = gameEntry(open.dataset.id);
      if (oe) {
        var oeLive = !!(oe.g.result && oe.g.result.state === "live");
        var hasLive = !!open.querySelector(".lbox");
        if (oeLive !== hasLive) {
          // 진행 중 ↔ 종료로 바뀌면 박스 구성 자체가 달라진다
          var wrap = open.querySelector(".cbox-wrap");
          if (wrap) {
            wrap.style.height = "auto";
            wrap.innerHTML = boxHTML(oe.g);
          }
        } else if (oeLive) {
          var lold = open.querySelector(".lbox");
          if (lold) {
            var ltpl = document.createElement("div");
            ltpl.innerHTML = liveSectionHTML(oe.g);
            if (ltpl.firstChild) lold.parentNode.replaceChild(ltpl.firstChild, lold);
          }
        } else {
          var old = open.querySelector(".rbox");
          if (old) {
            var tpl = document.createElement("div");
            tpl.innerHTML = resultHTML(oe.g);
            if (tpl.firstChild) old.parentNode.replaceChild(tpl.firstChild, old);
          }
        }
        // 펼쳐 둔 진행 중 경기는 선수 기록·최근 플레이도 30초마다 새로 받는다
        if (oeLive) refreshLiveSummary(open, oe.g, true);
        else if (oe.g.result && oe.g.result.state === "final" && (oe.g.sport === "basketball" || oe.g.sport === "soccer")) {
          var postgameEntry = summaryEntry(oe.g);
          if (!postgameEntry || (postgameEntry.err && Date.now() - postgameEntry.at > 60000)) {
            refreshPostgameSummary(open, oe.g, false);
          }
        }
      }
    }

    paintTiles();
    paintLiveBar();
  }

  function finishPoll(ok, errs, manual) {
    LIVE.busy = false;
    if (manual) setRefreshBusy(false);
    if (ok) { LIVE.err = null; LIVE.lastOk = new Date(); }
    else LIVE.err = errs.filter(Boolean).join(" / ") || "network";
    paintLive();
  }

  // 지금 위치가 어느 경기의 진행 시간대인지(시작 10분 전 ~ 시작 4시간 후)
  function anyLiveWindow() {
    var now = Date.now();
    var list = liveCandidates();
    for (var i = 0; i < list.length; i++) {
      if (list[i].g.result && list[i].g.result.state === "live") return true;
      var t = new Date(list[i].g.start).getTime();
      if (!isFinite(t)) continue;
      if (now >= t - 10 * 60 * 1000 && now <= t + 4 * 60 * 60 * 1000) return true;
    }
    return false;
  }

  function anyKovoWindow() {
    var now = Date.now(), day = todayStr();
    for (var i = 0; i < GAMES.length; i++) {
      var e = GAMES[i];
      if (!e.g || e.g.sport !== "volleyball" || e.date !== day) continue;
      if (e.g.result && e.g.result.state === "live") return true;
      var t = new Date(e.g.start).getTime();
      if (isFinite(t) && now >= t - 10 * 60 * 1000 && now <= t + 4 * 60 * 60 * 1000) return true;
    }
    return false;
  }

  function pollLive(manual) {
    pollKovoLive(manual);
    if (LIVE.busy) return;
    var cands = liveCandidates();
    if (!cands.length) { LIVE.err = null; paintLive(); return; }
    if (manual) LIVE.dated = {};

    var paths = {};
    cands.forEach(function (c) { (paths[c.path] = paths[c.path] || []).push(c); });

    LIVE.busy = true;
    if (manual) setRefreshBusy(true);

    var keys = Object.keys(paths);
    Promise.all(keys.map(function (p) { return fetchBoard(p, null); })).then(function (res) {
      var map = {}, ok = false, errs = [];
      res.forEach(function (r) {
        if (r.ok) { ok = true; Object.keys(r.events).forEach(function (id) { map[id] = r.events[id]; }); }
        else errs.push(r.err);
      });

      cands.forEach(function (c) {
        var ev = findEvent(c.g, map, c.path);
        if (ev) updateGame(c.g, ev);
      });

      // 기본 응답에 없는 경기 중 '진행 중'으로 남아 있는 것은 날짜를 지정해 한 번 더 확인
      var missing = cands.filter(function (c) {
        return !findEvent(c.g, map, c.path) && c.g.result && c.g.result.state === "live";
      }).slice(0, 3);
      if (!missing.length) { finishPoll(ok, errs, manual); return; }

      var extra = missing.map(function (c) {
        var t0 = new Date(c.g.start);
        var day = parts(t0);
        var prevDay = parts(new Date(t0.getTime() - 24 * 3600 * 1000));
        // KST 아침 경기는 미국 날짜로 전날일 수 있어 양쪽 날짜를 다 시도한다
        var dates = [prevDay.y + prevDay.m + prevDay.d, day.y + day.m + day.d]
          .filter(function (v, i, a) { return a.indexOf(v) === i; });
        var key = c.path + "|" + dates.join(",");
        var hit = LIVE.dated[key];
        if (hit && Date.now() - hit.at < DATED_TTL) {
          return Promise.resolve({ ok: true, path: c.path, events: hit.events, err: "" });
        }
        return fetchBoard(c.path, dates).then(function (r) {
          if (r.ok) LIVE.dated[key] = { at: Date.now(), events: r.events };
          return r;
        });
      });

      Promise.all(extra).then(function (rs) {
        rs.forEach(function (r) {
          if (r && r.ok) { ok = true; Object.keys(r.events).forEach(function (id) { map[id] = r.events[id]; }); }
        });
        missing.forEach(function (c) {
          var ev = findEvent(c.g, map, c.path);
          if (ev) updateGame(c.g, ev);
        });
        var errsAll = errs.concat(rs.map(function (r) { return r && r.err; }));
        finishPoll(ok, errsAll, manual);
      }, function (e) { finishPoll(ok, errs.concat(String(e && e.message || e)), manual); });
    }, function (e) {
      finishPoll(false, [String(e && e.message || e)], manual);
    });
  }

  function startLive() {
    if (!elLiveBar) return;
    paintLive();
    pollLive(false);
    if (LIVE.timer) window.clearInterval(LIVE.timer);
    LIVE.timer = window.setInterval(function () {
      if (document.hidden) return;        // 백그라운드 탭에서는 요청하지 않음
      // 경기 시간대가 아니면 두 분에 한 번만 확인한다(데이터 사용 절약)
      if (!anyLiveWindow() && !anyKovoWindow()) {
        LIVE.idle = (LIVE.idle || 0) + 1;
        if (LIVE.idle % 4 !== 0) return;
      } else {
        LIVE.idle = 0;
      }
      pollLive(false);
    }, LIVE_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) pollLive(false);
    });
    window.addEventListener("online", function () { pollLive(false); });
    if (elLiveRefresh) elLiveRefresh.addEventListener("click", function () { pollLive(true); });
  }

  /* ── 시작 ──────────────────────────────────────────── */
  // 해시로 바로 들어온 경우 그 화면부터 (없으면 홈)
  (function initFromHash() {
    var r = parseRoute();
    if (r.favorites) {
      state.favorites = true;
      state.openId = r.openId;
      if (r.openId) {
        var favoriteEntry = gameEntry(r.openId);
        if (favoriteEntry) state.day = favoriteEntry.date;
      }
      return;
    }
    if (r.allSports) {
      state.allSports = true;
      state.openId = r.openId;
      if (r.openId) {
        var allEntry = gameEntry(r.openId);
        if (allEntry) state.day = allEntry.date;
      }
      return;
    }
    if (!r.sport) return;
    state.sport = r.sport;
    if (r.openId) {
      var e = gameEntry(r.openId);
      if (e) {
        state.openId = r.openId;
        state.day = e.date;
        return;
      }
    }
    // 종목 화면 직접 진입: 그 종목 경기가 있는 첫 날짜로 맞춰 준다
    if (!gamesIn(state.day, r.sport).length) {
      var d = DAYS.filter(function (dd) { return gamesIn(dd.date, r.sport).length > 0; })[0];
      if (d) state.day = d.date;
    }
  })();

  if (elWeekPrev) elWeekPrev.addEventListener("click", function () { shiftWeek(-1); });
  if (elWeekNext) elWeekNext.addEventListener("click", function () { shiftWeek(1); });

  elList.addEventListener("click", function (e) {
    var teamButton = e.target.closest ? e.target.closest(".team-link") : null;
    if (teamButton && elList.contains(teamButton)) {
      e.preventDefault();
      e.stopPropagation();
      var teamItem = teamButton.closest(".mrow-item");
      if (!teamItem) return;
      if (!teamItem.classList.contains("open")) toggleItem(teamItem);
      var teamName = teamButton.dataset.teamFocus;
      window.setTimeout(function () {
        var blocks = teamItem.querySelectorAll(".tblock");
        for (var i = 0; i < blocks.length; i++) {
          if (blocks[i].dataset.teamName === teamName) {
            var block = blocks[i];
            block.scrollIntoView({ block: "nearest", behavior: "smooth" });
            block.classList.add("team-focus");
            window.setTimeout((function (target) {
              return function () { target.classList.remove("team-focus"); };
            })(block), 1400);
            break;
          }
        }
      }, 380);
      return;
    }
    var notifyButton = e.target.closest ? e.target.closest("[data-favorite-notify]") : null;
    if (notifyButton && elList.contains(notifyButton)) {
      e.preventDefault();
      requestFavoriteNotifications();
      return;
    }
    var button = e.target.closest ? e.target.closest(".fav-toggle") : null;
    if (!button || !elList.contains(button)) return;
    e.preventDefault();
    e.stopPropagation();
    var openId = state.openId;
    toggleFavorite(button.dataset.favSport, button.dataset.favTeam);
    if (state.favorites && openId && !itemOf(openId)) writeHash("favorites", true);
  });

  elEmptyCta.addEventListener("click", function () {
    var type = elEmptyCta.dataset.ctaType;
    var id = elEmptyCta.dataset.ctaId;
    if (!id) return;
    if (type === "day") {
      state.day = id;
      state.openId = null;
      writeHash(stateRoutePrefix(), true);
      render();
    } else if (type === "sport") {
      selectSport(id);
    }
  });

  // 로고(CLUTCH) 또는 목록 화면의 '종목 선택' 칩 → 홈
  elHomeLink.addEventListener("click", function (e) {
    e.preventDefault();
    goHome();
  });
  elBack.addEventListener("click", goHome);

  window.addEventListener("hashchange", syncFromHash);
  window.addEventListener("popstate", syncFromHash);

  /* ── 데이터 기준 시각 ──────────────────────────────── */
  function paintDataFreshness() {
    if (DATA.updatedAt) {
      var u = parts(DATA.updatedAt);
      var updatedMs = Date.parse(DATA.updatedAt);
      var staleData = isFinite(updatedMs) && Date.now() - updatedMs > 36 * 60 * 60 * 1000;
      elDataNote.textContent = "데이터 기준 " + Number(u.m) + "/" + Number(u.d) + " " + u.hh + ":" + u.mm +
        (staleData ? " · 갱신 지연" : "");
      elDataNote.classList.toggle("stale", staleData);
      elDataNote.title = staleData ? "데이터가 36시간 이상 갱신되지 않았습니다." : "마지막 데이터 갱신 시각";
    } else {
      elDataNote.textContent = "데이터 기준 —";
      elDataNote.classList.add("stale");
      elDataNote.title = "데이터 갱신 시각을 확인할 수 없습니다.";
    }
  }
  paintDataFreshness();
  window.setInterval(paintDataFreshness, 15 * 60 * 1000);

  render();
  startLive();
})();
