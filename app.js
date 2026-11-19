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

  /* ── 주소(해시) ↔ 화면 ───────────────────────────────── */
  // #             → 홈
  // #soccer       → 축구 일정 목록
  // #soccer/<id>  → 축구 일정 목록 + 그 경기 박스 펼침
  function parseRoute() {
    var raw = (location.hash || "").replace(/^#/, "").split("?")[0];
    if (!raw) return { sport: null, openId: null };
    var seg = raw.split("/");
    var sport = seg[0];
    if (!isSport(sport)) return { sport: null, openId: null };
    var openId = seg[1] ? decodeURIComponent(seg[1]) : null;
    if (openId && !gameEntry(openId)) openId = null;
    return { sport: sport, openId: openId };
  }

  function routeKey(r) {
    return (r.sport || "") + "|" + (r.openId || "");
  }

  function stateRoute() {
    return { sport: state.sport, openId: state.openId };
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
    sport: null,   // null = 홈(종목 선택)
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
        if (state.day === btn.dataset.date) return;
        state.day = btn.dataset.date;
        state.weekStart = mondayOf(state.day);
        state.openId = null;
        writeHash(state.sport || "", true);
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
    state.openId = null;
    writeHash(state.sport || "", true);
    render();
  }

  /* ── 종목 탭 ───────────────────────────────────────── */
  function renderTabs() {
    var games = gamesOf(state.day);
    var home = state.sport === null;

    // 홈은 종목을 고르는 화면이라 종목 탭 줄은 숨긴다(같은 선택지를 두 번 보여주지 않도록).
    elTabs.hidden = home;

    elTabs.innerHTML = SPORTS.map(function (s) {
      var n = games.filter(function (g) { return g.sport === s.id; }).length;
      var on = s.id === state.sport;
      return '<button class="tab" type="button" role="tab" id="tab-' + esc(s.id) + '"' +
        ' data-sport="' + esc(s.id) + '" aria-selected="' + on + '" aria-controls="panel"' +
        ' aria-label="' + esc(s.name) + (n ? " " + n + "경기" : " 경기 없음") + '"' +
        ' tabindex="' + (on || home ? "0" : "-1") + '">' +
        '<span class="em" aria-hidden="true">' + esc(s.icon) + "</span>" + esc(s.name) +
        (n > 0 ? '<span class="cnt">' + n + "</span>" : "") +
        "</button>";
    }).join("");

    Array.prototype.forEach.call(elTabs.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () { selectSport(tab.dataset.sport); });
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
        selectSport(next.dataset.sport);
        elTabs.querySelector('.tab[aria-selected="true"]').focus();
      });
    });
  }

  /* ── 화면 이동 ─────────────────────────────────────── */
  function selectSport(id) {
    if (!isSport(id)) return;
    var same = state.sport === id && !state.openId;
    state.sport = id;
    state.openId = null;
    if (!same) writeHash(id, false);
    render();
    window.scrollTo(0, 0);
  }

  function goHome() {
    var same = state.sport === null;
    state.sport = null;
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
  function formRow(side, team) {    if (!team) return "";
    var badges = (team.badges || []).map(function (b) {
      return '<span class="badge ' + toneClass(b.tone, ["hot", "rank"], "") + '">' + esc(b.text) + "</span>";
    }).join("");
    return "<li>" +
      '<span class="f-side ' + side + '">' + (side === "home" ? "홈" : "원정") + "</span>" +
      '<span class="f-name">' + esc(team.name) + "</span>" +
      (team.record ? '<span class="f-rec">' + esc(team.record) + "</span>" : "") +
      badges +
      "</li>";
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
  function teamBlockHTML(t) {
    if (!t) return "";
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
      return '<div class="tb-cell"><dt>' + esc(c[0]) + "</dt><dd>" + esc(c[1]) + "</dd></div>";
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
    if (Array.isArray(t.players) && t.players.length) {
      playersHTML = '<h4 class="tb-sub">주요 선수</h4><ul class="pl-list">' +
        t.players.slice(0, 3).map(function (p) {
          return '<li>' +
            '<span class="pl-top"><b>' + esc(p.name) + "</b>" +
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

    return '<section class="tblock ' + side + '">' +
      '<div class="tb-head">' +
        '<span class="tb-side">' + (side === "home" ? "홈" : "원정") + "</span>" +
        '<b class="tb-name">' + esc(t.name || t.abbr || "") + "</b>" +
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

  // 배당 — 미국식(+/-)과 소수 배당을 함께. 값이 없으면 "배당 정보 없음".
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
      '<span class="o-val"><b>' + decText(ml) + "</b><i>" + amText(ml) + "</i></span></li>";
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
      rows += oddsRowHTML("원정 승" + (g.away ? " · " + g.away.abbr : ""), ml.away);
      if (ml.draw != null) rows += oddsRowHTML("무승부", ml.draw);
      rows += oddsRowHTML("홈 승" + (g.home ? " · " + g.home.abbr : ""), ml.home);
    }
    var lines = [];
    if (o.spread && (o.spread.homeLine || o.spread.awayLine)) {
      var sp = "핸디캡 홈 " + (o.spread.homeLine || "—") +
        (o.spread.home != null ? " (" + amText(o.spread.home) + ")" : "") +
        " · 원정 " + (o.spread.awayLine || "—") +
        (o.spread.away != null ? " (" + amText(o.spread.away) + ")" : "");
      lines.push(sp);
    }
    if (o.total && (o.total.line || o.total.over != null)) {
      lines.push("총점 " + (o.total.line || "—") +
        (o.total.over != null ? " · 오버 " + amText(o.total.over) : "") +
        (o.total.under != null ? " / 언더 " + amText(o.total.under) : ""));
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
      impLine +
      '<p class="o-note">해외 배당이며 국내 배트맨·프로토 배당과 다를 수 있습니다. 소수 배당은 미국식 배당을 환산한 값입니다.</p>' +
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
      ? "실시간 주요 선수 기록은 경기 종료 후 반영됩니다."
      : "주요 선수 기록을 받지 못했습니다.";
    var topHTML = top.length
      ? '<ul class="r-top">' + top.map(function (p) {
          var bits = [];
          if (p.pts != null) bits.push(p.pts + "점");
          if (p.reb != null) bits.push(p.reb + "리바운드");
          if (p.ast != null) bits.push(p.ast + "어시스트");
          return "<li><span class=\"r-team\">" + esc(p.team || "") + "</span>" +
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
      '<h4 class="tb-sub">주요 선수 기록</h4>' + topHTML +
      "</section>";
  }

  function boxHTML(g) {
    var d = g.details || {};
    var injuries = Array.isArray(d.injuries) ? d.injuries : [];
    var checks = Array.isArray(d.checkpoints) ? d.checkpoints : [];
    var rows = Array.isArray(g.rows) ? g.rows : [];
    var tags = (g.tags || []).map(function (t) {
      return '<span class="tag ' + toneClass(t.tone, ["warn", "hot", "info"], "") + '">' + esc(t.text) + "</span>";
    }).join("");

    var liveNow = g.result && g.result.state === "live";

    // 경기 전 프리뷰(팀 상태·배당·맞대결·체크포인트)
    var preview = '<div class="box-head">' +
      '<span class="ch-badge">' + (liveNow ? "경기 전 브리핑" : "클러치 상황") + "</span>" +
      '<span class="ch-sub">' + (liveNow ? "배당 · 팀 비교 · 부상자" : "경기 전 브리핑") + "</span>" +
      (g.venue ? '<span class="ch-venue">' + esc(g.venue) + "</span>" : "") +
      "</div>" +
      '<ul class="form-list">' + formRow("away", g.away) + formRow("home", g.home) + "</ul>";

    if (tags) preview += '<div class="tags">' + tags + "</div>";

    if (rows.length) {
      preview += '<dl class="summary">' + rows.map(function (r) {
        var kind = toneClass(r.kind, ["flow", "inj", "watch"], "");
        return '<div class="srow ' + kind + '"><dt>' + esc(r.label) + "</dt><dd>" + md(r.text) + "</dd></div>";
      }).join("") + "</dl>";
    }

    // 팀별 정보: 원정 먼저, 홈 다음. 두 블록 사이는 넉넉히 띄운다.
    var teams = Array.isArray(d.teams) ? d.teams.filter(Boolean) : [];
    if (teams.length) {
      var ordered = teams.slice().sort(function (a, b) {
        var rank = function (t) { return t.side === "home" ? 1 : 0; };
        return rank(a) - rank(b);
      });
      preview += '<div class="team-blocks">' + ordered.map(teamBlockHTML).join("") + "</div>";
    } else if (injuries.length) {
      preview += '<h3 class="p-title">부상 리포트</h3><ul class="inj-list">' + injRowsHTML(injuries, true) + "</ul>";
    }

    preview += oddsHTML(g);

    if (d.h2h && (d.h2h.summary || (d.h2h.games && d.h2h.games.length))) {
      var hg = (d.h2h.games || []).slice(0, 5).map(function (m) {
        return "<li><span class=\"h-date\">" + esc((m.date || "").replace(/-/g, ".")) + "</span>" +
          "<span class=\"h-teams\">" + esc(m.home || "") + " " + esc(m.score || "") + " " + esc(m.away || "") + "</span></li>";
      }).join("");
      preview += '<h3 class="p-title">맞대결</h3>' +
        (d.h2h.summary ? '<p class="h-sum">' + esc(d.h2h.summary) + "</p>" : "") +
        (hg ? '<ul class="h-list">' + hg + "</ul>" : "");
    }

    if (checks.length) {
      preview += '<h3 class="p-title">체크포인트</h3><ol class="checks">' +
        checks.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("") + "</ol>";
    }

    if (d.note) preview += '<p class="note">' + esc(d.note) + "</p>";

    // 진행 중인 경기: 맨 위에 지금 상황(스코어·쿼터·최근 플레이·선수 기록),
    // 경기 전 프리뷰는 구분선 아래로 내린다. 끝난 경기는 지금처럼 결과를 맨 아래에.
    var body;
    if (liveNow) {
      body = liveSectionHTML(g) + '<div class="pregame">' + preview + "</div>";
    } else {
      body = preview + resultHTML(g);
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
      " — 클러치 상황 보기";

    var oddsChip = g.odds ? '<span class="mchip odds">배당</span>' : "";

    return '<li class="mrow-item" data-id="' + esc(g.id) + '">' +
      '<div class="mrow">' +
        '<span class="mrow-meta">' +
          '<span class="mwhen">' + esc(when) + " · <b>" + p.hh + ":" + p.mm + "</b></span>" +
          '<span class="mlg">' + esc(league) + "</span>" +
          oddsChip +
          '<span class="mpill" data-pill="' + esc(g.id) + '">' + livePillHTML(g) + "</span>" +
        "</span>" +
        '<button class="cbtn" type="button" aria-expanded="false" aria-controls="box-' + esc(g.id) + '"' +
        ' aria-label="' + esc(label) + '" data-id="' + esc(g.id) + '">' +
          '<span class="cbtn-label">클러치 상황</span>' +
          '<svg class="chev" width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
          '<path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        '<span class="mtms">' +
          '<span class="tm away">' + esc(away) + "</span>" +
          '<span class="mslot" data-slot="' + esc(g.id) + '">' + scoreSlotHTML(g) + "</span>" +
          '<span class="tm home">' + esc(home) + "</span>" +
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
    label.textContent = "클러치 상황";

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
      writeHash(state.sport + "/" + id, true);
    } else {
      closeItem(item);
      state.openId = null;
      writeHash(state.sport || "", true);
    }
  }

  function bindRows() {
    Array.prototype.forEach.call(elList.querySelectorAll(".mrow-item"), function (item) {
      item.querySelector(".mrow").addEventListener("click", function () { toggleItem(item); });
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
  var HOME_LEAD = "종목을 고르면 그날 경기 일정이 나옵니다.";

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

    elHomeLead.textContent = HOME_LEAD;
    elHomeLead.hidden = false;
    elEmpty.hidden = true;

    elList.innerHTML = '<div class="tiles">' + SPORTS.map(function (s) {
      return tileHTML(s, all.filter(function (g) { return g.sport === s.id; }));
    }).join("") + "</div>";

    Array.prototype.forEach.call(elList.querySelectorAll(".tile"), function (tile) {
      tile.addEventListener("click", function () { selectSport(tile.dataset.sport); });
    });
  }

  /* ── 일정 목록 화면 ─────────────────────────────────── */
  function renderSchedule() {
    var games = gamesIn(state.day, state.sport);

    if (!games.length) {
      elList.innerHTML = "";
      showEmpty(emptyState(state.day, state.sport));
      return;
    }

    elEmpty.hidden = true;
    elList.innerHTML =
      '<p class="list-hint">경기 줄 오른쪽 <b>클러치 상황</b>을 누르면 그 경기의 브리핑이 열립니다.</p>' +
      '<ul class="rows">' + games.map(rowHTML).join("") + "</ul>";
    bindRows();

    if (state.openId) {
      var item = itemOf(state.openId);
      if (item) openItem(item);
    }
  }

  /* ── 데이터 출처 칩 ────────────────────────────────── */
  // 지금 화면에 놓인 경기가 모두 ESPN 실제 데이터면 그렇게 표시하고,
  // 지금 화면에 놓인 경기의 출처를 표시한다.
  function renderDataChip() {
    var scope = state.sport ? gamesIn(state.day, state.sport) : gamesOf(state.day);
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
    var isHome = state.sport === null;

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
    } else {
      elBack.hidden = false;
      elTitle.innerHTML = "<em>" + longDate(state.day) + "</em> " + esc(sportMeta(state.sport).name) +
        " · " + gamesIn(state.day, state.sport).length + "경기";
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
  var DATED_TTL = 5 * 60 * 1000;
  var LIVE_SUM_TTL = 12000;     // 펼친 박스의 선수 기록·최근 플레이 캐시

  // data.js 의 league 값 → ESPN 경로
  var SOCCER_PATH = {
    EPL: "eng.1", PREMIERLEAGUE: "eng.1",
    LALIGA: "esp.1", LIGA: "esp.1",
    UCL: "uefa.champions", CHAMPIONSLEAGUE: "uefa.champions",
    BUNDESLIGA: "ger.1", SERIEA: "ita.1", LIGUE1: "fra.1",
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
    sumBusy: {}       // 같은 키의 summary 요청이 진행 중인지
  };

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
        if (!mine[nm]) { mine[nm] = { name: nm, team: abbr }; order.push(nm); }
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

  // ESPN summary 응답 → 최근 플레이 5개 + 팀별 출전 선수 기록
  function parseLiveSummary(j) {
    var out = { plays: [], box: [] };

    var plays = j && Array.isArray(j.plays) ? j.plays : [];
    out.plays = plays.slice(-5).reverse().map(function (p) {
      var per = p && p.period && p.period.number ? p.period.number + "Q" : "";
      var clk = (p && p.clock && p.clock.displayValue) || "";
      return {
        label: [per, clk].filter(Boolean).join(" "),
        text: String((p && (p.text || p.shortDescription)) || "").replace(/\s+/g, " ").trim(),
        away: p && p.awayScore != null ? p.awayScore : null,
        home: p && p.homeScore != null ? p.homeScore : null,
        scoring: !!(p && p.scoringPlay)
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
            name: (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || "",
            min: min,
            pts: s[idx.PTS],
            reb: idx.REB != null ? s[idx.REB] : null,
            ast: idx.AST != null ? s[idx.AST] : null
          });
        });
        out.box.push({
          abbr: (t.team && t.team.abbreviation) || "",
          name: (t.team && (t.team.shortDisplayName || t.team.displayName)) || "",
          rows: rows
        });
      });
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
    var upd = s && s.at ? hhmm(new Date(s.at)) : "";
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
        '<span class="bp-x">' + esc(p.text) + "</span>" +
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
        return '<tr><th scope="row" class="c-nm">' + esc(p.name) + "</th>" +
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
        return ab === awayAbbr ? 0 : (ab === homeAbbr ? 1 : 2);
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
    return '<section class="lbox" aria-label="지금 경기 상황">' +
      liveHeadHTML(g) +
      liveScoreHTML(g) +
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
    return before !== JSON.stringify(g.result);
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
    if (!cands.length && !n) { elLiveBar.hidden = true; return; }
    elLiveBar.hidden = false;
    elLiveBar.classList.toggle("live", n > 0);
    var failed = !!LIVE.err && !LIVE.lastOk;
    elLiveBar.classList.toggle("err", failed);
    if (elLiveText) {
      elLiveText.textContent = failed
        ? "실시간 정보를 못 받았습니다 · 정적 데이터 표시"
        : (n ? "지금 " + n + "경기 진행 중" : "지금 진행 중인 경기 없음");
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

  function pollLive(manual) {    if (LIVE.busy) return;
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
      if (!anyLiveWindow()) {
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

  elEmptyCta.addEventListener("click", function () {
    var type = elEmptyCta.dataset.ctaType;
    var id = elEmptyCta.dataset.ctaId;
    if (!id) return;
    if (type === "day") {
      state.day = id;
      state.openId = null;
      writeHash(state.sport || "", true);
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
  if (DATA.updatedAt) {
    var u = parts(DATA.updatedAt);
    elDataNote.textContent = "데이터 기준 " + Number(u.m) + "/" + Number(u.d) + " " + u.hh + ":" + u.mm;
  } else {
    elDataNote.textContent = "데이터 기준 —";
  }

  render();
  startLive();
})();
