/* =============================================================
   CLUTCH — 카드 데이터
   -------------------------------------------------------------
   이 파일만 고치면 사이트 카드가 바뀝니다. (빌드 도구 없음)
   브라우저에서 index.html 을 그냥 열어도 동작하도록 JSON 대신
   전역 변수(window.CLUTCH_DATA)로 데이터를 넣습니다.

   ⚠️ 아래 내용은 "샘플 데이터"입니다. 형식을 보여주기 위한 예시로,
      실제 경기 일정·결과·부상 정보가 아닙니다.
      (11월은 KBO 정규시즌·포스트시즌이 끝난 시기라 야구 샘플의
       날짜는 실제 편성과 맞지 않습니다. 배구 V리그 카드 역시 실존
       구단명을 빌린 가상의 대진 예시입니다. 형식 확인용으로만 보세요.)

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
  updatedAt: "2026-11-19T06:30:00+09:00",

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

        {
          id: "nba-det-sas-1119",
          sport: "basketball",
          league: "NBA",
          start: "2026-11-19T10:00:00+09:00",
          venue: "프로스트 뱅크 센터",
          away: {
            name: "디트로이트 피스톤즈",
            abbr: "DET",
            record: "8승 4패",
            badges: [{ text: "동부 3위", tone: "rank" }]
          },
          home: {
            name: "샌안토니오 스퍼스",
            abbr: "SAS",
            record: "12승 2패",
            badges: [
              { text: "서부 1위", tone: "rank" },
              { text: "12연승", tone: "hot" }
            ]
          },
          tags: [
            { text: "주전 결장", tone: "warn" },
            { text: "골밑 공백", tone: "warn" },
            { text: "연승 중", tone: "hot" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "서부 1위 **12연승** 스퍼스 홈, 동부 3위 디트로이트가 원정으로 맞붙습니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "디트로이트 **듀렌·로빈슨·홀랜드 OUT**, 조는 출전 불투명. 스퍼스는 해리스 OUT, 팍스는 당일 체크."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "주전 센터가 빠진 디트로이트 골밑(콜린스·폴 리드)이 **웸반야마(평균 28.6점)** 와 스퍼스 리바운드를 버틸 수 있을지."
            }
          ],
          details: {
            injuries: [
              { team: "DET", player: "제일런 듀렌", note: "햄스트링", status: "OUT" },
              { team: "DET", player: "던컨 로빈슨", note: "허벅지", status: "OUT" },
              { team: "DET", player: "론 홀랜드", note: "무릎", status: "OUT" },
              { team: "DET", player: "아이제이아 조", note: "출전 여부 미정", status: "DOUBTFUL" },
              { team: "SAS", player: "토바이어스 해리스", note: "결장", status: "OUT" },
              { team: "SAS", player: "디애런 팍스", note: "당일 체크", status: "DAY-TO-DAY" }
            ],
            checkpoints: [
              "**디트로이트 골밑** — 주전 센터 듀렌이 빠지면서 콜린스·폴 리드가 웸반야마(평균 28.6점) 수비와 림 프로텍션을 나눠 맡습니다. 파울 트러블이 곧 실점으로 이어질 수 있는 구조.",
              "**스퍼스 볼 운반** — 12연승 흐름이지만 해리스가 OUT이고 팍스가 당일 체크입니다. 팍스가 뛰지 못하면 볼 운반·돌파 역할 분담이 달라집니다.",
              "**리바운드 싸움** — 디트로이트가 수비 리바운드에서 밀리면 2차 공격 실점으로 격차가 벌어질 수 있습니다."
            ],
            note: "출전 여부는 경기 전까지 변동될 수 있습니다. 당일 발표 기준으로 다시 확인하세요."
          }
        },

        {
          id: "nba-cha-lal-1119",
          sport: "basketball",
          league: "NBA",
          start: "2026-11-19T13:00:00+09:00",
          venue: "크립토닷컴 아레나",
          away: {
            name: "샬럿 호네츠",
            abbr: "CHA",
            record: "4승 9패",
            badges: []
          },
          home: {
            name: "LA 레이커스",
            abbr: "LAL",
            record: "12승 2패",
            badges: [{ text: "8연승", tone: "hot" }]
          },
          tags: [
            { text: "주전 2명 결장", tone: "warn" },
            { text: "백투백 1일차", tone: "info" },
            { text: "8연승", tone: "hot" }
          ],
          rows: [
            {
              kind: "flow",
              label: "흐름",
              text: "**8연승** 레이커스 홈, 4승 9패 샬럿이 원정으로 들어옵니다."
            },
            {
              kind: "inj",
              label: "부상 변수",
              text: "레이커스 **케슬러·리브스 동시 OUT**(케슬러는 시즌 첫 결장). 샬럿은 크누펠·슈뢰더 OUT."
            },
            {
              kind: "watch",
              label: "관전 포인트",
              text: "높이가 낮아진 레이커스가 샬럿의 외곽 3점·리바운드 공세를 **돈치치와 대체 자원(그라임스·섹스턴 등)** 으로 얼마나 상쇄하느냐."
            }
          ],
          details: {
            injuries: [
              { team: "LAL", player: "워커 케슬러", note: "다리 통증 · 시즌 첫 결장", status: "OUT" },
              { team: "LAL", player: "오스틴 리브스", note: "발꿈치", status: "OUT" },
              { team: "CHA", player: "콘 크누펠", note: "결장", status: "OUT" },
              { team: "CHA", player: "데니스 슈뢰더", note: "결장", status: "OUT" }
            ],
            checkpoints: [
              "**레이커스 높이** — 케슬러가 빠지면 골밑 수비와 리바운드 부담이 분산됩니다. 샬럿이 공격 리바운드로 2차 공격을 얼마나 만들 수 있는지가 첫 변수.",
              "**백투백 1일차** — 유타전에 이어 이 경기가 백투백 첫날입니다. 주전 2명이 빠진 만큼 로테이션과 출전 시간 관리가 결과에 영향을 줍니다.",
              "**샬럿의 승부수** — 크누펠·슈뢰더 없이 외곽 3점과 리바운드로 승부해야 합니다. 돈치치가 공격에서 얼마를 짊어지고, 그라임스·섹스턴 등 대체 자원이 그 부담을 나눠 줄 수 있는지가 관건."
            ],
            note: "출전 여부는 경기 전까지 변동될 수 있습니다. 당일 발표 기준으로 다시 확인하세요."
          }
        },

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
