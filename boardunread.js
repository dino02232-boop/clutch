/* ── 자유게시판 '안 읽은 글' 배지 ──────────────────────────────────
   배지 숫자 = 전체 글 − 내가 연 글. 게시판을 한 번 열었다고 0이 되지 않고,
   글을 하나씩 열 때 그 글만 숫자에서 빠진다.

   읽은 글 기록은 두 곳에 함께 남긴다.
     · 이 기기: localStorage  'clutchReadPosts' (비로그인) / 'clutchReadPosts_<uid>' (로그인)
     · 로그인: users/{uid}/state/board 문서의 ids 배열(기기와 무관, 최근 500개)
   화면 숫자는 언제나 '이 기기 기록'으로 먼저 그린다. 그래서 Firestore 규칙이 아직
   게시되지 않았거나 권한·네트워크 오류가 나도, 글을 읽고 돌아오면 숫자가 바로 줄어든다.
   서버 기록이 오면 이 기기 기록과 합집합으로 합쳐 두 곳을 맞춘다.

   페이지를 떠났다가 뒤로 가기로 돌아오면(iOS Safari bfcache) 화면이 예전 상태 그대로
   살아나므로, pageshow·visibilitychange 에서 기록을 다시 읽어 배지를 새로 그린다.

   전체 글 수는 posts 컬렉션 count() 집계로 센다(문서를 다 읽지 않는다).
   글 하나를 열면 pages.js 가 markRead(id) 를 부르고, 목록의 줄 표시와 상단 배지가 함께 바뀐다. */
(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth;
  var CAP = 500, GUEST_KEY = 'clutchReadPosts';

  var me = null, stateDoc = null;
  var ids = [], set = {}, total = 0, loaded = false, staleTried = false;
  var observers = [];
  var lastRemote = 0, lastResync = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ── 이 기기 기록(localStorage) ─────────────────────── */
  function userKey(uid) { return GUEST_KEY + '_' + uid; }
  function myKey() { return me ? userKey(me.uid) : GUEST_KEY; }
  function readLs(key) {
    try {
      var a = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(a)) return [];
      return a.filter(function (x) { return typeof x === 'string' && x; });
    } catch (_) { return []; }
  }
  function writeLs(list) {
    try { localStorage.setItem(myKey(), JSON.stringify(list.slice(-CAP))); } catch (_) { /* 저장 못 해도 화면은 그대로 */ }
  }
  // 앞 목록 + 뒤 목록(새 기록)을 겹치지 않게 합친다. 최근 500개만 남긴다.
  function mergeLists(a, b) {
    var out = [], seen = {};
    (a || []).concat(b || []).forEach(function (x) {
      if (typeof x !== 'string' || !x || seen[x]) return;
      seen[x] = true; out.push(x);
    });
    return out.slice(-CAP);
  }

  function emit() {
    paint();
    for (var i = 0; i < observers.length; i++) { try { observers[i](); } catch (_) {} }
  }
  function rebuild() {
    var out = [], seen = {};
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (typeof id !== 'string' || !id || seen[id]) continue;
      seen[id] = true; out.push(id);
    }
    ids = out.slice(-CAP);
    set = {};
    for (var j = 0; j < ids.length; j++) set[ids[j]] = true;
  }
  function apply(list) {
    ids = (list || []).slice();
    rebuild();
    loaded = true;
    emit();
  }
  function unread() { return Math.max(0, total - ids.length); }
  function isRead(id) { return !!set[id]; }
  function readCount() { return ids.length; }

  /* ── 전체 글 수 ─────────────────────────────────────── */
  function loadTotal() {
    var col = db.collection('posts');
    function done(n) {
      total = Math.max(0, Number(n) || 0);
      loaded = true;
      checkStale();
      emit();
    }
    function fallback() {
      col.limit(500).get().then(function (s) { done(s.size); }, function () { done(total); });
    }
    try {
      if (typeof col.count === 'function') {
        col.count().get().then(function (a) {
          var d = (a && a.data && a.data()) || {};
          done(Number(d.count));
        }, fallback);
        return;
      }
    } catch (_) {}
    fallback();
  }

  /* ── 읽은 글 기록 ───────────────────────────────────── */
  // 이 기기에 남은 기록으로 먼저 채운다(로그인 전에 읽은 글도 함께 옮겨 온다).
  function loadReads() {
    var local = me ? mergeLists(readLs(userKey(me.uid)), readLs(GUEST_KEY)) : readLs(GUEST_KEY);
    apply(local);
    if (me && local.length) writeLs(local);
    if (me) loadRemote(local);
  }
  // 서버 기록(users/{uid}/state/board)과 이 기기 기록을 합집합으로 맞춘다.
  function loadRemote(localIds) {
    if (!me || !db) return;
    var uid = me.uid;
    stateDoc = db.collection('users').doc(uid).collection('state').doc('board');
    stateDoc.get().then(function (d) {
      if (!me || me.uid !== uid) return;
      var v = (d.exists && d.data()) || {};
      var remote = Array.isArray(v.ids) ? v.ids : [];
      lastRemote = Date.now();
      var merged = mergeLists(remote, ids);
      apply(merged);
      // 이 기기에서 새로 읽은 기록이 서버에 없으면 올려 둔다.
      if (merged.length > remote.length) saveReads();
    }, function () {
      // 규칙 게시 전·오프라인: 이 기기 기록만으로 숫자는 이미 줄어 있다.
      lastRemote = Date.now();
    });
  }
  function saveReads(opts) {
    writeLs(ids);                       // 기기 기록은 로그인 여부와 상관없이 항상 남긴다
    if (!me || !db) return;
    if (!stateDoc) stateDoc = db.collection('users').doc(me.uid).collection('state').doc('board');
    var ts = firebase.firestore.FieldValue.serverTimestamp();
    // 방금 읽은 한 개는 arrayUnion 으로 더한다(다른 기기에서 읽은 기록을 지우지 않게).
    // 여러 기기 기록을 합칠 때(loadRemote·checkStale)는 합친 전체 목록을 쓴다.
    var payload = { updatedAt: ts };
    if (opts && opts.add && opts.add.length) {
      payload.ids = firebase.firestore.FieldValue.arrayUnion.apply(null, opts.add.slice(-CAP));
    } else {
      payload.ids = ids.slice(-CAP);
    }
    stateDoc.set(payload, { merge: true })
      .catch(function () { /* 규칙·네트워크 문제는 화면 숫자만 우선 반영 */ });
  }

  function markRead(id) {
    if (!id || typeof id !== 'string' || set[id]) return;
    set[id] = true; ids.push(id);
    rebuild();
    saveReads({ add: [id] });
    emit();
  }

  /* 글 수보다 읽은 기록이 많으면(글 삭제 등) 실제로 있는 글만 남긴다. */
  function checkStale() {
    if (staleTried || !total || ids.length <= total) return;
    staleTried = true;
    var refs = [], i;
    for (i = 0; i < ids.length && i < CAP; i++) refs.push(db.collection('posts').doc(ids[i]));
    if (!refs.length) return;
    db.getAll.apply(db, refs).then(function (snaps) {
      var alive = {};
      for (var k = 0; k < snaps.length; k++) if (snaps[k] && snaps[k].exists) alive[snaps[k].id] = true;
      var before = ids.length;
      ids = ids.filter(function (x) { return alive[x]; });
      rebuild();
      if (ids.length !== before) saveReads();
      emit();
    }, function () {});
  }

  /* ── 배지 그리기 ────────────────────────────────────── */
  function paint() {
    var n = unread();
    var badges = document.querySelectorAll('[data-board-badge]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = n > 99 ? '99+' : String(n);
      badges[i].hidden = !(n > 0);
    }
    var links = document.querySelectorAll('[data-board-link]');
    for (var j = 0; j < links.length; j++) {
      links[j].classList.toggle('has-unread', n > 0);
      links[j].setAttribute('aria-label', n > 0 ? '자유게시판, 새 글 ' + n + '개' : '자유게시판');
    }
    var c = document.getElementById('boardCount');
    if (c) {
      c.innerHTML = '글 <b>' + total + '</b>개' + (n > 0 ? '<span class="bc-unread">안 읽은 글 <b>' + n + '</b>개</span>' : '');
    }
    // 처음 온 사람에게만: 모든 글이 '안 읽음'으로 시작한다는 한 줄 안내
    var tip = document.getElementById('boardReadTip');
    if (tip) tip.hidden = !(total > 0 && ids.length === 0 && loaded);
  }

  function start() {
    loadReads();
    loadTotal();
    paint();
  }

  /* ── 돌아왔을 때 다시 맞추기 ──────────────────────────
     뒤로 가기(bfcache)로 살아난 화면은 예전 숫자를 그대로 들고 있다. 이 기기 기록을
     다시 읽어 합치고, 글 수도 새로 센다(서버 읽기는 8초에 한 번만). */
  function resync() {
    var local = me ? mergeLists(readLs(userKey(me.uid)), readLs(GUEST_KEY)) : readLs(GUEST_KEY);
    var merged = mergeLists(ids, local);
    if (merged.length !== ids.length) apply(merged);
    else { rebuild(); if (loaded) emit(); }
    var now = Date.now();
    if (now - lastResync < 8000) return;
    lastResync = now;
    loadTotal();
    if (me && now - lastRemote > 8000) loadRemote(ids);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resync(); });
  window.addEventListener('pageshow', function () { resync(); });
  window.addEventListener('focus', function () { resync(); });

  if (auth) {
    auth.onAuthStateChanged(function (u) {
      var was = me && me.uid;
      me = u || null;
      if ((me && me.uid) !== was) { staleTried = false; loaded = false; stateDoc = null; lastRemote = 0; }
      start();
    });
  } else {
    start();
  }

  window.clutchBoard = {
    isRead: isRead,
    markRead: markRead,
    unread: unread,
    readCount: readCount,
    total: function () { return total; },
    refresh: function () { loadTotal(); paint(); },
    resync: resync,
    onChange: function (fn) { observers.push(fn); if (loaded) { try { fn(); } catch (_) {} } paint(); },
    esc: esc
  };
  // 헤더 메뉴가 나중에 만들어지는 화면이 있어 배지 자리를 한 번 더 확인한다.
  window.addEventListener('load', paint);
  setTimeout(paint, 1200);
})();
