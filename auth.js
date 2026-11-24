/* ── VERSUS 로그인/회원가입 모달 ─────────────────────────────
   아이디 + 비밀번호 두 칸으로 가입·로그인하고, 아래 구분선으로 Google 로그인도 함께 쓴다.
   아이디는 Firebase 이메일/비밀번호 인증을 그대로 쓰기 위해 `${id.toLowerCase()}@versus.local`
   형태의 이메일로 바꿔 넣는다(아이디는 대소문자 구분 없이 같은 계정). 회원가입 때 입력한
   아이디(원래 대소문자)를 displayName·nickname 으로 그대로 쓴다.

   쓰는 곳: betting.js(#betLogin), pages.js(#boardLogin). 창은 처음 열 때 한 번 만든다. */
(function () {
  'use strict';

  var auth = window.clutchAuth, db = window.clutchDb;
  var DOMAIN = 'versus.local';
  var ID_RE = /^[A-Za-z0-9_-]{3,20}$/;
  var MIN_PW = 6;
  var mode = 'login';           // 'login' | 'join'
  var busy = false;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function emailFor(id) { return String(id).trim().toLowerCase() + '@' + DOMAIN; }

  /* Firebase 오류 코드 → 한국어 안내 */
  function errText(e) {
    var code = String((e && (e.code || (e.error && e.error.code))) || '');
    var msg = String((e && e.message) || '');
    if (code === 'auth/email-already-in-use') return '이미 사용 중인 아이디입니다.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
      return '아이디 또는 비밀번호가 맞지 않습니다.';
    }
    if (code === 'auth/weak-password') return '비밀번호는 6자 이상으로 입력해 주세요.';
    if (code === 'auth/operation-not-allowed') return '이메일/비밀번호 로그인이 아직 활성화되지 않았습니다.';
    if (code === 'auth/invalid-email') return '아이디는 영문·숫자로 입력해 주세요.';
    if (code === 'auth/too-many-requests') return '시도가 너무 많습니다. 잠시 후 다시 해 주세요.';
    if (code === 'auth/network-request-failed') return '네트워크 연결을 확인해 주세요.';
    if (code === 'auth/user-disabled') return '이용이 정지된 계정입니다.';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
    if (/PASSWORD_LOGIN_DISABLED/.test(msg)) return '이메일/비밀번호 로그인이 아직 활성화되지 않았습니다.';
    return '로그인하지 못했습니다. ' + (msg || '잠시 후 다시 시도해 주세요.');
  }

  /* users/{uid} 문서 만들기 — 없을 때만, 규칙(validUserCreate)이 허용하는 필드 그대로 */
  async function ensureUser(user, rawId) {
    if (!user || !db) return;
    var name = rawId || user.displayName || '회원';
    var ref = db.collection('users').doc(user.uid);
    try {
      await db.runTransaction(async function (tx) {
        var d = await tx.get(ref);
        if (d.exists) return;
        tx.set(ref, {
          uid: user.uid,
          displayName: name,
          nickname: name,
          photoURL: user.photoURL || '',
          points: 10000,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          weekProfit: 0,
          totalProfit: 0,
          winRate: 0,
          maxOdds: 0
        });
      });
    } catch (e) {
      // 문서가 이미 있거나 규칙에 걸린 경우 — 로그인 자체는 그대로 진행한다.
    }
  }

  function notice(text) {
    var n = $('authNotice');
    if (n) n.textContent = text || '';
  }
  function setBusy(on, label) {
    busy = !!on;
    var b = $('authSubmit');
    if (!b) return;
    b.disabled = !!on;
    b.textContent = on ? (label || '처리 중…') : (mode === 'join' ? '가입하고 시작하기' : '로그인');
  }
  function paintMode() {
    var isJoin = mode === 'join';
    var tl = $('authTabLogin'), tj = $('authTabJoin');
    if (tl) { tl.classList.toggle('on', !isJoin); tl.setAttribute('aria-selected', isJoin ? 'false' : 'true'); }
    if (tj) { tj.classList.toggle('on', isJoin); tj.setAttribute('aria-selected', isJoin ? 'true' : 'false'); }
    var h = $('authHint');
    if (h) h.textContent = isJoin ? '아이디가 그대로 닉네임이 됩니다. 나중에 바꿀 수 있어요.' : '아이디와 비밀번호를 입력해 주세요.';
    var pw = $('authPw');
    if (pw) pw.setAttribute('autocomplete', isJoin ? 'new-password' : 'current-password');
    // 비밀번호 확인 칸은 회원가입에서만 보인다(로그인은 두 칸).
    var wrap2 = $('authPw2Wrap');
    if (wrap2) wrap2.hidden = !isJoin;
    var pw2 = $('authPw2');
    if (pw2) pw2.value = isJoin ? pw2.value : '';
    if (!busy) setBusy(false);
    notice('');
  }

  function close() {
    var w = $('authModal');
    if (w) w.remove();
    busy = false;
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function modalHTML() {
    return '<div class="auth-box" role="dialog" aria-modal="true" aria-labelledby="authBrand">' +
      '<div class="auth-head"><b class="auth-brand" id="authBrand">VERSUS</b>' +
        '<button type="button" class="auth-x" id="authClose" aria-label="닫기">×</button></div>' +
      '<div class="auth-tabs" role="tablist" aria-label="로그인 또는 회원가입">' +
        '<button type="button" id="authTabLogin" role="tab" aria-selected="true">로그인</button>' +
        '<button type="button" id="authTabJoin" role="tab" aria-selected="false">회원가입</button></div>' +
      '<form id="authForm" class="auth-form" novalidate>' +
        '<label for="authId">아이디</label>' +
        '<input id="authId" name="username" type="text" inputmode="latin" autocomplete="username" ' +
          'autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" placeholder="영문·숫자·_·- 3~20자">' +
        '<label for="authPw">비밀번호</label>' +
        '<input id="authPw" name="password" type="password" autocomplete="current-password" maxlength="72" placeholder="6자 이상">' +
        '<div id="authPw2Wrap" class="auth-field" hidden>' +
          '<label for="authPw2">비밀번호 확인</label>' +
          '<input id="authPw2" name="password2" type="password" autocomplete="new-password" maxlength="72" placeholder="비밀번호를 한 번 더">' +
        '</div>' +
        '<button type="submit" id="authSubmit" class="auth-submit">로그인</button>' +
      '</form>' +
      '<p id="authNotice" class="auth-notice" role="alert" aria-live="polite"></p>' +
      '<div class="auth-or"><span>또는</span></div>' +
      '<button type="button" id="authGoogle" class="auth-google"><span class="auth-g" aria-hidden="true">G</span>구글로 계속하기</button>' +
      '<p id="authHint" class="auth-hint">아이디와 비밀번호를 입력해 주세요.</p>' +
      '</div>';
  }

  async function submit() {
    if (busy) return;
    if (!auth) { notice('Firebase 연결을 확인해 주세요.'); return; }
    var rawId = ($('authId') && $('authId').value || '').trim();
    var pw = ($('authPw') && $('authPw').value) || '';
    if (!rawId) { notice('아이디를 입력해 주세요.'); if ($('authId')) $('authId').focus(); return; }
    if (!ID_RE.test(rawId)) {
      notice('아이디는 영문·숫자·_·- 로 3~20자 입력해 주세요.');
      if ($('authId')) $('authId').focus();
      return;
    }
    if (!pw) { notice('비밀번호를 입력해 주세요.'); if ($('authPw')) $('authPw').focus(); return; }
    if (mode === 'join' && pw.length < MIN_PW) {
      notice('비밀번호는 6자 이상으로 입력해 주세요.');
      if ($('authPw')) $('authPw').focus();
      return;
    }
    if (mode === 'join') {
      var pw2 = ($('authPw2') && $('authPw2').value) || '';
      if (!pw2) { notice('비밀번호를 한 번 더 입력해 주세요.'); if ($('authPw2')) $('authPw2').focus(); return; }
      if (pw2 !== pw) { notice('비밀번호가 서로 다릅니다.'); if ($('authPw2')) $('authPw2').focus(); return; }
    }
    notice('');
    setBusy(true, mode === 'join' ? '가입 중…' : '로그인 중…');
    try {
      if (mode === 'join') {
        var cred = await auth.createUserWithEmailAndPassword(emailFor(rawId), pw);
        var user = cred && cred.user;
        if (user) {
          try { await user.updateProfile({ displayName: rawId }); } catch (_) {}
          await ensureUser(user, rawId);
        }
        close();
      } else {
        var c2 = await auth.signInWithEmailAndPassword(emailFor(rawId), pw);
        await ensureUser(c2 && c2.user, '');
        close();
      }
    } catch (e) {
      notice(errText(e));
      setBusy(false);
    }
  }

  async function google() {
    if (busy) return;
    if (!auth) { notice('Firebase 연결을 확인해 주세요.'); return; }
    notice('');
    setBusy(true, '구글 로그인 중…');
    try {
      var p = new firebase.auth.GoogleAuthProvider();
      var r = await auth.signInWithPopup(p);
      await ensureUser(r && r.user, '');
      close();
    } catch (e) {
      var t = errText(e);
      setBusy(false);
      notice(t);
    }
  }

  function open(m) {
    mode = m === 'join' ? 'join' : 'login';
    var old = $('authModal');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.className = 'auth-modal';
    wrap.innerHTML = modalHTML();
    document.body.appendChild(wrap);
    paintMode();

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) return close();
      if (e.target.closest('#authClose')) return close();
      if (e.target.closest('#authTabLogin')) { mode = 'login'; paintMode(); return; }
      if (e.target.closest('#authTabJoin')) { mode = 'join'; paintMode(); return; }
      if (e.target.closest('#authGoogle')) return google();
    });
    $('authForm').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    document.addEventListener('keydown', onKey);
    var idEl = $('authId');
    if (idEl) { try { idEl.focus(); } catch (_) {} }
  }

  window.clutchLogin = open;
  window.clutchLoginModal = { open: open, close: close };
})();
