/* ── 자유게시판 '안 읽은 글' 배지 ──────────────────────────────────
   배지 숫자 = 전체 글 − 내가 연 글. 게시판을 한 번 열었다고 0이 되지 않고,
   글을 하나씩 열 때 그 글만 숫자에서 빠진다.

   읽은 글 기록
     · 로그인: users/{uid}/state/board 문서의 ids 배열(기기와 무관, 최근 500개)
     · 비로그인: localStorage 'clutchReadPosts' (같은 형식)
   전체 글 수는 posts 컬렉션 count() 집계로 센다(문서를 다 읽지 않는다).
   글 하나를 열면 pages.js 가 markRead(id) 를 부르고, 목록의 줄 표시와 상단 배지가 함께 바뀐다. */
(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth;
  var CAP = 500, GUEST_KEY = 'clutchReadPosts';
  var IGNORE_KEY = 'clutchBoardReadIntro';   // 첫 방문 안내를 이미 봤는지

  var me = null, stateDoc = null;
  var ids = [], set = {}, total = 0, loaded = false, staleTried = false, ready = false;
  var observers = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function emit() {
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
  function loadReads() {
    if (!me) {
      ids = [];
      try { ids = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]'); } catch (_) { ids = []; }
      if (!Array.isArray(ids)) ids = [];
      rebuild(); loaded = true; emit();
      return;
    }
    stateDoc = db.collection('users').doc(me.uid).collection('state').doc('board');
    stateDoc.get().then(function (d) {
      var v = (d.exists && d.data()) || {};
      ids = Array.isArray(v.ids) ? v.ids : [];
      rebuild(); loaded = true; emit();
    }, function () {
      ids = []; rebuild(); loaded = true; emit();
    });
  }
  function saveReads(full) {
    if (!me || !stateDoc) { try { localStorage.setItem(GUEST_KEY, JSON.stringify(ids.slice(-CAP))); } catch (_) {} return; }
    var ts = firebase.firestore.FieldValue.serverTimestamp();
    var p = full
      ? stateDoc.set({ ids: ids.slice(-CAP), updatedAt: ts }, { merge: true })
      : stateDoc.set({ ids: firebase.firestore.FieldValue.arrayUnion(ids[ids.length - 1]), updatedAt: ts }, { merge: true });
    p.catch(function () { /* 규칙·네트워크 문제는 화면 숫자만 우선 반영 */ });
  }

  function markRead(id) {
    if (!id || typeof id !== 'string' || set[id]) return;
    set[id] = true; ids.push(id);
    var trimmed = ids.length > CAP;
    if (trimmed) rebuild();
    saveReads(trimmed);
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
      if (ids.length !== before) saveReads(true);
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
    if (tip) {
      var seen = false;
      try { seen = sessionStorage.getItem(IGNORE_KEY) === '1'; } catch (_) {}
      var show = !seen && total > 0 && ids.length === 0;
      tip.hidden = !show;
      if (show) {
        try { sessionStorage.setItem(IGNORE_KEY, '1'); } catch (_) {}
      }
    }
  }

  function start() {
    loadReads();
    loadTotal();
    paint();
  }

  if (auth) {
    auth.onAuthStateChanged(function (u) {
      var was = me && me.uid;
      me = u || null;
      if ((me && me.uid) !== was) { staleTried = false; loaded = false; }
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
    onChange: function (fn) { observers.push(fn); if (loaded) { try { fn(); } catch (_) {} } paint(); },
    esc: esc
  };
})();
