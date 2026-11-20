/* =============================================================
   CLUTCH — 팀 페이지 (team.html)

   주소: team.html?team=<팀 이름, URL 인코딩>   예) team.html?team=%EB%B0%94%EC%9D%B4%EC%97%90%EB%A5%B8%20%EB%AE%8C%ED%97%A8
        team.html?team=LA%20%EB%A0%88%EC%9D%B4%EC%B9%B4%EC%8A%A4&sport=basketball
        ?team 에 팀 약칭(예: MUN, LAL)도 넣을 수 있습니다.

   원칙
   · data.js (window.CLUTCH_DATA) 의 경기 카드에 이미 있는 값만 모아 그립니다.
   · 어떤 항목의 데이터가 없으면 그 블록을 아예 그리지 않습니다. 값을 지어내지 않습니다.
   · 한 팀이 여러 종목에 있으면 sport 파라미터로 고르고, 없으면 경기가 많은 종목을 씁니다.
   ============================================================= */
(function () {
  "use strict";

  var DATA = window.CLUTCH_DATA || { days: [], sports: [] };
  var root = document.getElementById("team");
  var elSrc = document.getElementById("tpDataDate");

  /* ── 텍스트 헬퍼 (index 의 app.js 와 같은 규칙) ─────────── */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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

  // 사진이 없거나 404 면 <img> 만 지워져 이니셜 원이 남는다(크기 고정).
  function faceHTML(name, photo) {
    var src = typeof photo === "string" && /^https:\/\//i.test(photo) ? photo : "";
    return '<span class="pl-face" aria-hidden="true">' +
      '<span class="pl-ini">' + esc(initialsOf(name)) + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' +
        ' onerror="this.remove()">' : "") +
      "</span>";
  }

  // 미국식 배당 → 소수 배당 (index 의 decText 와 같은 환산)
  function decText(v) {
    if (v == null || !isFinite(Number(v)) || Number(v) === 0) return "";
    var n = Number(v);
    var d = n > 0 ? (n / 100 + 1) : (100 / Math.abs(n) + 1);
    return d.toFixed(2);
  }

  function norm(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase();
  }

  var WEEK = ["일", "월", "화", "수", "목", "금", "토"];

  // data.js 의 start 는 이미 KST(+09:00) 이므로 문자열에서 그대로 읽는다.
  function whenText(iso) {
    var s = String(iso || "");
    if (s.length < 16) return "";
    var y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
    var wd = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return m + "." + (d < 10 ? "0" + d : d) + " (" + wd + ") " + s.slice(11, 16);
  }

  function shortDate(iso) {
    var s = String(iso || "");
    return s.length >= 10 ? s.slice(5, 10).replace("-", ".") : "";
  }

  function sportOf(id) {
    var list = DATA.sports || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return { id: id, name: "", icon: "•" };
  }

  /* ── 전체 경기 펼치기 ─────────────────────────────────── */
  var GAMES = [];
  (DATA.days || []).forEach(function (day) {
    (day.games || []).forEach(function (g) { GAMES.push({ day: day.date, g: g }); });
  });
  GAMES.sort(function (a, b) {
    return String(a.g.start || "").localeCompare(String(b.g.start || ""));
  });

  function sidesOf(g, name) {
    var n = norm(name);
    if (!n) return null;
    var isHome = g.home && norm(g.home.name) === n;
    var isAway = g.away && norm(g.away.name) === n;
    if (!isHome && !isAway) {
      isHome = !!(g.home && norm(g.home.abbr) === n);
      isAway = !!(g.away && norm(g.away.abbr) === n);
    }
    if (isHome) return { side: "home", me: g.home, opp: g.away };
    if (isAway) return { side: "away", me: g.away, opp: g.home };
    return null;
  }

  /* ── 요청 해석 ────────────────────────────────────────── */
  var params = new URLSearchParams(location.search);
  var wantTeam = (params.get("team") || "").trim();
  var wantSport = (params.get("sport") || "").trim();

  if (!wantTeam) {
    renderEmpty("🏷️", "팀을 고르지 않았습니다",
      "경기 카드에서 팀 이름을 누르면 그 팀의 페이지로 옵니다. 주소 끝에 ?team=팀이름 을 붙여도 됩니다.");
    return;
  }

  var hits = [];
  GAMES.forEach(function (it) {
    var s = sidesOf(it.g, wantTeam);
    if (s) hits.push({ day: it.day, g: it.g, side: s.side, me: s.me, opp: s.opp });
  });

  if (!hits.length) {
    renderEmpty("🔍", "‘" + wantTeam + "’ 팀을 찾지 못했습니다",
      "클러치 데이터에 이 이름의 경기가 없습니다. 이름 표기를 확인하거나 경기 카드의 팀 이름을 눌러 주세요.");
    return;
  }

  // 이 이름이 나오는 종목들 (지금 데이터에는 한 팀이 두 종목에 겹치지 않는다)
  var sports = [];
  hits.forEach(function (h) { if (sports.indexOf(h.g.sport) < 0) sports.push(h.g.sport); });

  var sport = "";
  if (wantSport && sports.indexOf(wantSport) >= 0) {
    sport = wantSport;
  } else if (sports.length === 1) {
    sport = sports[0];
  } else {
    var best = sports[0], bestN = -1;
    sports.forEach(function (sp) {
      var n = hits.filter(function (h) { return h.g.sport === sp; }).length;
      if (n > bestN) { bestN = n; best = sp; }
    });
    sport = best;
  }
  var otherSports = sports.filter(function (sp) { return sp !== sport; });
  hits = hits.filter(function (h) { return h.g.sport === sport; });

  /* ── 팀 스냅숏 (카드 안 팀 블록) ───────────────────────── */
  function snapOf(h) {
    var teams = (h.g.details && h.g.details.teams) || [];
    var n = norm(h.me.name || "");
    var i;
    for (i = 0; i < teams.length; i++) if (norm(teams[i].name) === n) return teams[i];
    for (i = 0; i < teams.length; i++) if (teams[i].side === h.side) return teams[i];
    return null;
  }

  function keyPlayersOf(h) {
    var kp = (h.g.details && h.g.details.keyPlayers) || [];
    var n = norm(h.me.name || "");
    var i;
    for (i = 0; i < kp.length; i++) if (norm(kp[i].team) === n) return kp[i].players || [];
    for (i = 0; i < kp.length; i++) if (kp[i].side === h.side) return kp[i].players || [];
    return [];
  }

  function rich(h) {
    var t = snapOf(h), s = 0;
    if (!t) return -1;
    if (Array.isArray(t.players) && t.players.length) s += 8;
    if (keyPlayersOf(h).length) s += 8;
    if (Array.isArray(t.injuries) && t.injuries.length) s += 3;
    if (Array.isArray(t.last5Detail) && t.last5Detail.length) s += 2;
    if (Array.isArray(t.cells) && t.cells.length) s += 1;
    if (Array.isArray(t.nums) && t.nums.length) s += 1;
    if (t.venueRecord) s += 1;
    return s;
  }

  // 한 팀이 두 대회(예: 분데스리가 · UCL)에 나오면 전적·지표는 그 팀이 가장 많이 나오는
  // 대회 기준으로 모은다. 그래야 카드에서 본 리그 전적과 팀 페이지의 리그 순위가 어긋나지 않는다.
  function leagueOf(h) { return h.g.league || ""; }
  var lgCount = {}, lgFirst = {};
  hits.forEach(function (h) {
    var k = leagueOf(h);
    lgCount[k] = (lgCount[k] || 0) + 1;
    if (!lgFirst[k] || String(h.g.start || "") < lgFirst[k]) lgFirst[k] = String(h.g.start || "");
  });
  var mainLeague = "";
  Object.keys(lgCount).forEach(function (k) {
    if (!mainLeague) { mainLeague = k; return; }
    if (lgCount[k] > lgCount[mainLeague]) { mainLeague = k; return; }
    if (lgCount[k] === lgCount[mainLeague] && lgFirst[k] < lgFirst[mainLeague]) mainLeague = k;
  });
  var sameLeague = hits.filter(function (h) { return leagueOf(h) === mainLeague; });
  var otherLeagues = [];
  var leagueName = {};
  hits.forEach(function (h) {
    var k = leagueOf(h);
    if (k && h.g.leagueFull) leagueName[k] = h.g.leagueFull;
    if (k !== mainLeague && otherLeagues.indexOf(k) < 0) otherLeagues.push(k);
  });
  var pool = sameLeague.length ? sameLeague : hits;

  var ref = pool[0];
  pool.forEach(function (h) {
    var a = rich(h), b = rich(ref);
    if (a > b || (a === b && String(h.g.start || "") > String(ref.g.start || ""))) ref = h;
  });

  var prof = snapOf(ref) || {};

  // 이 경기 카드에 없는 값은 같은 대회의 다른 경기 카드에서 한 번 더 찾아본다.
  function pick(key) {
    if (prof[key] != null && prof[key] !== "") return prof[key];
    for (var i = 0; i < pool.length; i++) {
      var t = snapOf(pool[i]);
      if (t && t[key] != null && t[key] !== "") return t[key];
    }
    return null;
  }

  function anyKeyPlayers() {
    for (var i = 0; i < pool.length; i++) {
      var list = keyPlayersOf(pool[i]);
      if (list.length) return list;
    }
    return [];
  }

  var teamName = ref.me.name || wantTeam;
  var abbr = prof.abbr || ref.me.abbr || "";
  var league = ref.g.leagueFull || ref.g.league || "";
  var sp = sportOf(sport);
  var badges = (ref.me.badges && ref.me.badges.length) ? ref.me.badges : (prof.badges || []);
  var record = pick("record") || ref.me.record || "";
  // streak 칸에는 "2연승" 같은 짧은 흐름과 "최근 5경기 1승 2무 2패" 같은 문장이 섞여 있다.
  // 뒤엿은 아래 최근 5경기 줄과 겹치지 않게 짧은 흐름만 칩으로 쓴다.
  var streak = (function (s) {
    var t = String(s || "").trim();
    if (!t || t.indexOf("최근") >= 0 || t.length > 6) return "";
    return t;
  })(prof.streak);
  var venueRecord = prof.venueRecord || "";
  var last5 = pick("last5") || "";
  var l5detail = Array.isArray(pick("last5Detail")) ? pick("last5Detail") : [];
  var cells = Array.isArray(pick("cells")) ? pick("cells") : [];
  var nums = Array.isArray(pick("nums")) ? pick("nums") : [];
  var injuries = Array.isArray(pick("injuries")) ? pick("injuries") : [];
  var injurySummary = pick("injurySummary") || "";
  var note = (ref.g.details && ref.g.details.note) || "";

  document.title = teamName + " — CLUTCH 팀 페이지";
  if (elSrc) {
    var up = String(DATA.updatedAt || "");
    elSrc.textContent = up.length >= 16 ? up.slice(5, 10).replace("-", ".") + " " + up.slice(11, 16) : "—";
  }

  /* ── 그리기 조각 ─────────────────────────────────────── */
  function resClass(res) {
    var r = String(res || "").trim();
    if (r === "승" || r === "W" || r === "win") return "win";
    if (r === "패" || r === "L" || r === "loss") return "loss";
    return "draw";
  }

  function chipClass(tone) {
    if (tone === "rank") return "tp-chip rank";
    return "tp-chip plain";
  }

  var html = [];

  /* 머리: 이름 · 종목/리그 · 배지 */
  html.push('<h1 class="tp-name">' + esc(teamName) + "</h1>");
  var sub = ['<span class="tp-chip sport">' + esc(sp.icon + " " + (sp.name || sport)) + "</span>"];
  if (league) sub.push('<span class="tp-chip plain">' + esc(league) + "</span>");
  if (abbr) sub.push('<span class="tp-chip plain">' + esc(abbr) + "</span>");
  badges.forEach(function (b) {
    if (b && b.text) sub.push('<span class="' + chipClass(b.tone) + '">' + esc(b.text) + "</span>");
  });
  html.push('<p class="tp-sub">' + sub.join("") + "</p>");

  /* (b) 최근 전적 요약 — 홈/원정 구분 없이 */
  if (record || last5 || streak || venueRecord) {
    var formRes = l5detail.slice(0, 5).map(function (r) { return String(r.res || "").trim(); })
      .filter(function (r) { return r === "승" || r === "무" || r === "패"; });
    var formHTML = formRes.map(function (r) {
      return '<span class="fs ' + resClass(r) + '">' + esc(r) + "</span>";
    }).join("");

    var body = "";
    if (record) {
      body += '<div class="tp-rec"><b>' + esc(record) + "</b>" +
        (streak ? '<span class="streak ' + resClass(streak.indexOf("패") >= 0 ? "패" : (streak.indexOf("승") >= 0 ? "승" : "무")) + '">' + esc(streak) + "</span>" : "") +
        "</div>";
    } else if (streak) {
      body += '<div class="tp-rec"><span class="streak ' + resClass(streak.indexOf("패") >= 0 ? "패" : "승") + '">' + esc(streak) + "</span></div>";
    }
    if (formHTML || last5) {
      body += '<div class="tp-formrow"><span class="tp-lb">최근 5경기</span>' +
        (formHTML ? '<span class="tp-form">' + formHTML + "</span>" : "") +
        (last5 ? '<span class="tp-l5">' + esc(last5) + "</span>" : "") +
        (formHTML ? '<span class="tp-hint">왼쪽이 최신</span>' : "") +
        "</div>";
    }
    var kv = [];
    if (venueRecord) kv.push('<div class="wide"><dt>홈/원정 전적</dt><dd>' + esc(venueRecord) + "</dd></div>");
    if (kv.length) body += '<dl class="tp-kv" style="margin-top:9px;padding-top:9px;border-top:1px dashed rgba(17,24,39,.07)">' + kv.join("") + "</dl>";

    // 다른 대회 경기가 섮여 있으면 전적이 어느 대회 값인지 밝힌다
    if (otherLeagues.length) {
      body += '<p class="tp-hint" style="margin:9px 0 0;line-height:1.5">전적·지표는 ' + esc(league || "이 대회") +
        " 기준입니다. " + esc(otherLeagues.map(function (k) { return leagueName[k] || k; }).join(" · ")) +
        " 경기는 일정에서 대회명으로 구분됩니다.</p>";
    }

    html.push('<section class="tp-sec"><h2 class="tp-h">최근 전적</h2>' +
      '<div class="tp-card">' + body + "</div></section>");
  }

  /* 시즌 지표 (cells · nums) */
  var rows = [];
  var usedLabels = { "최근 흐름": 1 };
  cells.forEach(function (c) {
    if (!c || !c.label || usedLabels[c.label]) return;
    if (/전적$/.test(String(c.label))) return;  // 시즌 전적·리그 페이즈 전적은 위 전적 카드에 이미 있다
    usedLabels[c.label] = 1;
    rows.push(c);
  });
  var tiles = [];
  nums.forEach(function (n) {
    if (!n || !n.label || usedLabels[n.label]) return;
    usedLabels[n.label] = 1;
    tiles.push(n);
  });

  if (rows.length || tiles.length) {
    var s2 = "";
    if (rows.length) {
      s2 += '<dl class="tp-kv">' + rows.map(function (c) {
        return "<div><dt>" + esc(c.label) + "</dt><dd>" + esc(String(c.value)) + "</dd></div>";
      }).join("") + "</dl>";
    }
    if (tiles.length) {
      s2 += '<div class="tb-nums">' + tiles.map(function (n) {
        return '<div class="num"><b>' + esc(String(n.value)) + "</b><small>" + esc(n.label) + "</small></div>";
      }).join("") + "</div>";
    }
    html.push('<section class="tp-sec"><h2 class="tp-h">시즌 지표</h2>' +
      '<div class="tp-card">' + s2 + "</div></section>");
  }

  /* (c') 최근 5경기 상세 */
  if (l5detail.length) {
    var li = l5detail.map(function (r) {
      return "<li>" +
        '<span class="l5-date">' + esc(shortDate(r.date)) + "</span>" +
        '<span class="l5-ha">' + esc(r.ha || "") + "</span>" +
        '<span class="l5-opp" title="' + esc(r.opp || "") + '">' + esc(r.opp || "") + "</span>" +
        '<span class="l5-sc">' + esc(r.score || "") + "</span>" +
        '<span class="l5-res ' + (r.res === "승" ? "w" : (r.res === "패" ? "l" : "d")) + '">' + esc(r.res || "") + "</span>" +
        "</li>";
    }).join("");
    html.push('<section class="tp-sec"><h2 class="tp-h">최근 ' + l5detail.length + "경기</h2>" +
      '<div class="tp-card"><ul class="l5-list">' + li + "</ul></div></section>");
  }

  /* (c) 경기 일정 — 이 팀이 나오는 경기 전부(끝난 경기 → 예정) */
  function stateOf(h) {
    var r = h.g.result;
    if (r && r.state === "live") return "live";
    if (r && r.state === "final") return "final";
    if (h.g.status === "final") return "final";
    if (!h.g.start) return "none";
    return Date.now() < new Date(h.g.start).getTime() ? "next" : "none";
  }

  function oddsHTML(h) {
    var o = h.g.odds;
    if (!o || !o.moneyline) return "";
    var ml = o.moneyline;
    var own = h.side === "home" ? ml.home : ml.away;
    var opp = h.side === "home" ? ml.away : ml.home;
    var parts = [];
    if (decText(own)) parts.push('<span class="tp-od own"><i>승</i>' + decText(own) + "</span>");
    if (decText(ml.draw)) parts.push('<span class="tp-od"><i>무</i>' + decText(ml.draw) + "</span>");
    if (decText(opp)) parts.push('<span class="tp-od"><i>패</i>' + decText(opp) + "</span>");
    if (!parts.length) return "";
    return '<div class="tp-odds"><span class="tp-odlab">배당</span>' + parts.join("") +
      (o.provider ? '<span class="tp-odprov">' + esc(o.provider) + "</span>" : "") + "</div>";
  }

  var gHTML = hits.map(function (h) {
    var st = stateOf(h);
    var stText = st === "final" ? "종료" : (st === "live" ? "진행" : (st === "next" ? "예정" : "기록 없음"));
    var score = "";
    var r = h.g.result;
    if (r && r.state !== "scheduled" && r.awayScore != null && r.homeScore != null) {
      var mine = h.side === "home" ? r.homeScore : r.awayScore;
      var theirs = h.side === "home" ? r.awayScore : r.homeScore;
      var cls = Number(mine) > Number(theirs) ? "win" : (Number(mine) < Number(theirs) ? "loss" : "draw");
      score = '<span class="tp-score ' + cls + '">' + esc(String(mine)) + " - " + esc(String(theirs)) + "</span>";
    }

    return "<li>" +
      '<div class="tp-gtop">' +
        '<span class="tp-state ' + st + '">' + esc(stText) + "</span>" +
        '<span class="tp-when">' + esc(whenText(h.g.start)) + "</span>" +
        '<span class="tp-league">' + esc(h.g.leagueFull || h.g.league || "") + "</span>" +
      "</div>" +
      '<div class="tp-gmid">' +
        '<span class="tp-ha ' + h.side + '">' + (h.side === "home" ? "홈" : "원정") + "</span>" +
        '<span class="tp-opp" title="' + esc(h.opp ? h.opp.name : "") + '">' + esc(h.opp ? h.opp.name : "") + "</span>" +
        score +
      "</div>" +
      (st === "next" ? oddsHTML(h) : "") +
      "</li>";
  }).join("");

  if (gHTML) {
    var rng = "";
    if (DATA.days && DATA.days.length) {
      rng = shortDate(DATA.days[0].date) + "~" + shortDate(DATA.days[DATA.days.length - 1].date);
    }
    html.push('<section class="tp-sec"><h2 class="tp-h">경기 일정 <span class="n">' + hits.length + "경기</span></h2>" +
      '<div class="tp-card">' +
      (rng ? '<p class="tp-hint" style="margin:0 0 6px">데이터에 담긴 ' + esc(rng) + " 경기 · 홈/원정은 " + esc(teamName) + " 기준</p>" : "") +
      '<ul class="tp-games">' + gHTML + "</ul></div></section>");
  }

  /* (d) 주요 선수 */
  var players = [];
  var pl = pick("players");
  if (Array.isArray(pl) && pl.length) {
    players = pl.map(function (p) {
      return {
        name: p.name || "", photo: p.photo || "", pos: p.pos || "",
        stats: [p.stat || ""], sub: p.sub || "", last: p.last || "", recent: p.recent || ""
      };
    });
  } else {
    var kp = anyKeyPlayers();
    players = kp.map(function (p) {
      return { name: p.name || "", photo: p.photo || "", pos: "", stats: (p.stats || []), sub: "", last: "", recent: "" };
    });
  }
  players = players.filter(function (p) { return p.name; });

  if (players.length) {
    var ph = players.map(function (p) {
      var stat = p.stats.filter(Boolean).join(" · ");
      return '<li>' + faceHTML(p.name, p.photo) +
        '<span class="pl-body">' +
          '<span class="pl-top"><b title="' + esc(p.name) + '">' + esc(p.name) + "</b>" +
          (p.pos ? '<span class="pl-pos">' + esc(p.pos) + "</span>" : "") + "</span>" +
          (stat ? '<span class="tp-statline">' + esc(stat) + "</span>" : "") +
          (p.sub ? '<span class="pl-sub">' + esc(p.sub) + "</span>" : "") +
          (p.recent ? '<span class="pl-recent">' + esc(p.recent) + "</span>" : "") +
          (p.last ? '<span class="pl-last">' + esc(p.last) + "</span>" : "") +
        "</span></li>";
    }).join("");
    html.push('<section class="tp-sec"><h2 class="tp-h">주요 선수 <span class="n">' + players.length + "</span></h2>" +
      '<div class="tp-card"><ul class="tp-players">' + ph + "</ul></div></section>");
  }

  /* (e) 부상·결장 — 명단이 있을 때만 */
  if (injuries.length) {
    function statusChip(status) {
      var s = String(status || "").toUpperCase();
      var cls = s === "OUT" ? "out" : (s === "DOUBTFUL" ? "doubt" : (s.indexOf("DAY") === 0 ? "dtd" : "none"));
      return '<span class="st ' + cls + '">' + esc(status || "—") + "</span>";
    }
    var ih = injuries.map(function (i) {
      return "<li>" +
        '<span class="pl">' + esc(i.player || "") +
        (i.pos ? '<small class="pos">' + esc(i.pos) + "</small>" : "") +
        (i.line ? "<small>" + esc(i.line) + "</small>" : "") +
        "</span>" + statusChip(i.status) + "</li>";
    }).join("");
    html.push('<section class="tp-sec"><h2 class="tp-h">부상 · 결장 <span class="n">' + injuries.length + "</span></h2>" +
      '<div class="tp-card">' +
      (injurySummary ? '<b class="inj-sum">' + esc(injurySummary) + "</b>" : "") +
      '<ul class="inj-list solo">' + ih + "</ul></div></section>");
  }

  /* 다른 종목에 같은 이름의 팀이 있을 때 */
  if (otherSports.length) {
    html.push('<p class="tp-note">같은 이름이 다른 종목에도 있습니다. ' + otherSports.map(function (o) {
      return '<a class="tp-back" href="team.html?team=' + encodeURIComponent(wantTeam) + "&sport=" + encodeURIComponent(o) + '">' +
        esc(sportOf(o).name || o) + "</a>";
    }).join(" ") + "</p>");
  }

  /* 데이터 기준 메모(카드에 적힌 문장 그대로) */
  if (note) html.push('<p class="tp-note">' + esc(note) + "</p>");

  var back = '<a class="tp-back" href="index.html">← 오늘의 클러치</a>';
  root.innerHTML = back + html.join("");

  /* ── 데이터가 없을 때 ─────────────────────────────────── */
  function renderEmpty(ico, title, desc) {
    root.innerHTML = '<a class="tp-back" href="index.html">← 오늘의 클러치</a>' +
      '<div class="tp-empty"><span class="ico" aria-hidden="true">' + ico + "</span>" +
      "<h2>" + esc(title) + "</h2><p>" + esc(desc) + "</p>" +
      '<a href="index.html">오늘의 클러치로</a></div>';
  }
})();
