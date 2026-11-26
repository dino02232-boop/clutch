/* ── 홈 첫 화면 소개 · 시작 버튼 ─────────────────────────────
   처음 온 사람이 3초 안에 "여기가 뭘 하는 곳인지" 알 수 있게, 종목 타일 위에
   짧은 소개(무엇 · 가상 포인트 · 이용 3단계)와 회원가입/로그인 버튼을 둔다.
   카드 제목은 'VERSUS 이용 방법'이고, 카드 바로 아래에 LIVE 경기 줄이 이어진다.
   경기 하나를 크게 띄우던 강조 카드는 LIVE 목록과 중복이라 없앴다(2026-11-26 요청).

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
  /* ── 마크업 ─────────────────────────────────────────── */
  function stepsHTML() {
    return '<ol class="hh-steps">' +
      '<li><b>경기 브리핑 보기</b><span>두 팀 상태와 변수를 한눈에</span></li>' +
      '<li><b>10,000P 받기</b><span>회원가입하면 바로 들어옵니다</span></li>' +
      '<li><b>마음에 드는 쪽 예측</b><span>배당을 눌러 슬립에 담고 확정</span></li>' +
      '</ol>';
  }
  function guestHTML() {
    return '<div class="hh-card">' +
      '<p class="hh-kicker">VERSUS 이용 방법</p>' +
      '<h2 class="hh-title">돈 걸지 말고, 결과 예측만 즐기세요</h2>' +
      '<p class="hh-lead">축구·농구·배구 경기의 팀 상태와 변수를 한눈에 정리해 드립니다. 마음에 드는 쪽을 골라 가상 포인트로 예측해 보세요. 가입하면 10,000P부터입니다.</p>' +
      stepsHTML() +
      '<div class="hh-cta"><button type="button" class="hh-join" id="hhJoin">회원가입</button>' +
        '<button type="button" class="hh-login" id="hhLogin">로그인</button></div>' +
      '<p class="hh-note">포인트는 실제 돈이 아니에요. 충전·환전·현금화는 안 되고, 재미로 순위를 겨루는 놀이터입니다.</p>' +
      '</div>';
  }
  function memberHTML() {
    var p = myPoints == null ? '' : '<span class="hh-mine-pt"> · 내 포인트 <b>' + Math.floor(Number(myPoints)).toLocaleString('ko-KR') + 'P</b></span>';
    return '<div class="hh-card is-mine">' +
      '<p class="hh-mine">VERSUS 이용 방법' + p + '</p>' +
      '<p class="hh-lead">오늘 경기의 팀 상태와 변수를 한눈에 정리해 드립니다. 마음에 드는 쪽을 골라 가상 포인트로 예측해 보세요.</p>' +
      stepsHTML() +
      '<p class="hh-note">포인트는 실제 돈이 아니에요. 충전·환전·현금화는 안 되고, 재미로 순위를 겨루는 놀이터입니다.</p>' +
      '</div>';
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
    var sig = me ? 'm' + (myPoints == null ? '' : myPoints) : 'g';
    if (!force && sig === lastSig) return;
    lastSig = sig;
    root.innerHTML = me ? memberHTML() : guestHTML();
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
  // app.js 가 날짜 줄을 다시 그리면서 누른 버튼을 DOM 에서 떼어 내기 때문에, 버블 단계에서는
  // e.target.closest('#dates button') 이 null 이 되어 카드가 숨지 않았다. 그래서 캡처 단계에서 먼저 알아챈다.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#dates .day-cell, #dates button, #tabs .tab, #backBtn, #homeLink')) setTimeout(function () { paint(true); }, 0);
  }, true);

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
    // 포인트는 베팅 결과로 바뀌므로 주기적으로 다시 확인한다(홈일 때만, 값이 같으면 그리지 않음)
    setInterval(function () { paint(false); }, 30000);
    // 로그인 응답이 오지 않는 환경(오프라인 등)에서도 카드가 영영 숨지 않도록 안전장치.
    setTimeout(function () { if (!authReady) { authReady = true; paint(true); } }, 2500);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(true); });
  }
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
