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
      var nav=document.createElement('nav'); nav.id='betNav'; nav.className='bet-nav'; nav.innerHTML='<span id="betBalance"></span><a href="ranking.html">🏆 랭킹</a><a href="board.html">💬 자유게시판</a><button id="betShare">Bet 공유</button><button id="betLogin">Google 로그인</button><button id="betSupport" hidden>1,000P 지원</button>';
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
      if(e.target.id==='betBalance'&&me) nick();
      if(e.target.id==='betLogin') login();
      if(e.target.id==='betSubmit') submitBet();
      if(e.target.id==='betSupport') support();
      if(e.target.id==='betShare'){sessionStorage.setItem('clutchSlipShare',JSON.stringify(window.clutchSlipShare?window.clutchSlipShare():[]));location.href='board.html?share=1';}
      if(e.target.matches('[data-slip-remove]')) { slip.splice(Number(e.target.dataset.slipRemove),1); paint(); }
      if(e.target.id==='betHalf'&&el('betStake')) el('betStake').value=Math.max(100,Math.floor(balance/2/100)*100);
      if(e.target.id==='betAll'&&el('betStake')) el('betStake').value=balance;
    });
    document.addEventListener('input',function(e){if(e.target.id==='betStake')paint();});
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
    if(el('betReturn'))el('betReturn').textContent=fmt(Math.floor(stake*mult))+'P';
    if(el('betBalance'))el('betBalance').textContent=me?((window.clutchNickname||me.displayName||'회원')+' · '+fmt(balance)+'P'):'';
    if(el('betSupport'))el('betSupport').hidden=!(me&&balance<100);
    var submit=el('betSubmit'); if(submit)submit.textContent=me?'베팅 확정':'로그인 후 베팅 확정';
    if(el('betDockTitle'))el('betDockTitle').textContent='🧾 Bet'+(slip.length?' ('+slip.length+')':'');
    var authstate=el('betAuthState'); if(authstate)authstate.textContent=me?((window.clutchNickname||me.displayName||'회원'))+' · '+fmt(balance)+'P':'로그인하면 10,000P 지급';
    var loginBtn=el('betLogin'); if(loginBtn)loginBtn.hidden=!!me;
    var bal=el('betBalance'); if(bal){bal.title=me?'닉네임 변경':'로그인';bal.style.cursor=me?'pointer':'';bal.style.marginLeft='0';}
  }
  async function login(){if(!auth)return say('Firebase 연결을 확인해 주세요.');try{var p=new firebase.auth.GoogleAuthProvider();await auth.signInWithPopup(p);}catch(e){say('로그인에 실패했습니다: '+e.message);}}
  async function onUser(user){me=user;if(!user){balance=0;window.clutchNickname='';paint();return;}var ref=db.collection('users').doc(user.uid);try{await db.runTransaction(async function(tx){var d=await tx.get(ref);if(!d.exists)tx.set(ref,{uid:user.uid,displayName:user.displayName||'회원',photoURL:user.photoURL||'',points:10000,createdAt:firebase.firestore.FieldValue.serverTimestamp(),weekProfit:0,totalProfit:0,winRate:0,maxOdds:0});});}catch(e){say('회원 정보를 불러오지 못했습니다: '+e.message);}ref.onSnapshot(function(d){if(d.exists){var v=d.data()||{};balance=Number(v.points)||0;window.clutchNickname=v.nickname||'';if(!v.nickname&&me&&!sessionStorage.getItem('clutchNickSkip')&&!document.getElementById('nickModal'))openNick();paint();}});paint();}
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
    try{await db.runTransaction(async function(tx){var u=await tx.get(userRef);var p=Number(u.data().points)||0;if(p<stake)throw Error('포인트가 부족합니다.');if(picks.some(function(x){return Date.parse(x.start)<=Date.now();}))throw Error('경기가 시작됐습니다.');tx.update(userRef,{points:p-stake,lastBetId:id,lastStake:stake});tx.set(betRef,{uid:me.uid,stake:stake,picks:picks,combinedOdds:Number(picks.reduce(function(a,x){return a*x.decimal;},1).toFixed(4)),potential:Math.floor(stake*picks.reduce(function(a,x){return a*x.decimal;},1)),status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp(),weekKey:new Date().toISOString().slice(0,10)});});slip=[];paint();say('베팅이 확정되었습니다.');}catch(e){say('베팅을 확정하지 못했습니다: '+e.message);}
  }
  async function support(){if(!me||balance>=100)return;var ref=db.collection('users').doc(me.uid);try{await db.runTransaction(async function(tx){var d=await tx.get(ref),v=d.data(),now=Date.now();if(Number(v.points)>=100)throw Error('잔고가 100P 이상입니다.');if(v.supportAt&&now-v.supportAt.toMillis()<86400000)throw Error('지원금은 24시간에 한 번 받을 수 있습니다.');tx.update(ref,{points:Number(v.points)+1000,supportAt:firebase.firestore.FieldValue.serverTimestamp()});});say('1,000P 지원금을 받았습니다.');}catch(e){say(e.message);}}
  window.clutchSlipShare=function(){return slip.map(function(x){return {gameId:x.gameId,away:x.away,home:x.home,market:x.market,pick:x.pick,line:x.line,decimal:x.decimal};});};
  window.addEventListener('DOMContentLoaded',mount); if(document.readyState!=='loading')mount();
})();
