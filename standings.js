/* =============================================================
   CLUTCH — 리그 순위표 (standings.html)
   -------------------------------------------------------------
   데이터: standings-data.js 의 window.CLUTCH_STANDINGS
     · 팀 순위   = ESPN 이 정한 리그 순위표 (경기·승·무·패·득실·승점)
     · 개인 순위 = ESPN 리더보드 상위 20명
   값이 null 이면 '—' 로 표시하고, 없는 값을 만들어 넣지 않습니다.
   팀 이름·선수 이름은 데이터에 들어 있는 표기(한국어 우선, 없으면 영문)를 그대로 씁니다.
   ============================================================= */
(function () {
  "use strict";

  var DATA = window.CLUTCH_STANDINGS || null;
  var tabsEl = document.getElementById("stLeagues");
  var modeEl = document.getElementById("stMode");
  var panelEl = document.getElementById("stPanel");
  var titleEl = document.getElementById("stTitle");
  var seasonEl = document.getElementById("stSeason");
  var updatedEl = document.getElementById("stUpdated");
  var chipEl = document.getElementById("stChip");

  if (!DATA || !Array.isArray(DATA.leagues) || !DATA.leagues.length) {
    if (panelEl) {
      panelEl.innerHTML = '<div class="empty"><span class="ico" aria-hidden="true">📊</span>' +
        '<h2>순위표 데이터가 없습니다</h2>' +
        '<p>standings-data.js 를 찾지 못했습니다. <code>python3 tools/fetch_standings.py</code> 로 다시 만들어 주세요.</p></div>';
    }
    return;
  }

  var state = { key: DATA.leagues[0].key, mode: "team" };

  /* ── 헬퍼 ───────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function leagueOf(key) {
    for (var i = 0; i < DATA.leagues.length; i++) {
      if (DATA.leagues[i].key === key) return DATA.leagues[i];
    }
    return DATA.leagues[0];
  }

  function dash(v) {
    return (v === null || v === undefined || v === "") ? "—" : String(v);
  }

  function num(v) {
    return (v === null || v === undefined) ? "—" : String(v);
  }

  function signed(v) {
    if (v === null || v === undefined) return "—";
    return (v > 0 ? "+" : "") + String(v);
  }

  // ESPN note color('#81D6AC', 가끔 '##B5E7CE') → 옅은 배경 rgba
  function tint(hex, alpha) {
    var h = String(hex || "").replace(/^#+/, "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function initialsOf(name) {
    var s = String(name || "").trim();
    if (!s) return "?";
    if (/[\uac00-\ud7a3]/.test(s)) return s.slice(0, 1);
    var parts = s.replace(/[^A-Za-z0-9 .'-]/g, "").split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  }

  /* 팀 로고 — 약어를 깔아 두고 로고를 얹는다. 404 면 img 만 지워져 약어가 남는다. */
  function logoHTML(row) {
    var src = typeof row.logo === "string" && /^https:\/\//i.test(row.logo) ? row.logo : "";
    return '<span class="tlogo" aria-hidden="true"><span>' + esc(row.abbr || "?") + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' +
        ' onerror="this.remove()">' : "") + "</span>";
  }

  /* 선수 얼굴 — 이니셜 원 위에 사진. 축구는 사진이 없는 선수가 많아 이니셜이 정상 동작이다. */
  function faceHTML(name, photo) {
    var src = typeof photo === "string" && /^https:\/\//i.test(photo) ? photo : "";
    return '<span class="pl-face" aria-hidden="true"><span class="pl-ini">' + esc(initialsOf(name)) + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' +
        ' onerror="this.remove()">' : "") + "</span>";
  }

  function blockHead(title, meta) {
    return '<div class="st-block-head"><h2>' + esc(title) + "</h2>" +
      (meta ? '<span class="st-meta">' + esc(meta) + "</span>" : "") + "</div>";
  }

  /* ── 팀 순위 표 ─────────────────────────────────────── */
  function teamTable(group, lg) {
    var rows = group.rows || [];
    var soccer = lg.sport === "soccer";
    var volley = lg.sport === "volleyball";
    var h = ['<table class="st-table st-tbl-team' + (soccer ? "" : " is-nba") + '" aria-label="' +
      esc((group.name ? group.name + " " : "") + lg.name + " 팀 순위") + '">'];
    h.push("<colgroup><col class=\"c-rk\"><col><col class=\"c-gp\">" +
      (soccer
        ? '<col class="c-w"><col class="c-d"><col class="c-l"><col class="c-gd"><col class="c-pt">'
        : volley
          ? '<col class="c-w"><col class="c-l"><col class="c-pt"><col class="c-set">'
          : '<col class="c-w"><col class="c-l"><col class="c-gd"><col class="c-pct">') +
      "</colgroup>");
    h.push("<thead><tr>" +
      '<th class="rk" scope="col">순위</th>' +
      '<th class="l" scope="col">팀</th>' +
      '<th scope="col">경기</th><th scope="col">승</th>' +
      (soccer ? '<th scope="col">무</th><th scope="col">패</th><th scope="col">득실</th><th scope="col">승점</th>'
              : volley ? '<th scope="col">패</th><th scope="col">승점</th><th scope="col">세트</th>'
              : '<th scope="col">패</th><th scope="col">득실</th><th scope="col">승률</th>') +
      "</tr></thead><tbody>");

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var z = r.zone || null;
      var bg = z && z.color ? tint(z.color, 0.07) : null;
      var style = z && z.color ? ' style="--zc:' + esc(z.color) + (bg ? ";" + "background:" + bg : "") + '"' : "";
      h.push("<tr" + (z && z.color ? ' class="zone"' : "") + style + ">" +
        '<td class="rk' + (typeof r.rank === "number" && r.rank <= 3 ? " top" : "") + '">' + num(r.rank) + "</td>" +
        '<td class="l"><div class="st-team">' + logoHTML(r) + "<b>" + esc(r.team || "") + "</b></div></td>" +
        '<td class="num">' + num(r.played) + "</td>" +
        '<td class="num">' + num(r.win) + "</td>" +
        (soccer
          ? '<td class="num">' + num(r.draw) + "</td>" +
            '<td class="num">' + num(r.loss) + "</td>" +
            '<td class="num">' + signed(r.diff) + "</td>" +
            '<td class="num pt">' + num(r.points) + "</td>"
          : volley
            ? '<td class="num">' + num(r.loss) + "</td>" +
              '<td class="num pt">' + num(r.points) + "</td>" +
              '<td class="num">' + dash(r.sets) + "</td>"
            : '<td class="num">' + num(r.loss) + "</td>" +
              '<td class="num">' + signed(r.diff) + "</td>" +
              '<td class="num">' + dash(r.pct) + "</td>") +
        "</tr>");
    }
    h.push("</tbody></table>");
    return h.join("");
  }

  function legendHTML(lg) {
    var seen = {}, list = [];
    (lg.groups || []).forEach(function (g) {
      (g.rows || []).forEach(function (r) {
        var z = r.zone;
        if (z && z.label && z.color && !seen[z.label]) {
          seen[z.label] = 1;
          list.push(z);
        }
      });
    });
    if (!list.length) return "";
    return '<div class="st-legend">' + list.map(function (z) {
      return '<span class="lg"><i style="background:' + esc(z.color) + '"></i>' + esc(z.label) + "</span>";
    }).join("") + "</div>";
  }

  /* ── 개인 순위 표 ───────────────────────────────────── */
  function isPercentBoard(board) {
    return board && board.aggregate === "비율";
  }

  function leaderTable(board, lg) {
    var rows = board.rows || [];
    var h = ['<table class="st-table st-lb" aria-label="' +
      esc(lg.name + " " + board.label + " 개인 순위") + '">'];
    h.push('<colgroup><col class="c-rk"><col><col class="c-rec"></colgroup>');
    h.push('<thead><tr><th class="rk" scope="col">순위</th>' +
      '<th class="l" scope="col">선수 · 소속팀</th>' +
      '<th scope="col">' + esc(board.label) + "</th></tr></thead><tbody>");
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var sub = [r.team || "", (r.played !== null && r.played !== undefined) ? r.played + "경기" : ""]
        .filter(Boolean).join(" · ");
      h.push("<tr>" +
        '<td class="rk' + (typeof r.rank === "number" && r.rank <= 3 ? " top" : "") + '">' + num(r.rank) + "</td>" +
        '<td class="l"><div class="pl-row">' + faceHTML(r.name, r.photo) +
          '<span class="pl-nm"><b>' + esc(r.name || "") + "</b>" +
          (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></div></td>" +
        '<td class="rec">' + dash(r.display || (isPercentBoard(board) ? null : r.value)) + "</td>" +
        "</tr>");
    }
    h.push("</tbody></table>");
    return h.join("");
  }

  /* ── 화면 ───────────────────────────────────────────── */
  function renderTabs(lg) {
    tabsEl.innerHTML = DATA.leagues.map(function (l) {
      return '<button type="button" role="tab" class="tab" data-key="' + esc(l.key) + '"' +
        ' aria-selected="' + (l.key === lg.key ? "true" : "false") + '">' + esc(l.name) + "</button>";
    }).join("");
  }

  function renderModes(lg) {
    var hasLeaders = (lg.leaders || []).length > 0;
    var btns = modeEl.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      var isPlayer = btns[i].getAttribute("data-mode") === "player";
      btns[i].setAttribute("aria-selected", btns[i].getAttribute("data-mode") === state.mode ? "true" : "false");
      // 개인 순위 자료가 없는 리그(V리그)는 단추를 잠근다
      btns[i].disabled = isPlayer && !hasLeaders;
      if (isPlayer && !hasLeaders) btns[i].title = "이 리그는 개인 순위 자료가 없습니다";
      else btns[i].removeAttribute("title");
    }
  }

  function scrollSelectedIntoView() {
    var sel = tabsEl.querySelector('[aria-selected="true"]');
    if (!sel) return;
    var left = sel.offsetLeft - tabsEl.offsetLeft - 8;
    tabsEl.scrollLeft = left > 0 ? left : 0;
  }

  function render() {
    var lg = leagueOf(state.key);
    state.key = lg.key;
    if (state.mode === "player" && !(lg.leaders || []).length) state.mode = "team";

    titleEl.innerHTML = "<em>" + esc(lg.name) + "</em> " + (state.mode === "team" ? "팀 순위" : "개인 순위");
    seasonEl.textContent = lg.season || "—";
    updatedEl.textContent = "데이터 기준 " + fmtUpdated(DATA.updated);
    chipEl.textContent = (lg.source || DATA.source || "ESPN") + " 실제 값";

    renderTabs(lg);
    renderModes(lg);
    scrollSelectedIntoView();

    var html = "";
    if (state.mode === "team") {
      var multi = (lg.groups || []).length > 1;
      (lg.groups || []).forEach(function (g) {
        var n = (g.rows || []).length;
        html += '<section class="st-block">' +
          blockHead(multi ? g.name + " 팀 순위" : "팀 순위",
            n + "팀" + (lg.season ? " · " + lg.season : "")) +
          teamTable(g, lg) + "</section>";
      });
      html += legendHTML(lg);
    } else {
      var boards = lg.leaders || [];
      if (!boards.length) {
        html = '<div class="empty"><h2>개인 순위가 없습니다</h2><p>이 리그의 개인 순위 데이터가 비어 있습니다.</p></div>';
      }
      boards.forEach(function (b) {
        var ag = b.aggregate === "경기당" ? "경기당" : "시즌 누적";
        html += '<section class="st-block">' +
          blockHead(b.label, "1~" + (b.rows || []).length + "위 · " + (lg.season ? lg.season + " " : "") + ag) +
          leaderTable(b, lg) + "</section>";
      });
    }
    panelEl.innerHTML = html;
  }

  function fmtUpdated(iso) {
    if (!iso) return "—";
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return iso;
    return m[1] + "." + m[2] + "." + m[3] + " " + m[4] + ":" + m[5] + " KST";
  }

  /* ── 이벤트·주소 해시 ───────────────────────────────── */
  function writeHash() {
    var h = "#" + state.key + (state.mode === "player" ? "/player" : "");
    if (location.hash !== h) {
      try { history.replaceState(null, "", h); } catch (e) { location.hash = h; }
    }
  }

  function readHash() {
    var raw = String(location.hash || "").replace(/^#/, "");
    if (!raw) return;
    var parts = raw.split("/");
    var key = parts[0];
    for (var i = 0; i < DATA.leagues.length; i++) {
      if (DATA.leagues[i].key.toLowerCase() === key.toLowerCase()) { state.key = DATA.leagues[i].key; break; }
    }
    if (parts[1] === "player") state.mode = "player";
  }

  tabsEl.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".tab") : null;
    if (!btn) return;
    var key = btn.getAttribute("data-key");
    if (!key) return;
    state.key = key;
    writeHash();
    render();
  });

  modeEl.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("button[data-mode]") : null;
    if (!btn) return;
    state.mode = btn.getAttribute("data-mode") === "player" ? "player" : "team";
    writeHash();
    render();
  });

  window.addEventListener("hashchange", function () {
    readHash();
    render();
  });

  readHash();
  render();
})();
