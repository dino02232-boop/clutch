(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth, slip = [], me = null, balance = 0;
  var el = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Math.floor(Number(n) || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  function gameMap() {
    var m = {};
    ((window.CLUTCH_DATA || {}).days || []).forEach(function (d) { (d.games || []).forEach(function (g) { m[g.id] = Object.assign({date:d.date},g); }); });
    return m;
  }
  function dec(a) { a = Number(a); return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a); }
  // 화면에 보이는 배당(소수 둘째 자리)과 예상 획득을 같은 값으로 계산한다.
  function payout(stake, mult) { var m = Math.round(mult * 100) / 100; return Math.floor(stake * m + 1e-9); }
  function say(text) { var n = el('betNotice'); if (n) n.textContent = text; }
  // 접힘/펼침 상태를 버튼 문구와 aria-label 로도 알려 준다.
  function syncDock() {
    var dock = el('betDock'), btn = el('betDockToggle');
    if (!dock || !btn) return;
    var min = dock.classList.contains('is-min');
    btn.textContent = min ? '펼치기 ⌃' : '접기 ⌄';
    btn.setAttribute('aria-label', min ? 'Bet 펼치기' : 'Bet 접기');
    btn.setAttribute('aria-expanded', min ? 'false' : 'true');
  }
  function toggleDock() {
    el('betDock')?.classList.toggle('is-min');
    syncDock();
  }
  function mount() {
    if (!document.getElementById('betDock')) {
      var n = document.createElement('aside'); n.id='betDock'; n.className='bet-dock is-min';
      n.innerHTML='<div class="bet-dock-head"><b id="betDockTitle" role="button" tabindex="0">🧾 Bet</b><span id="betAuthState">로그인하면 10,000P 지급</span><button type="button" id="betDockToggle" class="bet-dock-toggle" aria-label="Bet 펼치기">펼치기</button></div><div id="betPicks"></div><div class="bet-stake"><label for="betStake">베팅 금액</label><input id="betStake" type="number" min="100" step="100" value="1000"><button id="betHalf">50%</button><button id="betAll">올인</button></div><div class="bet-total"><span>총 배당</span><b id="betOdds">1.00배</b><span>예상 획득</span><b id="betReturn">0P</b></div><button id="betSubmit" class="bet-submit">로그인 후 베팅 확정</button><p id="betNotice" aria-live="polite"></p></aside>';
      document.body.appendChild(n);
    }
    if (!document.getElementById('betNav')) {
      var nav=document.createElement('nav'); nav.id='betNav'; nav.className='bet-nav'; nav.innerHTML='<button type="button" id="betBalance" class="bet-pill" hidden aria-haspopup="dialog"></button><a href="ranking.html">🏆 랭킹</a><a href="board.html">💬 자유게시판</a><button id="betLogin">Google 로그인</button><button id="betSupport" hidden>1,000P 지원</button>';
      document.querySelector('.top')?.appendChild(nav);
    }
    document.body.addEventListener('click', function (e) {
      var b=e.target.closest('.o-pick'); if (!b) return;
      var g=gameMap()[b.dataset.betGame]; if (!g) return;
      if (Date.parse(g.start)<=Date.now()) { say('경기가 시작되어 선택할 수 없습니다.'); return; }
      var item={gameId:g.id, date:g.date, sport:g.sport, league:g.league, start:g.start, away:g.away.name, home:g.home.name, market:b.dataset.betMarket, pick:b.dataset.betPick, line:b.dataset.betLine||'', odds:Number(b.dataset.betOdds), decimal:Number(dec(b.dataset.betOdds).toFixed(4))};
      var ix=slip.findIndex(function(x){return x.gameId===item.gameId;}); if(ix>=0) slip[ix]=item; else slip.push(item); el('betDock')?.classList.remove('is-min'); syncDock(); paint();
    });
    document.addEventListener('click', function(e){
      if(e.target.id==='betDockTitle'||e.target.id==='betDockToggle'){toggleDock();}
      if(e.target.closest&&e.target.closest('#betBalance')) openBets();
      if(e.target.id==='betLogin') login();
      if(e.target.id==='betSubmit') submitBet();
      if(e.target.id==='betSupport') support();
      if(e.target.matches('[data-slip-remove]')) { slip.splice(Number(e.target.dataset.slipRemove),1); paint(); }
      if(e.target.id==='betHalf'&&el('betStake')) el('betStake').value=Math.max(100,Math.floor(balance/2/100)*100);
      if(e.target.id==='betAll'&&el('betStake')) el('betStake').value=balance;
    });
    // 금액 칸은 input·change·keyup·blur 어느 쪽으로 들어와도 다시 계산한다(아이폰에서 input 이 안 올 때가 있음).
    ['input','change','keyup','blur'].forEach(function(ev){
      document.addEventListener(ev,function(e){if(e.target&&e.target.id==='betStake')paint();},true);
    });
    if(auth) auth.onAuthStateChanged(onUser);
    syncDock();
    paint();
  }
  function paint() {
    var picks=el('betPicks'); if(!picks)return;
    var mult=slip.reduce(function(a,x){return a*x.decimal;},1);
    picks.innerHTML=slip.length?slip.map(function(x,i){return '<div class="bet-pick"><button data-slip-remove="'+i+'" aria-label="선택 삭제">×</button><b>'+esc(x.away)+' vs '+esc(x.home)+'</b><span>'+esc(({moneyline:'승무패',spread:'핸디캡',total:'언오버'})[x.market])+' · '+esc(({away:'원정',home:'홈',draw:'무승부',over:'오버',under:'언더'})[x.pick])+(x.line?' '+esc(x.line):'')+' · '+x.decimal.toFixed(2)+'배</span></div>';}).join(''):'<p class="bet-empty">경기에서 배당을 선택하세요.</p>';
    if(el('betOdds'))el('betOdds').textContent=mult.toFixed(2)+'배';
    var stake=Number(el('betStake')&&el('betStake').value)||0;
    if(el('betReturn'))el('betReturn').textContent=fmt(payout(stake,mult))+'P';
    if(el('betBalance')){var pill=el('betBalance');pill.hidden=!me;pill.innerHTML=me?((window.clutchTierBadge?window.clutchTierBadge(balance):'')+'<span class="bet-pill-txt">'+esc(window.clutchNickname||me.displayName||'회원')+' · '+fmt(balance)+'P</span>'):'';}
    if(el('betSupport'))el('betSupport').hidden=!(me&&balance<100);
    var submit=el('betSubmit'); if(submit)submit.textContent=me?'베팅 확정':'로그인 후 베팅 확정';
    if(el('betDockTitle'))el('betDockTitle').textContent='🧾 Bet'+(slip.length?' ('+slip.length+')':'');
    var authstate=el('betAuthState'); if(authstate)authstate.textContent=me?((window.clutchNickname||me.displayName||'회원'))+' · '+fmt(balance)+'P':'로그인하면 10,000P 지급';
    var loginBtn=el('betLogin'); if(loginBtn)loginBtn.hidden=!!me;
    var bal=el('betBalance'); if(bal){bal.title=me?'내 베팅 내역 보기':'로그인';}
    paintBetsMe();
  }
  async function login(){if(!auth)return say('Firebase 연결을 확인해 주세요.');try{var p=new firebase.auth.GoogleAuthProvider();await auth.signInWithPopup(p);}catch(e){say('로그인에 실패했습니다: '+e.message);}}
  async function onUser(user){me=user;if(!user){balance=0;window.clutchNickname='';closeBets();paint();return;}var ref=db.collection('users').doc(user.uid);try{await db.runTransaction(async function(tx){var d=await tx.get(ref);if(!d.exists)tx.set(ref,{uid:user.uid,displayName:user.displayName||'회원',photoURL:user.photoURL||'',points:10000,createdAt:firebase.firestore.FieldValue.serverTimestamp(),weekProfit:0,totalProfit:0,winRate:0,maxOdds:0});});}catch(e){say('회원 정보를 불러오지 못했습니다: '+e.message);}ref.onSnapshot(function(d){if(d.exists){var v=d.data()||{};balance=Number(v.points)||0;window.clutchNickname=v.nickname||'';if(!v.nickname&&me&&!sessionStorage.getItem('clutchNickSkip')&&!document.getElementById('nickModal'))openNick();paint();}});paint();}
  function openNick(){
    if(!me)return; var wrap=document.createElement('div'); wrap.id='nickModal'; wrap.className='nick-modal';
    wrap.innerHTML='<div class="nick-box"><h2>닉네임 정하기</h2><p>랭킹과 게시판에 이 이름으로 보입니다.</p><input id="nickInput" maxlength="20" placeholder="2~20자"><p id="nickNotice" class="nick-notice"></p><div class="nick-actions"><button id="nickSave">저장</button><button id="nickClose">나중에</button></div></div>';
    document.body.appendChild(wrap);
    el('nickInput').value=window.clutchNickname||'';
    el('nickSave').addEventListener('click',async function(){
      var v=(el('nickInput').value||'').trim();
      if(v.length<2)return (el('nickNotice').textContent='2자 이상 입력해 주세요.');
      try{ await db.collection('users').doc(me.uid).update({nickname:v}); window.clutchNickname=v; wrap.remove(); paint(); }catch(e){ el('nickNotice').textContent='저장 실패: '+e.message; }
    });
    el('nickClose').addEventListener('click',function(){sessionStorage.setItem('clutchNickSkip','1');wrap.remove();});
    wrap.addEventListener('click',function(e){if(e.target===wrap){sessionStorage.setItem('clutchNickSkip','1');wrap.remove();}});
  }
  function nick(){ if(!me)return login(); if(document.getElementById('nickModal'))return; openNick(); }
  async function submitBet(){
    if(!me){await login();return;} if(!slip.length)return say('먼저 경기 배당을 선택해 주세요.');
    var stake=Number(el('betStake').value), now=Date.now(), gm=gameMap();
    if(!Number.isInteger(stake)||stake<100)return say('베팅 금액은 100P 이상 정수로 입력해 주세요.');
    if(slip.some(function(x){return !gm[x.gameId]||Date.parse(gm[x.gameId].start)<=now;}))return say('경기가 시작된 선택이 있어 베팅할 수 없습니다. 배팅을 확인해 주세요.');
    if(stake>balance)return say('보유 포인트가 부족합니다.');
    var id=db.collection('bets').doc(me.uid).collection('items').doc().id, userRef=db.collection('users').doc(me.uid), betRef=db.collection('bets').doc(me.uid).collection('items').doc(id);
    var picks=slip.map(function(x){return {gameId:x.gameId,date:x.date,sport:x.sport,league:x.league,start:x.start,away:x.away,home:x.home,market:x.market,pick:x.pick,line:x.line,odds:x.odds,decimal:x.decimal};});
    try{await db.runTransaction(async function(tx){var u=await tx.get(userRef);var p=Number(u.data().points)||0;if(p<stake)throw Error('포인트가 부족합니다.');if(picks.some(function(x){return Date.parse(x.start)<=Date.now();}))throw Error('경기가 시작됐습니다.');tx.update(userRef,{points:p-stake,lastBetId:id,lastStake:stake});tx.set(betRef,{uid:me.uid,stake:stake,picks:picks,combinedOdds:Number(picks.reduce(function(a,x){return a*x.decimal;},1).toFixed(4)),potential:payout(stake,picks.reduce(function(a,x){return a*x.decimal;},1)),status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp(),weekKey:new Date().toISOString().slice(0,10)});});slip=[];paint();say('베팅이 확정되었습니다.');}catch(e){say('베팅을 확정하지 못했습니다: '+e.message);}
  }
  async function support(){if(!me||balance>=100)return;var ref=db.collection('users').doc(me.uid);try{await db.runTransaction(async function(tx){var d=await tx.get(ref),v=d.data(),now=Date.now();if(Number(v.points)>=100)throw Error('잔고가 100P 이상입니다.');if(v.supportAt&&now-v.supportAt.toMillis()<86400000)throw Error('지원금은 24시간에 한 번 받을 수 있습니다.');tx.update(ref,{points:Number(v.points)+1000,supportAt:firebase.firestore.FieldValue.serverTimestamp()});});say('1,000P 지원금을 받았습니다.');}catch(e){say(e.message);}}
  /* ── 내 베팅 내역 모달 ────────────────────────────────
     상단 `닉네임 · 포인트` 알약을 누르면 베팅한 경기·픽·배당·금액·예상/획득·상태를 보여 준다.
     머리의 ✏️ 로 닉네임을 바로 고칠 수 있다. */
  var betsUnsub = null;
  var STATUS_KO = { open: '베팅중', won: '적중', lost: '미적중', push: '무효' };
  var MARKET_KO = { moneyline: '승무패', spread: '핸디캡', total: '언오버' };
  var PICK_KO = { away: '원정', home: '홈', draw: '무승부', over: '오버', under: '언더' };
  function statusKo(s) { return STATUS_KO[s] || s || '베팅중'; }
  function two(n) { return ('0' + n).slice(-2); }
  function paintBetsMe() {
    var n = el('betsMe');
    if (!n || !me) return;
    var nx = window.clutchTierNext ? window.clutchTierNext(balance) : null;
    var hint = nx
      ? '다음 ' + nx.tier.name + '까지 ' + fmt(nx.need) + 'P'
      : '최고 티어입니다';
    n.innerHTML = '<b>' + esc(window.clutchNickname || me.displayName || '회원') + '</b>' +
      (window.clutchTierBadge ? window.clutchTierBadge(balance) : '') +
      '<span>' + fmt(balance) + 'P</span>' +
      '<em class="bets-next">' + esc(hint) + '</em>';
  }
  function betRowHTML(doc) {
    var b = doc && doc.data ? doc.data() : (doc || {});
    var picks = Array.isArray(b.picks) ? b.picks : [];
    var st = String(b.status || 'open');
    var d = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : null;
    var when = d ? (d.getMonth() + 1) + '.' + d.getDate() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) : '';
    var stake = Number(b.stake) || 0;
    var odds = Number(b.combinedOdds) || 0;
    var expect = b.potential != null ? Number(b.potential) : payout(stake, odds);
    var picksHTML = picks.map(function (x) {
      return '<li>' + esc(x.away) + ' vs ' + esc(x.home) +
        '<span>' + esc(MARKET_KO[x.market] || x.market || '') + ' ' +
        esc(PICK_KO[x.pick] || x.pick || '') + (x.line ? ' ' + esc(x.line) : '') +
        ' · ' + (Number(x.decimal) || 0).toFixed(2) + '배</span></li>';
    }).join('');
    return '<article class="bet-hist ' + esc(st) + '">' +
      '<div class="bh-top"><span class="bh-st ' + esc(st) + '">' + esc(statusKo(st)) + '</span>' +
      '<b class="bh-stake">' + fmt(stake) + 'P</b>' +
      '<span class="bh-odds">' + odds.toFixed(2) + '배</span>' +
      (when ? '<span class="bh-when">' + when + '</span>' : '') + '</div>' +
      '<ul class="bh-picks">' + picksHTML + '</ul>' +
      '<div class="bh-foot"><span>예상 ' + fmt(expect) + 'P</span>' +
      '<span>' + (st === 'open' ? '결과 기다리는 중' : '획득 ' + fmt(b.payout != null ? b.payout : 0) + 'P') + '</span></div>' +
      '</article>';
  }
  function loadMyBets() {
    var list = el('betsList');
    if (!list || !me) return;
    if (betsUnsub) { betsUnsub(); betsUnsub = null; }
    betsUnsub = db.collection('bets').doc(me.uid).collection('items')
      .orderBy('createdAt', 'desc').limit(30)
      .onSnapshot(function (s) {
        if (!s.docs.length) { list.innerHTML = '<p class="bets-empty">아직 베팅 내역이 없습니다.</p>'; return; }
        list.innerHTML = s.docs.map(betRowHTML).join('');
      }, function (e) {
        list.innerHTML = '<p class="bets-empty">내역을 불러오지 못했습니다: ' + esc(e.message) + '</p>';
      });
  }
  function closeBets() {
    if (betsUnsub) { betsUnsub(); betsUnsub = null; }
    var w = el('betsModal');
    if (w) w.remove();
  }
  function openBets() {
    if (!me) return login();
    closeBets();
    var wrap = document.createElement('div');
    wrap.id = 'betsModal';
    wrap.className = 'bets-modal';
    wrap.innerHTML = '<div class="bets-box" role="dialog" aria-modal="true" aria-label="내 베팅 내역">' +
      '<div class="bets-head"><b>🎟 내 베팅 내역</b>' +
      '<button type="button" id="betsNick" class="bets-icon" aria-label="닉네임 변경" title="닉네임 변경">✏️</button>' +
      '<button type="button" id="betsClose" class="bets-icon" aria-label="닫기" title="닫기">×</button></div>' +
      '<div id="betsMe" class="bets-me"></div>' +
      '<div id="betsList" class="bets-list"><p class="bets-empty">불러오는 중…</p></div>' +
      '</div>';
    document.body.appendChild(wrap);
    paintBetsMe();
    loadMyBets();
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) return closeBets();
      if (e.target.closest && e.target.closest('#betsClose')) return closeBets();
      if (e.target.closest && e.target.closest('#betsNick')) return nick();
    });
    document.addEventListener('keydown', function esc(ev) {
      if (ev.key === 'Escape') { closeBets(); document.removeEventListener('keydown', esc); }
    });
  }

  window.clutchSlipShare=function(){return slip.map(function(x){return {gameId:x.gameId,away:x.away,home:x.home,market:x.market,pick:x.pick,line:x.line,decimal:x.decimal};});};
  window.addEventListener('DOMContentLoaded',mount); if(document.readyState!=='loading')mount();
})();
