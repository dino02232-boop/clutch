(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth, user = null, shared = [], picked = {};
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Math.floor(Number(n) || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var say = function (s) { if ($('boardNotice')) $('boardNotice').textContent = s; if ($('detailNotice')) $('detailNotice').textContent = s; };
  var MARKET_KO = { moneyline: '승무패', spread: '핸디캡', total: '언오버' };
  var STATUS_KO = { open: '베팅중', won: '적중', lost: '미적중', push: '무효' };
  var tierBadge = function (points) {
    if (points == null || !isFinite(Number(points))) return '';
    return window.clutchTierBadge ? window.clutchTierBadge(points) : '';
  };
  // 게시판 목록·상세처럼 좁은 자리에 쓰는 작은 티어 마크(엠블럼만)
  var tierMark = function (points) {
    if (points == null || !isFinite(Number(points))) return '';
    return window.clutchTierBadge ? window.clutchTierBadge(points, { label: false }) : '';
  };
  // 픽 한 줄 표기는 betcard.js 한 곳에서 만든다(팀 이름이 보이게). 없을 때만 예전 표기.
  var pickText = function (x, g) {
    if (window.clutchPickLabel) return window.clutchPickLabel(x, g);
    return (MARKET_KO[x.market] || x.market || '') + ' ' +
      ({ away: '원정', home: '홈', draw: '무승부', over: '오버', under: '언더' }[x.pick] || x.pick || '') +
      (x.line ? ' ' + x.line : '');
  };

  /* ── 랭킹 ──────────────────────────────────────────────── */
  // 아이디(닉네임)를 누르면 그 사람에게 1:1 쪽지 창이 열린다.
  // 내 아이디는 눌러도 아무 일이 없도록 평범한 글자로 그린다.
  function isMine(uid) { return !!(uid && user && uid === user.uid); }
  function rankNameHTML(uid, name) {
    if (!uid || isMine(uid)) return '<b class="rk-name">' + esc(name) + '</b>';
    return '<button type="button" class="rk-name name-msg" data-msg-to="' + esc(uid) + '"' +
      ' data-msg-name="' + esc(name) + '" title="' + esc(name) + '에게 쪽지 보내기"' +
      ' aria-label="' + esc(name) + '에게 쪽지 보내기">' + esc(name) + '</button>';
  }
  function rankRowHTML(uid, x, i, metric) {
    var name = x.nickname || x.displayName || '회원';
    var pts = metric === 'week' ? Number(x.weekProfit || 0) : Number(x.points || 0);
    var sub = '적중 ' + Number(x.winRate || 0).toFixed(1) + '% · 최고 ' + Number(x.maxOdds || 0).toFixed(2) + '배';
    return '<div class="rk-row' + (i < 3 ? ' top' + (i + 1) : '') + '">' +
      '<span class="rk-no">' + (i + 1) + '</span>' +
      '<span class="rk-who"><span class="rk-nmline">' + rankNameHTML(uid, name) +
      tierBadge(x.points) + '</span>' +
      '<span class="rk-sub">' + esc(sub) + '</span></span>' +
      '<span class="rk-pt">' + fmt(pts) + '<small>P</small></span></div>';
  }
  function rankRows(target, snap, metric) {
    var node = $(target);
    if (!node) return;
    if (!snap.docs.length) { node.innerHTML = '<p class="rk-empty">아직 랭킹 데이터가 없습니다.</p>'; return; }
    node.innerHTML = snap.docs.map(function (doc, i) {
      return rankRowHTML(doc.id, doc.data() || {}, i, metric);
    }).join('');
  }
  // 로그인 상태가 정해지면 '내 아이디'를 다시 판단해 한 번 더 그린다.
  var rankSnap = { all: null, week: null };
  function paintRanks() {
    if (rankSnap.all) rankRows('rankAll', rankSnap.all, 'all');
    if (rankSnap.week) rankRows('rankWeek', rankSnap.week, 'week');
  }
  function loadRanks() {
    db.collection('users').orderBy('points', 'desc').limit(50).onSnapshot(function (s) { rankSnap.all = s; rankRows('rankAll', s, 'all'); });
    db.collection('users').orderBy('weekProfit', 'desc').limit(50).onSnapshot(function (s) { rankSnap.week = s; rankRows('rankWeek', s, 'week'); });
  }

  /* ── 자유게시판 ────────────────────────────────────────── */
  var postMap = {}, countCache = {}, profCache = {}, profBusy = {}, detailUnsub = null, curDetailId = '', listScroll = 0;

  function toDate(ts) {
    var d = ts && ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : (typeof ts === 'number' ? new Date(ts) : null));
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // 목록용: 오늘 쓴 글은 12:59, 다른 날은 11.24
  function fmtTime(ts) {
    var d = toDate(ts), now = new Date();
    if (!d) return '';
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    return (d.getMonth() + 1) + '.' + pad(d.getDate());
  }
  // 상세용: 2026.11.24 12:59
  function fmtFull(ts) {
    var d = toDate(ts);
    if (!d) return '';
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  // 목록용 상대 시간: 방금 전 · 12분 전 · 3시간 전 · 11.24 (해가 바뀌면 25.11.24)
  function fmtRel(ts) {
    var d = toDate(ts), now = new Date();
    if (!d) return '';
    var sec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (sec < 60) return '방금 전';
    if (sec < 3600) return Math.floor(sec / 60) + '분 전';
    if (sec < 86400) return Math.floor(sec / 3600) + '시간 전';
    var md = (d.getMonth() + 1) + '.' + pad(d.getDate());
    return d.getFullYear() === now.getFullYear() ? md : String(d.getFullYear()).slice(2) + '.' + md;
  }

  /* ── 글에 붙은 베팅('🎟 공유한 베팅') ─────────────────────
     슬립 한 줄 = 픽 하나. 같은 betId 를 가진 줄은 한 베팅(다폴)으로 묶는다.
     예전 글은 픽 한 줄에 합산 배당만 남아 있어, 그 한 줄을 한 베팅으로 본다.
     박스를 누르면 '내 베팅 내역'과 같은 결의 상세 카드가 모달로 열린다. */
  var slipCache = {}, gamesPromise = null, slipModalGroup = null;

  function slipGroups(slip) {
    var out = [], by = {};
    (slip || []).forEach(function (x, i) {
      if (!x || typeof x !== 'object') return;
      var key = x.betId ? 'b:' + x.betId : 'l:' + i;
      var g = by[key];
      if (!g) {
        g = by[key] = {
          key: key, legs: [], legacy: !x.betId,
          stake: 0, odds: 0, potential: null, payout: null,
          status: String(x.status || 'open'), createdAt: x.createdAt != null ? x.createdAt : null
        };
        out.push(g);
      }
      g.legs.push(x);
    });
    out.forEach(function (g) {
      g.legs.forEach(function (x) {
        if (!g.stake && Number(x.stake)) g.stake = Number(x.stake);
        if (!g.odds && Number(x.odds)) g.odds = Number(x.odds);
        if (g.potential == null && x.potential != null) g.potential = Number(x.potential);
        if (g.payout == null && x.payout != null) g.payout = Number(x.payout);
      });
      if (!g.odds) g.odds = g.legs.reduce(function (a, x) { return a * (Number(x.decimal) || 1); }, 1);
    });
    return out;
  }
  function slipCaption(g) {
    var first = g.legs[0] || {}, more = g.legs.length - 1;
    var main = esc(first.home) + ' vs ' + esc(first.away) + (more > 0 ? ' 외 ' + more : '');
    var sub = esc(pickText(first)) + (more > 0 ? ' · ' + g.legs.length + '픽' : '') +
      ' · ' + (Number(g.odds) || 0).toFixed(2) + '배' + (g.stake ? ' · ' + fmt(g.stake) + 'P' : '');
    return { main: main, sub: sub };
  }
  // 목록 메타 줄에 붙는 한 줄 베팅 요약 — '8.82배 · 3,000P' (베팅이 여러 개면 '외 N')
  function slipSummary(slip) {
    var gs = slipGroups(slip);
    if (!gs.length) return '';
    var g = gs[0], parts = [];
    var odds = Number(g.odds) || 0;
    if (odds > 0) parts.push(odds.toFixed(2) + '배');
    if (Number(g.stake) > 0) parts.push(fmt(g.stake) + 'P');
    var out = parts.join(' · ');
    if (gs.length > 1) out += (out ? ' ' : '') + '외 ' + (gs.length - 1);
    return out;
  }
  function slipCardHTML(slip, title, scope) {
    var groups = slipGroups(slip);
    if (!groups.length) return '';
    scope = scope || 'detail';
    slipCache[scope] = groups;
    return '<div class="post-slip"><b>' + esc(title) + '</b>' + groups.map(function (g, i) {
      var c = slipCaption(g);
      return '<button type="button" class="ps-card" data-slip-scope="' + esc(scope) + '" data-slip-group="' + i + '"' +
        ' data-slip-title="' + esc(title) + '"' +
        ' aria-label="베팅 상세 보기: ' + esc(c.main) + '">' +
        '<span class="ps-txt"><span class="ps-main">' + c.main + '</span>' +
        '<span class="ps-sub">' + c.sub + '</span></span>' +
        '<span class="ps-arw" aria-hidden="true">›</span></button>';
    }).join('') + '</div>';
  }

  /* 경기 결과(data.js)는 무거워서 게시판에서는 베팅 카드를 처음 열 때 한 번만 받는다. */
  function ensureGameData() {
    if (window.CLUTCH_DATA) return Promise.resolve(true);
    if (gamesPromise) return gamesPromise;
    gamesPromise = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'data.js';
      s.async = true;
      s.onload = function () { resolve(!!window.CLUTCH_DATA); };
      s.onerror = function () { gamesPromise = null; resolve(false); };
      document.head.appendChild(s);
    });
    return gamesPromise;
  }
  function slipBetHTML(g) {
    var bet = {
      picks: g.legs.map(function (x) {
        return {
          gameId: x.gameId || '', home: x.home || '', away: x.away || '',
          market: x.market || '', pick: x.pick || '', line: x.line || '',
          decimal: g.legacy ? 0 : (Number(x.decimal) || 0)
        };
      }),
      stake: g.stake, combinedOdds: g.odds, potential: g.potential,
      payout: g.payout, status: g.status, createdAt: g.createdAt
    };
    if (window.clutchBetCard) return window.clutchBetCard(bet, window.clutchGameMap ? window.clutchGameMap() : null);
    // betcard.js 가 없을 때를 위한 최소 표시(예전 한 줄 요약과 같은 내용)
    return '<article class="bet-hist"><ul class="bh-picks">' + g.legs.map(function (x) {
      return '<li class="bh-pick"><span class="bp-match">' + esc(x.home) + ' vs ' + esc(x.away) + '</span>' +
        '<span class="bp-meta">' + esc(pickText(x)) + ' · ' + Number(x.decimal || 0).toFixed(2) + '배</span></li>';
    }).join('') + '</ul></article>';
  }
  function paintSlipModal(g) {
    var node = $('slipList');
    if (!node || !g) return;
    node.innerHTML = slipBetHTML(g) +
      (g.legacy
        ? '<p class="slip-note">이 글에는 베팅 한 줄 요약만 저장돼 있어요. 실제 베팅의 모든 픽과 결과는 홈 위쪽 <b>내 베팅 내역</b>에서 볼 수 있습니다.</p>'
        : '');
  }
  function closeSlipModal() {
    var w = $('slipModal');
    if (w) w.remove();
    slipModalGroup = null;
  }
  function openSlipModal(g, title) {
    if (!g) return;
    closeSlipModal();
    var head = esc(title || '🎟 공유한 베팅');
    var wrap = document.createElement('div');
    wrap.id = 'slipModal';
    wrap.className = 'bets-modal slip-modal';
    wrap.innerHTML = '<div class="bets-box slip-box" role="dialog" aria-modal="true" aria-label="' + head + '">' +
      '<div class="bets-head"><b>' + head + '</b>' +
      '<button type="button" id="slipClose" class="bets-icon" aria-label="닫기" title="닫기">×</button></div>' +
      '<div id="slipList" class="bets-list slip-list"></div></div>';
    document.body.appendChild(wrap);
    slipModalGroup = g;
    paintSlipModal(g);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || (e.target.closest && e.target.closest('#slipClose'))) closeSlipModal();
    });
    // 적중·미적중·점수는 결과 데이터가 도착하면 채운다(없으면 저장된 상태만 보인다).
    if (!window.CLUTCH_DATA) {
      ensureGameData().then(function (ok) { if (ok && slipModalGroup === g) paintSlipModal(g); });
    }
  }

  /* 글쓴이 — 새 글에는 points 를 저장하지 않는다(Firestore 규칙이 6개 필드만 허용).
     그래서 티어 배지는 글에 남은 points 가 있으면 그것으로, 없으면 users 문서에서
     그 사람의 지금 포인트·닉네임을 한 번만 읽어 와(캐시) 채운다. */
  function profOf(uid) {
    return uid && Object.prototype.hasOwnProperty.call(profCache, uid) ? profCache[uid] : null;
  }
  function profFetch(uid) {
    if (!uid || profBusy[uid] || Object.prototype.hasOwnProperty.call(profCache, uid)) return;
    profBusy[uid] = true;
    db.collection('users').doc(uid).get().then(function (d) {
      var v = (d.exists && d.data()) || {};
      profCache[uid] = { points: v.points != null ? Number(v.points) : null, nickname: v.nickname || '' };
    }, function () { profCache[uid] = { points: null, nickname: '' }; }).then(function () {
      profBusy[uid] = false;
      paintAuthors(uid);
    });
  }
  // 글쓴이·댓글쓴이 표시 — clickable 이면 닉네임을 눌러 쪽지를 보낼 수 있는 버튼으로 그린다.
  // (목록 행은 행 전체가 '글 열기' 링크라서 버튼을 넣지 않는다 — 상세·댓글에서만)
  function authorHTML(uid, name, pts, clickable) {
    var can = !!(clickable && uid && !isMine(uid));
    var attrs = ' data-uid="' + esc(uid || '') + '" data-name="' + esc(name || '') + '"' +
      (pts != null ? ' data-pts="' + esc(pts) + '"' : '');
    var inner = esc(name || '회원') + tierMark(pts);
    return can
      ? '<button type="button" class="post-by name-msg" data-msg-to="' + esc(uid) + '"' +
          ' data-msg-name="' + esc(name || '') + '" title="' + esc(name || '회원') + '에게 쪽지 보내기"' +
          ' aria-label="' + esc(name || '회원') + '에게 쪽지 보내기"' + attrs + '>' + inner + '</button>'
      : '<span class="post-by"' + attrs + '>' + inner + '</span>';
  }
  function postByHTML(p, clickable) {
    var pr = profOf(p.uid);
    var pts = p.points != null ? p.points : (pr ? pr.points : null);
    var name = (pr && pr.nickname) || p.displayName || '회원';
    return authorHTML(p.uid, name, pts, clickable);
  }
  function paintAuthors(uid) {
    var nodes = document.querySelectorAll('.post-by[data-uid]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], u = n.getAttribute('data-uid');
      if (uid && u !== uid) continue;
      var pr = profOf(u), kept = n.getAttribute('data-pts');
      var pts = kept != null ? Number(kept) : (pr ? pr.points : null);
      n.innerHTML = esc((pr && pr.nickname) || n.getAttribute('data-name') || '회원') + tierMark(pts);
    }
  }

  /* ── 삭제(글·댓글) ────────────────────────────────────────────
     글쓴이 본인과 관리자(아래 두 계정)만 글·댓글을 지울 수 있다. 화면에서 버튼을 숨기는
     것과 별개로 Firestore 규칙이 같은 조건을 다시 검사한다(firestore.rules 의 isAdmin·delete). */
  var ADMIN_UIDS = ['xSLD6QapaAQIIQSsbDSYItjdFLX2', 'v5iaeJHK79bK5nRkSiDql3dcii03'];
  function isAdminUid(uid) { return !!uid && ADMIN_UIDS.indexOf(uid) >= 0; }
  function canDeletePost(p) { return !!(user && p && (p.uid === user.uid || isAdminUid(user.uid))); }
  function canDeleteComment(c) { return !!(user && c && (c.uid === user.uid || isAdminUid(user.uid))); }
  function deleteFail(e) {
    var code = String((e && (e.code || (e.error && e.error.code))) || '');
    var msg = String((e && e.message) || '');
    if (code === 'permission-denied' || /permission|insufficient/i.test(msg)) {
      say('Firebase 규칙 게시 후 사용할 수 있습니다.');
    } else {
      say('삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
  }
  function deletedToast() {
    if (window.clutchToast) window.clutchToast('삭제되었습니다.');
    else say('삭제되었습니다.');
  }
  function deletePost(id) {
    var p = id && postMap[id];
    if (!p) return;
    if (!user) return login();
    if (!canDeletePost(p)) return;
    if (!window.confirm('이 글을 삭제할까요?')) return;
    var ref = db.collection('posts').doc(id), cmts = ref.collection('comments');
    // 글만 지우면 댓글이 주인 없는 문서로 남으므로, 볼 수 있는 댓글(최근 500개)을 먼저 함께 지운다.
    // 댓글 정리가 실패해도 글 삭제는 그대로 진행한다.
    cmts.limit(500).get().then(function (s) {
      if (!s || !s.docs || !s.docs.length) return null;
      var batch = db.batch();
      s.docs.forEach(function (d) { batch.delete(cmts.doc(d.id)); });
      return batch.commit();
    }).then(function () { return ref.delete(); }).then(function () {
      // 목록에서도 바로 빼고 상세를 닫는다(스냅샷이 오기 전에 화면이 먼저 정리된다).
      listDocs = listDocs.filter(function (d) { return d.id !== id; });
      delete postMap[id];
      closeDetail();
      if (window.clutchBoard) window.clutchBoard.refresh();
      deletedToast();
    }, deleteFail);
  }
  function deleteComment(id, cid) {
    if (!id || !cid) return;
    if (!user) return login();
    if (!window.confirm('이 댓글을 삭제할까요?')) return;
    db.collection('posts').doc(id).collection('comments').doc(cid).delete().then(function () {
      // 댓글 목록은 실시간으로 다시 그려지고 댓글 수도 그때 줄어든다.
      deletedToast();
    }, deleteFail);
  }

  // 댓글 수 — count 집계를 먼저 쓰고, 지원하지 않으면 최근 50개를 세어 대신한다.
  function setCount(id, n) {
    if (typeof n !== 'number' || n < 0) return;
    countCache[id] = n;
    var nodes = document.querySelectorAll('[data-cmt]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-cmt') !== id) continue;
      el.textContent = n > 0 ? n : '';
      el.hidden = !(n > 0);
      if (n > 0) el.setAttribute('aria-label', '댓글 ' + n + '개'); else el.removeAttribute('aria-label');
    }
    var dc = $('detailCmtCount');
    if (dc && curDetailId === id) dc.textContent = n > 0 ? String(n) : '0';
  }
  function countComments(id) {
    var ref = db.collection('posts').doc(id).collection('comments');
    try {
      if (typeof ref.count === 'function') {
        ref.count().get().then(function (agg) {
          var d = agg && agg.data ? agg.data() : {};
          setCount(id, Number(d.count) || 0);
        }, function () {});
        return;
      }
    } catch (_) { /* 집계 미지원 → 아래로 */ }
    ref.limit(50).get().then(function (s) { setCount(id, s.size); }, function () {});
  }
  // 상세 화면의 댓글 목록(실시간)
  //   지금 보고 있는 글의 댓글은 cmtDocs 에도 담아 두어, 로그인 상태가 늦게 정해져도
  //   '님 댓글 삭제' 버튼이 바로 나타나도록 다시 그린다.
  var cmtPostId = '', cmtDocs = [];
  function paintComments(id) {
    var node = $('comments-' + id);
    if (!node) return;
    node.innerHTML = cmtDocs.length
      ? cmtDocs.map(function (d) {
          var c = d.data() || {};
          // 댓글쓴이 닉네임도 눌러서 쪽지를 보낼 수 있다(지금 닉네임은 users 문서에서 채운다)
          var cpr = c.uid ? profOf(c.uid) : null;
          if (c.uid && !isMine(c.uid)) profFetch(c.uid);
          var cn = (cpr && cpr.nickname) || c.displayName || '회원';
          return '<div class="cmt"><div class="cmt-h">' + authorHTML(c.uid, cn, cpr ? cpr.points : null, true) +
            '<span class="cmt-t">' + esc(fmtTime(c.createdAt)) + '</span>' +
            (canDeleteComment(c)
              ? '<button type="button" class="cmt-del" data-del-cmt="' + esc(d.id) + '"' +
                ' title="댓글 삭제" aria-label="댓글 삭제">삭제</button>'
              : '') +
            '</div><p>' + esc(c.body) + '</p></div>';
        }).join('')
      : '<p class="bl-nocmt">아직 댓글이 없습니다.</p>';
  }
  function loadComments(id) {
    cmtPostId = id; cmtDocs = [];
    return db.collection('posts').doc(id).collection('comments').orderBy('createdAt', 'asc').limit(100).onSnapshot(function (s) {
      if (cmtPostId !== id) return;
      cmtDocs = s.docs;
      paintComments(id);
      setCount(id, s.docs.length);
    }, function () {
      var node = $('comments-' + id);
      if (node) node.innerHTML = '<p class="bl-nocmt">댓글을 불러오지 못했습니다.</p>';
    });
  }

  /* ── 추천(따봉) ──────────────────────────────────────────────
     1인 1추천. 글 문서(posts/{id})의 likedUids 배열에 내 uid 를 넣고 빼며,
     likeCount 는 그 배열 길이와 같게 유지한다. Firestore 규칙이 '내 uid 하나만 더하거나
     빼고 likeCount = likedUids 길이'인 변경만 통과시킨다(제목·본문·남의 uid 는 못 건드림). */
  // 따봉 아이콘 — stroke="currentColor" 라서 CSS color(회색/에메랄드)를 그대로 따라간다.
  var LIKE_ICO = '<svg class="like-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
  var likeBusy = {};
  function likeCount(p) { return Math.max(0, Math.floor(Number(p && p.likeCount) || 0)); }
  function likedByMe(p) { return !!(user && p && Array.isArray(p.likedUids) && p.likedUids.indexOf(user.uid) >= 0); }
  // 목록 제목 줄 오른쪽 — 추천이 0이면 흐리게, 1 이상이면 에메랄드로 눈에 띄게
  function likeBadgeHTML(p) {
    var n = likeCount(p);
    return '<span class="bl-like' + (n > 0 ? ' on' : ' zero') + (likedByMe(p) ? ' mine' : '') + '"' +
      ' aria-label="추천 ' + n + '개">' + LIKE_ICO + '<b>' + fmt(n) + '</b></span>';
  }
  // 상세 하단 버튼 — 따봉 추천 N (내가 누른 글은 에메랄드로 살아나고, 다시 누르면 취소)
  function likeBarHTML(id, p) {
    if (!p) return '';
    var n = likeCount(p), on = likedByMe(p);
    return '<button type="button" class="detail-like' + (on ? ' on' : '') + (likeBusy[id] ? ' busy' : '') + '"' +
      ' data-like="' + esc(id) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' aria-label="추천 ' + n + '개' + (on ? ', 눌러서 취소' : '') + '"' +
      ' title="' + (on ? '추천 취소' : '이 글 추천') + '">' +
      LIKE_ICO + '<span>추천</span><b>' + fmt(n) + '</b></button>';
  }
  function paintLikeBar(id) {
    var bar = $('detailLikeBar');
    if (!bar) return;
    bar.innerHTML = id ? likeBarHTML(id, postMap[id]) : '';
  }
  function toggleLike(id) {
    var p = id && postMap[id];
    if (!p) return;
    if (!user) return login();
    if (likeBusy[id]) return;
    likeBusy[id] = true;
    paintLikeBar(id);
    var ref = db.collection('posts').doc(id);
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (d) {
        if (!d.exists) throw new Error('gone');
        var v = d.data() || {};
        var uids = Array.isArray(v.likedUids) ? v.likedUids.slice() : [];
        var i = uids.indexOf(user.uid);
        if (i >= 0) uids.splice(i, 1); else uids.push(user.uid);
        tx.update(ref, { likedUids: uids, likeCount: uids.length });
        return uids;
      });
    }).then(function (uids) {
      p.likedUids = uids;
      p.likeCount = uids.length;
    }, function (e) {
      var code = String((e && (e.code || (e.error && e.error.code))) || '');
      var msg = String((e && e.message) || '');
      if (code === 'permission-denied' || /permission|insufficient/i.test(msg)) {
        say('아직 추천 규칙이 Firebase에 반영되지 않았어요. 조금 뒤 다시 눌러 주세요.');
      } else if (code === 'not-found' || /gone/.test(msg)) {
        say('글을 찾을 수 없어요. 목록에서 다시 열어 주세요.');
      } else {
        say('추천을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.');
      }
    }).then(function () {
      likeBusy[id] = false;
      paintLikeBar(id);
      paintRows();
    });
  }

  // 목록 한 줄 — 커뮤니티 게시판처럼 2줄로 촘촘하게.
  //   1행: 안 읽음 점 · 픽 뱃지 · 제목 · [댓글 수]
  //   2행: 상대 시간 · 닉네임 · 베팅 한 줄 요약
  function rowHTML(id, p) {
    var n = countCache[id] || 0;
    var read = window.clutchBoard ? window.clutchBoard.isRead(id) : true;
    var hasSlip = !!(p.slip && p.slip.length);
    var sum = hasSlip ? slipSummary(p.slip) : '';
    var full = fmtFull(p.createdAt);
    return '<a class="bl-row' + (read ? '' : ' unread') + '" href="#post=' + encodeURIComponent(id) + '" data-post="' + esc(id) + '"' +
      (read ? '' : ' aria-label="안 읽음, ' + esc(p.title || '') + '"') + '>' +
      '<span class="bl-titlerow">' +
        '<span class="bl-dot" aria-hidden="true"></span>' +
        (hasSlip ? '<span class="bl-bet" title="베팅 공유" aria-label="베팅 공유">픽</span>' : '') +
        '<span class="bl-title">' + esc(p.title) + '</span>' +
        '<span class="bl-cmt" data-cmt="' + esc(id) + '"' + (n ? '' : ' hidden') +
          (n ? ' aria-label="댓글 ' + n + '개"' : '') + '>' + (n || '') + '</span>' +
        likeBadgeHTML(p) + '</span>' +
      '<span class="bl-meta">' +
        '<span class="bl-time"' + (full ? ' title="' + esc(full) + '"' : '') + '>' + esc(fmtRel(p.createdAt)) + '</span>' +
        postByHTML(p, false) +
        (sum ? '<span class="bl-slip"><i aria-hidden="true">🎟</i> ' + esc(sum) + '</span>' : '') +
      '</span></a>';
  }

  /* ── 목록 페이지 나누기(한 페이지 20개) ──────────────────
     전체 글 수는 posts count() 집계(clutchBoard)로 받고, 페이지는 최신순으로 PAGE_SIZE*page
     개를 받아 끝의 20개만 그린다. 글이 수십 개 수준이라 이 방식이 가장 단순하고,
     한 페이지를 넘길 때마다 20개씩만 더 읽는다. */
  var PAGE_SIZE = 20, listPage = 1, listDocs = [], postsUnsub = null;

  function totalPosts() {
    return window.clutchBoard ? window.clutchBoard.total() : 0;
  }
  function pagerHTML() {
    var total = totalPosts();
    var max = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (max <= 1) return '';
    var cur = Math.min(listPage, max), out = [];
    var from = Math.max(1, cur - 2), to = Math.min(max, from + 4);
    from = Math.max(1, to - 4);
    out.push('<button type="button" class="pg-btn" data-pg="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + ' aria-label="이전 페이지">‹</button>');
    if (from > 1) out.push('<button type="button" class="pg-btn" data-pg="1">1</button>' + (from > 2 ? '<span class="pg-gap">…</span>' : ''));
    for (var p = from; p <= to; p++) {
      out.push('<button type="button" class="pg-btn' + (p === cur ? ' on' : '') + '" data-pg="' + p + '"' + (p === cur ? ' aria-current="page"' : '') + '>' + p + '</button>');
    }
    if (to < max) out.push((to < max - 1 ? '<span class="pg-gap">…</span>' : '') + '<button type="button" class="pg-btn" data-pg="' + max + '">' + max + '</button>');
    out.push('<button type="button" class="pg-btn" data-pg="' + (cur + 1) + '"' + (cur >= max ? ' disabled' : '') + ' aria-label="다음 페이지">›</button>');
    return out.join('');
  }
  function paintPager() {
    var box = $('boardPager');
    if (!box) return;
    box.innerHTML = pagerHTML();
    box.hidden = !box.innerHTML;
  }
  function paintRows() {
    var node = $('postList');
    if (!node || $('postDetail') && !$('postDetail').hidden) return;
    node.innerHTML = listDocs.length
      ? listDocs.map(function (d) { return rowHTML(d.id, d.data() || {}); }).join('')
      : '<p class="bl-empty">아직 글이 없습니다. 첫 글을 남겨 보세요.</p>';
  }

  function loadPosts(page) {
    var want = Math.max(1, page || 1);
    if (postsUnsub) { try { postsUnsub(); } catch (_) {} postsUnsub = null; }
    var node = $('postList');
    if (!node) return;
    if (want !== listPage || !node.innerHTML) node.innerHTML = '<p class="bl-empty">불러오는 중…</p>';
    postsUnsub = db.collection('posts').orderBy('createdAt', 'desc').limit(PAGE_SIZE * want).onSnapshot(function (s) {
      listPage = want;
      listDocs = s.docs.slice((want - 1) * PAGE_SIZE, want * PAGE_SIZE);
      postMap = {};
      s.docs.forEach(function (d) {
        var p = d.data() || {};
        postMap[d.id] = p;
        if (p.points == null) profFetch(p.uid);
      });
      // 글 상세를 보고 있을 때는 목록을 드러내지 않는다(추천 수만 바뀌어도 스냅샷이 오므로)
      if (!$('postDetail') || $('postDetail').hidden) node.hidden = false;
      paintRows();
      s.docs.forEach(function (d) { countComments(d.id); });
      paintAuthors();
      paintPager();
      // 열어 둔 글의 추천 수가 다른 사람 손에 바뀌면 버튼도 따라 바뀌게
      if (curDetailId && postMap[curDetailId] && $('postDetail') && !$('postDetail').hidden) paintLikeBar(curDetailId);
      if (want > 1 && !listDocs.length) { listPage = 1; loadPosts(1); }
    }, function () {
      node.innerHTML = '<p class="bl-empty">글을 불러오지 못했습니다.</p>';
      node.hidden = false;
    });
  }

  /* 목록 ↔ 상세: 해시(#post=id)로 오가서 브라우저 뒤로 가기도 목록 복귀가 된다 */
  // 상세 머리(글쓴이·시각·✉️ 쪽지·삭제) — 로그인 상태가 늦게 정해지면 삭제 버튼을 다시 그린다.
  function detailMetaHTML(id, p) {
    var mine = !!(user && p.uid === user.uid);
    return postByHTML(p, true) + '<span class="meta-when">' + esc(fmtFull(p.createdAt)) + '</span>' +
      (p.uid && !mine ? '<button type="button" class="meta-msg" data-msg-to="' + esc(p.uid) + '"' +
        ' data-msg-name="' + esc((profOf(p.uid) && profOf(p.uid).nickname) || p.displayName || '') + '">✉️ 쪽지</button>' : '') +
      (canDeletePost(p) ? '<button type="button" class="meta-del" data-del-post="' + esc(id) + '"' +
        ' title="이 글 삭제" aria-label="이 글 삭제">삭제</button>' : '');
  }
  function paintDetailMeta(id) {
    var p = id && postMap[id];
    if (p && $('detailMeta')) $('detailMeta').innerHTML = detailMetaHTML(id, p);
  }
  function hashId() {
    var m = /^#post=(.+)$/.exec(location.hash || '');
    if (!m) return '';
    try { return decodeURIComponent(m[1]); } catch (_) { return m[1]; }
  }
  function renderDetail(id) {
    var p = postMap[id];
    if (!p) return false;
    curDetailId = id;
    var list = $('postList'), det = $('postDetail');
    if (list) list.hidden = true;
    if (det) {
      det.hidden = false;
      $('detailTitle').textContent = p.title || '';
      paintDetailMeta(id);
      $('detailBody').textContent = p.body || '';
      $('detailSlip').innerHTML = slipCardHTML(p.slip, '🎟 공유한 베팅', 'detail');
      paintLikeBar(id);
      $('detailCmtCount').textContent = countCache[id] ? String(countCache[id]) : '0';
      if ($('detailNotice')) $('detailNotice').textContent = '';
      $('detailComments').innerHTML = '<div id="comments-' + esc(id) + '"><p class="bl-nocmt">댓글을 불러오는 중…</p></div>';
      $('detailCommentBox').innerHTML = '<input id="comment-' + esc(id) + '" maxlength="1000" placeholder="댓글 남기기">' +
        '<button type="button" data-comment="' + esc(id) + '">등록</button>';
    }
    if (detailUnsub) { try { detailUnsub(); } catch (_) {} detailUnsub = null; }
    detailUnsub = loadComments(id);
    paintAuthors();
    // 이 글을 열었으니 '안 읽은 글' 숫자에서 뺀다(로그인: Firestore, 비로그인: localStorage)
    if (window.clutchBoard) window.clutchBoard.markRead(id);
    return true;
  }
  function showDetail(id) {
    if (!id) return showList();
    if (!postMap[id]) {
      // 목록 스냅샷보다 먼저 해시로 들어온 경우(새로고침·링크 공유) 직접 한 번 읽는다
      var list = $('postList'), det = $('postDetail');
      if (list) list.hidden = true;
      if (det) {
        det.hidden = false;
        $('detailTitle').textContent = '';
        $('detailMeta').innerHTML = '';
        $('detailBody').textContent = '불러오는 중…';
        $('detailSlip').innerHTML = '';
        paintLikeBar('');
        $('detailComments').innerHTML = '';
        $('detailCommentBox').innerHTML = '';
      }
      curDetailId = '';
      db.collection('posts').doc(id).get().then(function (d) {
        if (!d.exists) { closeDetail(); return; }
        postMap[id] = d.data() || {};
        if (postMap[id].points == null) profFetch(postMap[id].uid);
        if (hashId() === id) renderDetail(id);
      }, function () {
        if ($('detailBody')) $('detailBody').textContent = '글을 불러오지 못했습니다.';
      });
      return;
    }
    renderDetail(id);
  }
  function showList() {
    curDetailId = '';
    cmtPostId = ''; cmtDocs = [];
    if (detailUnsub) { try { detailUnsub(); } catch (_) {} detailUnsub = null; }
    var det = $('postDetail'), list = $('postList');
    if (det) det.hidden = true;
    if (list) list.hidden = false;
    paintLikeBar('');
    paintRows();
    paintPager();
  }
  // '← 목록으로' — 해시 기록만 지우고 목록으로 (뒤로 가기 기록을 남기지 않는다)
  function closeDetail() {
    if (location.hash) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { location.hash = ''; }
    }
    showList();
    if (listScroll) { try { window.scrollTo(0, listScroll); } catch (_) {} }
    listScroll = 0;
  }
  function route() {
    var id = hashId();
    if (!id) { showList(); return; }
    listScroll = listScroll || window.scrollY || document.documentElement.scrollTop || 0;
    if (renderDetail(id)) { try { window.scrollTo(0, 0); } catch (_) {} }
    else showDetail(id);
  }

  // 글쓰기 판 열기/닫기
  function toggleCompose(force) {
    var box = $('writeBox'), btn = $('writeToggle');
    if (!box) return;
    var open = typeof force === 'boolean' ? force : box.hidden;
    if (open && curDetailId) closeDetail();
    box.hidden = !open;
    if (btn) { btn.textContent = open ? '닫기' : '✏️ 글쓰기'; btn.classList.toggle('on', open); }
    if (open) { try { box.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { box.scrollIntoView(); } }
  }

  // 내 베팅 내역에서 글에 붙일 베팅을 고른다
  function drawBetPick() {
    var node = $('myBetPick');
    if (!node) return;
    if (!user) { node.innerHTML = '<p class="rk-empty">로그인하면 내 베팅 내역을 불러옵니다.</p>'; return; }
    if (!picked.list.length) { node.innerHTML = '<p class="rk-empty">아직 베팅 내역이 없습니다.</p>'; return; }
    node.innerHTML = picked.list.map(function (b) {
      var on = picked.sel[b.id];
      return '<button type="button" class="bet-choice' + (on ? ' on' : '') + '" data-betpick="' + esc(b.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="bc-main">' + esc(b.home) + ' vs ' + esc(b.away) + (b.count > 1 ? ' 외 ' + (b.count - 1) : '') + '</span>' +
        '<span class="bc-sub">' + esc(pickText(b)) + (b.count > 1 ? ' · ' + b.count + '픽' : '') +
        ' · ' + Number(b.decimal || 0).toFixed(2) + '배' +
        (b.stake ? ' · ' + fmt(b.stake) + 'P' : '') + ' · ' + esc(STATUS_KO[b.status] || b.status || '') + '</span>' +
        '</button>';
    }).join('');
  }
  function drawShared() {
    var node = $('sharedSlip');
    if (!node) return;
    node.innerHTML = shared.length
      ? '<div class="share-count">붙일 베팅 ' + Object.keys(picked.sel || {}).filter(function (k) { return picked.sel[k]; }).length + '개</div>' + slipCardHTML(shared, '내 Bet 공유', 'compose')
      : '';
  }
  function myBets(u) {
    db.collection('bets').doc(u.uid).collection('items').orderBy('createdAt', 'desc').limit(30).onSnapshot(function (s) {
      picked.docs = {};
      picked.list = s.docs.map(function (d) {
        var b = d.data() || {};
        picked.docs[d.id] = b;
        var first = (b.picks || [])[0] || {};
        return {
          id: d.id, gameId: first.gameId || '', away: first.away || '', home: first.home || '',
          market: first.market || '', pick: first.pick || '', line: first.line || '',
          decimal: Number(b.combinedOdds) || Number(first.decimal) || 0,
          stake: Number(b.stake) || 0, status: b.status || 'open',
          count: (b.picks || []).length
        };
      });
      drawBetPick();
    }, function () {
      if ($('myBetPick')) $('myBetPick').innerHTML = '<p class="rk-empty">베팅 내역을 불러오지 못했습니다.</p>';
    });
  }
  /* 글에 붙일 베팅 한 건 → 슬립 줄들(픽마다 한 줄, 같은 betId 로 묶인다).
     다폴도 모든 픽과 합산 배당·베팅 포인트·상태가 그대로 남는다. */
  function legsFromBet(id) {
    var b = (picked.docs || {})[id];
    if (!b) return [];
    var picks = Array.isArray(b.picks) ? b.picks : [];
    var odds = Number(b.combinedOdds) || picks.reduce(function (a, x) { return a * (Number(x.decimal) || 1); }, 1);
    var created = 0, c = b.createdAt;
    if (c && typeof c.toDate === 'function') { var dt = c.toDate(); created = dt && dt.getTime ? dt.getTime() : 0; }
    else if (typeof c === 'number' && isFinite(c)) created = c;
    else if (typeof c === 'string' && c) { var d2 = new Date(c); created = isNaN(d2.getTime()) ? 0 : d2.getTime(); }
    var head = {
      betId: id, stake: Number(b.stake) || 0, odds: Number(Number(odds).toFixed(4)),
      potential: b.potential != null ? Number(b.potential) : null,
      payout: b.payout != null ? Number(b.payout) : null,
      status: String(b.status || 'open'), createdAt: created
    };
    return picks.map(function (x) {
      var leg = {
        gameId: x.gameId || '', sport: x.sport || '', league: x.league || '', start: x.start || '',
        home: x.home || '', away: x.away || '', market: x.market || '', pick: x.pick || '',
        line: x.line || '', decimal: Number(x.decimal) || 0
      };
      for (var k in head) if (Object.prototype.hasOwnProperty.call(head, k)) leg[k] = head[k];
      return leg;
    });
  }
  function rebuildShared() {
    var out = [], ids = Object.keys(picked.sel || {});
    // 글 한 편에 담기는 슬립은 20줄까지(Firestore 규칙). 베팅 한 건은 통째로 넣거나 뺀다.
    for (var i = 0; i < ids.length; i++) {
      if (!picked.sel[ids[i]]) continue;
      var legs = legsFromBet(ids[i]);
      if (!legs.length || out.length + legs.length > 20) continue;
      out = out.concat(legs);
    }
    shared = out;
  }
  function pickBet(id) {
    if (!id) return;
    picked.sel[id] = !picked.sel[id];
    rebuildShared();
    drawBetPick();
    drawShared();
  }

  // 로그인은 auth.js 의 로그인/회원가입 모달로 연다(아이디·비밀번호 또는 Google).
  // 모달이 없는 화면에서는 예전처럼 Google 팝업으로 넘어간다.
  function login() {
    if (!auth) return say('Firebase 연결을 확인해 주세요.');
    if (window.clutchLogin) return window.clutchLogin('login');
    return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) { say('로그인 실패: ' + e.message); });
  }
  async function addPost() {
    if (!user) return say('글쓰기는 로그인 후 이용할 수 있습니다.');
    var title = $('postTitle').value.trim(), body = $('postBody').value.trim();
    if (!title || !body) return say('제목과 내용을 입력해 주세요.');
    try {
      // Firestore 규칙(posts create)이 uid·displayName·title·body·slip·createdAt 6개만 허용한다.
      // points 를 함께 쓰면 'Missing or insufficient permissions' 로 거부되므로 넣지 않는다.
      var ref = await db.collection('posts').add({ uid: user.uid, displayName: (window.clutchNickname || user.displayName || '회원'), title: title, body: body, slip: shared.slice(0, 20), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      $('postTitle').value = ''; $('postBody').value = ''; shared = []; picked.sel = {};
      sessionStorage.removeItem('clutchSlipShare'); drawBetPick(); drawShared(); toggleCompose(false); say('');
      // 내가 쓴 글은 '안 읽은 글'로 세지 않는다. 글 수도 바로 다시 센다.
      if (window.clutchBoard) { if (ref && ref.id) window.clutchBoard.markRead(ref.id); window.clutchBoard.refresh(); }
    } catch (e) { say('등록 실패: ' + e.message); }
  }
  async function addComment(id) {
    if (!user) return say('댓글은 로그인 후 작성할 수 있습니다.');
    var input = $('comment-' + id), body = input ? input.value.trim() : ''; if (!body) return;
    try {
      await db.collection('posts').doc(id).collection('comments').add({ uid: user.uid, displayName: (window.clutchNickname || user.displayName || '회원'), body: body, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      input.value = '';
    } catch (e) { say('댓글 등록 실패: ' + e.message); }
  }

  if ($('rankAll')) {
    loadRanks();
    var rd = $('rankDate');
    if (rd) rd.textContent = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + ' 기준';
  }
  if ($('postList')) {
    picked = { list: [], sel: {}, docs: {} };
    // 예전 'Bet 공유' 버튼에서 넘어온 슬립이 있으면 그대로 붙여 둔다
    try {
      var st = JSON.parse(sessionStorage.getItem('clutchSlipShare') || '[]');
      if (Array.isArray(st)) shared = st;
    } catch (_) { shared = []; }
    loadPosts(1);
    drawShared();
    if (shared.length) toggleCompose(true);
    window.addEventListener('hashchange', route);
    // 처음 들어온 주소에 #post=id 가 붙어 있으면 그 글로 바로 연다
    route();
    // 읽음 기록·전체 글 수가 준비되면 목록의 점과 페이지 번호를 다시 그린다
    if (window.clutchBoard) window.clutchBoard.onChange(function () { paintRows(); paintPager(); });
  }
  if (auth) auth.onAuthStateChanged(function (u) {
    user = u;
    // 이미 로그인한 사람에게는 '로그인' 버튼을 내보이지 않는다
    var lb = $('boardLogin');
    if (lb) lb.hidden = !!u;
    // 내 아이디는 쪽지 버튼이 아니어야 하므로 랭킹·게시판을 한 번 다시 그린다
    if ($('rankAll')) paintRanks();
    paintAuthors();
    // 추천은 로그인 상태에 따라 '내가 누른 글' 표시가 달라진다 — 목록·상세를 한 번 다시 그린다
    // (아직 목록을 못 받았을 때 다시 그리면 '글이 없습니다'가 잠깐 뜨므로 받은 뒤에만)
    if ($('postList') && listDocs.length) paintRows();
    if (curDetailId) {
      paintLikeBar(curDetailId);
      paintDetailMeta(curDetailId);
      if (cmtPostId === curDetailId) paintComments(curDetailId);
    }
    if (!u) { if ($('myBetPick')) drawBetPick(); return; }
    var ref = db.collection('users').doc(u.uid);
    ref.get().then(function (d) {
      var v = d.exists ? d.data() : {};
      window.clutchNickname = v.nickname || '';
      if (!d.exists) return ref.set({ uid: u.uid, displayName: u.displayName || '회원', photoURL: u.photoURL || '', points: 10000, createdAt: firebase.firestore.FieldValue.serverTimestamp(), weekProfit: 0, totalProfit: 0, winRate: 0, maxOdds: 0 });
      // 내 정보는 이미 읽었으니 글 목록에서 다시 읽지 않고 그대로 쓴다
      profCache[u.uid] = { points: v.points != null ? Number(v.points) : null, nickname: v.nickname || '' };
      paintAuthors(u.uid);
    }).then(function () {
      if ($('myBetPick')) { drawBetPick(); myBets(u); }
    });
  });
  document.addEventListener('click', function (e) {
    var lk = e.target.closest && e.target.closest('[data-like]');
    if (lk) { e.preventDefault(); toggleLike(lk.getAttribute('data-like')); return; }
    var dp = e.target.closest && e.target.closest('[data-del-post]');
    if (dp) { e.preventDefault(); deletePost(dp.getAttribute('data-del-post')); return; }
    var dcm = e.target.closest && e.target.closest('[data-del-cmt]');
    if (dcm) { e.preventDefault(); deleteComment(curDetailId, dcm.getAttribute('data-del-cmt')); return; }
    if (e.target.id === 'boardLogin') login();
    if (e.target.id === 'writeToggle') toggleCompose();
    if (e.target.id === 'writeCancel') toggleCompose(false);
    if (e.target.id === 'submitPost') addPost();
    if (e.target.id === 'detailBack' || (e.target.closest && e.target.closest('#detailBack'))) closeDetail();
    var pg = e.target.closest && e.target.closest('#boardPager [data-pg]');
    if (pg && !pg.disabled) {
      var n = Number(pg.getAttribute('data-pg')) || 1;
      if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { location.hash = ''; } }
      showList();
      loadPosts(n);
      try { window.scrollTo(0, 0); } catch (_) {}
    }
    /* 아이디(닉네임)·✉️ 버튼 → 그 사람에게 1:1 쪽지. 내 아이디는 열지 않고,
       로그인 전이면 로그인 모달을 띄운다. */
    var mto = e.target.closest && e.target.closest('[data-msg-to]');
    if (mto) {
      e.preventDefault();
      var uid = mto.getAttribute('data-msg-to');
      if (!uid || isMine(uid)) return;
      if (!user) return login();
      var nm = mto.getAttribute('data-msg-name') || '';
      if (!nm) { for (var k in postMap) { if (postMap[k] && postMap[k].uid === uid) { nm = postMap[k].displayName || ''; break; } } }
      if (window.clutchMessages) window.clutchMessages.compose({ uid: uid, name: nm });
    }
    if (e.target.closest && e.target.closest('[data-betpick]')) pickBet(e.target.closest('[data-betpick]').getAttribute('data-betpick'));
    // '🎟 공유한 베팅' 박스 → 그 베팅의 상세 카드
    var sc = e.target.closest && e.target.closest('[data-slip-scope]');
    if (sc) {
      var scope = sc.getAttribute('data-slip-scope') || 'detail';
      var gs = slipCache[scope] || [];
      openSlipModal(gs[Number(sc.getAttribute('data-slip-group')) || 0], sc.getAttribute('data-slip-title'));
      return;
    }
    if (e.target.dataset && e.target.dataset.comment) addComment(e.target.dataset.comment);
  });
  // 모달은 Esc 로도 닿는다(바깥 영역·× 는 모달이 직접 처리).
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && slipModalGroup) closeSlipModal();
  });
})();
