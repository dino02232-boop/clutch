(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth, user = null, shared = [], picked = {};
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Math.floor(Number(n) || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var say = function (s) { if ($('boardNotice')) $('boardNotice').textContent = s; };
  var MARKET_KO = { moneyline: '승무패', spread: '핸디캡', total: '언오버' };
  var PICK_KO = { away: '원정', home: '홈', draw: '무승부', over: '오버', under: '언더' };
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
  var pickText = function (x) {
    return (MARKET_KO[x.market] || x.market || '') + ' ' + (PICK_KO[x.pick] || x.pick || '') +
      (x.line ? ' ' + x.line : '');
  };

  /* ── 랭킹 ──────────────────────────────────────────────── */
  function rankRowHTML(x, i, metric) {
    var name = x.nickname || x.displayName || '회원';
    var pts = metric === 'week' ? Number(x.weekProfit || 0) : Number(x.points || 0);
    var sub = '적중 ' + Number(x.winRate || 0).toFixed(1) + '% · 최고 ' + Number(x.maxOdds || 0).toFixed(2) + '배';
    return '<div class="rk-row' + (i < 3 ? ' top' + (i + 1) : '') + '">' +
      '<span class="rk-no">' + (i + 1) + '</span>' +
      '<span class="rk-who"><span class="rk-nmline"><b class="rk-name">' + esc(name) + '</b>' +
      tierBadge(x.points) + '</span>' +
      '<span class="rk-sub">' + esc(sub) + '</span></span>' +
      '<span class="rk-pt">' + fmt(pts) + '<small>P</small></span></div>';
  }
  function rankRows(target, snap, metric) {
    var node = $(target);
    if (!node) return;
    if (!snap.docs.length) { node.innerHTML = '<p class="rk-empty">아직 랭킹 데이터가 없습니다.</p>'; return; }
    node.innerHTML = snap.docs.map(function (doc, i) {
      return rankRowHTML(doc.data() || {}, i, metric);
    }).join('');
  }
  function loadRanks() {
    db.collection('users').orderBy('points', 'desc').limit(50).onSnapshot(function (s) { rankRows('rankAll', s, 'all'); });
    db.collection('users').orderBy('weekProfit', 'desc').limit(50).onSnapshot(function (s) { rankRows('rankWeek', s, 'week'); });
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

  function slipCardHTML(slip, title) {
    if (!slip || !slip.length) return '';
    return '<div class="post-slip"><b>' + esc(title) + '</b>' + slip.map(function (x) {
      return '<p>' + esc(x.away) + ' vs ' + esc(x.home) + ' · ' + esc(pickText(x)) +
        ' · ' + Number(x.decimal || 0).toFixed(2) + '배' + (x.stake ? ' · ' + fmt(x.stake) + 'P' : '') + '</p>';
    }).join('') + '</div>';
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
  function postByHTML(p) {
    var pr = profOf(p.uid);
    var pts = p.points != null ? p.points : (pr ? pr.points : null);
    var name = (pr && pr.nickname) || p.displayName || '회원';
    return '<span class="post-by" data-uid="' + esc(p.uid || '') + '"' +
      ' data-name="' + esc(p.displayName || '') + '"' +
      (p.points != null ? ' data-pts="' + esc(p.points) + '"' : '') + '>' +
      esc(name) + tierMark(pts) + '</span>';
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
  function loadComments(id) {
    return db.collection('posts').doc(id).collection('comments').orderBy('createdAt', 'asc').limit(100).onSnapshot(function (s) {
      var node = $('comments-' + id);
      if (node) {
        node.innerHTML = s.docs.length
          ? s.docs.map(function (d) {
              var c = d.data() || {};
              return '<div class="cmt"><div class="cmt-h"><b>' + esc(c.displayName || '회원') + '</b>' +
                '<span class="cmt-t">' + esc(fmtTime(c.createdAt)) + '</span></div>' +
                '<p>' + esc(c.body) + '</p></div>';
            }).join('')
          : '<p class="bl-nocmt">아직 댓글이 없습니다.</p>';
      }
      setCount(id, s.docs.length);
    }, function () {
      var node = $('comments-' + id);
      if (node) node.innerHTML = '<p class="bl-nocmt">댓글을 불러오지 못했습니다.</p>';
    });
  }

  // 목록 한 줄
  function rowHTML(id, p) {
    var n = countCache[id] || 0;
    return '<a class="bl-row" href="#post=' + encodeURIComponent(id) + '" data-post="' + esc(id) + '">' +
      '<span class="bl-titlerow"><span class="bl-title">' + esc(p.title) + '</span>' +
      (p.slip && p.slip.length ? '<span class="bl-ticket" title="베팅 첨부">🎟</span>' : '') +
      '<span class="bl-cmt" data-cmt="' + esc(id) + '"' + (n ? '' : ' hidden') + '>' + (n || '') + '</span></span>' +
      '<span class="bl-meta">' + postByHTML(p) + '<span class="bl-time">' + fmtTime(p.createdAt) + '</span></span>' +
      '</a>';
  }

  function loadPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').limit(50).onSnapshot(function (s) {
      var node = $('postList');
      if (!node) return;
      postMap = {};
      s.docs.forEach(function (d) {
        var p = d.data() || {};
        postMap[d.id] = p;
        if (p.points == null) profFetch(p.uid);
      });
      node.innerHTML = s.docs.length
        ? s.docs.map(function (d) { return rowHTML(d.id, d.data() || {}); }).join('')
        : '<p class="bl-empty">아직 글이 없습니다. 첫 글을 남겨 보세요.</p>';
      node.hidden = false;
      s.docs.forEach(function (d) { countComments(d.id); });
      paintAuthors();
    }, function () {
      var node = $('postList');
      if (node) { node.innerHTML = '<p class="bl-empty">글을 불러오지 못했습니다.</p>'; node.hidden = false; }
    });
  }

  /* 목록 ↔ 상세: 해시(#post=id)로 오가서 브라우저 뒤로 가기도 목록 복귀가 된다 */
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
      $('detailMeta').innerHTML = postByHTML(p) + '<span class="meta-when">' + esc(fmtFull(p.createdAt)) + '</span>';
      $('detailBody').textContent = p.body || '';
      $('detailSlip').innerHTML = slipCardHTML(p.slip, '🎟 공유한 베팅');
      $('detailCmtCount').textContent = countCache[id] ? String(countCache[id]) : '0';
      $('detailComments').innerHTML = '<div id="comments-' + esc(id) + '"><p class="bl-nocmt">댓글을 불러오는 중…</p></div>';
      $('detailCommentBox').innerHTML = '<input id="comment-' + esc(id) + '" maxlength="1000" placeholder="댓글 남기기">' +
        '<button type="button" data-comment="' + esc(id) + '">등록</button>';
    }
    if (detailUnsub) { try { detailUnsub(); } catch (_) {} detailUnsub = null; }
    detailUnsub = loadComments(id);
    paintAuthors();
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
    if (detailUnsub) { try { detailUnsub(); } catch (_) {} detailUnsub = null; }
    var det = $('postDetail'), list = $('postList');
    if (det) det.hidden = true;
    if (list) list.hidden = false;
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
    if (!user) { node.innerHTML = '<p class="rk-empty">Google 로그인하면 내 베팅 내역을 불러옵니다.</p>'; return; }
    if (!picked.list.length) { node.innerHTML = '<p class="rk-empty">아직 베팅 내역이 없습니다.</p>'; return; }
    node.innerHTML = picked.list.map(function (b) {
      var on = picked.sel[b.id];
      return '<button type="button" class="bet-choice' + (on ? ' on' : '') + '" data-betpick="' + esc(b.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="bc-main">' + esc(b.away) + ' vs ' + esc(b.home) + '</span>' +
        '<span class="bc-sub">' + esc(pickText(b)) + ' · ' + Number(b.decimal || 0).toFixed(2) + '배' +
        (b.stake ? ' · ' + fmt(b.stake) + 'P' : '') + ' · ' + esc(STATUS_KO[b.status] || b.status || '') + '</span>' +
        '</button>';
    }).join('');
  }
  function drawShared() {
    var node = $('sharedSlip');
    if (!node) return;
    node.innerHTML = shared.length
      ? '<div class="share-count">붙일 베팅 ' + shared.length + '개</div>' + slipCardHTML(shared, '내 Bet 공유')
      : '';
  }
  function myBets(u) {
    db.collection('bets').doc(u.uid).collection('items').orderBy('createdAt', 'desc').limit(30).onSnapshot(function (s) {
      picked.list = s.docs.map(function (d) {
        var b = d.data() || {};
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
  function pickBet(id) {
    var b = null;
    picked.list.forEach(function (x) { if (x.id === id) b = x; });
    if (!b) return;
    picked.sel[id] = !picked.sel[id];
    shared = picked.list.filter(function (x) { return picked.sel[x.id]; }).map(function (x) {
      return { gameId: x.gameId, away: x.away, home: x.home, market: x.market, pick: x.pick, line: x.line, decimal: x.decimal, stake: x.stake };
    });
    drawBetPick();
    drawShared();
  }

  async function login() { try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (e) { say('로그인 실패: ' + e.message); } }
  async function addPost() {
    if (!user) return say('글쓰기는 Google 로그인 후 이용할 수 있습니다.');
    var title = $('postTitle').value.trim(), body = $('postBody').value.trim();
    if (!title || !body) return say('제목과 내용을 입력해 주세요.');
    try {
      // Firestore 규칙(posts create)이 uid·displayName·title·body·slip·createdAt 6개만 허용한다.
      // points 를 함께 쓰면 'Missing or insufficient permissions' 로 거부되므로 넣지 않는다.
      await db.collection('posts').add({ uid: user.uid, displayName: (window.clutchNickname || user.displayName || '회원'), title: title, body: body, slip: shared.slice(0, 20), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      $('postTitle').value = ''; $('postBody').value = ''; shared = []; picked.sel = {};
      sessionStorage.removeItem('clutchSlipShare'); drawBetPick(); drawShared(); toggleCompose(false); say('');
    } catch (e) { say('등록 실패: ' + e.message); }
  }
  async function addComment(id) {
    if (!user) return say('댓글은 Google 로그인 후 작성할 수 있습니다.');
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
    picked = { list: [], sel: {} };
    // 예전 'Bet 공유' 버튼에서 넘어온 슬립이 있으면 그대로 붙여 둔다
    try {
      var st = JSON.parse(sessionStorage.getItem('clutchSlipShare') || '[]');
      if (Array.isArray(st)) shared = st;
    } catch (_) { shared = []; }
    loadPosts();
    drawShared();
    if (shared.length) toggleCompose(true);
    window.addEventListener('hashchange', route);
    // 처음 들어온 주소에 #post=id 가 붙어 있으면 그 글로 바로 연다
    route();
  }
  if (auth) auth.onAuthStateChanged(function (u) {
    user = u;
    // 이미 로그인한 사람에게는 'Google 로그인' 버튼을 내보이지 않는다
    var lb = $('boardLogin');
    if (lb) lb.hidden = !!u;
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
    if (e.target.id === 'boardLogin') login();
    if (e.target.id === 'writeToggle') toggleCompose();
    if (e.target.id === 'writeCancel') toggleCompose(false);
    if (e.target.id === 'submitPost') addPost();
    if (e.target.id === 'detailBack' || (e.target.closest && e.target.closest('#detailBack'))) closeDetail();
    if (e.target.closest && e.target.closest('[data-betpick]')) pickBet(e.target.closest('[data-betpick]').getAttribute('data-betpick'));
    if (e.target.dataset && e.target.dataset.comment) addComment(e.target.dataset.comment);
  });
})();
