/* ── VERSUS 1:1 쪽지 ──────────────────────────────────────────────
   로그인한 사용자끼리 닉네임으로 1:1 쪽지를 주고받는다.

   저장 구조 (Firestore)
     users/{받는사람}/inbox/{msgId}   받은 쪽지 — 받는 사람만 읽고, 보낸 사람이 쓴다
     users/{보낸사람}/outbox/{msgId}  보낸 쪽지 — 보낸 사람만 읽고, 받는 사람은 readAt 만 바꾼다
   두 문서는 같은 msgId 로 한 번에(batch) 기록하고, 받는 사람이 열면 양쪽 readAt 을 같이 올린다.
   스팸 방지는 규칙(firestore.rules)에서 3초 1통·500자·자기 자신 금지를 강제하고,
   화면에서도 같은 기준으로 먼저 막는다.

   화면: 상단 '✉️ 쪽지' → 모달(받은/보낸/새 쪽지). '내 베팅 내역' 모달과 같은 결. */
(function () {
  'use strict';
  var auth = window.clutchAuth, db = window.clutchDb;
  var PAGE = 20, MAX_BODY = 500, THROTTLE_MS = 3000;

  var me = null, myName = '';
  var unread = 0, unsubUnread = null;
  var tab = 'inbox', page = 1, totalDocs = 0, rows = [];
  var openId = '', view = 'list';
  var composeTo = null, lastSentAt = 0;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toDate(ts) {
    var d = ts && ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function when(ts) {
    var d = toDate(ts), now = new Date();
    if (!d) return '';
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    return (d.getMonth() + 1) + '.' + pad(d.getDate());
  }
  function whenFull(ts) {
    var d = toDate(ts);
    if (!d) return '';
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function preview(body) {
    var s = String(body || '').replace(/\s+/g, ' ').trim();
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  }
  function badgeText(n) { return n > 99 ? '99+' : String(n); }

  /* ── 안 읽은 쪽지 배지 ────────────────────────────────── */
  function paintBadges() {
    var list = [document.getElementById('msgBadge'), document.getElementById('msgOpenBadge')];
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (!n) continue;
      n.textContent = badgeText(unread);
      n.hidden = !(unread > 0);
    }
    var pill = $('msgPill');
    if (pill) {
      pill.classList.toggle('has-unread', unread > 0);
      pill.setAttribute('aria-label', unread > 0 ? '쪽지, 안 읽은 쪽지 ' + unread + '개' : '쪽지');
    }
    var open = $('msgOpen');
    if (open) open.setAttribute('aria-label', unread > 0 ? '쪽지함 열기, 안 읽은 쪽지 ' + unread + '개' : '쪽지함 열기');
  }
  function watchUnread() {
    if (unsubUnread) { try { unsubUnread(); } catch (_) {} unsubUnread = null; }
    unread = 0;
    if (!me || !db) { paintBadges(); return; }
    var q = db.collection('users').doc(me.uid).collection('inbox')
      .where('readAt', '==', null).limit(50);
    unsubUnread = q.onSnapshot(function (s) {
      unread = s.size;
      paintBadges();
    }, function () { unread = 0; paintBadges(); });
  }

  /* ── 공통 ────────────────────────────────────────────── */
  function countOf(kind) {
    var ref = db.collection('users').doc(me.uid).collection(kind);
    try {
      if (typeof ref.count === 'function') {
        return ref.count().get().then(function (a) {
          var d = (a && a.data && a.data()) || {};
          return Number(d.count) || 0;
        }, function () { return fallbackCount(ref); });
      }
    } catch (_) {}
    return fallbackCount(ref);
  }
  function fallbackCount(ref) {
    return ref.limit(500).get().then(function (s) { return s.size; }, function () { return 0; });
  }

  /* ── 목록 ────────────────────────────────────────────── */
  function rowHTML(d) {
    var v = d.data() || {};
    var who = tab === 'inbox' ? (v.fromName || '회원') : (v.toName || '회원');
    var isUnread = tab === 'inbox' && !v.readAt;
    return '<button type="button" class="msg-row' + (isUnread ? ' unread' : '') + '" data-msg="' + esc(d.id) + '">' +
      '<span class="mr-top">' +
        (isUnread ? '<i class="mr-dot" aria-label="안 읽음"></i>' : '') +
        '<b class="mr-who">' + esc(who) + '</b>' +
        '<span class="mr-time">' + esc(when(v.createdAt)) + '</span></span>' +
      '<span class="mr-body">' + esc(preview(v.body)) + '</span>' +
      '</button>';
  }
  function pagerHTML() {
    var max = Math.max(1, Math.ceil(totalDocs / PAGE));
    if (max <= 1) return '';
    var cur = Math.min(page, max), out = [];
    var from = Math.max(1, cur - 2), to = Math.min(max, from + 4);
    from = Math.max(1, to - 4);
    out.push('<button type="button" class="pg-btn" data-pg="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + ' aria-label="이전 페이지">‹</button>');
    if (from > 1) out.push('<button type="button" class="pg-btn" data-pg="1">1</button>' + (from > 2 ? '<span class="pg-gap">…</span>' : ''));
    for (var p = from; p <= to; p++) {
      out.push('<button type="button" class="pg-btn' + (p === cur ? ' on' : '') + '" data-pg="' + p + '"' +
        (p === cur ? ' aria-current="page"' : '') + '>' + p + '</button>');
    }
    if (to < max) out.push((to < max - 1 ? '<span class="pg-gap">…</span>' : '') + '<button type="button" class="pg-btn" data-pg="' + max + '">' + max + '</button>');
    out.push('<button type="button" class="pg-btn" data-pg="' + (cur + 1) + '"' + (cur >= max ? ' disabled' : '') + ' aria-label="다음 페이지">›</button>');
    return out.join('');
  }
  function paintList() {
    var list = $('msgList');
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<p class="msg-empty">' + (tab === 'inbox'
        ? '받은 쪽지가 없습니다. 위의 <b>+ 새 쪽지</b>로 먼저 보내 보세요.'
        : '보낸 쪽지가 없습니다.') + '</p>';
    } else {
      list.innerHTML = rows.map(rowHTML).join('');
    }
    paintPager();
  }
  function loadPage() {
    if (!me) return;
    var list = $('msgList');
    if (list) list.innerHTML = '<p class="msg-empty">불러오는 중…</p>';
    var kind = tab === 'inbox' ? 'inbox' : 'outbox';
    db.collection('users').doc(me.uid).collection(kind)
      .orderBy('createdAt', 'desc').limit(PAGE * page).get()
      .then(function (s) {
        var start = (page - 1) * PAGE;
        rows = s.docs.slice(start, start + PAGE);
        paintList();
        return countOf(kind);
      }).then(function (n) {
        totalDocs = n;
        var max = Math.max(1, Math.ceil(totalDocs / PAGE));
        if (page > max && max >= 1) { page = max; return loadPage(); }
        paintPager();
      }).catch(function (e) {
        var m = String(e && e.message || e);
        if (/permission|insufficient/i.test(m)) m = '쪽지함을 열 수 없습니다. 잠시 후 다시 시도해 주세요.';
        if (list) list.innerHTML = '<p class="msg-empty">' + esc(m) + '</p>';
      });
  }

  /* ── 한 통 보기 ──────────────────────────────────────── */
  function paintDetail(d) {
    var v = d.data() || {};
    var other = tab === 'inbox' ? (v.fromName || '회원') : (v.toName || '회원');
    var sub = tab === 'inbox'
      ? '받은 쪽지'
      : '보낸 쪽지 · ' + (v.readAt ? '<span class="md-read">읽음</span>' : '<span class="md-read un">아직 안 읽음</span>');
    var body = $('msgList');    if (!body) return;
    body.innerHTML = '<div class="msg-detail">' +
        '<div class="md-head"><b class="md-who">' + esc(other) + '</b>' +
          '<span class="md-when">' + esc(whenFull(v.createdAt)) + '</span></div>' +
        '<p class="md-sub">' + sub + '</p>' +
        '<div class="md-body">' + esc(v.body) + '</div>' +
        '<div class="md-actions">' +
          '<button type="button" class="md-reply" data-reply="1">답장</button>' +
          '<button type="button" class="md-back" data-back="1">목록으로</button>' +
        '</div>' +
      '</div>';
    paintPager(true);
  }
  function openMessage(id) {
    var d = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) d = rows[i];
    if (!d) return;
    openId = id; view = 'detail';
    paintDetail(d);
    if (tab === 'inbox' && !(d.data() || {}).readAt) markRead(d);
  }
  function markRead(d) {
    var v = d.data() || {};
    if (!me || v.readAt) return;
    var b = db.batch();
    var ts = firebase.firestore.FieldValue.serverTimestamp();
    b.update(db.collection('users').doc(me.uid).collection('inbox').doc(d.id), { readAt: ts });
    if (v.fromUid && v.fromUid !== me.uid) {
      b.update(db.collection('users').doc(v.fromUid).collection('outbox').doc(d.id), { readAt: ts });
    }
    b.commit().then(function () {
      if (unread > 0) { unread -= 1; paintBadges(); }
    }).catch(function () { /* 규칙에 걸리면 배지는 실시간 구독이 다시 맞춘다 */ });
  }

  /* ── 새 쪽지 쓰기 ────────────────────────────────────── */
  function composeHTML() {
    return '<div class="msg-compose">' +
      '<label class="mc-lab" for="msgTo">받는 사람</label>' +
      '<div class="mc-to">' +
        '<input id="msgTo" type="text" maxlength="20" autocomplete="off" autocapitalize="none" placeholder="닉네임 2자 이상">' +
        '<button type="button" id="msgFind">찾기</button>' +
      '</div>' +
      '<div id="msgPicked" class="mc-picked" hidden></div>' +
      '<div id="msgFound" class="mc-found"></div>' +
      '<label class="mc-lab" for="msgBody">내용</label>' +
      '<textarea id="msgBody" maxlength="' + MAX_BODY + '" rows="5" placeholder="하고 싶은 말을 적어 주세요 (500자까지)"></textarea>' +
      '<div class="mc-foot"><span id="msgLen">0 / ' + MAX_BODY + '</span>' +
        '<button type="button" id="msgSend" class="mc-send">보내기</button></div>' +
      '<p id="msgNotice" class="mc-notice" aria-live="polite"></p>' +
      '</div>';
  }
  function say(t) { var n = $('msgNotice'); if (n) n.textContent = t || ''; }
  function paintPicked() {
    var box = $('msgPicked');
    if (!box) return;
    if (!composeTo) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<span class="mp-chip">' + esc(composeTo.name || '회원') + '<button type="button" class="mp-x" data-unpick="1" aria-label="받는 사람 지우기">×</button></span>';
  }
  function findUser() {
    if (!me) return;
    var q = ($('msgTo') && $('msgTo').value || '').trim();
    var box = $('msgFound');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = '<p class="mc-hint">닉네임을 2자 이상 입력해 주세요.</p>'; return; }
    box.innerHTML = '<p class="mc-hint">찾는 중…</p>';
    db.collection('users').where('nickname', '==', q).limit(8).get().then(function (s) {
      if (!s.size) { box.innerHTML = '<p class="mc-hint">‘' + esc(q) + '’ 닉네임을 찾지 못했습니다. 게시판 글쓴이 옆 쪽지 버튼으로도 보낼 수 있어요.</p>'; return; }
      var html = s.docs.map(function (d) {
        var v = d.data() || {};
        var mine = d.id === me.uid;
        return '<button type="button" class="mc-hit" data-pick="' + esc(d.id) + '" data-name="' + esc(v.nickname || v.displayName || '회원') + '"' +
          (mine ? ' disabled' : '') + '>' + esc(v.nickname || v.displayName || '회원') + (mine ? ' (나)' : '') + '</button>';
      }).join('');
      box.innerHTML = '<div class="mc-hits">' + html + '</div>';
    }).catch(function (e) {
      box.innerHTML = '<p class="mc-hint">찾지 못했습니다: ' + esc(e.message) + '</p>';
    });
  }
  function pickUser(uid, name) {
    if (!me) return;
    if (uid === me.uid) { say('자기 자신에게는 보낼 수 없습니다.'); return; }
    composeTo = { uid: uid, name: name };
    paintPicked();
    var box = $('msgFound'); if (box) box.innerHTML = '';
    var to = $('msgTo'); if (to) to.value = '';
    say('');
    var body = $('msgBody'); if (body) body.focus();
  }
  function send() {
    if (!me) return login();
    if (!composeTo) return say('받는 사람을 먼저 찾아 주세요.');
    if (composeTo.uid === me.uid) return say('자기 자신에게는 보낼 수 없습니다.');
    var body = ($('msgBody') && $('msgBody').value || '').trim();
    if (!body) return say('내용을 입력해 주세요.');
    if (body.length > MAX_BODY) return say(MAX_BODY + '자까지 보낼 수 있습니다.');
    var now = Date.now();
    if (now - lastSentAt < THROTTLE_MS) return say('너무 빠릅니다. 3초 뒤에 다시 보내 주세요.');
    var btn = $('msgSend');
    if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
    var ts = firebase.firestore.FieldValue.serverTimestamp();
    var msgId = db.collection('users').doc(composeTo.uid).collection('inbox').doc().id;
    var payload = {
      fromUid: me.uid,
      fromName: myName || (me.displayName || '회원'),
      toUid: composeTo.uid,
      toName: composeTo.name || '회원',
      body: body,
      createdAt: ts,
      readAt: null
    };
    var b = db.batch();
    b.set(db.collection('users').doc(composeTo.uid).collection('inbox').doc(msgId), payload);
    b.set(db.collection('users').doc(me.uid).collection('outbox').doc(msgId), payload);
    b.update(db.collection('users').doc(me.uid), { lastMsgAt: ts });
    b.commit().then(function () {
      lastSentAt = Date.now();
      if (btn) { btn.disabled = false; btn.textContent = '보내기'; }
      if ($('msgBody')) $('msgBody').value = '';
      if ($('msgLen')) $('msgLen').textContent = '0 / ' + MAX_BODY;
      composeTo = null; paintPicked();
      say('쪽지를 보냈습니다.');
      tab = 'outbox'; page = 1; view = 'list';
      paintTabs();
      loadPage();
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = '보내기'; }
      var m = String(e && e.message || e);
      if (/permission|insufficient/i.test(m)) m = '보내지 못했습니다. 로그인 상태와 잠시 후 다시 시도해 주세요.';
      say(m);
    });
  }

  /* ── 모달 ────────────────────────────────────────────── */
  function paintTabs() {
    var box = $('msgModal');
    if (!box) return;
    var ti = box.querySelector('[data-tab="inbox"]'), to = box.querySelector('[data-tab="outbox"]');
    if (ti) { ti.classList.toggle('on', tab === 'inbox'); ti.setAttribute('aria-selected', tab === 'inbox' ? 'true' : 'false'); }
    if (to) { to.classList.toggle('on', tab === 'outbox'); to.setAttribute('aria-selected', tab === 'outbox' ? 'true' : 'false'); }
    var nb = box.querySelector('.msg-new');
    if (nb) { nb.classList.remove('on'); nb.removeAttribute('aria-pressed'); }
  }
  function paintPager(hide) {
    var box = $('msgPager');
    if (!box) return;
    if (hide) { box.innerHTML = ''; box.hidden = true; return; }
    box.innerHTML = pagerHTML();
    box.hidden = !box.innerHTML;
  }
  function showListPanel() {
    view = 'list'; openId = '';
    var box = $('msgModal');
    if (!box) return;
    var tabs = box.querySelector('.msg-tabs');
    if (tabs) tabs.hidden = false;
    loadPage();
  }
  function showCompose() {
    view = 'compose';
    var box = $('msgModal');
    if (!box) return;
    // 탭은 그대로 두어 받은/보낸 쪽지로 되돌아갈 수 있게 한다.
    var tabs = box.querySelector('.msg-tabs');
    if (tabs) {
      tabs.hidden = false;
      var nb = tabs.querySelector('.msg-new');
      if (nb) { nb.classList.add('on'); nb.setAttribute('aria-pressed', 'true'); }
    }
    var list = $('msgList');
    if (list) list.innerHTML = composeHTML();
    paintPager(true);
    paintPicked();
    var len = $('msgLen');
    var ta = $('msgBody');
    if (ta) ta.addEventListener('input', function () { if (len) len.textContent = ta.value.length + ' / ' + MAX_BODY; });
    var inp = $('msgTo');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); findUser(); } });
    }
  }
  function close() {
    var w = $('msgModal');
    if (w) w.remove();
    view = 'list'; openId = ''; rows = []; page = 1; composeTo = null;
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function open(opt) {
    if (!me) return login();
    close();
    var wrap = document.createElement('div');
    wrap.id = 'msgModal';
    wrap.className = 'msg-modal';
    wrap.innerHTML = '<div class="msg-box" role="dialog" aria-modal="true" aria-label="쪽지함">' +
      '<div class="bets-head"><b>✉️ 쪽지</b>' +
      '<button type="button" id="msgClose" class="bets-icon" aria-label="닫기">×</button></div>' +
      '<div class="msg-tabs" role="tablist" aria-label="쪽지함 종류">' +
        '<button type="button" data-tab="inbox" role="tab" aria-selected="true" class="on">받은 쪽지</button>' +
        '<button type="button" data-tab="outbox" role="tab" aria-selected="false">보낸 쪽지</button>' +
        '<button type="button" data-tab="new" class="msg-new">+ 새 쪽지</button>' +
      '</div>' +
      '<div id="msgList" class="msg-list"><p class="msg-empty">불러오는 중…</p></div>' +
      '<div id="msgPager" class="pager msg-pager" hidden></div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.addEventListener('keydown', onKey);
    tab = 'inbox'; page = 1;
    paintTabs();

    wrap.addEventListener('click', function (e) {
      var t = e.target;
      if (t === wrap) return close();
      if (t.closest('#msgClose')) return close();
      var tabBtn = t.closest('[data-tab]');
      if (tabBtn) {
        var k = tabBtn.getAttribute('data-tab');
        if (k === 'new') return showCompose();
        tab = k === 'outbox' ? 'outbox' : 'inbox';
        page = 1; view = 'list';
        paintTabs();
        showListPanel();
        return;
      }
      var row = t.closest('[data-msg]');
      if (row) return openMessage(row.getAttribute('data-msg'));
      var pg = t.closest('[data-pg]');
      if (pg && !pg.disabled) { page = Number(pg.getAttribute('data-pg')) || 1; loadPage(); return; }
      if (t.closest('[data-back]')) return showListPanel();
      if (t.closest('#msgFind')) return findUser();
      var hit = t.closest('[data-pick]');
      if (hit) return pickUser(hit.getAttribute('data-pick'), hit.getAttribute('data-name'));
      if (t.closest('[data-unpick]')) { composeTo = null; paintPicked(); return; }
      if (t.closest('#msgSend')) return send();
      if (t.closest('[data-reply]')) {
        var d = null;
        for (var i = 0; i < rows.length; i++) if (rows[i].id === openId) d = rows[i];
        if (!d) return;
        var v = d.data() || {};
        var uid = tab === 'inbox' ? v.fromUid : v.toUid;
        var nm = tab === 'inbox' ? v.fromName : v.toName;
        showCompose();
        if (uid && uid !== me.uid) pickUser(uid, nm);
        else if ($('msgNotice')) $('msgNotice').textContent = '내 쪽지입니다.';
        return;
      }
    });

    if (opt && opt.uid) {
      showCompose();
      if (opt.uid === me.uid) { if ($('msgNotice')) $('msgNotice').textContent = '내 글에는 쪽지를 보낼 수 없습니다.'; }
      else pickUser(opt.uid, opt.name || '회원');
    } else {
      loadPage();
    }
  }

  function login() {
    if (window.clutchLogin) return window.clutchLogin('login');
    if (window.clutchLoginModal) return window.clutchLoginModal.open('login');
  }

  /* ── 진입점 ──────────────────────────────────────────── */
  function mountPill() {
    var nav = document.getElementById('betNav');
    if (nav && !document.getElementById('msgPill')) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.id = 'msgPill';
      pill.className = 'msg-pill';
      pill.setAttribute('aria-haspopup', 'dialog');
      pill.innerHTML = '<i class="mp-ico" aria-hidden="true">✉️</i><i class="mp-txt">쪽지</i><i id="msgBadge" class="cnt-badge" hidden></i>';
      var bal = document.getElementById('betBalance');
      if (bal && bal.parentNode === nav) nav.insertBefore(pill, bal.nextSibling);
      else nav.insertBefore(pill, nav.firstChild);
    }
    paintBadges();
  }

  function onUser(u) {
    me = u || null;
    myName = '';
    if (!me) { watchUnread(); if ($('msgModal')) close(); return; }
    db.collection('users').doc(me.uid).get().then(function (d) {
      var v = (d.exists && d.data()) || {};
      myName = v.nickname || v.displayName || me.displayName || '회원';
    }, function () {});
    watchUnread();
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && (e.target.closest('#msgPill') || e.target.closest('#msgOpen'))) {
      e.preventDefault();
      open();
    }
  });

  function init() {
    mountPill();
    // 상단 메뉴는 betting.js 가 DOMContentLoaded 에서 만든다 — 순서가 엇갈려도 잡도록 몇 번 더 시도한다.
    setTimeout(mountPill, 200);
    setTimeout(mountPill, 900);
    window.addEventListener('load', mountPill);
    if (auth) auth.onAuthStateChanged(onUser);
    else watchUnread();
  }
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

  window.clutchMessages = {
    open: function () { open(); },
    compose: function (opt) { open(opt || {}); },
    unread: function () { return unread; },
    pageSize: PAGE
  };
})();
