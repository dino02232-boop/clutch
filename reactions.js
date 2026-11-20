/* =============================================================
   CLUTCH — 경기 후 브리핑 'SNS 반응'
   -------------------------------------------------------------
   X(트위터) 공개 검색으로 실제로 확인한 글만 넣습니다.
   지어낸 문장은 넣지 않습니다.

   키 형식  : "<경기 id>|<선수 이름>"
              - 경기 id  : data.js 의 games[].id (예: nba-utah-lal-20261119)
              - 선수 이름: data.js / ESPN 박스스코어의 표기 그대로 (예: Luka Doncic)
   값 형식  : {
                text  : 카드에 인용할 한 줄 (1~2문장, 원문 그대로 · 말줄임 없이 짧게)
                ko    : (선택) 원문 뜻을 옮긴 한국어 한 줄. 원문은 그대로 두고 아래에 작게 함께 나옵니다.
                        숫자·선수명·팀명·기록은 원문과 똑같이, 없는 내용은 덧붙이지 않습니다.
                author: 계정 표시 이름 (예: StatMuse)
                handle: @ 를 뺀 계정명 (예: statmuse)
                url   : 그 글의 원문 링크 (필수)
                at    : 글 작성 시각, ISO 8601 (UTC)
              }

   · 같은 경기·선수에 반응이 여러 개면 최신 글 하나만 화면에 나옵니다.
   · 키가 맞지 않거나 url 이 없으면 카드에 아무것도 그리지 않습니다
     (기존 레이아웃은 그대로).
   · 자동 수집을 붙일 때도 이 객체에 같은 키로 덧붙이면 됩니다.
   ============================================================= */
window.CLUTCH_REACTIONS = {

  /* 2026-11-19 유타 109 : 97 레이커스 — 유타 3연패 뒤 LA 두 팀 연속 격파 */
  "nba-utah-lal-20261119|Keyonte George": {
    text: "Keyonte George vs LA: 30 PTS 10 AST. Utah with back-to-back wins after a 12-game losing skid.",
    ko: "케이온테 조지, LA전 30점 10어시스트. 유타는 12연패 뒤 2연승을 달렸다.",
    author: "StatMuse",
    handle: "statmuse",
    url: "https://x.com/statmuse/status/2123288234432381135",
    at: "2026-11-19T05:32:18Z"
  },
  "nba-utah-lal-20261119|Luka Doncic": {
    text: "Luka Doncic took the blame for last night's loss to the Jazz.",
    ko: "루카 돈치치, 어젯밤 재즈전 패배의 책임을 자신에게 돌렸다.",
    author: "Lakers Nation",
    handle: "LakersNation",
    url: "https://x.com/LakersNation/status/2123493127709204798",
    at: "2026-11-19T19:06:28Z"
  },

  /* 2026-11-19 댈러스 116 : 94 골든스테이트 — 쿠퍼 플래그 33점 */
  "nba-gsw-dal-20261119|Cooper Flagg": {
    text: "Cooper Flagg vs Golden State: 33 PTS 5 REB 9 AST 3 STL 11-15 FG +32. Only LeBron has more 30 PT games as a teenager.",
    ko: "쿠퍼 플래그, 골든스테이트전 33점 5리바운드 9어시스트 3스틸 야투 11-15, +32. 10대 때 30점 이상 경기는 르브론만 더 많다.",
    author: "StatMuse",
    handle: "statmuse",
    url: "https://x.com/statmuse/status/2123257472320164034",
    at: "2026-11-19T03:30:04Z"
  },

  /* 2026-11-20 포틀랜드 124 : 114 밀워키 — 릴라드, 친정팀 상대 시즌 최다 33점 */
  "nba-por-mil-20261120|Damian Lillard": {
    text: "DAME REVENGE GAME. In his first showdown against Milwaukee since returning to Portland, Damian Lillard fired 33 points to help the Trail Blazers send the Bucks to their 12th straight loss.",
    ko: "데임 복수전. 포틀랜드 복귀 후 첫 밀워키전에서 데미안 릴라드가 33점을 터뜨려, 트레일 블레이저스가 밀워키를 12연패로 몰아넣었다.",
    author: "One Sports",
    handle: "OneSportsPHL",
    url: "https://x.com/OneSportsPHL/status/2123646541055623264",
    at: "2026-11-20T05:16:05Z"
  }

};
