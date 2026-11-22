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
  },

  /* 2026-11-20 포틀랜드 124 : 114 밀워키 — 홀리데이, 브리핑이 꿈은 선수 */
  "nba-por-mil-20261120|Jrue Holiday": {
    text: "Jrue Holiday tallied 22 points, 7 assists & 4 steals.",
    ko: "주루 홀리데이가 22점 7어시스트 4스틸을 기록했다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2123631412532424977",
    at: "2026-11-20T04:15:58Z"
  },

  /* 2026-11-20 멤피스 126 : 98 골든스테이트 — 웰스 야투 8-10 */
  "nba-gsw-mem-20261120|Jaylen Wells": {
    text: "Jaylen Wells scored 22 points on 8-of-10 shooting, including 4 threes.",
    ko: "제일런 웰스가 야투 8-10, 3점 4개로 22점을 넣었다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2123631412532424977",
    at: "2026-11-20T04:15:58Z"
  },
  /* 2026-11-20 뉴욕 102 : 99 미네소타 — 타운스 22점 12리바운드 */
  "nba-nyk-min-20261120|Karl-Anthony Towns": {
    text: "Karl-Anthony Towns scored 22 points + 12 rebounds, plus 3 blocks.",
    ko: "칼앤서니 타운스가 22점 12리바운드에 블록 3개를 보탰다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2123631412532424977",
    at: "2026-11-20T04:15:58Z"
  },
  /* 2026-11-20 샌안토니오 124 : 112 LA클리퍼스 — 웸반야마 32점 11리바운드 */
  "nba-lac-sas-20261120|Victor Wembanyama": {
    text: "Victor Wembanyama dropped 32 points + 11 rebounds on 13-of-26 shooting.",
    ko: "빅터 웸반야마가 야투 13-26으로 32점 11리바운드를 기록했다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2123631412532424977",
    at: "2026-11-20T04:15:58Z"
  },

  /* 2026-11-21 클리블랜드 128 : 119 인디애나 — 하든, 캐벌리어스 데뷔 후 최다 51점 */
  "nba-ind-cle-20261121|James Harden": {
    text: "🤯 James Harden: 51 points with 7 threes. He came in averaging 16.2 a game, and his previous season high was 32.",
    ko: "제임스 하든, 3점 7개 포함 51점. 경기 전 평균은 16.2점이었고 직전 시즌 최고 기록은 32점이었다.",
    author: "TheePlusSide",
    handle: "TheePlusSide",
    url: "https://x.com/TheePlusSide/status/2124362235221070065",
    at: "2026-11-22T04:40:00Z"
  },

  /* 2026-11-22 샌안토니오 114 : 91 뉴올리언스 — 웸반야마 50점 19리바운드 5블록 */
  "nba-nop-sas-20261122|Victor Wembanyama": {
    text: "50 and 19 with 5 blocks.. Wemby was playing a different video game than the Pelicans 😂",
    ko: "50점 19리바운드에 블록 5개.. 웸비는 펠리컨스와 다른 게임을 하는 것 같았다 😂",
    author: "BIGDEALSPORTSx",
    handle: "BIGDEALSPORTSx",
    url: "https://x.com/BIGDEALSPORTSx/status/2124369588783837677",
    at: "2026-11-22T05:09:13Z"
  },
  /* 2026-11-22 필라델피아 132 : 129 밀워키 — 엠비드 26점 17리바운드 9어시스트 */
  "nba-mil-phi-20261122|Joel Embiid": {
    text: "Joel Embiid scored 26 points, 17 rebounds & 9 assists.",
    ko: "조엘 엠비드가 26점 17리바운드 9어시스트를 기록했다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2124359645129331002",
    at: "2026-11-22T04:29:42Z"
  },
  /* 2026-11-22 뉴욕 97 : 96 포틀랜드 — 브런슨 30점, 브리지스 버저비터 */
  "nba-por-nyk-20261122|Jalen Brunson": {
    text: "Brunson playing on rookie mode",
    ko: "브런슨이 루키 모드로 뛰고 있다.",
    author: "BIGDEALSPORTSx",
    handle: "BIGDEALSPORTSx",
    url: "https://x.com/BIGDEALSPORTSx/status/2124314779829576138",
    at: "2026-11-22T01:31:26Z"
  },
  /* 2026-11-22 댈러스 110 : 100 LA클리퍼스 — 프레그 22점 6리바운드 8어시스트 */
  "nba-lac-dal-20261122|Cooper Flagg": {
    text: "Cooper Flagg filled the box score with 22 points, 6 rebounds & 8 assists.",
    ko: "쿠퍼 프레그가 22점 6리바운드 8어시스트로 기록지를 가득 채웠다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2124359645129331002",
    at: "2026-11-22T04:29:42Z"
  },
  /* 2026-11-22 미네소타 104 : 95 멤피스 — 맥대니얼스 25점 */
  "nba-mem-min-20261122|Jaden McDaniels": {
    text: "Jaden McDaniels scored 25 points on 11-of-17 shooting.",
    ko: "제이든 맥대니얼스가 야투 11-17로 25점을 넣었다.",
    author: "PropStreak",
    handle: "PropStreak",
    url: "https://x.com/PropStreak/status/2124359645129331002",
    at: "2026-11-22T04:29:42Z"
  }

};
