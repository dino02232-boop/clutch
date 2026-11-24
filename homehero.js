/* ── 홈 첫 화면 소개 · 시작 버튼 · 첫 경기 강조 ────────────────────
   처음 온 사람이 3초 안에 "여기가 뭘 하는 곳인지" 알 수 있게, 종목 타일 위에
   짧은 소개(무엇 · 가상 포인트 · 이용 3단계)와 회원가입/로그인 버튼을 둔다.
   바로 아래에는 지금 진행 중이거나 가장 가까운 경기 하나를 크게 걸어 둔다.

   · 로그인한 회원에게도 같은 내용을 두고, 3단계는 접지 않고 늘 펼쳐 둔다(2026-11-24 요청).
   · 소개 문구는 '경기 정보 → 예측' 순서로 읽히게 쓴다. 사이트의 절반은 경기 브리핑이라는 점이
     첫 문장에서 드러나야 한다(베팅 안내만 먼저 나오지 않게).
   · 포인트는 실제 돈이 아니라는 안내를 이 소개문 안에 담는다(별도 팝업 없음).
   · 홈(종목을 고르기 전 화면)에서만 보이고, 종목·경기 화면으로 들어가면 숨는다. */
(function () {
  'use strict';
  var auth = window.clutchAuth, db = window.clutchDb;
  var me = null, myPoints = null;
  // 로그인 상태가 확정되기 전에는 아무것도 그리지 않는다. 먼저 비회원용 카드가
  // 잠깐 떴다가 회원 카드로 바뀌는 깜빡임을 막기 위함(2026-11-24 요청).
  var authReady = false;
  var root = null, lastSig = '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 소개 카드는 '처음 들어온 홈 화면'에서만 띄운다(2026-11-24 요청).
  // 날짜·종목을 고르면 app.js 가 pushState 로 주소만 바꿔 hashchange 이벤트가 오지 않으므로,
  // 주소뿐 아니라 종목 탭 줄이 숨겨진 진짜 홈 상태인지까지 함께 본다.
  function isHome() {
    var h = location.hash || '';
    if (h && h !== '#') return false;
    var tabs = document.getElementById('tabs');
    if (tabs && !tabs.hidden) return false; // 날짜·종목을 골라 목록을 보는 중
    return true;
  }
  function plain(s) {
    return String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  }
  function cut(s, n) {
    s = plain(s);
    if (s.length <= n) return s;
    var t = s.slice(0, n);
    var dot = Math.max(t.lastIndexOf('. '), t.lastIndexOf('다. '));
    if (dot > n * 0.5) return t.slice(0, dot + 1);
    return s.slice(0, t.lastIndexOf(' ')) + '…';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ── 데이터 ─────────────────────────────────────────── */
  function allGames() {
    var out = [];
    var days = (window.CLUTCH_DATA || {}).days || [];
    for (var i = 0; i < days.length; i++) {
      var gs = days[i].games || [];
      for (var j = 0; j < gs.length; j++) if (gs[j] && gs[j].id) out.push(gs[j]);
    }
    return out;
  }
  function spotGame() {
    var games = allGames(), now = Date.now();
    var live = [], upcoming = [], past = [];
    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      var st = (g.result && g.result.state) || '';
      var t = Date.parse(g.start);
      if (st === 'live') live.push({ g: g, t: t });
      else if (isFinite(t) && t > now) upcoming.push({ g: g, t: t });
      else past.push({ g: g, t: isFinite(t) ? t : 0 });
    }
    live.sort(function (a, b) { return a.t - b.t; });
    upcoming.sort(function (a, b) { return a.t - b.t; });
    past.sort(function (a, b) { return b.t - a.t; });
    if (live.length) return { g: live[0].g, kind: 'live' };
    if (upcoming.length) return { g: upcoming[0].g, kind: 'next' };
    if (past.length) return { g: past[0].g, kind: 'past' };
    return null;
  }
  function reasonFor(g, kind) {
    if (kind === 'live') {
      var r = g.result || {};
      var a = r.awayScore != null ? r.awayScore : '-', h = r.homeScore != null ? r.homeScore : '-';
      var tail = r.detail ? ' · ' + String(r.detail).replace(/\s*·?\s*세트\s*스코어\s*$/, '') : '';
      return '지금 ' + (g.away ? g.away.name : '') + ' ' + a + ' : ' + h + ' ' + (g.home ? g.home.name : '') + tail;
    }
    if (g.preview) return cut(g.preview, 96);
    var rows = g.rows || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && (rows[i].kind === 'watch' || rows[i].kind === 'flow') && rows[i].text) return cut(rows[i].text, 96);
    }
    if (kind === 'past') return '오늘 이미 끝난 경기입니다. 결과와 브리핑을 확인해 보세요.';
    var ml = g.odds && g.odds.moneyline;
    if (ml && ml.home != null && ml.away != null) {
      return '해외 배당 ' + Number(ml.home).toFixed(2) + ' · ' + Number(ml.away).toFixed(2) + '로 팽팽한 한 판입니다.';
    }
    return '가장 가까이 시작하는 경기입니다.';
  }
  function whenText(g, kind) {
    var t = Date.parse(g.start);
    if (!isFinite(t)) return '';
    var d = new Date(t);
    var today = new Date(), same = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (kind === 'live') return hm + ' 시작';
    if (same) return hm + ' 시작';
    return (d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + hm;
  }

  /* ── 마크업 ─────────────────────────────────────────── */
  function stepsHTML() {
    return '<ol class="hh-steps">' +
      '<li><b>경기 브리핑 보기</b><span>두 팀 상태와 변수를 30초로</span></li>' +
      '<li><b>10,000P 받기</b><span>회원가입하면 바로 들어옵니다</span></li>' +
      '<li><b>마음에 드는 쪽 예측</b><span>배당을 눌러 슬립에 담고 확정</span></li>' +
      '</ol>';
  }
  function guestHTML() {
    return '<div class="hh-card">' +
      '<p class="hh-kicker">경기 브리핑 · 가상 포인트 예측</p>' +
      '<h2 class="hh-title">돈 걸지 말고, 결과 예측만 즐기세요</h2>' +
      '<p class="hh-lead">축구·농구·배구 경기의 팀 상태와 변수를 30초로 정리해 드립니다. 마음에 드는 쪽을 골라 가상 포인트로 예측해 보세요. 가입하면 10,000P부터입니다.</p>' +
      stepsHTML() +
      '<div class="hh-cta"><button type="button" class="hh-join" id="hhJoin">회원가입</button>' +
        '<button type="button" class="hh-login" id="hhLogin">로그인</button></div>' +
      '<p class="hh-note">포인트는 실제 돈이 아니에요. 충전·환전·현금화는 안 되고, 재미로 순위를 겨루는 놀이터입니다.</p>' +
      '</div>';
  }
  function memberHTML() {
    var p = myPoints == null ? '' : ' · 내 포인트 <b>' + Math.floor(Number(myPoints)).toLocaleString('ko-KR') + 'P</b>';
    return '<div class="hh-card is-mine">' +
      '<p class="hh-mine">오늘도 놀다 가세요' + p + '</p>' +
      '<p class="hh-lead">오늘 경기의 팀 상태와 변수를 30초로 정리해 드립니다. 마음에 드는 쪽을 골라 가상 포인트로 예측해 보세요.</p>' +
      '<div class="hh-more">' +
      '<p class="hh-more-label">이용 방법 보기</p>' + stepsHTML() +
      '<p class="hh-note">포인트는 실제 돈이 아니에요. 충전·환전·현금화는 안 되고, 재미로 순위를 겨루는 놀이터입니다.</p>' +
      '</div>' +
      '</div>';
  }
  function featHTML(spot) {
    if (!spot) return '';
    var g = spot.g;
    var home = (g.home && g.home.name) || '';
    var away = (g.away && g.away.name) || '';
    var league = g.league || '';
    var href = '#' + g.sport + '/' + encodeURIComponent(g.id);
    return '<a class="hh-feat" href="' + esc(href) + '" aria-label="' + esc(away + ' 대 ' + home + ' 경기 브리핑 열기') + '">' +
      '<span class="hh-feat-top">' +
        (spot.kind === 'live' ? '<span class="hh-live">LIVE</span>' : '') +
        '<span class="hh-when">' + esc(whenText(g, spot.kind)) + '</span>' +
        (league ? '<span class="hh-lg">' + esc(league) + '</span>' : '') +
      '</span>' +
      '<span class="hh-teams"><b>' + esc(away) + '</b><i>vs</i><b>' + esc(home) + '</b></span>' +
      '<p class="hh-why">' + esc(reasonFor(g, spot.kind)) + '</p>' +
      '<span class="hh-go">브리핑 보기 <span aria-hidden="true">›</span></span>' +
      '</a>';
  }

  /* ── 그리기 ─────────────────────────────────────────── */
  function paint(force) {
    if (!root) return;
    var home = isHome();
    if (!authReady) { root.hidden = true; return; }
    root.hidden = !home;
    // 홈에서는 소개 카드가 같은 말을 더 자세히 하므로 위의 한 줄(homeLead)은 감춘다.
    var lead = document.getElementById('homeLead');
    if (lead && home) lead.style.display = 'none';
    if (!home) return;
    var spot = spotGame();
    var sig = (me ? 'm' + (myPoints == null ? '' : myPoints) : 'g') + '|' + (spot ? spot.g.id + spot.kind + ((spot.g.result || {}).awayScore || '') + ((spot.g.result || {}).homeScore || '') : '-');
    if (!force && sig === lastSig) return;
    lastSig = sig;
    root.innerHTML = (me ? memberHTML() : guestHTML()) + featHTML(spot);
  }

  function mount() {
    if (root) return;
    var lead = document.getElementById('homeLead');
    if (!lead || !lead.parentNode) return;
    root = document.createElement('div');
    root.id = 'homeHero';
    root.className = 'home-hero';
    root.hidden = true;
    lead.parentNode.insertBefore(root, lead.nextSibling);
    paint(true);
  }

  function loadPoints() {
    myPoints = null;
    if (!me || !db) return;
    var uid = me.uid;
    db.collection('users').doc(uid).get().then(function (d) {
      if (!me || me.uid !== uid) return;
      var v = (d.exists && d.data()) || {};
      myPoints = v.points == null ? null : Number(v.points);
      paint(true);
    }, function () {});
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#hhJoin')) { if (window.clutchLogin) window.clutchLogin('join'); }
    else if (t.closest('#hhLogin')) { if (window.clutchLogin) window.clutchLogin('login'); }
  });

  window.addEventListener('hashchange', function () { paint(false); });
  window.addEventListener('popstate', function () { paint(false); });
  // 날짜·종목·뒤로가기 버튼은 주소를 pushState 로 바꿔 hashchange 가 오지 않는다 → 직접 다시 그린다.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#dates button, #tabs .tab, #backBtn, #homeLink')) setTimeout(function () { paint(true); }, 0);
  });

  function init() {
    mount();
    if (auth) {
      auth.onAuthStateChanged(function (u) {
        var was = me && me.uid;
        me = u || null;
        authReady = true;
        if ((me && me.uid) !== was) loadPoints();
        paint(true);
      });
    } else {
      authReady = true;
    }
    // 라이브 점수는 app.js 가 data 를 갱신하므로 주기적으로 다시 그린다(홈일 때만)
    setInterval(function () { paint(false); }, 30000);
    // 로그인 응답이 오지 않는 환경(오프라인 등)에서도 카드가 영영 숨지 않도록 안전장치.
    setTimeout(function () { if (!authReady) { authReady = true; paint(true); } }, 2500);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(true); });
  }
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
