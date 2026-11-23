(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth, user = null, shared = [];
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return (Number(n) || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var say = function (s) { if ($('boardNotice')) $('boardNotice').textContent = s; };

  function rankRows(target, snap, metric) {
    $(target).innerHTML = snap.docs.map(function (doc, i) {
      var x = doc.data();
      return `<div class="rank-row"><b>#${i + 1}</b><b>${esc(x.nickname || x.displayName || '회원')}</b><span>${fmt(metric === 'week' ? x.weekProfit : x.points)}P</span><span>적중 ${Number(x.winRate || 0).toFixed(1)}%</span><span>최고 ${Number(x.maxOdds || 0).toFixed(2)}배</span></div>`;
    }).join('') || '<p>아직 랭킹 데이터가 없습니다.</p>';
  }
  function loadRanks() {
    db.collection('users').orderBy('points', 'desc').limit(50).onSnapshot(function (s) { rankRows('rankAll', s, 'all'); });
    db.collection('users').orderBy('weekProfit', 'desc').limit(50).onSnapshot(function (s) { rankRows('rankWeek', s, 'week'); });
  }
  function loadComments(id) {
    db.collection('posts').doc(id).collection('comments').orderBy('createdAt', 'asc').limit(100).onSnapshot(function (s) {
      var node = $('comments-' + id);
      if (node) node.innerHTML = s.docs.map(function (d) { var c = d.data(); return `<p><b>${esc(c.displayName)}</b> ${esc(c.body)}</p>`; }).join('');
    });
  }
  function loadPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').limit(50).onSnapshot(function (s) {
      $('posts').innerHTML = s.docs.map(function (doc) {
        var p = doc.data();
        var card = p.slip && p.slip.length ? `<div class="page-card"><b>🎟 공유한 베팅 슬립</b>${p.slip.map(function (x) { return `<p>${esc(x.away)} vs ${esc(x.home)} · ${esc(x.market)} ${esc(x.pick)} ${esc(x.line)} · ${Number(x.decimal).toFixed(2)}배</p>`; }).join('')}</div>` : '';
        var created = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate().toLocaleString('ko-KR') : '방금';
        return `<article class="page-card board-post"><h2>${esc(p.title)}</h2><small>${esc(p.displayName)} · ${created}</small><p>${esc(p.body)}</p>${card}<div id="comments-${doc.id}"></div><div class="comment-box"><input id="comment-${doc.id}" maxlength="1000" placeholder="댓글"><button data-comment="${doc.id}">댓글</button></div></article>`;
      }).join('') || '<p>첫 글을 남겨 보세요.</p>';
      s.docs.forEach(function (d) { loadComments(d.id); });
    });
  }
  async function login() { try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (e) { say('로그인 실패: ' + e.message); } }
  function drawShare() {
    if (!$('sharedSlip')) return;
    try { shared = JSON.parse(sessionStorage.getItem('clutchSlipShare') || '[]'); } catch (_) { shared = []; }
    $('sharedSlip').innerHTML = shared.length ? `<div class="page-card"><b>첨부할 베팅 슬립</b>${shared.map(function (x) { return `<p>${esc(x.away)} vs ${esc(x.home)} · ${esc(x.market)} ${esc(x.pick)} ${esc(x.line)} · ${Number(x.decimal).toFixed(2)}배</p>`; }).join('')}</div>` : '';
  }
  async function addPost() {
    if (!user) return say('글쓰기는 Google 로그인 후 이용할 수 있습니다.');
    var title = $('postTitle').value.trim(), body = $('postBody').value.trim();
    if (!title || !body) return say('제목과 내용을 입력해 주세요.');
    try {
      await db.collection('posts').add({uid:user.uid, displayName:(window.clutchNickname || user.displayName || '회원'), title:title, body:body, slip:shared.slice(0,20), createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      $('postTitle').value = ''; $('postBody').value = ''; shared = []; sessionStorage.removeItem('clutchSlipShare'); drawShare(); say('게시글을 등록했습니다.');
    } catch (e) { say('등록 실패: ' + e.message); }
  }
  async function addComment(id) {
    if (!user) return say('댓글은 Google 로그인 후 작성할 수 있습니다.');
    var input = $('comment-' + id), body = input.value.trim(); if (!body) return;
    try { await db.collection('posts').doc(id).collection('comments').add({uid:user.uid, displayName:(window.clutchNickname || user.displayName || '회원'), body:body, createdAt:firebase.firestore.FieldValue.serverTimestamp()}); input.value = ''; }
    catch (e) { say('댓글 등록 실패: ' + e.message); }
  }
  function myBets(u) {
    db.collection('bets').doc(u.uid).collection('items').orderBy('createdAt', 'desc').limit(50).onSnapshot(function (s) {
      $('myBets').innerHTML = s.docs.map(function (d) { var b = d.data(); return `<div class="board-post"><b>${fmt(b.stake)}P · ${Number(b.combinedOdds).toFixed(2)}배 · ${esc(b.status)}</b>${b.picks.map(function (x) { return `<p>${esc(x.away)} vs ${esc(x.home)} · ${esc(x.market)} ${esc(x.pick)} ${esc(x.line)}</p>`; }).join('')}</div>`; }).join('') || '<p>베팅 내역이 없습니다.</p>';
    });
  }
  if ($('rankAll')) loadRanks();
  if ($('posts')) { drawShare(); loadPosts(); }
  if (auth) auth.onAuthStateChanged(function (u) {
    user = u; if (!u) return;
    var ref = db.collection('users').doc(u.uid);
    ref.get().then(function (d) { var v=d.exists?d.data():{}; window.clutchNickname=v.nickname||''; if (!d.exists) return ref.set({uid:u.uid, displayName:u.displayName || '회원', photoURL:u.photoURL || '', points:10000, createdAt:firebase.firestore.FieldValue.serverTimestamp(), weekProfit:0, totalProfit:0, winRate:0, maxOdds:0}); });
    if ($('myBets')) {
      ref.onSnapshot(function (d) { var x = d.data() || {}; $('myStats').textContent = '잔액 ' + fmt(x.points) + 'P · 적중률 ' + Number(x.winRate || 0).toFixed(1) + '% · 최고 배당 ' + Number(x.maxOdds || 0).toFixed(2) + '배'; });
      myBets(u);
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.id === 'boardLogin') login();
    if (e.target.id === 'submitPost') addPost();
    if (e.target.id === 'shareCurrent') { shared = window.clutchSlipShare ? window.clutchSlipShare() : []; drawShare(); }
    if (e.target.dataset.comment) addComment(e.target.dataset.comment);
  });
})();
