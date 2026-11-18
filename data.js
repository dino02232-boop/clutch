/* =============================================================
   CLUTCH — 카드 데이터
   -------------------------------------------------------------
   이 파일만 고치면 사이트 카드가 바뀝니다. (빌드 도구 없음)
   브라우저에서 index.html 을 그냥 열어도 동작하도록 JSON 대신
   전역 변수(window.CLUTCH_DATA)로 데이터를 넣습니다.

   ⚠️ 축구·야구·배구 카드는 "샘플 데이터"입니다. 형식을 보여주기 위한 예시로,
      실제 경기 일정·결과·부상 정보가 아닙니다.
      (11월은 KBO 정규시즌·포스트시즌이 끝난 시기라 야구 샘플의
       날짜는 실제 편성과 맞지 않습니다. 배구 V리그 카드 역시 실존
       구단명을 빌린 가상의 대진 예시입니다. 형식 확인용으로만 보세요.)

   ✅ NBA 2026-11-19 카드는 ESPN 공개 API 에서 받은 실제 일정·전적·부상 명단입니다.
      이 구간(NBA-AUTO 표식 사이)은 work/fetch_nba.py 가 자동으로 다시 채웁니다.
      손으로 고치지 마세요:  python3 work/fetch_nba.py --date 2026-11-19 --write

   [스키마]
   version    : 데이터 형식 버전(숫자). 지금은 1.
   updatedAt  : 데이터를 만든 시각. ISO 8601 +09:00 형식.
   sports[]   : 종목 목록. { id, name, icon }
                id  = "soccer" | "baseball" | "basketball" | "volleyball"
                (탭 순서는 이 배열 순서를 그대로 따릅니다)
   days[]     : 브리핑 날짜별 묶음.
     date     : "YYYY-MM-DD" (KST 기준 날짜)
     games[]  : 그 날의 경기 카드. 아래 [경기 카드] 참고.

   [경기 카드]
   id         : 고유 문자열 (영문/숫자/하이픈)
   sport      : sports[].id 중 하나
   source     : (선택) "espn" 이면 ESPN 실제 데이터. 없으면 샘플.
                화면 오른쪽 위 칩이 이 값으로 '샘플 데이터 / ESPN 실제 데이터'를 고릅니다.
   league     : 리그 표기 (예: "NBA", "UCL", "KBO")
   start      : 경기 시작 시각. ISO 8601 +09:00 (예: "2026-11-19T10:00:00+09:00")
   venue      : (선택) 경기장 이름
   away/home  : 팀 정보 { name, abbr, record, badges[] }
                name   = 화면에 보이는 팀 이름
                abbr   = 3글자 약어
                record = 전적/순위 요약 ("12승 2패", "리그 페이즈 4승" 등)
                badges = [{ text, tone }]  tone: "hot" | "rank" (생략 시 기본)
   tags[]     : 카드 위쪽 태그 [{ text, tone }]
                tone: "warn" | "hot" | "info" (생략 시 회색)
   rows[]     : 카드 본문 3줄 내외 [{ kind, label, text }]
                kind: "flow"(흐름) | "inj"(부상 변수) | "watch"(관전 포인트)
                label은 화면에 보이는 제목, kind는 색만 정합니다.
                text 안에서 **굵게** 를 쓰면 굵게 표시됩니다.
   details    : (선택) 카드 펼쳤을 때 내용
     injuries[]   : [{ team, player, note, status }]
                    status: "OUT" | "DOUBTFUL" | "DAY-TO-DAY" | "NONE"
     checkpoints[]: ["**소제목** — 설명", ...] (펼친 패널의 번호 목록)
     note         : (선택) 패널 맨 아래 작은 안내문
   ============================================================= */

window.CLUTCH_DATA = {
  version: 1,
  updatedAt: "2026-11-18T22:58:11+09:00",

  sports: [
    { id: "soccer", name: "축구", icon: "⚽" },
    { id: "baseball", name: "야구", icon: "⚾" },
    { id: "basketball", name: "농구", icon: "🏀" },
    { id: "volleyball", name: "배구", icon: "🏐" }
  ],

  days: [
    /* ── 2026-11-19 (목) ─────────────────────────────────── */
    {
      date: "2026-11-19",
      games: [
        {
          id: "ucl-mci-rma-1119",
          sport: "soccer",
          league: "UCL",
          start: "2026-11-19T05:00:00+09:00",
          venue: "에티하드 스타디움",
          away: {
            name: "맨체스터 시티",
            abbr: "MCI",
            record: "리그 페이즈 3승 1무",
            badges: [{ text: "홈 3연승", tone: "hot" }]
          },
          home: {
            name: "레알 마드리드",
            abbr: "RMA",
            record: "리그 페이즈 4승",
            badges: [{ text: "4연승", tone: "hot" }]
          },
          tags: [
            { text: "중원 2명 결장", tone: "warn" },
            { text: "리그 페이즈 5차전", tone: "info" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "리그 페이즈 5차전. 두 팀 모두 상위권에 붙어 있어 승점 3점이 순위표를 크게 흔듭니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "시티는 중원 두 자리가 비고, 레알은 왼쪽 수비수가 당일 체크입니다. 중원 숫자 싸움이 점유율로 바로 이어지는 구조."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "시티의 전방 압박이 레알의 후방 빌드업을 끊느냐, 레알의 측면 전환이 먼저 열리느냐."
            }
          ],
          details: {
            injuries: [
              { team: "MCI", player: "로드리", note: "무릎", status: "OUT" },
              { team: "MCI", player: "제러미 도쿠", note: "햄스트링", status: "DOUBTFUL" },
              { team: "RMA", player: "프랑 가르시아", note: "발목 · 당일 체크", status: "DAY-TO-DAY" }
            ],
            checkpoints: [
              "**시티 중원 리듬** — 로드리가 빠지면 빌드업 첫 패스의 각도가 달라집니다. 후방에서 전진 패스가 끊기면 측면 고립이 반복됩니다.",
              "**레알 왼쪽 라인** — 프랑 가르시아가 뛰지 못하면 측면 커버가 안쪽으로 당겨지고, 시티 오른쪽 공격 숫자가 늘어납니다.",
              "**세트피스** — 두 팀 모두 세트피스 득점 비중이 높습니다. 전반 파울 수가 경기 흐름을 바꿀 수 있습니다."
            ],
            note: "라인업은 킥오프 1시간 전 공식 발표로 확정됩니다."
          }
        },

        {
          id: "ucl-liv-fcb-1119",
          sport: "soccer",
          league: "UCL",
          start: "2026-11-19T05:00:00+09:00",
          venue: "안필드",
          away: {
            name: "바이에른 뮌헨",
            abbr: "FCB",
            record: "리그 페이즈 4승",
            badges: [{ text: "리그 선두", tone: "rank" }]
          },
          home: {
            name: "리버풀",
            abbr: "LIV",
            record: "리그 페이즈 2승 1무 1패",
            badges: [{ text: "안필드 무패", tone: "hot" }]
          },
          tags: [
            { text: "수비 라인 재편", tone: "warn" },
            { text: "원정 3연전 1차전", tone: "info" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "리그 페이즈 5차전. 뮌헨은 원정 3연전의 첫 경기, 리버풀은 홈에서 승점을 쌓아야 하는 위치입니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "리버풀은 센터백 한 자리가 비어 라인 높이를 조절해야 하고, 뮌헨은 최전방 한 명이 당일 체크입니다."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "리버풀의 전방 압박과 뮌헨의 후방 빌드업, 그리고 수비 라인 뒤에 남는 공간을 누가 먼저 쓰느냐."
            }
          ],
          details: {
            injuries: [
              { team: "LIV", player: "이브라히마 코나테", note: "허벅지", status: "OUT" },
              { team: "LIV", player: "코디 각포", note: "발목 · 당일 체크", status: "DOUBTFUL" },
              { team: "FCB", player: "자말 무시알라", note: "무릎", status: "DAY-TO-DAY" }
            ],
            checkpoints: [
              "**리버풀 수비 라인** — 센터백 한 자리가 바뀌면 라인 높이가 낮아집니다. 그만큼 중원과의 간격이 벌어져 뮌헨이 그 공간을 쓸 수 있습니다.",
              "**뮌헨 후방 빌드업** — 리버풀 전방 압박의 첫 방향을 뮌헨이 어떻게 벗어나느냐가 원정 경기의 첫 변수입니다.",
              "**측면 뒷공간** — 뮌헨 풀백이 올라간 자리를 리버풀 윙어가 노리는 장면이 반복될 수 있습니다."
            ],
            note: "라인업은 킥오프 1시간 전 공식 발표로 확정됩니다."
          }
        },

        {
          id: "kbo-lg-hanwha-1119",
          sport: "baseball",
          league: "KBO",
          start: "2026-11-19T18:30:00+09:00",
          venue: "잠실야구장",
          away: {
            name: "LG 트윈스",
            abbr: "LG",
            record: "정규시즌 2위",
            badges: [{ text: "원정 4연승", tone: "hot" }]
          },
          home: {
            name: "한화 이글스",
            abbr: "한화",
            record: "정규시즌 1위",
            badges: [{ text: "홈 6연승", tone: "hot" }]
          },
          tags: [
            { text: "불펜 소모", tone: "warn" },
            { text: "시리즈 3차전", tone: "info" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "시리즈 3차전. 1·2차전을 나눠 가져 양 팀 필승조 소모가 비슷한 상태로 3차전에 들어옵니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "양 팀 모두 필승조 한 명씩 이틀 연투로 가용성이 떨어졌습니다. 선발이 6회를 넘기느냐가 그대로 승부처입니다."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "한화 중심 타선이 LG 선발의 초구 승부를 얼마나 끌어내느냐, LG 1·2번이 출루로 앞 타석을 만드느냐."
            }
          ],
          details: {
            injuries: [
              { team: "LG", player: "함덕주", note: "이틀 연투 · 컨디션", status: "DAY-TO-DAY" },
              { team: "한화", player: "김서현", note: "이틀 연투 · 컨디션", status: "DAY-TO-DAY" },
              { team: "LG", player: "문보경", note: "옆구리", status: "DOUBTFUL" }
            ],
            checkpoints: [
              "**선발 이닝** — 양 팀 선발이 6회를 넘기면 필승조를 1이닝씩 아껴 쓸 수 있습니다. 5회 이전 강판이 나오면 불펜 매치업이 길어집니다.",
              "**중심 타선 앞 출루** — 한화는 1·2번 출루율이 높고, LG는 좌완 선발에 강한 타자들이 3·4번에 몰려 있습니다.",
              "**주루와 수비** — 시리즈 초반 실책 2개가 모두 득점으로 이어졌습니다. 한 점 승부에서 수비 집중력이 갈릴 수 있습니다."
            ],
            note: "출전 선수 명단은 경기 전 공식 발표를 확인하세요."
          }
        },

        {
          id: "kbo-kia-samsung-1119",
          sport: "baseball",
          league: "KBO",
          start: "2026-11-19T18:30:00+09:00",
          venue: "광주-기아 챔피언스 필드",
          away: {
            name: "KIA 타이거즈",
            abbr: "KIA",
            record: "정규시즌 5위",
            badges: [{ text: "원정 3연승", tone: "hot" }]
          },
          home: {
            name: "삼성 라이온즈",
            abbr: "삼성",
            record: "정규시즌 4위",
            badges: [{ text: "홈 3승 1패", tone: "rank" }]
          },
          tags: [
            { text: "단기전 첫 경기", tone: "info" },
            { text: "선발 맞대결", tone: "warn" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "단기전 첫 경기. KIA는 원정 3연승으로 올라왔고, 삼성은 홈에서 시리즈를 시작합니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "KIA 외야수 한 명이 수비는 가능하지만 타격 컨디션이 떨어져 있습니다. 삼성은 포수 백업이 어깨 관리 중입니다."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "양 팀 선발의 이닝 소화력. 첫 경기를 잡는 쪽이 불펜을 하루 더 아끼고 시리즈를 끌고 갑니다."
            }
          ],
          details: {
            injuries: [
              { team: "KIA", player: "나성범", note: "타격 컨디션", status: "DAY-TO-DAY" },
              { team: "삼성", player: "강민호", note: "어깨 관리", status: "DOUBTFUL" }
            ],
            checkpoints: [
              "**선발 맞대결** — 두 선발 모두 좌타자 상대 피안타율이 낮습니다. 좌타 라인이 많은 쪽이 초반에 불리할 수 있습니다.",
              "**불펜 가용성** — KIA 필승조는 사흘 휴식, 삼성 필승조는 이틀 휴식입니다. 후반 접전에서 누가 더 신선한지가 변수입니다.",
              "**광주 구장 변수** — 외야 바람이 강한 날은 플라이볼이 살아납니다. 장타보다 뜬공 승부가 늘어날 수 있습니다."
            ],
            note: "출전 선수 명단은 경기 전 공식 발표를 확인하세요."
          }
        },

        /* ── NBA 실제 데이터 · work/fetch_nba.py 가 생성/갱신 ── */
        /* NBA-AUTO 2026-11-19 START */
        {
          "id": "nba-hou-ind-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T09:00:00+09:00",
          "venue": "Gainbridge Fieldhouse",
          "away": {
            "name": "휴스턴 로키츠",
            "abbr": "HOU",
            "record": "11승 4패",
            "badges": [
              {
                "text": "원정 4승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "인디애나 페이서스",
            "abbr": "IND",
            "record": "5승 9패",
            "badges": [
              {
                "text": "홈 2승 4패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 4명",
              "tone": "warn"
            },
            {
              "text": "평균 117.8점 · 112.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**휴스턴 로키츠** 11승 4패(원정 4승 3패, 최근 5경기 4승 1패), **인디애나 페이서스** 5승 9패(홈 2승 4패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "휴스턴 로키츠 부상 명단 3명(결장 1명), 인디애나 페이서스 5명(결장 3명). 양 팀 합쳐 8명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.8점 대 112.1점**, 평균 리바운드 45.7개 대 41.6개, 3점 성공률 37.1% 대 32.8%. 평균 득점 차 5.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "HOU",
                "player": "Clint Capela",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "HOU",
                "player": "Amen Thompson",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "HOU",
                "player": "Julian Phillips",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "IND",
                "player": "Tyrese Haliburton",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "IND",
                "player": "Johnny Furphy",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "IND",
                "player": "Ben Sheppard",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "IND",
                "player": "T.J. McConnell",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "IND",
                "player": "Andrew Nembhard",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 휴스턴 로키츠 11승 4패(원정 4승 3패) / 인디애나 페이서스 5승 9패(홈 2승 4패).",
              "**최근 전적** — 휴스턴 로키츠 최근 5경기 4승 1패(직전 경기 110-128 패) / 인디애나 페이서스 최근 5경기 2승 3패(직전 경기 124-131 패).",
              "**부상 명단** — 휴스턴 로키츠: Clint Capela, Amen Thompson, Julian Phillips / 인디애나 페이서스: Tyrese Haliburton, Johnny Furphy, Ben Sheppard, T.J. McConnell 외 1명."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-mem-cle-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T09:00:00+09:00",
          "venue": "Rocket Arena",
          "away": {
            "name": "멤피스 그리즐리스",
            "abbr": "MEM",
            "record": "10승 4패",
            "badges": [
              {
                "text": "원정 7승 0패",
                "tone": "hot"
              }
            ]
          },
          "home": {
            "name": "클리블랜드 캐벌리어스",
            "abbr": "CLE",
            "record": "8승 7패",
            "badges": [
              {
                "text": "홈 6승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 8명",
              "tone": "warn"
            },
            {
              "text": "평균 121.7점 · 118.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**멤피스 그리즐리스** 10승 4패(원정 7승 0패, 최근 5경기 4승 1패), **클리블랜드 캐벌리어스** 8승 7패(홈 6승 2패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "멤피스 그리즐리스 부상 명단 5명(결장 5명), 클리블랜드 캐벌리어스 5명(결장 3명). 양 팀 합쳐 10명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **121.7점 대 118.1점**, 평균 리바운드 47.4개 대 45.9개, 3점 성공률 39.5% 대 36.7%. 3점 성공률 차 2.8%p가 외곽 승부에서 어떻게 드러나는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "MEM",
                "player": "GG Jackson",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "MEM",
                "player": "Isaiah Stewart",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "MEM",
                "player": "Ty Jerome",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "MEM",
                "player": "Scotty Pippen Jr.",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "MEM",
                "player": "Richie Saunders",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "CLE",
                "player": "Nae'Qwan Tomlin",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "CLE",
                "player": "Sam Merrill",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "CLE",
                "player": "Evan Mobley",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "CLE",
                "player": "Jaylon Tyson",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "CLE",
                "player": "Peyton Watson",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 멤피스 그리즐리스 10승 4패(원정 7승 0패) / 클리블랜드 캐벌리어스 8승 7패(홈 6승 2패).",
              "**최근 전적** — 멤피스 그리즐리스 최근 5경기 4승 1패(직전 경기 136-120 승) / 클리블랜드 캐벌리어스 최근 5경기 3승 2패(직전 경기 126-115 승).",
              "**부상 명단** — 멤피스 그리즐리스: GG Jackson, Isaiah Stewart, Ty Jerome, Scotty Pippen Jr. 외 1명 / 클리블랜드 캐벌리어스: Nae'Qwan Tomlin, Sam Merrill, Evan Mobley, Jaylon Tyson 외 1명."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-mil-mia-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T09:00:00+09:00",
          "venue": "Kaseya Center",
          "away": {
            "name": "밀워키 벅스",
            "abbr": "MIL",
            "record": "1승 13패",
            "badges": [
              {
                "text": "원정 0승 6패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "마이애미 히트",
            "abbr": "MIA",
            "record": "8승 6패",
            "badges": [
              {
                "text": "홈 4승 3패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 1명",
              "tone": "warn"
            },
            {
              "text": "평균 106.1점 · 119.4점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**밀워키 벅스** 1승 13패(원정 0승 6패, 최근 5경기 0승 5패), **마이애미 히트** 8승 6패(홈 4승 3패, 최근 5경기 5승 0패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "밀워키 벅스 부상 명단 1명(결장 1명), 마이애미 히트 3명(결장 0명). 양 팀 합쳐 4명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **106.1점 대 119.4점**, 평균 리바운드 45.4개 대 42.6개, 3점 성공률 34.1% 대 34.3%. 평균 득점 차 13.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "MIL",
                "player": "Ousmane Dieng",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "MIA",
                "player": "Myron Gardner",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "MIA",
                "player": "Nikola Jovic",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "MIA",
                "player": "Bam Adebayo",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 밀워키 벅스 1승 13패(원정 0승 6패) / 마이애미 히트 8승 6패(홈 4승 3패).",
              "**최근 전적** — 밀워키 벅스 최근 5경기 0승 5패(직전 경기 106-113 패) / 마이애미 히트 최근 5경기 5승 0패(직전 경기 128-110 승).",
              "**부상 명단** — 밀워키 벅스: Ousmane Dieng / 마이애미 히트: Myron Gardner, Nikola Jovic, Bam Adebayo."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-phi-orl-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T09:00:00+09:00",
          "venue": "Kia Center",
          "away": {
            "name": "필라델피아 세븐티식서스",
            "abbr": "PHI",
            "record": "12승 3패",
            "badges": [
              {
                "text": "원정 6승 1패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "올랜도 매직",
            "abbr": "ORL",
            "record": "6승 7패",
            "badges": [
              {
                "text": "홈 1승 4패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 8명",
              "tone": "warn"
            },
            {
              "text": "평균 114.1점 · 108.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**필라델피아 세븐티식서스** 12승 3패(원정 6승 1패, 최근 5경기 4승 1패), **올랜도 매직** 6승 7패(홈 1승 4패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "필라델피아 세븐티식서스 부상 명단 4명(결장 4명), 올랜도 매직 4명(결장 4명). 양 팀 합쳐 8명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.1점 대 108.8점**, 평균 리바운드 43.1개 대 43.2개, 3점 성공률 35.2% 대 34.0%. 평균 득점 차 5.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "PHI",
                "player": "Dominick Barlow",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "PHI",
                "player": "Jaylen Brown",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "PHI",
                "player": "Adem Bona",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "PHI",
                "player": "Ariel Hukporti",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ORL",
                "player": "Izaiyah Nelson",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ORL",
                "player": "Jonathan Isaac",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ORL",
                "player": "Noah Penda",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ORL",
                "player": "Paolo Banchero",
                "note": "결장",
                "status": "OUT"
              }
            ],
            "checkpoints": [
              "**전적** — 필라델피아 세븐티식서스 12승 3패(원정 6승 1패) / 올랜도 매직 6승 7패(홈 1승 4패).",
              "**최근 전적** — 필라델피아 세븐티식서스 최근 5경기 4승 1패(직전 경기 135-123 승) / 올랜도 매직 최근 5경기 4승 1패(직전 경기 115-105 승).",
              "**부상 명단** — 필라델피아 세븐티식서스: Dominick Barlow, Jaylen Brown, Adem Bona, Ariel Hukporti / 올랜도 매직: Izaiyah Nelson, Jonathan Isaac, Noah Penda, Paolo Banchero."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-chi-bkn-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T09:30:00+09:00",
          "venue": "Barclays Center",
          "away": {
            "name": "시카고 불스",
            "abbr": "CHI",
            "record": "3승 10패",
            "badges": [
              {
                "text": "원정 2승 6패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "브루클린 네츠",
            "abbr": "BKN",
            "record": "3승 10패",
            "badges": [
              {
                "text": "홈 1승 4패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 2명",
              "tone": "warn"
            },
            {
              "text": "평균 114.6점 · 111.2점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**시카고 불스** 3승 10패(원정 2승 6패, 최근 5경기 2승 3패), **브루클린 네츠** 3승 10패(홈 1승 4패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "시카고 불스는 부상 명단 3명(결장 2명). 브루클린 네츠는 ESPN 부상 명단에 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.6점 대 111.2점**, 평균 리바운드 43.8개 대 42.2개, 3점 성공률 30.8% 대 36.2%. 3점 성공률 차 5.4%p가 외곽 승부에서 어떻게 드러나는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "CHI",
                "player": "Tobe Awaka",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "CHI",
                "player": "Caleb Wilson",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "CHI",
                "player": "Patrick Williams",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 시카고 불스 3승 10패(원정 2승 6패) / 브루클린 네츠 3승 10패(홈 1승 4패).",
              "**최근 전적** — 시카고 불스 최근 5경기 2승 3패(직전 경기 115-126 패) / 브루클린 네츠 최근 5경기 1승 4패(직전 경기 123-135 패).",
              "**부상 명단** — 시카고 불스: Tobe Awaka, Caleb Wilson, Patrick Williams / 브루클린 네츠: 없음."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-was-tor-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T09:30:00+09:00",
          "venue": "Scotiabank Arena",
          "away": {
            "name": "워싱턴 위저즈",
            "abbr": "WAS",
            "record": "4승 11패",
            "badges": [
              {
                "text": "원정 2승 6패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "토론토 랩터스",
            "abbr": "TOR",
            "record": "5승 9패",
            "badges": [
              {
                "text": "홈 2승 5패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 6명",
              "tone": "warn"
            },
            {
              "text": "평균 111.3점 · 112.9점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**워싱턴 위저즈** 4승 11패(원정 2승 6패, 최근 5경기 0승 5패), **토론토 랩터스** 5승 9패(홈 2승 5패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "워싱턴 위저즈 부상 명단 5명(결장 4명), 토론토 랩터스 3명(결장 2명). 양 팀 합쳐 8명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.3점 대 112.9점**, 평균 리바운드 41.7개 대 40.6개, 3점 성공률 31.5% 대 33.3%. 두 팀 시즌 지표가 비슷해 초반 흐름이 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "WAS",
                "player": "Tristan Vukcevic",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "WAS",
                "player": "Reece Beekman",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "WAS",
                "player": "Justin Champagnie",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "WAS",
                "player": "Jamir Watkins",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "WAS",
                "player": "Felix Okpara",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "TOR",
                "player": "Kawhi Leonard",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "TOR",
                "player": "Nate Bittle",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "TOR",
                "player": "Kevin McCullar Jr.",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 워싱턴 위저즈 4승 11패(원정 2승 6패) / 토론토 랩터스 5승 9패(홈 2승 5패).",
              "**최근 전적** — 워싱턴 위저즈 최근 5경기 0승 5패(직전 경기 120-136 패) / 토론토 랩터스 최근 5경기 0승 5패(직전 경기 102-111 패).",
              "**부상 명단** — 워싱턴 위저즈: Tristan Vukcevic, Reece Beekman, Justin Champagnie, Jamir Watkins 외 1명 / 토론토 랩터스: Kawhi Leonard, Nate Bittle, Kevin McCullar Jr.."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-atl-okc-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T10:00:00+09:00",
          "venue": "Paycom Center",
          "away": {
            "name": "애틀랜타 호크스",
            "abbr": "ATL",
            "record": "8승 6패",
            "badges": [
              {
                "text": "원정 5승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "오클라호마시티 썬더",
            "abbr": "OKC",
            "record": "9승 5패",
            "badges": [
              {
                "text": "홈 5승 0패",
                "tone": "hot"
              }
            ]
          },
          "tags": [
            {
              "text": "결장 11명",
              "tone": "warn"
            },
            {
              "text": "평균 117.8점 · 112.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**애틀랜타 호크스** 8승 6패(원정 5승 3패, 최근 5경기 3승 2패), **오클라호마시티 썬더** 9승 5패(홈 5승 0패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "애틀랜타 호크스 부상 명단 6명(결장 6명), 오클라호마시티 썬더 5명(결장 5명). 양 팀 합쳐 11명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.8점 대 112.1점**, 평균 리바운드 44.9개 대 46.1개, 3점 성공률 33.8% 대 34.2%. 평균 득점 차 5.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "ATL",
                "player": "Jock Landale",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ATL",
                "player": "Kingston Flemings",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ATL",
                "player": "Asa Newell",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ATL",
                "player": "CJ McCollum",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ATL",
                "player": "Mouhamed Gueye",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "ATL",
                "player": "Henri Veesaar",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "OKC",
                "player": "Thomas Sorber",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "OKC",
                "player": "Jaylin Williams",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "OKC",
                "player": "Cason Wallace",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "OKC",
                "player": "Chet Holmgren",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "OKC",
                "player": "Jalen Williams",
                "note": "결장",
                "status": "OUT"
              }
            ],
            "checkpoints": [
              "**전적** — 애틀랜타 호크스 8승 6패(원정 5승 3패) / 오클라호마시티 썬더 9승 5패(홈 5승 0패).",
              "**최근 전적** — 애틀랜타 호크스 최근 5경기 3승 2패(직전 경기 113-106 승) / 오클라호마시티 썬더 최근 5경기 2승 3패(직전 경기 125-103 승).",
              "**부상 명단** — 애틀랜타 호크스: Jock Landale, Kingston Flemings, Asa Newell, CJ McCollum 외 2명 / 오클라호마시티 썬더: Thomas Sorber, Jaylin Williams, Cason Wallace, Chet Holmgren 외 1명."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-det-nop-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T10:00:00+09:00",
          "venue": "Smoothie King Center",
          "away": {
            "name": "디트로이트 피스턴스",
            "abbr": "DET",
            "record": "9승 4패",
            "badges": [
              {
                "text": "원정 6승 2패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "뉴올리언스 펠리컨스",
            "abbr": "NOP",
            "record": "5승 10패",
            "badges": [
              {
                "text": "홈 4승 6패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 10명",
              "tone": "warn"
            },
            {
              "text": "평균 114.8점 · 115.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**디트로이트 피스턴스** 9승 4패(원정 6승 2패, 최근 5경기 3승 2패), **뉴올리언스 펠리컨스** 5승 10패(홈 4승 6패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "디트로이트 피스턴스 부상 명단 5명(결장 5명), 뉴올리언스 펠리컨스 5명(결장 5명). 양 팀 합쳐 10명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 115.8점**, 평균 리바운드 44.3개 대 42.1개, 3점 성공률 36.0% 대 33.3%. 3점 성공률 차 2.7%p가 외곽 승부에서 어떻게 드러나는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "DET",
                "player": "Isaiah Joe",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DET",
                "player": "Duncan Robinson",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DET",
                "player": "Taurean Prince",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DET",
                "player": "Ronald Holland II",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DET",
                "player": "Jalen Duren",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "NOP",
                "player": "Bennedict Mathurin",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "NOP",
                "player": "Bryce McGowens",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "NOP",
                "player": "Trendon Watford",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "NOP",
                "player": "Trey Murphy III",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "NOP",
                "player": "Dejounte Murray",
                "note": "결장",
                "status": "OUT"
              }
            ],
            "checkpoints": [
              "**전적** — 디트로이트 피스턴스 9승 4패(원정 6승 2패) / 뉴올리언스 펠리컨스 5승 10패(홈 4승 6패).",
              "**최근 전적** — 디트로이트 피스턴스 최근 5경기 3승 2패(직전 경기 105-93 승) / 뉴올리언스 펠리컨스 최근 5경기 1승 4패(직전 경기 115-94 승).",
              "**부상 명단** — 디트로이트 피스턴스: Isaiah Joe, Duncan Robinson, Taurean Prince, Ronald Holland II 외 1명 / 뉴올리언스 펠리컨스: Bennedict Mathurin, Bryce McGowens, Trendon Watford, Trey Murphy III 외 1명."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-gsw-dal-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T10:00:00+09:00",
          "venue": "American Airlines Center",
          "away": {
            "name": "골든스테이트 워리어스",
            "abbr": "GSW",
            "record": "8승 6패",
            "badges": [
              {
                "text": "원정 2승 5패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "댈러스 매버릭스",
            "abbr": "DAL",
            "record": "7승 7패",
            "badges": [
              {
                "text": "홈 5승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 8명",
              "tone": "warn"
            },
            {
              "text": "평균 115.1점 · 112.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**골든스테이트 워리어스** 8승 6패(원정 2승 5패, 최근 5경기 2승 3패), **댈러스 매버릭스** 7승 7패(홈 5승 2패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "골든스테이트 워리어스 부상 명단 7명(결장 5명), 댈러스 매버릭스 7명(결장 3명). 양 팀 합쳐 14명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **115.1점 대 112.1점**, 평균 리바운드 44.9개 대 43.3개, 3점 성공률 38.2% 대 33.5%. 3점 성공률 차 4.7%p가 외곽 승부에서 어떻게 드러나는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "GSW",
                "player": "Stephen Curry",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "GSW",
                "player": "Brandon Williams",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "GSW",
                "player": "Kristaps Porzingis",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "GSW",
                "player": "Moses Moody",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "GSW",
                "player": "Jimmy Butler III",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "GSW",
                "player": "Draymond Green",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "GSW",
                "player": "Al Horford",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "DAL",
                "player": "Sergio de Larrea",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DAL",
                "player": "Dereck Lively II",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DAL",
                "player": "Tarik Biberovic",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "DAL",
                "player": "Walter Clayton Jr.",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "DAL",
                "player": "Tobi Lawal",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "DAL",
                "player": "Max Christie",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "DAL",
                "player": "Santi Aldama",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 골든스테이트 워리어스 8승 6패(원정 2승 5패) / 댈러스 매버릭스 7승 7패(홈 5승 2패).",
              "**최근 전적** — 골든스테이트 워리어스 최근 5경기 2승 3패(직전 경기 94-115 패) / 댈러스 매버릭스 최근 5경기 2승 3패(직전 경기 94-131 패).",
              "**부상 명단** — 골든스테이트 워리어스: Stephen Curry, Brandon Williams, Kristaps Porzingis, Moses Moody 외 3명 / 댈러스 매버릭스: Sergio de Larrea, Dereck Lively II, Tarik Biberovic, Walter Clayton Jr. 외 3명."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-bos-den-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T11:30:00+09:00",
          "venue": "Ball Arena",
          "away": {
            "name": "보스턴 셀틱스",
            "abbr": "BOS",
            "record": "11승 3패",
            "badges": [
              {
                "text": "원정 5승 2패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "덴버 너기츠",
            "abbr": "DEN",
            "record": "7승 5패",
            "badges": [
              {
                "text": "홈 2승 3패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 1명",
              "tone": "warn"
            },
            {
              "text": "평균 114.8점 · 113.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**보스턴 셀틱스** 11승 3패(원정 5승 2패, 최근 5경기 4승 1패), **덴버 너기츠** 7승 5패(홈 2승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "덴버 너기츠는 부상 명단 1명(결장 1명). 보스턴 셀틱스는 ESPN 부상 명단에 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 113.8점**, 평균 리바운드 44.9개 대 41.7개, 3점 성공률 38.2% 대 34.5%. 3점 성공률 차 3.7%p가 외곽 승부에서 어떻게 드러나는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "DEN",
                "player": "Julian Strawther",
                "note": "결장",
                "status": "OUT"
              }
            ],
            "checkpoints": [
              "**전적** — 보스턴 셀틱스 11승 3패(원정 5승 2패) / 덴버 너기츠 7승 5패(홈 2승 3패).",
              "**최근 전적** — 보스턴 셀틱스 최근 5경기 4승 1패(직전 경기 105-115 패) / 덴버 너기츠 최근 5경기 3승 2패(직전 경기 105-117 패).",
              "**부상 명단** — 보스턴 셀틱스: 없음 / 덴버 너기츠: Julian Strawther."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-phx-sac-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T12:00:00+09:00",
          "venue": "Golden 1 Center",
          "away": {
            "name": "피닉스 선즈",
            "abbr": "PHX",
            "record": "6승 7패",
            "badges": [
              {
                "text": "원정 1승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "새크라멘토 킹스",
            "abbr": "SAC",
            "record": "1승 12패",
            "badges": [
              {
                "text": "홈 0승 8패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 3명",
              "tone": "warn"
            },
            {
              "text": "평균 113.0점 · 107.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**피닉스 선즈** 6승 7패(원정 1승 3패, 최근 5경기 3승 2패), **새크라멘토 킹스** 1승 12패(홈 0승 8패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "피닉스 선즈 부상 명단 1명(결장 1명), 새크라멘토 킹스 4명(결장 2명). 양 팀 합쳐 5명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **113.0점 대 107.8점**, 평균 리바운드 40.1개 대 39.7개, 3점 성공률 36.6% 대 34.3%. 평균 득점 차 5.2점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "PHX",
                "player": "Mark Williams",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "SAC",
                "player": "Maxime Raynaud",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "SAC",
                "player": "Ben Simmons",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "SAC",
                "player": "De'Andre Hunter",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              },
              {
                "team": "SAC",
                "player": "Precious Achiuwa",
                "note": "당일 체크",
                "status": "DAY-TO-DAY"
              }
            ],
            "checkpoints": [
              "**전적** — 피닉스 선즈 6승 7패(원정 1승 3패) / 새크라멘토 킹스 1승 12패(홈 0승 8패).",
              "**최근 전적** — 피닉스 선즈 최근 5경기 3승 2패(직전 경기 117-105 승) / 새크라멘토 킹스 최근 5경기 0승 5패(직전 경기 103-125 패).",
              "**부상 명단** — 피닉스 선즈: Mark Williams / 새크라멘토 킹스: Maxime Raynaud, Ben Simmons, De'Andre Hunter, Precious Achiuwa."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-uta-lal-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T12:00:00+09:00",
          "venue": "crypto.com Arena",
          "away": {
            "name": "유타 재즈",
            "abbr": "UTA",
            "record": "2승 13패",
            "badges": [
              {
                "text": "원정 1승 6패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "LA 레이커스",
            "abbr": "LAL",
            "record": "13승 2패",
            "badges": [
              {
                "text": "홈 6승 1패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 6명",
              "tone": "warn"
            },
            {
              "text": "평균 108.7점 · 122.5점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**유타 재즈** 2승 13패(원정 1승 6패, 최근 5경기 1승 4패), **LA 레이커스** 13승 2패(홈 6승 1패, 최근 5경기 5승 0패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "유타 재즈 부상 명단 4명(결장 4명), LA 레이커스 2명(결장 2명). 양 팀 합쳐 6명이 ESPN 부상 명단에 올라 있습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **108.7점 대 122.5점**, 평균 리바운드 44.3개 대 41.4개, 3점 성공률 35.1% 대 38.1%. 평균 득점 차 13.8점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "injuries": [
              {
                "team": "UTA",
                "player": "Jaxson Hayes",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "UTA",
                "player": "Lauri Markkanen",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "UTA",
                "player": "Jusuf Nurkic",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "UTA",
                "player": "Jaren Jackson Jr.",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "LAL",
                "player": "Walker Kessler",
                "note": "결장",
                "status": "OUT"
              },
              {
                "team": "LAL",
                "player": "Austin Reaves",
                "note": "결장",
                "status": "OUT"
              }
            ],
            "checkpoints": [
              "**전적** — 유타 재즈 2승 13패(원정 1승 6패) / LA 레이커스 13승 2패(홈 6승 1패).",
              "**최근 전적** — 유타 재즈 최근 5경기 1승 4패(직전 경기 132-107 승) / LA 레이커스 최근 5경기 5승 0패(직전 경기 118-114 승).",
              "**부상 명단** — 유타 재즈: Jaxson Hayes, Lauri Markkanen, Jusuf Nurkic, Jaren Jackson Jr. / LA 레이커스: Walker Kessler, Austin Reaves."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 22:58 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-19 END */,

        {
          id: "vleague-men-kal-hyundai-1119",
          sport: "volleyball",
          league: "V리그 남자부",
          start: "2026-11-19T19:00:00+09:00",
          venue: "인천 계양체육관",
          away: {
            name: "대한항공",
            abbr: "",
            record: "5승 2패",
            badges: [{ text: "홈 3연승", tone: "hot" }]
          },
          home: {
            name: "현대캐피탈",
            abbr: "",
            record: "6승 1패",
            badges: [{ text: "리그 선두", tone: "rank" }]
          },
          tags: [
            { text: "세터 컨디션", tone: "warn" },
            { text: "선두 경쟁", tone: "info" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "1위 현대캐피탈과 3위권 대한항공의 맞대결. 두 팀 모두 최근 5경기에서 4승을 챙겼습니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "대한항공은 세터와 아웃사이드 히터 한 명이 컨디션 조절 중이고, 현대캐피탈은 아포짓이 당일 체크입니다."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "대한항공의 강한 서브가 현대캐피탈 리시브 라인을 흔드느냐, 현대캐피탈의 블로킹 높이가 대한항공 오픈 공격을 막느냐."
            }
          ],
          details: {
            injuries: [
              { team: "대한항공", player: "한선수", note: "무릎 관리", status: "DAY-TO-DAY" },
              { team: "대한항공", player: "정지석", note: "허리 · 출전 불투명", status: "DOUBTFUL" },
              { team: "현대캐피탈", player: "허수봉", note: "어깨 관리", status: "DAY-TO-DAY" }
            ],
            checkpoints: [
              "**서브 리시브** — 두 팀 모두 서브 득점 비중이 높습니다. 리시브가 흔들린 쪽은 속공을 못 쓰고 오픈 공격 의존도가 올라갑니다.",
              "**세터 운영** — 대한항공 세터가 정상 컨디션이 아니면 속공 비중이 줄고, 공격이 좌우 날개로 몰립니다.",
              "**블로킹 매치업** — 현대캐피탈 센터가 대한항공 아웃사이드 히터 코스를 얼마나 닫는지가 세트 흐름을 가릅니다."
            ],
            note: "출전 선수 명단은 경기 전 공식 발표를 확인하세요."
          }
        },

        {
          id: "vleague-women-heungkuk-hyundai-1119",
          sport: "volleyball",
          league: "V리그 여자부",
          start: "2026-11-19T19:00:00+09:00",
          venue: "인천 삼산월드체육관",
          away: {
            name: "흥국생명",
            abbr: "",
            record: "5승 2패",
            badges: [{ text: "원정 2연승", tone: "hot" }]
          },
          home: {
            name: "현대건설",
            abbr: "",
            record: "4승 3패",
            badges: [{ text: "홈 2연승", tone: "rank" }]
          },
          tags: [
            { text: "외국인 선수 컨디션", tone: "warn" },
            { text: "상위권 맞대결", tone: "info" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "2위 흥국생명과 3위 현대건설의 맞대결. 승점 차가 한 경기 안쪽이라 순위가 바로 바뀔 수 있습니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "흥국생명 외국인 공격수가 무릎 테이핑을 하고 나서고, 현대건설 미들 블로커 한 명이 발목 관리 중입니다."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "흥국생명의 고공 공격이 현대건설 블로킹 위를 넘어가느냐, 현대건설이 범실을 줄이고 리시브를 버티느냐."
            }
          ],
          details: {
            injuries: [
              { team: "흥국생명", player: "투트쿠", note: "무릎 테이핑", status: "DAY-TO-DAY" },
              { team: "현대건설", player: "양효진", note: "발목 관리", status: "DAY-TO-DAY" },
              { team: "현대건설", player: "위파위", note: "컨디션", status: "DOUBTFUL" }
            ],
            checkpoints: [
              "**고공 공격 대 블로킹** — 흥국생명 공격 점유가 외국인 선수에 몰려 있습니다. 현대건설이 블로킹 방향을 먼저 읽으면 사이드 아웃이 쉬워집니다.",
              "**범실 수** — 두 팀 모두 세트당 범실이 리그 평균보다 높습니다. 접전 세트에서 범실이 적은 쪽이 가져갑니다.",
              "**리시브 안정** — 현대건설 리베로의 리시브 효율이 경기 전체 템포를 정합니다."
            ],
            note: "출전 선수 명단은 경기 전 공식 발표를 확인하세요."
          }
        }
      ]
    },

    /* ── 2026-11-20 (금) — 축구·야구는 경기가 없는 날 예시 ── */
    {
      date: "2026-11-20",
      games: [
        {
          id: "nba-gsw-lal-1120",
          sport: "basketball",
          league: "NBA",
          start: "2026-11-20T11:30:00+09:00",
          venue: "크립토닷컴 아레나",
          away: {
            name: "골든스테이트 워리어스",
            abbr: "GSW",
            record: "9승 5패",
            badges: [{ text: "원정 2연승", tone: "hot" }]
          },
          home: {
            name: "LA 레이커스",
            abbr: "LAL",
            record: "12승 2패",
            badges: [{ text: "백투백 2일차", tone: "rank" }]
          },
          tags: [
            { text: "백투백 2일차", tone: "info" },
            { text: "같은 홈 2연전", tone: "info" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "레이커스 홈 2연전 둘째 날. 전날 샬럿전에 이어 이틀 연속 경기입니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "레이커스는 케슬러·리브스가 계속 빠지고, 백투백 둘째 날이라 주전 출전 시간 관리가 필요합니다. 골든스테이트는 큰 부상 없이 로테이션을 돌리고 있습니다."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "골든스테이트의 빠른 템포와 3점 시도 수가 체력이 떨어진 레이커스 수비를 얼마나 흔드는지."
            }
          ],
          details: {
            injuries: [
              { team: "LAL", player: "워커 케슬러", note: "다리 통증", status: "OUT" },
              { team: "LAL", player: "오스틴 리브스", note: "발꿈치", status: "OUT" },
              { team: "LAL", player: "르브론 제임스", note: "출전 시간 관리", status: "DAY-TO-DAY" }
            ],
            checkpoints: [
              "**체력과 템포** — 백투백 둘째 날 레이커스가 수비 전환에서 늦어지면 골든스테이트의 얼리 오펜스가 반복됩니다.",
              "**골밑 수비** — 케슬러 없이 이틀 연속 경기라 골밑 수비 부담이 커집니다. 파울 관리가 로테이션을 결정합니다.",
              "**벤치 득점** — 양 팀 모두 벤치에서 3점이 터지는 쪽이 흐름을 가져가는 경기입니다."
            ],
            note: "출전 여부는 경기 전까지 변동될 수 있습니다."
          }
        }
      ]
    }
  ]
};
