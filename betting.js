(function () {
  'use strict';
  var db = window.clutchDb, auth = window.clutchAuth, slip = [], me = null, balance = 0, userUnsub = null;
  var el = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Math.floor(Number(n) || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  function gameMap() {
    var m = {};
    ((window.CLUTCH_DATA || {}).days || []).forEach(function (d) { (d.games || []).forEach(function (g) { m[g.id] = Object.assign({date:d.date},g); }); });
    return m;
  }
  function dec(a) { a = Number(a); return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a); }
  // 경기 시작(KST) 뒤에는 배당을 고를 수 없다. LIVE·종료 상태도 잠근다.
  // 카드를 그리는 app.js 와 같은 함수를 쓰고, 없으면 여기서 같은 기준으로 판단한다.
  function betLocked(g) {
    if (window.clutchBetLocked) return window.clutchBetLocked(g);
    if (!g) return true;
    var r = g.result || {};
    if (r.state === 'live' || r.state === 'final') return true;
    if (g.status === 'live' || g.status === 'final') return true;
    var t = new Date(g.start).getTime();
    return !isFinite(t) || Date.now() >= t;
  }
  function closeText() { return window.clutchBetCloseText || '베팅 마감'; }
  // 화면에 그려진 배당 칸을 잠근다. app.js 가 다시 그린 카드든, 시작 시각만 지난
  // 카드(라이브 폴링이 없을 때)든 배당 칸과 배당 박스를 같은 모양으로 맞춘다.
  function lockDom() {
    var gm = gameMap();
    Array.prototype.forEach.call(document.querySelectorAll('.o-pick'), function (b) {
      if (!betLocked(gm[b.dataset.betGame])) return;
      if (!b.disabled) b.disabled = true;
      if (b.getAttribute('aria-disabled') !== 'true') b.setAttribute('aria-disabled', 'true');
      b.setAttribute('data-bet-closed', '1');
      if (!b.classList.contains('is-closed')) b.classList.add('is-closed');
      var box = b.closest ? b.closest('.obox') : null;
      if (!box) return;
      box.classList.add('is-closed');
      var head = box.querySelector('.o-head');
      if (!head || head.querySelector('.o-closed-note')) return;
      var note = document.createElement('span');
      note.className = 'o-closed-note';
      note.textContent = '🔒 ' + closeText();
      var headTitle = head.querySelector('b');
      if (headTitle && headTitle.nextSibling) head.insertBefore(note, headTitle.nextSibling);
      else head.appendChild(note);
    });
  }
  // 슬립에 담아 둔 픽 중 경기가 시작된 것을 뺀다. 뺀 게 있으면 Bet 을 펼쳐 알린다.
  function pruneClosed() {
    if (!slip.length) return 0;
    var gm = gameMap(), dropped = [];
    slip = slip.filter(function (x) {
      if (!betLocked(gm[x.gameId])) return true;
      dropped.push(x);
      return false;
    });
    if (!dropped.length) return 0;
    if (el('betDock')) el('betDock').classList.remove('is-min');
    syncDock();
    say('경기가 시작되어 베팅 슬립에서 뺐습니다: ' + dropped.map(function (x) { return x.home + ' vs ' + x.away; }).join(', '));
    paint();
    return dropped.length;
  }
  // 화면에 보이는 배당(소수 둘째 자리)과 예상 획득을 같은 값으로 계산한다.
  function payout(stake, mult) { var m = Math.round(mult * 100) / 100; return Math.floor(stake * m + 1e-9); }
  function say(text) { var n = el('betNotice'); if (n) n.textContent = text; }
  // 로그인·로그아웃 결과는 auth.js 의 토스트를 그대로 쓴다(없는 화면에서는 Bet 창 안내로 대신).
  function toast(text) { if (window.clutchToast) return window.clutchToast(text); say(text); }
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
      n.innerHTML='<div class="bet-dock-head"><b id="betDockTitle" role="button" tabindex="0">🧾 Bet</b><span id="betAuthState">로그인하면 10,000P 지급</span><button type="button" id="betDockToggle" class="bet-dock-toggle" aria-label="Bet 펼치기">펼치기</button></div><div id="betPicks"></div><div class="bet-stake"><label for="betStake">베팅 금액</label><input id="betStake" type="number" min="100" step="100" value="1000"><button id="betHalf">50%</button><button id="betAll">올인</button></div><div class="bet-total"><span>총 배당</span><b id="betOdds">1.00배</b><span>예상 획득</span><b id="betReturn">0P</b></div><button id="betSubmit" class="bet-submit">로그인 후 베팅 확정</button><p class="bet-money-note">가상 포인트로만 참여합니다. 충전·환전·현금화는 되지 않습니다.</p><p id="betNotice" aria-live="polite"></p></aside>';
      document.body.appendChild(n);
    }
    if (!document.getElementById('betNav')) {
      var nav=document.createElement('nav'); nav.id='betNav'; nav.className='bet-nav'; nav.innerHTML='<button type="button" id="betBalance" class="bet-pill" hidden aria-haspopup="dialog"></button><a href="ranking.html">🏆 랭킹</a><a href="board.html" data-board-link>💬 자유게시판<i data-board-badge class="cnt-badge" hidden></i></a><button id="betLogin">로그인</button><button id="betSupport" hidden>1,000P 지원</button>';
      document.querySelector('.top')?.appendChild(nav);
    }
    document.body.addEventListener('click', function (e) {
      var b=e.target.closest('.o-pick'); if (!b) return;
      var gm=gameMap(), g=gm[b.dataset.betGame];
      if (b.disabled || b.getAttribute('aria-disabled')==='true' || betLocked(g)) { lockDom(); say('경기가 시작되어 선택할 수 없습니다.'); return; }
      var item={gameId:g.id, date:g.date, sport:g.sport, league:g.league, start:g.start, away:g.away.name, home:g.home.name, market:b.dataset.betMarket, pick:b.dataset.betPick, line:b.dataset.betLine||'', odds:Number(b.dataset.betOdds), decimal:Number(dec(b.dataset.betOdds).toFixed(4))};
      // 슬립 한 자리는 '경기 + 마켓'. 같은 경기라도 승무패·핸디캡·언오버는 각각 따로 담긴다.
      // 같은 마켓의 다른 픽은 교체하고, 완전히 같은 leg(경기+마켓+픽)를 다시 누르면 뺀다.
      var ix=slip.findIndex(function(x){return x.gameId===item.gameId&&x.market===item.market;});
      if(ix>=0){
        if(slip[ix].pick===item.pick){slip.splice(ix,1);say('슬립에서 뺐습니다.');}
        else{slip[ix]=item;say('같은 마켓의 픽을 교체했습니다.');}
      } else slip.push(item);
      el('betDock')?.classList.remove('is-min'); syncDock(); paint();
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
    // 경기 시작 시각이 지나면 다시 그리지 않은 카드도 잠근다(라이브 폴링이 쉬는 동안 포함).
    lockDom();
    setInterval(function(){ lockDom(); pruneClosed(); }, 15000);
    ['visibilitychange','pageshow','focus'].forEach(function(ev){
      document.addEventListener(ev,function(){ lockDom(); pruneClosed(); },true);
      window.addEventListener(ev,function(){ lockDom(); pruneClosed(); },true);
    });
    syncDock();
    paint();
  }
  function paint() {
    var picks=el('betPicks'); if(!picks)return;
    var mult=slip.reduce(function(a,x){return a*x.decimal;},1);
    picks.innerHTML=slip.length?slip.map(function(x,i){return '<div class="bet-pick"><button data-slip-remove="'+i+'" aria-label="선택 삭제">×</button><b>'+esc(x.home)+' vs '+esc(x.away)+'</b><span>'+esc(pickLabel(x))+' · '+x.decimal.toFixed(2)+'배</span></div>';}).join(''):'<p class="bet-empty">경기에서 배당을 선택하세요. 같은 경기의 승무패·핸디캡·언오버는 함께 담을 수 있습니다.</p>';
    if(el('betOdds'))el('betOdds').textContent=mult.toFixed(2)+'배';
    var stake=Number(el('betStake')&&el('betStake').value)||0;
    if(el('betReturn'))el('betReturn').textContent=fmt(payout(stake,mult))+'P';
    // 알약 안은 [닉네임][· 포인트] 두 조각으로 나눠 둔다. 폭이 모자라면 닉네임만 말줄임되고
    // 포인트 숫자(1,000,000P)는 끝까지 보인다.
    if(el('betBalance')){var pill=el('betBalance');pill.hidden=!me;pill.innerHTML=me?((window.clutchTierBadge?window.clutchTierBadge(balance,{label:false,cls:'pill'}):'')+'<span class="bet-pill-txt"><span class="bet-pill-name">'+esc(window.clutchNickname||me.displayName||'회원')+'</span><span class="bet-pill-pt">'+fmt(balance)+'P</span></span>'):'';}
    if(el('betSupport'))el('betSupport').hidden=!(me&&balance<100);
    var submit=el('betSubmit'); if(submit)submit.textContent=me?'베팅 확정':'로그인 후 베팅 확정';
    if(el('betDockTitle'))el('betDockTitle').textContent='🧾 Bet'+(slip.length?' ('+slip.length+')':'');
    var authstate=el('betAuthState'); if(authstate)authstate.textContent=me?((window.clutchNickname||me.displayName||'회원'))+' · '+fmt(balance)+'P':'로그인하면 10,000P 지급';
    var loginBtn=el('betLogin'); if(loginBtn)loginBtn.hidden=!!me;
    var bal=el('betBalance'); if(bal){bal.title=me?'내 베팅 내역 보기':'로그인';}
    paintBetsMe();
  }
  // 로그인은 auth.js 의 로그인/회원가입 모달로 연다(아이디·비밀번호 또는 Google).
  // 모달이 없는 화면에서는 예전처럼 Google 팝업으로 넘어간다.
  function login(){
    if(!auth)return say('Firebase 연결을 확인해 주세요.');
    if(window.clutchLogin)return window.clutchLogin('login');
    try{return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());}
    catch(e){say('로그인에 실패했습니다: '+e.message);}
  }
  async function onUser(user){me=user;if(userUnsub){userUnsub();userUnsub=null;}if(!user){balance=0;window.clutchNickname='';closeBets();paint();return;}var ref=db.collection('users').doc(user.uid);try{await db.runTransaction(async function(tx){var d=await tx.get(ref);if(!d.exists)tx.set(ref,{uid:user.uid,displayName:user.displayName||'회원',photoURL:user.photoURL||'',points:10000,createdAt:firebase.firestore.FieldValue.serverTimestamp(),weekProfit:0,totalProfit:0,winRate:0,maxOdds:0});});}catch(e){say('회원 정보를 불러오지 못했습니다: '+e.message);}userUnsub=ref.onSnapshot(function(d){if(d.exists){var v=d.data()||{};balance=Number(v.points)||0;window.clutchNickname=v.nickname||'';if(!v.nickname&&me&&!sessionStorage.getItem('clutchNickSkip')&&!document.getElementById('nickModal'))openNick();paint();}});paint();}
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
    if (pruneClosed()) return say('이미 시작된 경기가 있어 베팅할 수 없습니다.');
    if(!slip.length)return say('먼저 경기 배당을 선택해 주세요.');
    var stake=Number(el('betStake').value), gm=gameMap();
    if(!Number.isInteger(stake)||stake<100)return say('베팅 금액은 100P 이상 정수로 입력해 주세요.');
    if(slip.some(function(x){return betLocked(gm[x.gameId]);}))return say('이미 시작된 경기가 있어 베팅할 수 없습니다.');
    if(stake>balance)return say('보유 포인트가 부족합니다.');
    var id=db.collection('bets').doc(me.uid).collection('items').doc().id, userRef=db.collection('users').doc(me.uid), betRef=db.collection('bets').doc(me.uid).collection('items').doc(id);
    var picks=slip.map(function(x){return {gameId:x.gameId,date:x.date,sport:x.sport,league:x.league,start:x.start,away:x.away,home:x.home,market:x.market,pick:x.pick,line:x.line,odds:x.odds,decimal:x.decimal};});
    try{await db.runTransaction(async function(tx){var u=await tx.get(userRef);var p=Number(u.data().points)||0;if(p<stake)throw Error('포인트가 부족합니다.');if(picks.some(function(x){return Date.parse(x.start)<=Date.now();}))throw Error('경기가 시작됐습니다.');tx.update(userRef,{points:p-stake,lastBetId:id,lastStake:stake});tx.set(betRef,{uid:me.uid,stake:stake,picks:picks,combinedOdds:Number(picks.reduce(function(a,x){return a*x.decimal;},1).toFixed(4)),potential:payout(stake,picks.reduce(function(a,x){return a*x.decimal;},1)),status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp(),weekKey:new Date().toISOString().slice(0,10)});});slip=[];paint();say('베팅이 확정되었습니다.');}catch(e){say('베팅을 확정하지 못했습니다: '+e.message);}
  }
  async function support(){if(!me||balance>=100)return;var ref=db.collection('users').doc(me.uid);try{await db.runTransaction(async function(tx){var d=await tx.get(ref),v=d.data(),now=Date.now();if(Number(v.points)>=100)throw Error('잔고가 100P 이상입니다.');if(v.supportAt&&now-v.supportAt.toMillis()<86400000)throw Error('지원금은 24시간에 한 번 받을 수 있습니다.');tx.update(ref,{points:Number(v.points)+1000,supportAt:firebase.firestore.FieldValue.serverTimestamp()});});say('1,000P 지원금을 받았습니다.');}catch(e){say(e.message);}}
  /* ── 내 베팅 내역 모달 ────────────────────────────────
     상단 `닉네임 · 포인트` 알약을 누르면 베팅한 경기·픽·배당·금액·예상/획득·상태를 보여 준다.
     닉네임 바로 옆의 ✏️ 로 닉네임을 바로 고칠 수 있다. */
  var betsUnsub = null;
  var STATUS_KO = { open: '베팅중', won: '적중', lost: '미적중', push: '무효' };
  var MARKET_KO = { moneyline: '승무패', spread: '핸디캡', total: '언오버' };
  // 픽 한 줄 표기는 betcard.js 한 곳에서 만든다(여기는 betcard.js 가 늦게 실렸을 때의 대비).
  function pickLabel(x, g) {
    if (window.clutchPickLabel) return window.clutchPickLabel(x, g);
    return (MARKET_KO[x.market] || x.market || '') + ' ' +
      ({ away: '원정', home: '홈', draw: '무승부', over: '오버', under: '언더' }[x.pick] || x.pick || '') +
      (x.line ? ' ' + x.line : '');
  }
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
      '<button type="button" id="betsNick" class="bets-icon" aria-label="닉네임 변경" title="닉네임 변경">✏️</button>' +
      (window.clutchTierBadge ? window.clutchTierBadge(balance, { cls: 'lg' }) : '') +
      '<span>' + fmt(balance) + 'P</span>' +
      '<em class="bets-next">' + esc(hint) + '</em>';
  }
  /* ── 픽별 적중·미적중 판정 ─────────────────────────────
     tools/settle_bets.py 와 같은 기준으로 계산한다. 서버 정산값(pick.status)이
     있으면 그 값을 먼저 쓰고, 아직 정산 전이면 페이지에 실린 경기 결과
     (window.CLUTCH_DATA 의 game.result — app.js 가 실시간 점수까지 덮어쓴다)로
     지금 바로 판정한다. */
  function pickNum(v) {
    if (v == null) return NaN;
    var n = parseFloat(String(v).replace(/^\s*\+/, '').trim());
    return isFinite(n) ? n : NaN;
  }
  var PICK_EPS = 1e-9;
  function pickOutcome(x, g) {
    // → { kind: won | lost | push | live | pre | unknown, score: '4:0' }
    // 표기는 경기 줄과 같게 홈:원정 순서로 적는다(판정은 아래에서 away·home 값으로 한다).
    var r = (g && g.result) || null;
    var score = r && r.awayScore != null && r.homeScore != null
      ? String(r.homeScore) + ':' + String(r.awayScore) : '';
    var st = String((x && x.status) || '');
    if (st === 'won' || st === 'lost' || st === 'push' || st === 'void') {
      return { kind: st === 'void' ? 'push' : st, score: score };
    }
    if (!g) return { kind: 'unknown', score: '' };
    var state = r ? String(r.state || '') : '';
    if (state === 'live') return { kind: 'live', score: score };
    if (state !== 'final') return { kind: 'pre', score: '' };
    var away = Number(r.awayScore), home = Number(r.homeScore);
    if (!isFinite(away) || !isFinite(home)) return { kind: 'pre', score: '' };
    var market = String(x.market || ''), side = String(x.pick || ''), line = pickNum(x.line);
    var kind = '';
    if (market === 'moneyline' || market === 'h2h' || market === '1x2') {
      if (side === 'draw') {
        kind = away === home ? 'won' : 'lost';
      } else if (away === home) {
        // 경기 뒤 data.js 배당이 내려가도, 무승부가 있는 종목(축구)이면 홈·원정은 미적중이다.
        var drawOdds = (g.odds && g.odds.moneyline) ? g.odds.moneyline.draw : null;
        kind = (drawOdds != null || String(g.sport || '') === 'soccer') ? 'lost' : 'push';
      } else {
        kind = ((side === 'away') === (away > home)) ? 'won' : 'lost';
      }
    } else if (market === 'spread' || market === 'handicap') {
      if (!isFinite(line) || (side !== 'home' && side !== 'away')) return { kind: 'unknown', score: score };
      var margin = side === 'home' ? (home + line - away) : (away + line - home);
      kind = Math.abs(margin) < PICK_EPS ? 'push' : (margin > 0 ? 'won' : 'lost');
    } else if (market === 'total' || market === 'ou') {
      if (!isFinite(line) || (side !== 'over' && side !== 'under')) return { kind: 'unknown', score: score };
      var total = away + home;
      kind = Math.abs(total - line) < PICK_EPS ? 'push' : (((side === 'over') === (total > line)) ? 'won' : 'lost');
    }
    return { kind: kind || 'unknown', score: score };
  }
  var OUT_BADGE = { won: ['won', '✅ 적중'], lost: ['lost', '❌ 미적중'], push: ['push', '적특'], live: ['live', 'LIVE'], pre: ['pre', '경기 전'] };
  function pickBadgeHTML(o) {
    var b = OUT_BADGE[o && o.kind];
    if (!b) return '';
    var tail = o.score && (o.kind === 'won' || o.kind === 'lost' || o.kind === 'push' || o.kind === 'live')
      ? ' · ' + o.score : '';
    return '<span class="bp-badge ' + b[0] + '">' + esc(b[1] + tail) + '</span>';
  }
  function betRowHTML(doc, gm) {
    var b = doc && doc.data ? doc.data() : (doc || {});
    // 카드 모양은 betcard.js 한 곳에서 그린다(자유게시판의 '공유한 베팅' 상세와 같은 카드).
    if (window.clutchBetCard) return window.clutchBetCard(b, gm || gameMap());
    var picks = Array.isArray(b.picks) ? b.picks : [];
    var st = String(b.status || 'open');
    var d = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : null;
    var when = d ? (d.getMonth() + 1) + '.' + d.getDate() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) : '';
    var stake = Number(b.stake) || 0;
    var odds = Number(b.combinedOdds) || 0;
    var expect = b.potential != null ? Number(b.potential) : payout(stake, odds);
    var games = gm || gameMap();
    var outs = picks.map(function (x) { return pickOutcome(x, games[x.gameId]); });
    var anyLost = outs.some(function (o) { return o.kind === 'lost'; });
    var allDone = outs.length > 0 && outs.every(function (o) { return o.kind === 'won' || o.kind === 'lost' || o.kind === 'push'; });
    // 슬립 상태는 그대로 두고, 확정된 결과만 배지로 덧붙인다.
    var flag = '';
    if (st === 'open' && anyLost) flag = '<span class="bh-flag lost">미적중 확정</span>';
    else if (st === 'open' && allDone) flag = '<span class="bh-flag won">적중 확정</span>';
    var picksHTML = picks.map(function (x, i) {
      return '<li class="bh-pick">' +
        '<span class="bp-top"><b class="bp-match">' + esc(x.home) + ' vs ' + esc(x.away) + '</b>' +
          pickBadgeHTML(outs[i]) + '</span>' +
        '<span class="bp-meta">' + esc(pickLabel(x, games[x.gameId])) +
        ' · ' + (Number(x.decimal) || 0).toFixed(2) + '배</span></li>';
    }).join('');
    var footRight = st !== 'open'
      ? '획득 ' + fmt(b.payout != null ? b.payout : 0) + 'P'
      : (anyLost ? '미적중 확정 · 정산 대기' : (allDone ? '적중 확정 · 정산 대기' : '결과 기다리는 중'));
    return '<article class="bet-hist ' + esc(st) + (st === 'open' && anyLost ? ' settled-lost' : '') + '">' +
      '<div class="bh-top"><span class="bh-st ' + esc(st) + '">' + esc(statusKo(st)) + '</span>' + flag +
      '<b class="bh-stake">' + fmt(stake) + 'P</b>' +
      '<span class="bh-odds">' + odds.toFixed(2) + '배</span>' +
      (when ? '<span class="bh-when">' + when + '</span>' : '') + '</div>' +
      '<ul class="bh-picks">' + picksHTML + '</ul>' +
      '<div class="bh-foot"><span>예상 ' + fmt(expect) + 'P</span>' +
      '<span>' + esc(footRight) + '</span></div>' +
      '</article>';
  }
  /* 실시간 점수가 갱신되면 모달을 열어 둔 동안 배지도 따라 바뀌게 한다
     (20초마다 화면 내용이 달라졌는지만 확인하고, 달라졌을 때만 다시 그린다). */
  var betsDocs = null, betsSig = '', betsTick = null;
  function betsSignature(docs, games) {
    return docs.map(function (d) {
      var b = d && d.data ? d.data() : (d || {});
      return String(b.status || 'open') + (b.picks || []).map(function (x) {
        var g = games[x.gameId], r = (g && g.result) || {};
        return '#' + x.gameId + ':' + (r.state || '-') + ':' + r.awayScore + ':' + r.homeScore;
      }).join(',');
    }).join(';');
  }
  /* ── 진행 중 / 지난 베팅 나눠 그리기 ───────────────────
     정산 전(open) 베팅은 위쪽에 그대로 펼쳐 두고, 끝난 베팅(적중·미적중·무효)은
     아래 '지난 베팅 내역'에 모아 기본은 접어 둔다. 접힘 여부는 다시 그려도 유지한다. */
  var betsPastOpen = false;
  function betStatusOf(doc) {
    var b = doc && doc.data ? doc.data() : (doc || {});
    var s = String(b.status || 'open');
    return s === 'void' ? 'push' : s;
  }
  function sectionHead(label, count) {
    return '<div class="bets-sec-h"><b>' + label + '</b><em>' + count + '건</em></div>';
  }
  function renderMyBets() {
    var list = el('betsList');
    if (!list || !betsDocs) return;
    if (!betsDocs.length) { list.innerHTML = '<p class="bets-empty">아직 베팅 내역이 없습니다.</p>'; return; }
    var games = gameMap();
    betsSig = betsSignature(betsDocs, games);
    var active = [], past = [];
    betsDocs.forEach(function (d) { (betStatusOf(d) === 'open' ? active : past).push(d); });
    var activeHTML = active.length
      ? active.map(function (d) { return betRowHTML(d, games); }).join('')
      : '<p class="bets-empty bets-none">현재 진행 중인 베팅이 없어요.</p>';
    var pastHTML = past.length
      ? '<section class="bets-sec bets-past-sec">' +
          '<button type="button" id="betsPastToggle" class="bets-toggle" aria-expanded="' + (betsPastOpen ? 'true' : 'false') + '" aria-controls="betsPast">' +
            '<span class="bets-toggle-t">지난 베팅 내역</span>' +
            '<em class="bets-toggle-n">(' + past.length + '건)</em>' +
            '<span class="bets-chev" aria-hidden="true">▾</span>' +
          '</button>' +
          '<div id="betsPast" class="bets-past"' + (betsPastOpen ? '' : ' hidden') + '>' +
            past.map(function (d) { return betRowHTML(d, games); }).join('') +
          '</div>' +
        '</section>'
      : '';
    list.innerHTML =
      '<section class="bets-sec bets-active-sec">' +
        sectionHead('진행 중인 베팅', active.length) +
        '<div class="bets-active">' + activeHTML + '</div>' +
      '</section>' + pastHTML;
  }
  function togglePast() {
    betsPastOpen = !betsPastOpen;
    var btn = el('betsPastToggle'), box = el('betsPast');
    if (btn) btn.setAttribute('aria-expanded', betsPastOpen ? 'true' : 'false');
    if (box) box.hidden = !betsPastOpen;
  }
  function refreshIfStale() {
    if (!betsDocs || !el('betsList')) return;
    var games = gameMap();
    if (betsSignature(betsDocs, games) !== betsSig) renderMyBets();
  }
  function loadMyBets() {
    var list = el('betsList');
    if (!list || !me) return;
    if (betsUnsub) { betsUnsub(); betsUnsub = null; }
    betsUnsub = db.collection('bets').doc(me.uid).collection('items')
      .orderBy('createdAt', 'desc').limit(30)
      .onSnapshot(function (s) {
        betsDocs = s.docs;
        renderMyBets();
      }, function (e) {
        betsDocs = null;
        list.innerHTML = '<p class="bets-empty">내역을 불러오지 못했습니다: ' + esc(e.message) + '</p>';
      });
    if (!betsTick) betsTick = setInterval(refreshIfStale, 20000);
  }
  function closeBets() {
    if (betsUnsub) { betsUnsub(); betsUnsub = null; }
    if (betsTick) { clearInterval(betsTick); betsTick = null; }
    betsDocs = null;
    var w = el('betsModal');
    if (w) w.remove();
  }
  /* 내 베팅 내역 머리의 `로그아웃` → Firebase 세션을 지우고 이 창을 닫는다.
     로그인 상태가 비회원으로 바뀌면 onUser(null) 이 위 알약·Bet 창·로그인 버튼을
     비회원 모습으로 되돌리고, 바뀐 사실은 토스트로 알린다. */
  function logout() {
    if (!auth) return say('Firebase 연결을 확인해 주세요.');
    closeBets();
    auth.signOut().then(function () {
      toast('로그아웃되었습니다.');
    }, function (e) {
      toast('로그아웃하지 못했습니다: ' + ((e && e.message) || '다시 시도해 주세요.'));
    });
  }
  function openBets() {
    if (!me) return login();
    closeBets();
    var wrap = document.createElement('div');
    wrap.id = 'betsModal';
    wrap.className = 'bets-modal';
    wrap.innerHTML = '<div class="bets-box" role="dialog" aria-modal="true" aria-label="내 베팅 내역">' +
      '<div class="bets-head">' +
      '<button type="button" id="betsLogout" class="bets-logout">로그아웃</button>' +
      '<button type="button" id="betsClose" class="bets-icon" aria-label="닫기" title="닫기">×</button></div>' +
      '<div id="betsMe" class="bets-me"></div>' +
      '<div id="betsList" class="bets-list"><p class="bets-empty">불러오는 중…</p></div>' +
      '</div>';
    betsPastOpen = false;
    document.body.appendChild(wrap);
    paintBetsMe();
    loadMyBets();
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) return closeBets();
      if (e.target.closest && e.target.closest('#betsClose')) return closeBets();
      if (e.target.closest && e.target.closest('#betsLogout')) return logout();
      if (e.target.closest && e.target.closest('#betsNick')) return nick();
      if (e.target.closest && e.target.closest('#betsPastToggle')) return togglePast();
    });
    document.addEventListener('keydown', function esc(ev) {
      if (ev.key === 'Escape') { closeBets(); document.removeEventListener('keydown', esc); }
    });
  }

  window.clutchSlipShare=function(){return slip.map(function(x){return {gameId:x.gameId,away:x.away,home:x.home,market:x.market,pick:x.pick,line:x.line,decimal:x.decimal};});};
  window.addEventListener('DOMContentLoaded',mount); if(document.readyState!=='loading')mount();
})();
