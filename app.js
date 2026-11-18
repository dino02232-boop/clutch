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
    openId: null   // 펼친 경기 id
  };

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

  /* ── 날짜 버튼 ─────────────────────────────────────── */
  function renderDates() {
    elDates.innerHTML = DAYS.map(function (d) {
      var on = d.date === state.day;
      return '<button class="date-btn" type="button" data-date="' + esc(d.date) + '"' +
        ' aria-pressed="' + on + '">' +
        '<span class="d">' + shortDate(d.date) + "</span>" +
        '<span class="w">' + esc(dayTag(d.date)) + "</span>" +
        "</button>";
    }).join("");

    Array.prototype.forEach.call(elDates.querySelectorAll(".date-btn"), function (btn) {
      btn.addEventListener("click", function () {
        if (state.day === btn.dataset.date) return;
        state.day = btn.dataset.date;
        state.openId = null;
        writeHash(state.sport || "", true);
        render();
      });
    });
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
  function formRow(side, team) {
    if (!team) return "";
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

  function boxHTML(g) {
    var d = g.details || {};
    var injuries = Array.isArray(d.injuries) ? d.injuries : [];
    var checks = Array.isArray(d.checkpoints) ? d.checkpoints : [];
    var rows = Array.isArray(g.rows) ? g.rows : [];
    var tags = (g.tags || []).map(function (t) {
      return '<span class="tag ' + toneClass(t.tone, ["warn", "hot", "info"], "") + '">' + esc(t.text) + "</span>";
    }).join("");

    var body = '<div class="box-head">' +
      '<span class="ch-badge">클러치 상황</span>' +
      '<span class="ch-sub">오늘의 경기 정보</span>' +
      (g.venue ? '<span class="ch-venue">' + esc(g.venue) + "</span>" : "") +
      "</div>" +
      '<ul class="form-list">' + formRow("away", g.away) + formRow("home", g.home) + "</ul>";

    if (tags) body += '<div class="tags">' + tags + "</div>";

    if (rows.length) {
      body += '<dl class="summary">' + rows.map(function (r) {
        var kind = toneClass(r.kind, ["flow", "inj", "watch"], "");
        return '<div class="srow ' + kind + '"><dt>' + esc(r.label) + "</dt><dd>" + md(r.text) + "</dd></div>";
      }).join("") + "</dl>";
    }

    if (injuries.length) {
      body += '<h3 class="p-title">부상 리포트</h3><ul class="inj-list">' +
        injuries.map(function (i) {
          return '<li><span class="tt">' + esc(i.team || "") + "</span>" +
            '<span class="pl">' + esc(i.player) +
            (i.note ? "<small>" + esc(i.note) + "</small>" : "") + "</span>" +
            statusHTML(i.status) + "</li>";
        }).join("") + "</ul>";
    }

    if (checks.length) {
      body += '<h3 class="p-title">체크포인트</h3><ol class="checks">' +
        checks.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("") + "</ol>";
    }

    if (d.note) body += '<p class="note">' + esc(d.note) + "</p>";

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

    return '<li class="mrow-item" data-id="' + esc(g.id) + '">' +
      '<div class="mrow">' +
        '<span class="mrow-meta">' +
          '<span class="mwhen">' + esc(when) + " · <b>" + p.hh + ":" + p.mm + "</b></span>" +
          '<span class="mlg">' + esc(league) + "</span>" +
        "</span>" +
        '<button class="cbtn" type="button" aria-expanded="false" aria-controls="box-' + esc(g.id) + '"' +
        ' aria-label="' + esc(label) + '" data-id="' + esc(g.id) + '">' +
          '<span class="cbtn-label">클러치 상황</span>' +
          '<svg class="chev" width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
          '<path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        '<span class="mtms">' +
          '<span class="tm away">' + esc(away) + "</span>" +
          '<span class="vs" aria-hidden="true">vs</span>' +
          '<span class="tm home">' + esc(home) + "</span>" +
        "</span>" +
      "</div>" +
      '<div class="cbox-wrap" id="box-' + esc(g.id) + '"></div>' +
      "</li>";
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

  function tileHTML(s, gs) {
    var n = gs.length;
    var count = n ? n + "경기" : "경기 없음";
    var sub = leagueLine(gs);
    return '<button class="tile' + (n ? "" : " none") + '" type="button" data-sport="' + esc(s.id) + '"' +
      ' aria-label="' + esc(s.name) + " " + count + ", " + esc(sub) + '">' +
      '<span class="tile-ico" aria-hidden="true">' + esc(s.icon) + "</span>" +
      '<span class="tile-body">' +
        '<span class="tile-top">' +
          '<b class="tile-name">' + esc(s.name) + "</b>" +
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
  // 샘플이 섞여 있으면 샘플이라고 밝힌다.
  function renderDataChip() {
    var scope = state.sport ? gamesIn(state.day, state.sport) : gamesOf(state.day);
    var real = scope.filter(function (g) { return g.source === "espn"; }).length;
    var label = real === 0 ? "샘플 데이터"
      : (real === scope.length ? "ESPN 실제 데이터" : "ESPN + 샘플");
    elDataChip.textContent = label;
    elDataChip.classList.toggle("real", real > 0);
  }

  /* ── 렌더 ──────────────────────────────────────────── */
  function render() {
    var isHome = state.sport === null;

    elBrandDate.textContent = state.day.replace(/-/g, ".") + " " + weekdayOf(state.day);
    renderDataChip();

    renderDates();
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
    elDataNote.textContent = "샘플 브리핑";
  }

  render();
})();
