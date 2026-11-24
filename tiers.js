/* =============================================================
   VERSUS — 포인트 롤(LoL) 티어
   -------------------------------------------------------------
   가상 포인트를 롤 랭크처럼 10단계로 나눈다. 가입 기본 10,000P 가
   실버에서 시작하도록 구간을 잡았다.

         0 ~   4,999P  아이언        IRON
     5,000 ~   9,999P  브론즈        BRONZE
    10,000 ~  19,999P  실버          SILVER   ← 가입 시작점
    20,000 ~  34,999P  골드          GOLD
    35,000 ~  54,999P  플래티넘      PLATINUM
    55,000 ~  79,999P  에메랄드      EMERALD
    80,000 ~ 119,999P  다이아몬드    DIAMOND
   120,000 ~ 199,999P  마스터        MASTER
   200,000 ~ 299,999P  그랜드마스터  GRANDMASTER
   300,000P 이상       챌린저        CHALLENGER

   쓰는 곳: 랭킹(닉네임 옆), 상단 닉네임 알약, 내 베팅 내역 모달,
   자유게시판 글쓴이. 배지 색은 betting.css 의 .t-<key> 가,
   엠블럼 그림은 이 파일 아래쪽 EMB 가 맡는다.
   ============================================================= */
(function () {
  'use strict';

  var TIERS = [
    { key: 'iron',        name: '아이언',       en: 'IRON',        min: 0,      max: 4999 },
    { key: 'bronze',      name: '브론즈',       en: 'BRONZE',      min: 5000,   max: 9999 },
    { key: 'silver',      name: '실버',         en: 'SILVER',      min: 10000,  max: 19999 },
    { key: 'gold',        name: '골드',         en: 'GOLD',        min: 20000,  max: 34999 },
    { key: 'platinum',    name: '플래티넘',     en: 'PLATINUM',    min: 35000,  max: 54999 },
    { key: 'emerald',     name: '에메랄드',     en: 'EMERALD',     min: 55000,  max: 79999 },
    { key: 'diamond',     name: '다이아몬드',   en: 'DIAMOND',     min: 80000,  max: 119999 },
    { key: 'master',      name: '마스터',       en: 'MASTER',      min: 120000, max: 199999 },
    { key: 'grandmaster', name: '그랜드마스터', en: 'GRANDMASTER', min: 200000, max: 299999 },
    { key: 'challenger',  name: '챌린저',       en: 'CHALLENGER',  min: 300000, max: null }
  ];

  /* ── 롤 티어 엠블럼 (인라인 SVG) ──────────────────────────────
     기본은 방패 하나. 티어가 오를수록 보석·왕관·날개를 더해
     실루엣만 봐도 단계가 구분되게 했다. 16~24px 로 줄여도 형태가
     남도록 면적은 크게, 선은 1.8~3px 로 두껍게 그렸다.
     그라데이션 id 는 티어마다 하나(tv-<key>)만 쓴다. 같은 배지가
     화면에 여러 번 나와도 정의 내용이 같아 문제되지 않는다. */
  var SHIELD = 'M14 1.6 22.9 4.8v7.1c0 5.1-3.7 8.7-8.9 10.2C8.8 20.6 5.1 17 5.1 11.9V4.8z';
  var SHINE = 'M14 3.1 20.9 5.4v6.5c0 4.1-2.9 7.1-6.9 8.4z';

  // 날개(깃) — 방패 양옆으로 뻗는 짧은 획 세 줄
  var FEATHERS = 'M5.3 6 2 4.1M5.3 9.5 1.5 8.2M5.3 12.9 2.2 12.5' +
    'M22.7 6 26 4.1M22.7 9.5 26.5 8.2M22.7 12.9 25.8 12.5';

  var EMB = {
    iron: {
      g: ['#93A0AD', '#4B5563'],
      art: '<path d="M9.5 11.7h9" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".92"/>'
    },
    bronze: {
      g: ['#DCA36C', '#8A5327'],
      art: '<path d="M9.9 9.4 14 13.5l4.1-4.1" fill="none" stroke="#fff" stroke-width="2.7"' +
        ' stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>'
    },
    silver: {
      g: ['#DCE4EC', '#8B9AA8'],
      art: '<path d="M10 9.9h8M10 13.7h8" stroke="#fff" stroke-width="2.1" stroke-linecap="round" opacity=".92"/>'
    },
    gold: {
      g: ['#FFDB7D', '#C08A00'],
      art: '<path d="M9.5 13.6V8.7l2.7 2 1.8-3.4 1.8 3.4 2.7-2v4.9z" fill="#fff" opacity=".95"/>'
    },
    platinum: {
      g: ['#9CEAE0', '#0E7C74'],
      art: '<path d="M14 7.7 17.7 11.4 14 15.9 10.3 11.4z" fill="#fff" opacity=".96"/>' +
        '<path d="M14 7.7 15.9 11.4h-3.8z" fill="#0B1220" opacity=".2"/>'
    },
    emerald: {
      g: ['#7FE3A4', '#11763A'],
      art: '<path d="M14 8 17.5 11.5 14 15.7 10.5 11.5z" fill="#fff" opacity=".96"/>' +
        '<path d="M14 8 15.8 11.5h-3.6z" fill="#0B1220" opacity=".2"/>'
    },
    diamond: {
      g: ['#A9C4FF', '#1D4ED8'],
      art: '<path d="M9.7 9.9H18.3L14 16.7z" fill="#fff" opacity=".96"/>' +
        '<path d="M9.7 9.9h8.6l-2.6 2.1h-3.4z" fill="#0B1220" opacity=".16"/>'
    },
    master: {
      g: ['#C9A8FF', '#6D28D9'],
      art: '<path d="M10.2 10V6.9l2.1 1.5 1.7-2.6 1.7 2.6 2.1-1.5V10z" fill="#fff" opacity=".95"/>' +
        '<path d="M14 11.1 16.8 14 14 17.3 11.2 14z" fill="#fff" opacity=".9"/>'
    },
    grandmaster: {
      g: ['#FFA38F', '#B42318'],
      art: '<path d="M14 8.4 17.6 11.7 14 15.9 10.4 11.7z" fill="#fff" opacity=".96"/>' +
        '<path d="M14 8.4 15.9 11.7h-3.8z" fill="#0B1220" opacity=".2"/>',
      feather: true
    },
    challenger: {
      g: ['#8FF0FF', '#0E7490'],
      art: '<path d="M10.1 9.6V6.6l2.1 1.5 1.8-2.6 1.8 2.6 2.1-1.5v3z" fill="#fff" opacity=".95"/>' +
        '<path d="M14 10.8 16.9 13.8 14 17.2 11.1 13.8z" fill="#fff" opacity=".92"/>',
      feather: true,
      glow: true
    }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pts(points) {
    var n = Math.floor(Number(points) || 0);
    return n > 0 ? n : 0;
  }
  // 포인트 → 티어. 모르는 값(없음·문자)은 0P 로 보고 아이언을 돌려준다.
  function tierOf(points) {
    var p = pts(points);
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (p >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[0];
  }
  // 다음 티어와 거기까지 남은 포인트. 최고 티어면 null.
  function nextOf(points) {
    var t = tierOf(points);
    var i = TIERS.indexOf(t);
    if (i < 0 || i >= TIERS.length - 1) return null;
    var next = TIERS[i + 1];
    return { tier: next, need: Math.max(0, next.min - pts(points)) };
  }
  function rangeText(t) {
    return t.max == null
      ? t.min.toLocaleString('ko-KR') + 'P 이상'
      : t.min.toLocaleString('ko-KR') + '~' + t.max.toLocaleString('ko-KR') + 'P';
  }

  // 티어 하나의 엠블럼 SVG. 그림만 있고 이름은 badgeHTML 이 붙인다.
  function markSVG(t) {
    var e = EMB[t.key] || EMB.iron;
    var id = 'tv-' + t.key;
    return '<svg class="tier-mark" viewBox="0 0 28 24" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2=".35" y2="1">' +
        '<stop offset="0" stop-color="' + e.g[0] + '"/><stop offset="1" stop-color="' + e.g[1] + '"/>' +
      '</linearGradient></defs>' +
      (e.feather
        ? '<path d="' + FEATHERS + '" stroke="' + e.g[1] +
          '" stroke-width="2" stroke-linecap="round" opacity=".55"/>'
        : '') +
      '<path d="' + SHIELD + '" fill="url(#' + id + ')" stroke="' + e.g[1] +
        '" stroke-width=".9" stroke-opacity=".9"/>' +
      '<path d="' + SHINE + '" fill="#fff" opacity=".16"/>' +
      e.art +
      (e.glow
        ? '<path d="' + SHIELD + '" fill="none" stroke="#fff" stroke-width=".8" opacity=".45"/>'
        : '') +
      '</svg>';
  }

  /* 티어 배지 한 조각.
     opt.cls        : 추가 클래스
     opt.en         : true 면 영문 약자(IRON) 대신 한글 이름
     opt.points     : 있으면 넘긴 포인트로 티어를 계산(없으면 opt 자체를 값으로 본다)
     opt.tier       : 티어 객체를 직접 넘길 때
     opt.icon=false : 엠블럼 없이 색 점만
     opt.label=false: 글자 없이 엠블럼만(상단 닉네임 알약처럼 좁은 자리) */
  function badgeHTML(points, opt) {
    opt = opt || {};
    var t = opt.tier || tierOf(points);
    var label = opt.en ? t.en : t.name;
    var tip = t.name + ' · ' + rangeText(t) + ' (LoL 티어)';
    var cls = 'tier-badge t-' + t.key +
      (opt.icon === false ? '' : ' has-mark') +
      (opt.label === false ? ' icon-only' : '') +
      (opt.cls ? ' ' + opt.cls : '');
    var inner = (opt.icon === false
      ? '<i class="tier-dot" aria-hidden="true"></i>'
      : markSVG(t)) +
      (opt.label === false ? '' : esc(label));
    return '<span class="' + cls + '" role="img" aria-label="' + esc(tip) +
      '" title="' + esc(tip) + '">' + inner + '</span>';
  }

  window.clutchTiers = TIERS;
  window.clutchTier = tierOf;
  window.clutchTierNext = nextOf;
  window.clutchTierRange = rangeText;
  window.clutchTierBadge = badgeHTML;
  window.clutchTierMark = function (points) { return markSVG(tierOf(points)); };
})();
