/* =============================================================
   VERSUS — 포인트 롤(LoL) 티어
   -------------------------------------------------------------
   가상 포인트를 롤 랭크처럼 10단계로 나눈다. 가입 기본 1,000P 가
   실버에서 시작하도록 구간을 잡았다.

     0 ~    499P  아이언        IRON
   500 ~    999P  브론즈        BRONZE
   1,000 ~  1,999P  실버        SILVER
   2,000 ~  3,499P  골드        GOLD
   3,500 ~  5,499P  플래티넘     PLATINUM
   5,500 ~  7,999P  에메랄드     EMERALD
   8,000 ~ 11,999P  다이아몬드   DIAMOND
  12,000 ~ 19,999P  마스터       MASTER
  20,000 ~ 29,999P  그랜드마스터 GRANDMASTER
  30,000P 이상      챌린저      CHALLENGER

   쓰는 곳: 랭킹(닉네임 옆), 상단 닉네임 알약, 내 베팅 내역 모달,
   자유게시판 글쓴이. 배지 색은 betting.css 의 .t-<key> 가 맡는다.
   ============================================================= */
(function () {
  'use strict';

  var TIERS = [
    { key: 'iron',        name: '아이언',       en: 'IRON',        min: 0,     max: 499 },
    { key: 'bronze',      name: '브론즈',       en: 'BRONZE',      min: 500,   max: 999 },
    { key: 'silver',      name: '실버',         en: 'SILVER',      min: 1000,  max: 1999 },
    { key: 'gold',        name: '골드',         en: 'GOLD',        min: 2000,  max: 3499 },
    { key: 'platinum',    name: '플래티넘',     en: 'PLATINUM',    min: 3500,  max: 5499 },
    { key: 'emerald',     name: '에메랄드',     en: 'EMERALD',     min: 5500,  max: 7999 },
    { key: 'diamond',     name: '다이아몬드',   en: 'DIAMOND',     min: 8000,  max: 11999 },
    { key: 'master',      name: '마스터',       en: 'MASTER',      min: 12000, max: 19999 },
    { key: 'grandmaster', name: '그랜드마스터', en: 'GRANDMASTER', min: 20000, max: 29999 },
    { key: 'challenger',  name: '챌린저',       en: 'CHALLENGER',  min: 30000, max: null }
  ];

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
  /* 티어 배지 한 조각.
     opt.cls   : 추가 클래스
     opt.en    : true 면 영문 약자(IRON) 대신 한글 이름
     opt.points: 있으면 넘긴 포인트로 티어를 계산(없으면 opt 자체를 값으로 본다) */
  function badgeHTML(points, opt) {
    opt = opt || {};
    var t = opt.tier || tierOf(points);
    var label = opt.en ? t.en : t.name;
    return '<span class="tier-badge t-' + t.key + (opt.cls ? ' ' + opt.cls : '') +
      '" title="' + esc(t.name + ' · ' + rangeText(t) + ' (LoL 티어)') + '">' +
      '<i class="tier-dot" aria-hidden="true"></i>' + esc(label) + '</span>';
  }

  window.clutchTiers = TIERS;
  window.clutchTier = tierOf;
  window.clutchTierNext = nextOf;
  window.clutchTierRange = rangeText;
  window.clutchTierBadge = badgeHTML;
})();
