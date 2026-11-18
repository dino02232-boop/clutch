/* =============================================================
   CLUTCH — app.js
   data.js 의 window.CLUTCH_DATA 를 읽어 화면을 그립니다.
   · 첫 진입(해시 없음) = 홈: 종목을 고르는 화면(축구/야구/농구/배구 큰 타일 4개)
   · 종목을 고르면 그 종목의 경기 카드 목록만 표시 (URL 해시로도 진입)
   · 로고(CLUTCH)나 종목 화면의 '종목 선택' 버튼을 누르면 홈으로 복귀
   · 날짜 버튼: 데이터에 있는 날짜만 표시
   · 카드 펼치기(아코디언), 종목별 빈 상태
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
  var elHomeLink = document.getElementById("homeLink");
  var elHomeLead = document.getElementById("homeLead");
  var elBackHome = document.getElementById("backHome");

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

  // 해시 → 종목 id. 해시가 없거나(# 포함) 모르는 값이면 홈(null).
  function readHash() {
    var id = (location.hash || "").replace(/^#/, "").split("?")[0];
    if (!id) return null;
    return SPORTS.some(function (s) { return s.id === id; }) ? id : null;
  }

  /* ── 상태 ──────────────────────────────────────────── */
  var today = todayStr();
  var state = {
    // 기본 날짜: 오늘 브리핑이 있으면 오늘, 없으면 가장 가까운(첫) 브리핑 날짜
    day: DAYS.filter(function (d) { return d.date >= today; })[0] ?
      DAYS.filter(function (d) { return d.date >= today; })[0].date : DAYS[DAYS.length - 1].date,
    // null = 홈(전체 종목). 해시가 있으면 그 종목 화면으로 시작한다.
    sport: null
  };

  // URL 해시(#soccer / #baseball / #basketball / #volleyball)로 바로 진입
  (function initFromHash() {
    var id = readHash();
    if (!id) return; // 해시 없음·모르는 해시 → 홈
    state.sport = id;
    // 해당 종목 카드가 있는 날짜로 맞춰 준다
    var dayWithSport = DAYS.filter(function (d) {
      return gamesIn(d.date, id).length > 0;
    })[0];
    if (dayWithSport) state.day = dayWithSport.date;
  })();

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
        renderDates();
        renderTabs();
        renderList();
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
        ' tabindex="' + (on || home ? "0" : "-1") + '">' +
        '<span class="em" aria-hidden="true">' + esc(s.icon) + "</span>" + esc(s.name) +
        (n > 0 ? '<span class="cnt">' + n + "</span>" : "") +
        "</button>";
    }).join("");

    // 종목 화면에서는 선택된 탭이 패널 이름표가 되고, 홈에서는 패널이 종목 선택 영역이 된다.
    var active = elTabs.querySelector('.tab[aria-selected="true"]');
    if (active) {
      elPanel.setAttribute("role", "tabpanel");
      elPanel.setAttribute("aria-labelledby", active.id);
      elPanel.removeAttribute("aria-label");
    } else {
      elPanel.setAttribute("role", "region");
      elPanel.removeAttribute("aria-labelledby");
      elPanel.setAttribute("aria-label", "종목 선택");
    }

    Array.prototype.forEach.call(elTabs.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () { selectSport(tab.dataset.sport, true); });
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
        selectSport(next.dataset.sport, true);
        elTabs.querySelector('.tab[aria-selected="true"]').focus();
      });
    });
  }

  /* ── 주소(해시) ↔ 화면 ───────────────────────────────── */
  // file:// 에서 history API 가 막히는 브라우저가 있어 실패하면 해시만 바꾼다.
  function setHash(id) {
    var url = location.pathname + location.search + (id ? "#" + id : "");
    try {
      history.pushState(null, "", url);
      return;
    } catch (e) { /* file:// origin null */ }
    try { location.hash = id ? id : ""; } catch (e2) { /* noop */ }
  }

  function selectSport(id, writeHash) {
    if (!SPORTS.some(function (s) { return s.id === id; })) return;
    var same = state.sport === id;
    state.sport = id;
    renderTabs();
    renderList();
    if (writeHash !== false && !same) setHash(id);
  }

  function goHome(writeHash) {
    var same = state.sport === null;
    state.sport = null;
    renderTabs();
    renderList();
    if (writeHash !== false && !same) setHash(null);
  }

  // 뒤로가기·해시 직접 입력 등으로 주소만 바뀌었을 때 화면을 맞춘다.
  function syncFromHash() {
    var id = readHash();
    if (id === state.sport) return;
    if (id) selectSport(id, false);
    else goHome(false);
  }

  /* ── 카드 ──────────────────────────────────────────── */
  function teamHTML(side, team) {
    var badges = (team.badges || []).map(function (b) {
      return '<span class="badge ' + toneClass(b.tone, ["hot", "rank"], "") + '">' + esc(b.text) + "</span>";
    }).join("");
    // 약어가 비었거나, 팀 이름과 같거나, 이름이 약어로 시작하면 중복 표기를 생략
    var abbr = team.abbr || "";
    if (!abbr || abbr === team.name || team.name.indexOf(abbr + " ") === 0) abbr = "";
    var abbrHTML = abbr ? '<span class="abbr">' + esc(abbr) + "</span>" : "";
    return '<div class="team ' + side + '">' +
      '<span class="side">' + (side === "home" ? "홈" : "원정") + "</span>" +
      "<div>" +
      '<div class="tmain">' + abbrHTML +
      '<span class="nm">' + esc(team.name) + "</span></div>" +
      '<div class="tmeta">' +
      (team.record ? '<span class="rec">' + esc(team.record) + "</span>" : "") +
      badges +
      "</div></div></div>";
  }

  function statusHTML(status) {
    var s = String(status || "").toUpperCase();
    if (s === "OUT") return '<span class="st out">OUT</span>';
    if (s === "DOUBTFUL") return '<span class="st doubt">DOUBTFUL</span>';
    if (s === "DAY-TO-DAY" || s === "DTD") return '<span class="st dtd">DAY-TO-DAY</span>';
    return '<span class="st none">' + esc(status || "—") + "</span>";
  }

  function detailsHTML(g) {
    var d = g.details || {};
    var injuries = Array.isArray(d.injuries) ? d.injuries : [];
    var checks = Array.isArray(d.checkpoints) ? d.checkpoints : [];
    if (!injuries.length && !checks.length) return "";

    var body = '<div class="clutch-head">' +
      '<span class="ch-badge">클러치 상황</span>' +
      '<span class="ch-sub">오늘의 경기 정보</span>' +
      '</div>';
    if (injuries.length) {
      body += '<h3 class="p-title">부상 리포트</h3><ul class="inj-list">' +
        injuries.map(function (i) {
          return "<li><span class=\"tt\">" + esc(i.team || "") + "</span>" +
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

    return '<div class="panel"><div class="panel-inner">' + body + "</div></div>" +
      '<button class="toggle" type="button" aria-expanded="false" aria-label="클러치 상황 보기">' +
      '<span class="toggle-label">클러치 상황 보기</span>' +
      '<svg class="chev" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>";
  }

  function cardHTML(g) {
    var p = parts(g.start);
    var when = shortDate(p.y + "-" + p.m + "-" + p.d) + " (" + weekdayOf(p.y + "-" + p.m + "-" + p.d) + ")";
    var tags = (g.tags || []).map(function (t) {
      return '<span class="tag ' + toneClass(t.tone, ["warn", "hot", "info"], "") + '">' + esc(t.text) + "</span>";
    }).join("");
    var rows = (g.rows || []).map(function (r) {
      var kind = toneClass(r.kind, ["flow", "inj", "watch"], "");
      return '<div class="srow ' + kind + '"><dt>' + esc(r.label) + "</dt><dd>" + md(r.text) + "</dd></div>";
    }).join("");

    var sm = sportMeta(g.sport);

    return '<article class="card" data-id="' + esc(g.id || "") + '" data-sport="' + esc(g.sport || "") + '">' +
      '<div class="card-head">' +
        '<span class="league">' + "<i></i>" + esc(g.league || sm.name) + "</span>" +
        '<span class="when">' + when + " <b>" + p.hh + ":" + p.mm + "</b> KST</span>" +
      "</div>" +
      teamHTML("away", g.away) +
      '<div class="at" aria-hidden="true">@</div>' +
      teamHTML("home", g.home) +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      (rows ? '<dl class="summary">' + rows + "</dl>" : "") +
      detailsHTML(g) +
      "</article>";
  }

  /* ── 아코디언 ──────────────────────────────────────── */
  function openCard(card) {
    var panel = card.querySelector(".panel");
    if (!panel) return;
    var btn = card.querySelector(".toggle");
    var label = btn.querySelector(".toggle-label");
    card.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    label.textContent = "클러치 상황 접기";
    btn.setAttribute("aria-label", "클러치 상황 접기");
    window.clearTimeout(panel._timer);
    panel.style.height = panel.scrollHeight + "px";
    panel.style.opacity = "1";
    panel._timer = window.setTimeout(function () {
      if (card.classList.contains("open")) panel.style.height = "auto";
    }, 380);
  }

  function closeCard(card) {
    var panel = card.querySelector(".panel");
    if (!panel || !card.classList.contains("open")) return;
    var btn = card.querySelector(".toggle");
    var label = btn.querySelector(".toggle-label");
    window.clearTimeout(panel._timer);
    panel.style.height = panel.scrollHeight + "px";
    void panel.offsetHeight;
    panel.style.height = "0px";
    panel.style.opacity = "0";
    card.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    label.textContent = "클러치 상황 보기";
    btn.setAttribute("aria-label", "클러치 상황 보기");
  }

  function bindCards() {
    var cards = Array.prototype.slice.call(elList.querySelectorAll(".card"));
    cards.forEach(function (card) {
      function flip() {
        var willOpen = !card.classList.contains("open");
        cards.forEach(function (other) { if (other !== card) closeCard(other); });
        if (willOpen) openCard(card); else closeCard(card);
      }
      var btn = card.querySelector(".toggle");
      if (btn) btn.addEventListener("click", flip);
      card.addEventListener("click", function (e) {
        if (e.target.closest(".toggle") || e.target.closest(".panel")) return;
        flip();
      });
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

  /* ── 렌더 ──────────────────────────────────────────── */
  var HOME_LEAD = "종목을 고르면 그날 경기 카드가 나옵니다.";

  function renderList() {
    if (state.sport === null) renderHome();
    else renderSport();
  }

  // 종목 타일의 한 줄 요약: 그 날짜·그 종목 카드의 리그명을 모아 보여준다.
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

  function bindTiles() {
    Array.prototype.forEach.call(elList.querySelectorAll(".tile"), function (tile) {
      tile.addEventListener("click", function () {
        selectSport(tile.dataset.sport);
        window.scrollTo(0, 0);
      });
    });
  }

  // 홈 — 종목을 고르는 화면. 경기 카드는 여기에 나오지 않는다.
  function renderHome() {
    var all = gamesOf(state.day);

    elBrandDate.textContent = state.day.replace(/-/g, ".") + " " + weekdayOf(state.day);
    elTitle.innerHTML = "<em>" + longDate(state.day) + "</em> 종목 선택";
    elBackHome.hidden = true;

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
    bindTiles();
  }

  // 종목 화면 — 한 종목의 카드만
  function renderSport() {
    var games = gamesIn(state.day, state.sport);
    var meta = sportMeta(state.sport);

    elBrandDate.textContent = state.day.replace(/-/g, ".") + " " + weekdayOf(state.day);
    elTitle.innerHTML = "<em>" + longDate(state.day) + "</em> " + esc(meta.name) +
      " · <span id=\"listCount\">" + games.length + "경기</span>";
    elHomeLead.hidden = true;
    elBackHome.hidden = false;

    if (games.length) {
      elEmpty.hidden = true;
      elList.innerHTML = games.map(function (g) { return cardHTML(g); }).join("");
      bindCards();
    } else {
      elList.innerHTML = "";
      showEmpty(emptyState(state.day, state.sport));
    }
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

  elEmptyCta.addEventListener("click", function () {
    var type = elEmptyCta.dataset.ctaType;
    var id = elEmptyCta.dataset.ctaId;
    if (!id) return;
    if (type === "day") {
      state.day = id;
      renderDates();
      renderTabs();
      renderList();
    } else if (type === "sport") {
      selectSport(id);
    }
  });

  // 로고(또는 '종목 선택' 버튼)를 누르면 홈(종목 선택)으로
  function homeFromLink(e) {
    if (e) e.preventDefault();
    goHome();
    window.scrollTo(0, 0);
  }
  elHomeLink.addEventListener("click", homeFromLink);
  elBackHome.addEventListener("click", homeFromLink);

  window.addEventListener("hashchange", syncFromHash);
  window.addEventListener("popstate", syncFromHash);

  /* ── 데이터 기준 시각 ──────────────────────────────── */
  if (DATA.updatedAt) {
    var u = parts(DATA.updatedAt);
    elDataNote.textContent = "데이터 기준 " + Number(u.m) + "/" + Number(u.d) + " " + u.hh + ":" + u.mm;
  } else {
    elDataNote.textContent = "샘플 브리핑";
  }

  /* ── 시작 ──────────────────────────────────────────── */
  renderDates();
  renderTabs();
  renderList();
})();
