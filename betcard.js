/* ── 베팅 카드(공용) ────────────────────────────────────────────────
   '내 베팅 내역' 모달(betting.js)과 자유게시판의 '🎟 공유한 베팅' 상세(pages.js)가
   같은 모양의 카드를 그리도록 한 곳에 모았다. 화면이 없는 순수 함수만 둔다.

   window.clutchBetCard(bet, games, opts)
     bet   : { picks[], stake, combinedOdds, potential, payout, status, createdAt }
     games : { gameId: game } (없으면 window.CLUTCH_DATA 에서 만든다)
     opts  : { label: 머리 제목(생략 가능) }
   window.clutchPickOutcome(pick, game) — 픽 하나의 적중·미적중 판정
   window.clutchGameMap()               — data.js 의 경기 맵
   판정 기준은 tools/settle_bets.py 와 같다. */
(function () {
  'use strict';
  var fmt = function (n) { return Math.floor(Number(n) || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var MARKET_KO = { moneyline: '승무패', spread: '핸디캡', total: '언오버', h2h: '승무패', handicap: '핸디캡', ou: '언오버' };
  var PICK_KO = { away: '원정', home: '홈', draw: '무승부', over: '오버', under: '언더' };
  var STATUS_KO = { open: '베팅중', won: '적중', lost: '미적중', push: '무효', void: '무효' };

  function statusKo(s) { return STATUS_KO[s] || s || '베팅중'; }

  /* ── 픽 한 줄 표기 ────────────────────────────────────
     '승무패 홈'·'핸디캡 원정 -1.5' 처럼 홈/원정만 적으면 무엇에 걸었는지
     한눈에 안 들어온다. 픽에 남은 팀 이름(pick.home·pick.away)을 먼저 쓰고,
     없으면 경기 데이터(games[gameId])의 홈·원정 팀에서, 그것도 없으면
     "홈 vs 원정" 한 줄(matchup)에서 읽는다. 어느 쪽도 없을 때만 홈/원정으로 적는다. */
  function nameOf(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object') return String(v.name || v.shortName || v.displayName || v.abbr || '').trim();
    return String(v).trim();
  }
  function teamName(x, g, side) {
    var direct = nameOf(side === 'home' ? (x && x.home) : (x && x.away));
    if (direct) return direct;
    var fromGame = nameOf(g && g[side]);
    if (fromGame) return fromGame;
    var pair = x && typeof x.matchup === 'string' ? x.matchup.split(/\s*(?:vs\.?|v\.?)\s*/i) : null;
    if (pair && pair.length === 2) {
      var fromPair = nameOf(side === 'home' ? pair[0] : pair[1]);
      if (fromPair) return fromPair;
    }
    return PICK_KO[side] || '';
  }
  function lineText(v) {
    if (v == null) return '';
    return String(v).trim();
  }
  /* 예: '승무패 · 갈라타사라이 승', '핸디캡 · 코모 -1.5', '언오버 · 오버 2.5' */
  function pickLabel(x, g) {
    x = x || {};
    var market = String(x.market || ''), side = String(x.pick || ''), line = lineText(x.line);
    var head = MARKET_KO[market] || market || '';
    var body;
    if (market === 'moneyline' || market === 'h2h' || market === '1x2') {
      if (side === 'draw') body = '무승부';
      else if (side === 'home' || side === 'away') body = teamName(x, g, side) + ' 승';
      else body = PICK_KO[side] || side;
    } else if ((market === 'spread' || market === 'handicap') && (side === 'home' || side === 'away')) {
      body = teamName(x, g, side) + (line ? ' ' + line : '');
    } else {
      body = (PICK_KO[side] || side) + (line ? ' ' + line : '');
    }
    return head ? head + ' · ' + body : body;
  }
  function two(n) { return ('0' + n).slice(-2); }
  function payout(stake, mult) { var m = Math.round(mult * 100) / 100; return Math.floor(stake * m + 1e-9); }

  function gameMap() {
    var m = {};
    ((window.CLUTCH_DATA || {}).days || []).forEach(function (d) {
      (d.games || []).forEach(function (g) { m[g.id] = Object.assign({ date: d.date }, g); });
    });
    return m;
  }

  /* createdAt 은 Firestore Timestamp·Date·ms 숫자·ISO 문자열 어느 쪽으로도 올 수 있다. */
  function toDate(ts) {
    var d = null;
    if (ts && typeof ts.toDate === 'function') d = ts.toDate();
    else if (ts instanceof Date) d = ts;
    else if (typeof ts === 'number' && isFinite(ts)) d = new Date(ts);
    else if (typeof ts === 'string' && ts) d = new Date(ts);
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function whenText(ts) {
    var d = toDate(ts);
    if (!d) return '';
    return (d.getMonth() + 1) + '.' + d.getDate() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
  }

  function pickNum(v) {
    if (v == null) return NaN;
    var n = parseFloat(String(v).replace(/^\s*\+/, '').trim());
    return isFinite(n) ? n : NaN;
  }
  var PICK_EPS = 1e-9;
  function pickOutcome(x, g) {
    // → { kind: won | lost | push | live | pre | unknown, score: '4:0' }
    // 표기는 경기 줄과 같게 홈:원정 순서로 적는다(판정은 아래에서 away·home 값으로 한다).
    var r = (g && g.result) || null;
    var score = r && r.awayScore != null && r.homeScore != null
      ? String(r.homeScore) + ':' + String(r.awayScore) : '';
    var st = String((x && x.status) || '');
    if (st === 'won' || st === 'lost' || st === 'push' || st === 'void') {
      return { kind: st === 'void' ? 'push' : st, score: score };
    }
    if (!g) return { kind: 'unknown', score: '' };
    var state = r ? String(r.state || '') : '';
    if (state === 'live') return { kind: 'live', score: score };
    if (state !== 'final') return { kind: 'pre', score: '' };
    var away = Number(r.awayScore), home = Number(r.homeScore);
    if (!isFinite(away) || !isFinite(home)) return { kind: 'pre', score: '' };
    var market = String(x.market || ''), side = String(x.pick || ''), line = pickNum(x.line);
    var kind = '';
    if (market === 'moneyline' || market === 'h2h' || market === '1x2') {
      if (side === 'draw') {
        kind = away === home ? 'won' : 'lost';
      } else if (away === home) {
        // 경기 뒤 data.js 배당이 내려가도, 무승부가 있는 종목(축구)이면 홈·원정은 미적중이다.
        var drawOdds = (g.odds && g.odds.moneyline) ? g.odds.moneyline.draw : null;
        kind = (drawOdds != null || String(g.sport || '') === 'soccer') ? 'lost' : 'push';
      } else {
        kind = ((side === 'away') === (away > home)) ? 'won' : 'lost';
      }
    } else if (market === 'spread' || market === 'handicap') {
      if (!isFinite(line) || (side !== 'home' && side !== 'away')) return { kind: 'unknown', score: score };
      var margin = side === 'home' ? (home + line - away) : (away + line - home);
      kind = Math.abs(margin) < PICK_EPS ? 'push' : (margin > 0 ? 'won' : 'lost');
    } else if (market === 'total' || market === 'ou') {
      if (!isFinite(line) || (side !== 'over' && side !== 'under')) return { kind: 'unknown', score: score };
      var total = away + home;
      kind = Math.abs(total - line) < PICK_EPS ? 'push' : (((side === 'over') === (total > line)) ? 'won' : 'lost');
    }
    return { kind: kind || 'unknown', score: score };
  }
  var OUT_BADGE = { won: ['won', '✅ 적중'], lost: ['lost', '❌ 미적중'], push: ['push', '적특'], live: ['live', 'LIVE'], pre: ['pre', '경기 전'] };
  function pickBadgeHTML(o) {
    var b = OUT_BADGE[o && o.kind];
    if (!b) return '';
    var tail = o.score && (o.kind === 'won' || o.kind === 'lost' || o.kind === 'push' || o.kind === 'live')
      ? ' · ' + o.score : '';
    return '<span class="bp-badge ' + b[0] + '">' + esc(b[1] + tail) + '</span>';
  }

  function betCard(b, games, opts) {
    b = b || {};
    opts = opts || {};
    var picks = Array.isArray(b.picks) ? b.picks : [];
    var st = String(b.status || 'open');
    if (st === 'void') st = 'push';
    var when = whenText(b.createdAt);
    var stake = Number(b.stake) || 0;
    var odds = Number(b.combinedOdds != null ? b.combinedOdds : b.odds) || 0;
    if (!odds && picks.length) {
      odds = picks.reduce(function (a, x) { return a * (Number(x.decimal) || 1); }, 1);
    }
    var expect = b.potential != null ? Number(b.potential) : payout(stake, odds);
    var gm = games || gameMap();
    var outs = picks.map(function (x) { return pickOutcome(x, gm[x.gameId]); });
    var anyLost = outs.some(function (o) { return o.kind === 'lost'; });
    var allDone = outs.length > 0 && outs.every(function (o) { return o.kind === 'won' || o.kind === 'lost' || o.kind === 'push'; });
    // 슬립 상태는 그대로 두고, 확정된 결과만 배지로 덧붙인다.
    var flag = '';
    if (st === 'open' && anyLost) flag = '<span class="bh-flag lost">미적중 확정</span>';
    else if (st === 'open' && allDone) flag = '<span class="bh-flag won">적중 확정</span>';
    var picksHTML = picks.map(function (x, i) {
      var dec = Number(x.decimal) || 0;
      return '<li class="bh-pick">' +
        '<span class="bp-top"><b class="bp-match">' + esc(x.home) + ' vs ' + esc(x.away) + '</b>' +
          pickBadgeHTML(outs[i]) + '</span>' +
        '<span class="bp-meta">' + esc(pickLabel(x, gm[x.gameId])) +
        (dec > 0 ? ' · ' + dec.toFixed(2) + '배' : '') + '</span></li>';
    }).join('');
    var footRight = st !== 'open'
      ? '획득 ' + fmt(b.payout != null ? b.payout : 0) + 'P'
      : (anyLost ? '미적중 확정 · 정산 대기' : (allDone ? '적중 확정 · 정산 대기' : '결과 기다리는 중'));
    var label = opts.label ? '<div class="bh-label">' + esc(opts.label) + '</div>' : '';
    return '<article class="bet-hist ' + esc(st) + (st === 'open' && anyLost ? ' settled-lost' : '') + '">' + label +
      '<div class="bh-top"><span class="bh-st ' + esc(st) + '">' + esc(statusKo(st)) + '</span>' + flag +
      '<b class="bh-stake">' + fmt(stake) + 'P</b>' +
      '<span class="bh-odds">' + odds.toFixed(2) + '배</span>' +
      (when ? '<span class="bh-when">' + esc(when) + '</span>' : '') + '</div>' +
      '<ul class="bh-picks">' + picksHTML + '</ul>' +
      '<div class="bh-foot"><span>예상 ' + fmt(expect) + 'P</span>' +
      '<span>' + esc(footRight) + '</span></div>' +
      '</article>';
  }

  window.clutchBetCard = betCard;
  window.clutchPickLabel = pickLabel;
  window.clutchPickOutcome = pickOutcome;
  window.clutchGameMap = gameMap;
  window.clutchBetWhen = whenText;
})();
