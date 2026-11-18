/* =============================================================
   CLUTCH — 카드 데이터
   -------------------------------------------------------------
   이 파일만 고치면 사이트 카드가 바뀝니다. (빌드 도구 없음)
   브라우저에서 index.html 을 그냥 열어도 동작하도록 JSON 대신
   전역 변수(window.CLUTCH_DATA)로 데이터를 넣습니다.

   ✅ 실제 데이터 (KST 2026-11-19 ~ 11-25)
      · 농구(NBA)  : ESPN 공개 API (일정·전적·평균 득점/리바운드/3점·부상 명단)
                     구간 표식 NBA-AUTO / 생성기 work/fetch_nba.py
                     python3 work/fetch_nba.py --from 2026-11-19 --to 2026-11-25 --write
      · 축구        : ESPN 공개 API (UCL·EPL·라리가, 일정·전적·순위·오버언더)
                     구간 표식 SOCCER-AUTO / 생성기 work/fetch_soccer.py
                     부상·결장 명단은 ESPN 축구 응답에 없어 표시하지 않습니다.
      · 배구        : TheSportsDB 무료 키 123 (독일·폴란드·이탈리아 리그)
                     구간 표식 VOLLEY-AUTO / 생성기 work/fetch_volley.py
                     전적·순위·부상 값이 이 소스에 없어 표시하지 않습니다.
                     한국 V리그는 TheSportsDB 시즌 데이터가 2024-25에서 멈춰 있어 넣지 않았습니다.
      세 구간 모두 표식 사이를 손으로 고치지 마세요. 스크립트가 다시 채웁니다.

   ⚠️ 야구(KBO) 카드는 "샘플 데이터"입니다. 형식을 보여주기 위한 예시로,
      실제 경기 일정·결과·부상 정보가 아닙니다.
      (11월은 KBO 정규시즌·포스트시즌이 끝난 비시즌이라 실제 편성과 맞지 않습니다.
       형식 확인용으로만 보세요.)

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
     teams[]      : 팀별 정보 블록 (원정팀 먼저, 홈팀 다음). 없으면 블록을 그리지 않습니다.
                    [{ abbr, name, side:"away"|"home",
                       record:"11승 4패", venueRecord:"원정 4승 3패",
                       last5:"4승 1패", lastGame:"110-128 패",
                       ppg:117.8, rpg:45.7, tp:37.1,          // 시즌 평균 득점·리바운드·3점 성공률
                       injuries:[{ player, status, note }] }] // 그 팀 부상자만
                    값이 없는 항목은 키를 빼거나 null 로 둡니다(화면에서 생략).
     injuries[]   : [{ team, player, note, status }]  // teams[] 가 없는 카드의 옛 목록
                    status: "OUT" | "DOUBTFUL" | "DAY-TO-DAY" | "NONE"
     checkpoints[]: ["**소제목** — 설명", ...] (펼친 패널의 번호 목록)
     note         : (선택) 패널 맨 아래 작은 안내문
   ============================================================= */

window.CLUTCH_DATA = {
  version: 1,
  updatedAt: "2026-11-18T23:28:06+09:00",

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
        /* VOLLEY-AUTO 2026-11-19 START */
        {
          "id": "vball-2553993",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-19T00:30:00+09:00",
          "away": {
            "name": "Aluron CMC Warta Zawiercie",
            "abbr": "ACWZ",
            "badges": []
          },
          "home": {
            "name": "Trefl Gdańsk",
            "abbr": "TGS",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "12라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Aluron CMC Warta Zawiercie** 대 **Trefl Gdańsk**, 폴란드 플루스리가 12라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ACWZ",
                "name": "Aluron CMC Warta Zawiercie",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "12"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "TGS",
                "name": "Trefl Gdańsk",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "12"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553960",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-19T03:30:00+09:00",
          "away": {
            "name": "Bogdanka LUK Lublin",
            "abbr": "BLL",
            "badges": []
          },
          "home": {
            "name": "Cuprum Stilon Gorzów",
            "abbr": "CSGW",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "7라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Bogdanka LUK Lublin** 대 **Cuprum Stilon Gorzów**, 폴란드 플루스리가 7라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BLL",
                "name": "Bogdanka LUK Lublin",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "CSGW",
                "name": "Cuprum Stilon Gorzów",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        }
        /* VOLLEY-AUTO 2026-11-19 END */,

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
              "text": "멤피스 그리즐리스 5명(결장 5명), 클리블랜드 캐벌리어스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **121.7점 대 118.1점**, 평균 리바운드 47.4개 대 45.9개, 3점 성공률 39.5% 대 36.7%. 평균 득점 차 3.6점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MEM",
                "name": "멤피스 그리즐리스",
                "side": "away",
                "record": "10승 4패",
                "venueRecord": "원정 7승 0패",
                "last5": "4승 1패",
                "lastGame": "136-120 승",
                "ppg": 121.7,
                "rpg": 47.4,
                "tp": 39.5,
                "injuries": [
                  {
                    "player": "GG Jackson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Isaiah Stewart",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ty Jerome",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Scotty Pippen Jr.",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Richie Saunders",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "CLE",
                "name": "클리블랜드 캐벌리어스",
                "side": "home",
                "record": "8승 7패",
                "venueRecord": "홈 6승 2패",
                "last5": "3승 2패",
                "lastGame": "126-115 승",
                "ppg": 118.1,
                "rpg": 45.9,
                "tp": 36.7,
                "injuries": [
                  {
                    "player": "Nae'Qwan Tomlin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylon Tyson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Sam Merrill",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Peyton Watson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Evan Mobley",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 멤피스 그리즐리스 승률 29.5%, 클리블랜드 캐벌리어스 70.5%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
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
              "text": "휴스턴 로키츠 3명(결장 1명), 인디애나 페이서스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.8점 대 112.1점**, 평균 리바운드 45.7개 대 41.6개, 3점 성공률 37.1% 대 32.8%. 평균 득점 차 5.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "HOU",
                "name": "휴스턴 로키츠",
                "side": "away",
                "record": "11승 4패",
                "venueRecord": "원정 4승 3패",
                "last5": "4승 1패",
                "lastGame": "110-128 패",
                "ppg": 117.8,
                "rpg": 45.7,
                "tp": 37.1,
                "injuries": [
                  {
                    "player": "Clint Capela",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Amen Thompson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Julian Phillips",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              },
              {
                "abbr": "IND",
                "name": "인디애나 페이서스",
                "side": "home",
                "record": "5승 9패",
                "venueRecord": "홈 2승 4패",
                "last5": "2승 3패",
                "lastGame": "124-131 패",
                "ppg": 112.1,
                "rpg": 41.6,
                "tp": 32.8,
                "injuries": [
                  {
                    "player": "T.J. McConnell",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Andrew Nembhard",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tyrese Haliburton",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Johnny Furphy",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ben Sheppard",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 휴스턴 로키츠 승률 73.2%, 인디애나 페이서스 26.8%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "밀워키 벅스 1명(결장 1명), 마이애미 히트 3명이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 4명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **106.1점 대 119.4점**, 평균 리바운드 45.4개 대 42.6개, 3점 성공률 34.1% 대 34.3%. 평균 득점 차 13.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MIL",
                "name": "밀워키 벅스",
                "side": "away",
                "record": "1승 13패",
                "venueRecord": "원정 0승 6패",
                "last5": "0승 5패",
                "lastGame": "106-113 패",
                "ppg": 106.1,
                "rpg": 45.4,
                "tp": 34.1,
                "injuries": [
                  {
                    "player": "Ousmane Dieng",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "MIA",
                "name": "마이애미 히트",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 4승 3패",
                "last5": "5승 0패",
                "lastGame": "128-110 승",
                "ppg": 119.4,
                "rpg": 42.6,
                "tp": 34.3,
                "injuries": [
                  {
                    "player": "Myron Gardner",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Nikola Jovic",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Bam Adebayo",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 밀워키 벅스 승률 19.7%, 마이애미 히트 80.3%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "필라델피아 세븐티식서스 4명(결장 4명), 올랜도 매직 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.1점 대 108.8점**, 평균 리바운드 43.1개 대 43.2개, 3점 성공률 35.2% 대 34.0%. 평균 득점 차 5.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "PHI",
                "name": "필라델피아 세븐티식서스",
                "side": "away",
                "record": "12승 3패",
                "venueRecord": "원정 6승 1패",
                "last5": "4승 1패",
                "lastGame": "135-123 승",
                "ppg": 114.1,
                "rpg": 43.1,
                "tp": 35.2,
                "injuries": [
                  {
                    "player": "Dominick Barlow",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylen Brown",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Adem Bona",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ariel Hukporti",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "ORL",
                "name": "올랜도 매직",
                "side": "home",
                "record": "6승 7패",
                "venueRecord": "홈 1승 4패",
                "last5": "4승 1패",
                "lastGame": "115-105 승",
                "ppg": 108.8,
                "rpg": 43.2,
                "tp": 34.0,
                "injuries": [
                  {
                    "player": "Izaiyah Nelson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Isaac",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Noah Penda",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Paolo Banchero",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 필라델피아 세븐티식서스 승률 58.7%, 올랜도 매직 41.3%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "시카고 불스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 브루클린 네츠는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.6점 대 111.2점**, 평균 리바운드 43.8개 대 42.2개, 3점 성공률 30.8% 대 36.2%. 평균 득점 차 3.4점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "CHI",
                "name": "시카고 불스",
                "side": "away",
                "record": "3승 10패",
                "venueRecord": "원정 2승 6패",
                "last5": "2승 3패",
                "lastGame": "115-126 패",
                "ppg": 114.6,
                "rpg": 43.8,
                "tp": 30.8,
                "injuries": [
                  {
                    "player": "Patrick Williams",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobe Awaka",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Caleb Wilson",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "BKN",
                "name": "브루클린 네츠",
                "side": "home",
                "record": "3승 10패",
                "venueRecord": "홈 1승 4패",
                "last5": "1승 4패",
                "lastGame": "123-135 패",
                "ppg": 111.2,
                "rpg": 42.2,
                "tp": 36.2,
                "injuries": []
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 시카고 불스 승률 46.3%, 브루클린 네츠 53.7%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "워싱턴 위저즈 5명(결장 4명), 토론토 랩터스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.3점 대 112.9점**으로 비슷하고, 평균 리바운드 41.7개 대 40.6개, 3점 성공률 31.5% 대 33.3%. 3점 성공률 차 1.8%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "WAS",
                "name": "워싱턴 위저즈",
                "side": "away",
                "record": "4승 11패",
                "venueRecord": "원정 2승 6패",
                "last5": "0승 5패",
                "lastGame": "120-136 패",
                "ppg": 111.3,
                "rpg": 41.7,
                "tp": 31.5,
                "injuries": [
                  {
                    "player": "Felix Okpara",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tristan Vukcevic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Reece Beekman",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Justin Champagnie",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jamir Watkins",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "TOR",
                "name": "토론토 랩터스",
                "side": "home",
                "record": "5승 9패",
                "venueRecord": "홈 2승 5패",
                "last5": "0승 5패",
                "lastGame": "102-111 패",
                "ppg": 112.9,
                "rpg": 40.6,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Kawhi Leonard",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Nate Bittle",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kevin McCullar Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 워싱턴 위저즈 승률 34.7%, 토론토 랩터스 65.3%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "디트로이트 피스턴스 5명(결장 5명), 뉴올리언스 펠리컨스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 115.8점**으로 비슷하고, 평균 리바운드 44.3개 대 42.1개, 3점 성공률 36.0% 대 33.3%. 3점 성공률 차 2.7%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DET",
                "name": "디트로이트 피스턴스",
                "side": "away",
                "record": "9승 4패",
                "venueRecord": "원정 6승 2패",
                "last5": "3승 2패",
                "lastGame": "105-93 승",
                "ppg": 114.8,
                "rpg": 44.3,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Isaiah Joe",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Duncan Robinson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Taurean Prince",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ronald Holland II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Duren",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "NOP",
                "name": "뉴올리언스 펠리컨스",
                "side": "home",
                "record": "5승 10패",
                "venueRecord": "홈 4승 6패",
                "last5": "1승 4패",
                "lastGame": "115-94 승",
                "ppg": 115.8,
                "rpg": 42.1,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Bennedict Mathurin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bryce McGowens",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trendon Watford",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trey Murphy III",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Dejounte Murray",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 디트로이트 피스턴스 승률 74.3%, 뉴올리언스 펠리컨스 25.7%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "결장 10명",
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
              "text": "애틀랜타 호크스 5명(결장 5명), 오클라호마시티 썬더 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.8점 대 112.1점**, 평균 리바운드 44.9개 대 46.1개, 3점 성공률 33.8% 대 34.2%. 평균 득점 차 5.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ATL",
                "name": "애틀랜타 호크스",
                "side": "away",
                "record": "8승 6패",
                "venueRecord": "원정 5승 3패",
                "last5": "3승 2패",
                "lastGame": "113-106 승",
                "ppg": 117.8,
                "rpg": 44.9,
                "tp": 33.8,
                "injuries": [
                  {
                    "player": "Jock Landale",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kingston Flemings",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Asa Newell",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "CJ McCollum",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Mouhamed Gueye",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "OKC",
                "name": "오클라호마시티 썬더",
                "side": "home",
                "record": "9승 5패",
                "venueRecord": "홈 5승 0패",
                "last5": "2승 3패",
                "lastGame": "125-103 승",
                "ppg": 112.1,
                "rpg": 46.1,
                "tp": 34.2,
                "injuries": [
                  {
                    "player": "Thomas Sorber",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylin Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Cason Wallace",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chet Holmgren",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 애틀랜타 호크스 승률 25.6%, 오클라호마시티 썬더 74.4%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "결장 6명",
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
              "text": "골든스테이트 워리어스 5명(결장 3명), 댈러스 매버릭스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **115.1점 대 112.1점**, 평균 리바운드 44.9개 대 43.3개, 3점 성공률 38.2% 대 33.5%. 평균 득점 차 3.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "GSW",
                "name": "골든스테이트 워리어스",
                "side": "away",
                "record": "8승 6패",
                "venueRecord": "원정 2승 5패",
                "last5": "2승 3패",
                "lastGame": "94-115 패",
                "ppg": 115.1,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": [
                  {
                    "player": "Draymond Green",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Al Horford",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Stephen Curry",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Brandon Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kristaps Porzingis",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "DAL",
                "name": "댈러스 매버릭스",
                "side": "home",
                "record": "7승 7패",
                "venueRecord": "홈 5승 2패",
                "last5": "2승 3패",
                "lastGame": "94-131 패",
                "ppg": 112.1,
                "rpg": 43.3,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Sergio de Larrea",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Walter Clayton Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Dereck Lively II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Tobi Lawal",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tarik Biberovic",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 골든스테이트 워리어스 승률 34.8%, 댈러스 매버릭스 65.2%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "덴버 너기츠 1명(결장 1명)이 ESPN 부상 명단에 올라 있습니다. 보스턴 셀틱스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 113.8점**으로 비슷하고, 평균 리바운드 44.9개 대 41.7개, 3점 성공률 38.2% 대 34.5%. 3점 성공률 차 3.7%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BOS",
                "name": "보스턴 셀틱스",
                "side": "away",
                "record": "11승 3패",
                "venueRecord": "원정 5승 2패",
                "last5": "4승 1패",
                "lastGame": "105-115 패",
                "ppg": 114.8,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": []
              },
              {
                "abbr": "DEN",
                "name": "덴버 너기츠",
                "side": "home",
                "record": "7승 5패",
                "venueRecord": "홈 2승 3패",
                "last5": "3승 2패",
                "lastGame": "105-117 패",
                "ppg": 113.8,
                "rpg": 41.7,
                "tp": 34.5,
                "injuries": [
                  {
                    "player": "Julian Strawther",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 보스턴 셀틱스 승률 59.0%, 덴버 너기츠 41.0%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-utah-lal-20261119",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-19T12:00:00+09:00",
          "venue": "crypto.com Arena",
          "away": {
            "name": "유타 재즈",
            "abbr": "UTAH",
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
              "text": "유타 재즈 4명(결장 4명), LA 레이커스 2명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 6명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **108.7점 대 122.5점**, 평균 리바운드 44.3개 대 41.4개, 3점 성공률 35.1% 대 38.1%. 평균 득점 차 13.8점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "UTAH",
                "name": "유타 재즈",
                "side": "away",
                "record": "2승 13패",
                "venueRecord": "원정 1승 6패",
                "last5": "1승 4패",
                "lastGame": "132-107 승",
                "ppg": 108.7,
                "rpg": 44.3,
                "tp": 35.1,
                "injuries": [
                  {
                    "player": "Jaxson Hayes",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Lauri Markkanen",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jusuf Nurkic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaren Jackson Jr.",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "LAL",
                "name": "LA 레이커스",
                "side": "home",
                "record": "13승 2패",
                "venueRecord": "홈 6승 1패",
                "last5": "5승 0패",
                "lastGame": "118-114 승",
                "ppg": 122.5,
                "rpg": 41.4,
                "tp": 38.1,
                "injuries": [
                  {
                    "player": "Walker Kessler",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Austin Reaves",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 유타 재즈 승률 18.4%, LA 레이커스 81.6%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
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
              "text": "피닉스 선즈 1명(결장 1명), 새크라멘토 킹스 4명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 5명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **113.0점 대 107.8점**, 평균 리바운드 40.1개 대 39.7개, 3점 성공률 36.6% 대 34.3%. 평균 득점 차 5.2점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "PHX",
                "name": "피닉스 선즈",
                "side": "away",
                "record": "6승 7패",
                "venueRecord": "원정 1승 3패",
                "last5": "3승 2패",
                "lastGame": "117-105 승",
                "ppg": 113.0,
                "rpg": 40.1,
                "tp": 36.6,
                "injuries": [
                  {
                    "player": "Mark Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "SAC",
                "name": "새크라멘토 킹스",
                "side": "home",
                "record": "1승 12패",
                "venueRecord": "홈 0승 8패",
                "last5": "0승 5패",
                "lastGame": "103-125 패",
                "ppg": 107.8,
                "rpg": 39.7,
                "tp": 34.3,
                "injuries": [
                  {
                    "player": "Maxime Raynaud",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "De'Andre Hunter",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Precious Achiuwa",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Ben Simmons",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 피닉스 선즈 승률 71.8%, 새크라멘토 킹스 28.2%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-19 END */
      ]
    },

    /* ── 2026-11-20 (금) — 축구·야구는 경기가 없는 날 예시 ── */
    {
      date: "2026-11-20",
      games: [
        /* VOLLEY-AUTO 2026-11-20 START */
        {
          "id": "vball-2553957",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-20T00:30:00+09:00",
          "away": {
            "name": "Projekt Warsaw",
            "abbr": "PW",
            "badges": []
          },
          "home": {
            "name": "Norwid Częstochowa",
            "abbr": "NCS",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "7라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Projekt Warsaw** 대 **Norwid Częstochowa**, 폴란드 플루스리가 7라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "PW",
                "name": "Projekt Warsaw",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "NCS",
                "name": "Norwid Częstochowa",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553958",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-20T03:30:00+09:00",
          "away": {
            "name": "ZAKSA Kędzierzyn-Koźle",
            "abbr": "ZKDK",
            "badges": []
          },
          "home": {
            "name": "Jastrzębie Barkom",
            "abbr": "JBB",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "7라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**ZAKSA Kędzierzyn-Koźle** 대 **Jastrzębie Barkom**, 폴란드 플루스리가 7라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ZKDK",
                "name": "ZAKSA Kędzierzyn-Koźle",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "JBB",
                "name": "Jastrzębie Barkom",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        }
        /* VOLLEY-AUTO 2026-11-20 END */,

        /* NBA-AUTO 2026-11-20 START */
        {
          "id": "nba-gsw-mem-20261120",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-20T10:00:00+09:00",
          "venue": "FedExForum",
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
            "name": "멤피스 그리즐리스",
            "abbr": "MEM",
            "record": "10승 4패",
            "badges": [
              {
                "text": "홈 3승 4패",
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
              "text": "평균 115.1점 · 121.7점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**골든스테이트 워리어스** 8승 6패(원정 2승 5패, 최근 5경기 2승 3패), **멤피스 그리즐리스** 10승 4패(홈 3승 4패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "골든스테이트 워리어스 5명(결장 3명), 멤피스 그리즐리스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **115.1점 대 121.7점**, 평균 리바운드 44.9개 대 47.4개, 3점 성공률 38.2% 대 39.5%. 평균 득점 차 6.6점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "GSW",
                "name": "골든스테이트 워리어스",
                "side": "away",
                "record": "8승 6패",
                "venueRecord": "원정 2승 5패",
                "last5": "2승 3패",
                "lastGame": "94-115 패",
                "ppg": 115.1,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": [
                  {
                    "player": "Draymond Green",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Al Horford",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Stephen Curry",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Brandon Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kristaps Porzingis",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "MEM",
                "name": "멤피스 그리즐리스",
                "side": "home",
                "record": "10승 4패",
                "venueRecord": "홈 3승 4패",
                "last5": "4승 1패",
                "lastGame": "136-120 승",
                "ppg": 121.7,
                "rpg": 47.4,
                "tp": 39.5,
                "injuries": [
                  {
                    "player": "GG Jackson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Isaiah Stewart",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ty Jerome",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Scotty Pippen Jr.",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Richie Saunders",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 골든스테이트 워리어스 승률 33.8%, 멤피스 그리즐리스 66.2%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-por-mil-20261120",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-20T10:00:00+09:00",
          "venue": "Fiserv Forum",
          "away": {
            "name": "포틀랜드 트레일블레이저스",
            "abbr": "POR",
            "record": "9승 5패",
            "badges": [
              {
                "text": "원정 6승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "밀워키 벅스",
            "abbr": "MIL",
            "record": "1승 13패",
            "badges": [
              {
                "text": "홈 1승 7패",
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
              "text": "평균 117.0점 · 106.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**포틀랜드 트레일블레이저스** 9승 5패(원정 6승 3패, 최근 5경기 3승 2패), **밀워키 벅스** 1승 13패(홈 1승 7패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "포틀랜드 트레일블레이저스 5명(결장 5명), 밀워키 벅스 1명(결장 1명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 6명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.0점 대 106.1점**, 평균 리바운드 44.7개 대 45.4개, 3점 성공률 36.0% 대 34.1%. 평균 득점 차 10.9점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "POR",
                "name": "포틀랜드 트레일블레이저스",
                "side": "away",
                "record": "9승 5패",
                "venueRecord": "원정 6승 3패",
                "last5": "3승 2패",
                "lastGame": "105-106 패",
                "ppg": 117.0,
                "rpg": 44.7,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Deni Avdija",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chris Youngblood",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Vit Krejci",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ja Morant",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Shaedon Sharpe",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "MIL",
                "name": "밀워키 벅스",
                "side": "home",
                "record": "1승 13패",
                "venueRecord": "홈 1승 7패",
                "last5": "0승 5패",
                "lastGame": "106-113 패",
                "ppg": 106.1,
                "rpg": 45.4,
                "tp": 34.1,
                "injuries": [
                  {
                    "player": "Ousmane Dieng",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 포틀랜드 트레일블레이저스 승률 78.8%, 밀워키 벅스 21.2%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-nyk-min-20261120",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-20T10:00:00+09:00",
          "venue": "Target Center",
          "away": {
            "name": "뉴욕 닉스",
            "abbr": "NYK",
            "record": "8승 6패",
            "badges": [
              {
                "text": "원정 4승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "미네소타 팀버울브스",
            "abbr": "MIN",
            "record": "11승 4패",
            "badges": [
              {
                "text": "홈 7승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 110.0점 · 116.7점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**뉴욕 닉스** 8승 6패(원정 4승 3패, 최근 5경기 3승 2패), **미네소타 팀버울브스** 11승 4패(홈 7승 2패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "미네소타 팀버울브스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 뉴욕 닉스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **110.0점 대 116.7점**, 평균 리바운드 47.5개 대 48.6개, 3점 성공률 36.0% 대 37.0%. 평균 득점 차 6.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "NYK",
                "name": "뉴욕 닉스",
                "side": "away",
                "record": "8승 6패",
                "venueRecord": "원정 4승 3패",
                "last5": "3승 2패",
                "lastGame": "111-102 승",
                "ppg": 110.0,
                "rpg": 47.5,
                "tp": 36.0,
                "injuries": []
              },
              {
                "abbr": "MIN",
                "name": "미네소타 팀버울브스",
                "side": "home",
                "record": "11승 4패",
                "venueRecord": "홈 7승 2패",
                "last5": "4승 1패",
                "lastGame": "106-105 승",
                "ppg": 116.7,
                "rpg": 48.6,
                "tp": 37.0,
                "injuries": [
                  {
                    "player": "Zyon Pullin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Kuminga",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylen Clark",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Anthony Edwards",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Donte DiVincenzo",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 뉴욕 닉스 승률 47.5%, 미네소타 팀버울브스 52.5%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-lac-sas-20261120",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-20T10:00:00+09:00",
          "venue": "Frost Bank Center",
          "away": {
            "name": "LA 클리퍼스",
            "abbr": "LAC",
            "record": "4승 9패",
            "badges": [
              {
                "text": "원정 0승 5패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "샌안토니오 스퍼스",
            "abbr": "SAS",
            "record": "12승 3패",
            "badges": [
              {
                "text": "홈 5승 3패",
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
              "text": "평균 111.9점 · 117.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**LA 클리퍼스** 4승 9패(원정 0승 5패, 최근 5경기 3승 2패), **샌안토니오 스퍼스** 12승 3패(홈 5승 3패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "LA 클리퍼스 4명(결장 4명), 샌안토니오 스퍼스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 7명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.9점 대 117.1점**, 평균 리바운드 39.5개 대 48.2개, 3점 성공률 39.0% 대 33.5%. 평균 득점 차 5.2점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "LAC",
                "name": "LA 클리퍼스",
                "side": "away",
                "record": "4승 9패",
                "venueRecord": "원정 0승 5패",
                "last5": "3승 2패",
                "lastGame": "107-132 패",
                "ppg": 111.9,
                "rpg": 39.5,
                "tp": 39.0,
                "injuries": [
                  {
                    "player": "Yanic Konan Niederhauser",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Brandon Ingram",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bradley Beal",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jordan Miller",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "SAS",
                "name": "샌안토니오 스퍼스",
                "side": "home",
                "record": "12승 3패",
                "venueRecord": "홈 5승 3패",
                "last5": "4승 1패",
                "lastGame": "93-105 패",
                "ppg": 117.1,
                "rpg": 48.2,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Dylan Harper",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobias Harris",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jayden Quaintance",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — LA 클리퍼스 승률 9.5%, 샌안토니오 스퍼스 90.5%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-20 END */
      ]
    },

    /* ── 2026-11-21 (토) ─────────────────────────────────── */
    {
      date: "2026-11-21",
      games: [
        /* VOLLEY-AUTO 2026-11-21 START */
        {
          "id": "vball-2553015",
          "sport": "volleyball",
          "league": "GER",
          "leagueFull": "독일 1. 분데스리가",
          "source": "thesportsdb",
          "start": "2026-11-21T01:00:00+09:00",
          "away": {
            "name": "VC Olympia Berlin",
            "abbr": "VOB",
            "badges": []
          },
          "home": {
            "name": "Helios Grizzlys Giesen",
            "abbr": "HGG",
            "badges": []
          },
          "tags": [
            {
              "text": "GER · 독일 1. 분데스리가",
              "tone": "info"
            },
            {
              "text": "5라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**VC Olympia Berlin** 대 **Helios Grizzlys Giesen**, 독일 1. 분데스리가 5라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "VOB",
                "name": "VC Olympia Berlin",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "HGG",
                "name": "Helios Grizzlys Giesen",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553954",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-21T01:00:00+09:00",
          "away": {
            "name": "GKS Katowice",
            "abbr": "GK",
            "badges": []
          },
          "home": {
            "name": "AZS Olsztyn",
            "abbr": "AO",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "7라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**GKS Katowice** 대 **AZS Olsztyn**, 폴란드 플루스리가 7라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "GK",
                "name": "GKS Katowice",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "AO",
                "name": "AZS Olsztyn",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "7"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2554296",
          "sport": "volleyball",
          "league": "ITA",
          "leagueFull": "이탈리아 수페르레가",
          "source": "thesportsdb",
          "start": "2026-11-21T03:45:00+09:00",
          "away": {
            "name": "Verona Volley",
            "abbr": "VV",
            "badges": []
          },
          "home": {
            "name": "Cuneo Volley",
            "abbr": "CV",
            "badges": []
          },
          "tags": [
            {
              "text": "ITA · 이탈리아 수페르레가",
              "tone": "info"
            },
            {
              "text": "6라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Verona Volley** 대 **Cuneo Volley**, 이탈리아 수페르레가 6라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "VV",
                "name": "Verona Volley",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "이탈리아 수페르레가"
                  },
                  {
                    "label": "라운드",
                    "value": "6"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "CV",
                "name": "Cuneo Volley",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "이탈리아 수페르레가"
                  },
                  {
                    "label": "라운드",
                    "value": "6"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        }
        /* VOLLEY-AUTO 2026-11-21 END */,

        /* SOCCER-AUTO 2026-11-21 START */
        {
          "id": "soccer-esp-ath-20261121",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-21T05:00:00+09:00",
          "venue": "San Mamés",
          "away": {
            "name": "에스파뇰",
            "abbr": "ESP",
            "record": "3승 3무 6패",
            "badges": [
              {
                "text": "리그 13위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "아틀레틱 빌바오",
            "abbr": "ATH",
            "record": "4승 4무 3패",
            "badges": [
              {
                "text": "리그 7위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**에스파뇰** 3승 3무 6패(리그 13위), **아틀레틱 빌바오** 4승 4무 3패(리그 7위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.1골 대 1.4골**, 평균 실점 1.2골 대 1.0골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ESP",
                "name": "에스파뇰",
                "side": "away",
                "record": "3승 3무 6패",
                "badges": [
                  {
                    "text": "리그 13위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 3무 6패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "13위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.1골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "-1"
                  }
                ]
              },
              {
                "abbr": "ATH",
                "name": "아틀레틱 빌바오",
                "side": "home",
                "record": "4승 4무 3패",
                "badges": [
                  {
                    "text": "리그 7위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "4승 4무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "7위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-승-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.0골"
                  },
                  {
                    "label": "득실차",
                    "value": "+4"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-ful-mnc-20261121",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-21T21:30:00+09:00",
          "venue": "Etihad Stadium",
          "away": {
            "name": "풀럼",
            "abbr": "FUL",
            "record": "2승 4무 4패",
            "badges": [
              {
                "text": "리그 15위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "맨체스터 시티",
            "abbr": "MNC",
            "record": "7승 0무 3패",
            "badges": [
              {
                "text": "리그 3위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**풀럼** 2승 4무 4패(리그 15위), **맨체스터 시티** 7승 0무 3패(리그 3위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.0골 대 2.1골**, 평균 실점 1.2골 대 1.3골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "FUL",
                "name": "풀럼",
                "side": "away",
                "record": "2승 4무 4패",
                "badges": [
                  {
                    "text": "리그 15위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 4무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "15위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-무-패-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "-2"
                  }
                ]
              },
              {
                "abbr": "MNC",
                "name": "맨체스터 시티",
                "side": "home",
                "record": "7승 0무 3패",
                "badges": [
                  {
                    "text": "리그 3위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "7승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "3위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.1골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.3골"
                  },
                  {
                    "label": "득실차",
                    "value": "+8"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-dep-ala-20261121",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-21T22:00:00+09:00",
          "venue": "Mendizorrotza",
          "away": {
            "name": "데포르티보",
            "abbr": "DEP",
            "record": "3승 6무 3패",
            "badges": [
              {
                "text": "리그 9위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "알라베스",
            "abbr": "ALA",
            "record": "3승 4무 5패",
            "badges": [
              {
                "text": "리그 12위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**데포르티보** 3승 6무 3패(리그 9위), **알라베스** 3승 4무 5패(리그 12위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.2골 대 1.2골**, 평균 실점 1.2골 대 1.4골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DEP",
                "name": "데포르티보",
                "side": "away",
                "record": "3승 6무 3패",
                "badges": [
                  {
                    "text": "리그 9위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 6무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "9위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-승-패-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "+1"
                  }
                ]
              },
              {
                "abbr": "ALA",
                "name": "알라베스",
                "side": "home",
                "record": "3승 4무 5패",
                "badges": [
                  {
                    "text": "리그 12위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 4무 5패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "12위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-무-패-무-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.4골"
                  },
                  {
                    "label": "득실차",
                    "value": "-2"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        }
        /* SOCCER-AUTO 2026-11-21 END */,

        /* NBA-AUTO 2026-11-21 START */
        {
          "id": "nba-cha-atl-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T09:00:00+09:00",
          "venue": "State Farm Arena",
          "away": {
            "name": "샬럿 호네츠",
            "abbr": "CHA",
            "record": "4승 10패",
            "badges": [
              {
                "text": "원정 1승 6패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "애틀랜타 호크스",
            "abbr": "ATL",
            "record": "8승 6패",
            "badges": [
              {
                "text": "홈 3승 3패",
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
              "text": "평균 100.1점 · 117.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**샬럿 호네츠** 4승 10패(원정 1승 6패, 최근 5경기 1승 4패), **애틀랜타 호크스** 8승 6패(홈 3승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "샬럿 호네츠 3명(결장 3명), 애틀랜타 호크스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **100.1점 대 117.8점**, 평균 리바운드 46.9개 대 44.9개, 3점 성공률 31.4% 대 33.8%. 평균 득점 차 17.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "CHA",
                "name": "샬럿 호네츠",
                "side": "away",
                "record": "4승 10패",
                "venueRecord": "원정 1승 6패",
                "last5": "1승 4패",
                "lastGame": "114-118 패",
                "ppg": 100.1,
                "rpg": 46.9,
                "tp": 31.4,
                "injuries": [
                  {
                    "player": "Grayson Allen",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kon Knueppel",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Dennis Schroder",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "ATL",
                "name": "애틀랜타 호크스",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 3승 3패",
                "last5": "3승 2패",
                "lastGame": "113-106 승",
                "ppg": 117.8,
                "rpg": 44.9,
                "tp": 33.8,
                "injuries": [
                  {
                    "player": "Jock Landale",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kingston Flemings",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Asa Newell",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "CJ McCollum",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Mouhamed Gueye",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 샬럿 호네츠 승률 25.2%, 애틀랜타 호크스 74.8%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-orl-bkn-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T09:30:00+09:00",
          "venue": "Barclays Center",
          "away": {
            "name": "올랜도 매직",
            "abbr": "ORL",
            "record": "6승 7패",
            "badges": [
              {
                "text": "원정 5승 3패",
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
              "text": "결장 4명",
              "tone": "warn"
            },
            {
              "text": "평균 108.8점 · 111.2점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**올랜도 매직** 6승 7패(원정 5승 3패, 최근 5경기 4승 1패), **브루클린 네츠** 3승 10패(홈 1승 4패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "올랜도 매직 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 브루클린 네츠는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **108.8점 대 111.2점**으로 비슷하고, 평균 리바운드 43.2개 대 42.2개, 3점 성공률 34.0% 대 36.2%. 3점 성공률 차 2.2%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ORL",
                "name": "올랜도 매직",
                "side": "away",
                "record": "6승 7패",
                "venueRecord": "원정 5승 3패",
                "last5": "4승 1패",
                "lastGame": "115-105 승",
                "ppg": 108.8,
                "rpg": 43.2,
                "tp": 34.0,
                "injuries": [
                  {
                    "player": "Izaiyah Nelson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Isaac",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Noah Penda",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Paolo Banchero",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "BKN",
                "name": "브루클린 네츠",
                "side": "home",
                "record": "3승 10패",
                "venueRecord": "홈 1승 4패",
                "last5": "1승 4패",
                "lastGame": "123-135 패",
                "ppg": 111.2,
                "rpg": 42.2,
                "tp": 36.2,
                "injuries": []
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 올랜도 매직 승률 62.9%, 브루클린 네츠 37.1%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-ind-cle-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T09:30:00+09:00",
          "venue": "Rocket Arena",
          "away": {
            "name": "인디애나 페이서스",
            "abbr": "IND",
            "record": "5승 9패",
            "badges": [
              {
                "text": "원정 3승 4패",
                "tone": ""
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
              "text": "결장 6명",
              "tone": "warn"
            },
            {
              "text": "평균 112.1점 · 118.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**인디애나 페이서스** 5승 9패(원정 3승 4패, 최근 5경기 2승 3패), **클리블랜드 캐벌리어스** 8승 7패(홈 6승 2패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "인디애나 페이서스 5명(결장 3명), 클리블랜드 캐벌리어스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.1점 대 118.1점**, 평균 리바운드 41.6개 대 45.9개, 3점 성공률 32.8% 대 36.7%. 평균 득점 차 6.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "IND",
                "name": "인디애나 페이서스",
                "side": "away",
                "record": "5승 9패",
                "venueRecord": "원정 3승 4패",
                "last5": "2승 3패",
                "lastGame": "124-131 패",
                "ppg": 112.1,
                "rpg": 41.6,
                "tp": 32.8,
                "injuries": [
                  {
                    "player": "T.J. McConnell",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Andrew Nembhard",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tyrese Haliburton",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Johnny Furphy",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ben Sheppard",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "CLE",
                "name": "클리블랜드 캐벌리어스",
                "side": "home",
                "record": "8승 7패",
                "venueRecord": "홈 6승 2패",
                "last5": "3승 2패",
                "lastGame": "126-115 승",
                "ppg": 118.1,
                "rpg": 45.9,
                "tp": 36.7,
                "injuries": [
                  {
                    "player": "Nae'Qwan Tomlin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylon Tyson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Sam Merrill",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Peyton Watson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Evan Mobley",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 인디애나 페이서스 승률 19.7%, 클리블랜드 캐벌리어스 80.3%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-tor-det-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T09:30:00+09:00",
          "venue": "Little Caesars Arena",
          "away": {
            "name": "토론토 랩터스",
            "abbr": "TOR",
            "record": "5승 9패",
            "badges": [
              {
                "text": "원정 3승 4패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "디트로이트 피스턴스",
            "abbr": "DET",
            "record": "9승 4패",
            "badges": [
              {
                "text": "홈 3승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 7명",
              "tone": "warn"
            },
            {
              "text": "평균 112.9점 · 114.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**토론토 랩터스** 5승 9패(원정 3승 4패, 최근 5경기 0승 5패), **디트로이트 피스턴스** 9승 4패(홈 3승 2패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "토론토 랩터스 3명(결장 2명), 디트로이트 피스턴스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.9점 대 114.8점**으로 비슷하고, 평균 리바운드 40.6개 대 44.3개, 3점 성공률 33.3% 대 36.0%. 3점 성공률 차 2.7%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "TOR",
                "name": "토론토 랩터스",
                "side": "away",
                "record": "5승 9패",
                "venueRecord": "원정 3승 4패",
                "last5": "0승 5패",
                "lastGame": "102-111 패",
                "ppg": 112.9,
                "rpg": 40.6,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Kawhi Leonard",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Nate Bittle",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kevin McCullar Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              },
              {
                "abbr": "DET",
                "name": "디트로이트 피스턴스",
                "side": "home",
                "record": "9승 4패",
                "venueRecord": "홈 3승 2패",
                "last5": "3승 2패",
                "lastGame": "105-93 승",
                "ppg": 114.8,
                "rpg": 44.3,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Isaiah Joe",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Duncan Robinson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Taurean Prince",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ronald Holland II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Duren",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 토론토 랩터스 승률 27.8%, 디트로이트 피스턴스 72.2%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-was-chi-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T10:00:00+09:00",
          "venue": "United Center",
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
            "name": "시카고 불스",
            "abbr": "CHI",
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
              "text": "결장 6명",
              "tone": "warn"
            },
            {
              "text": "평균 111.3점 · 114.6점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**워싱턴 위저즈** 4승 11패(원정 2승 6패, 최근 5경기 0승 5패), **시카고 불스** 3승 10패(홈 1승 4패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "워싱턴 위저즈 5명(결장 4명), 시카고 불스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.3점 대 114.6점**, 평균 리바운드 41.7개 대 43.8개, 3점 성공률 31.5% 대 30.8%. 평균 득점 차 3.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "WAS",
                "name": "워싱턴 위저즈",
                "side": "away",
                "record": "4승 11패",
                "venueRecord": "원정 2승 6패",
                "last5": "0승 5패",
                "lastGame": "120-136 패",
                "ppg": 111.3,
                "rpg": 41.7,
                "tp": 31.5,
                "injuries": [
                  {
                    "player": "Felix Okpara",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tristan Vukcevic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Reece Beekman",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Justin Champagnie",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jamir Watkins",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "CHI",
                "name": "시카고 불스",
                "side": "home",
                "record": "3승 10패",
                "venueRecord": "홈 1승 4패",
                "last5": "2승 3패",
                "lastGame": "115-126 패",
                "ppg": 114.6,
                "rpg": 43.8,
                "tp": 30.8,
                "injuries": [
                  {
                    "player": "Patrick Williams",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobe Awaka",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Caleb Wilson",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 워싱턴 위저즈 승률 42.9%, 시카고 불스 57.1%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-nop-okc-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T10:00:00+09:00",
          "venue": "Paycom Center",
          "away": {
            "name": "뉴올리언스 펠리컨스",
            "abbr": "NOP",
            "record": "5승 10패",
            "badges": [
              {
                "text": "원정 1승 4패",
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
              "text": "결장 10명",
              "tone": "warn"
            },
            {
              "text": "평균 115.8점 · 112.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**뉴올리언스 펠리컨스** 5승 10패(원정 1승 4패, 최근 5경기 1승 4패), **오클라호마시티 썬더** 9승 5패(홈 5승 0패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "뉴올리언스 펠리컨스 5명(결장 5명), 오클라호마시티 썬더 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **115.8점 대 112.1점**, 평균 리바운드 42.1개 대 46.1개, 3점 성공률 33.3% 대 34.2%. 평균 득점 차 3.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "NOP",
                "name": "뉴올리언스 펠리컨스",
                "side": "away",
                "record": "5승 10패",
                "venueRecord": "원정 1승 4패",
                "last5": "1승 4패",
                "lastGame": "115-94 승",
                "ppg": 115.8,
                "rpg": 42.1,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Bennedict Mathurin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bryce McGowens",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trendon Watford",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trey Murphy III",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Dejounte Murray",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "OKC",
                "name": "오클라호마시티 썬더",
                "side": "home",
                "record": "9승 5패",
                "venueRecord": "홈 5승 0패",
                "last5": "2승 3패",
                "lastGame": "125-103 승",
                "ppg": 112.1,
                "rpg": 46.1,
                "tp": 34.2,
                "injuries": [
                  {
                    "player": "Thomas Sorber",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylin Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Cason Wallace",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chet Holmgren",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 뉴올리언스 펠리컨스 승률 10.2%, 오클라호마시티 썬더 89.8%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-phx-utah-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T11:30:00+09:00",
          "venue": "Delta Center",
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
            "name": "유타 재즈",
            "abbr": "UTAH",
            "record": "2승 13패",
            "badges": [
              {
                "text": "홈 1승 7패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 113.0점 · 108.7점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**피닉스 선즈** 6승 7패(원정 1승 3패, 최근 5경기 3승 2패), **유타 재즈** 2승 13패(홈 1승 7패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "피닉스 선즈 1명(결장 1명), 유타 재즈 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 5명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **113.0점 대 108.7점**, 평균 리바운드 40.1개 대 44.3개, 3점 성공률 36.6% 대 35.1%. 평균 득점 차 4.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "PHX",
                "name": "피닉스 선즈",
                "side": "away",
                "record": "6승 7패",
                "venueRecord": "원정 1승 3패",
                "last5": "3승 2패",
                "lastGame": "117-105 승",
                "ppg": 113.0,
                "rpg": 40.1,
                "tp": 36.6,
                "injuries": [
                  {
                    "player": "Mark Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "UTAH",
                "name": "유타 재즈",
                "side": "home",
                "record": "2승 13패",
                "venueRecord": "홈 1승 7패",
                "last5": "1승 4패",
                "lastGame": "132-107 승",
                "ppg": 108.7,
                "rpg": 44.3,
                "tp": 35.1,
                "injuries": [
                  {
                    "player": "Jaxson Hayes",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Lauri Markkanen",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jusuf Nurkic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaren Jackson Jr.",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 피닉스 선즈 승률 61.7%, 유타 재즈 38.3%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-hou-den-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T12:00:00+09:00",
          "venue": "Ball Arena",
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
              "text": "결장 2명",
              "tone": "warn"
            },
            {
              "text": "평균 117.8점 · 113.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**휴스턴 로키츠** 11승 4패(원정 4승 3패, 최근 5경기 4승 1패), **덴버 너기츠** 7승 5패(홈 2승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "휴스턴 로키츠 3명(결장 1명), 덴버 너기츠 1명(결장 1명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 4명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.8점 대 113.8점**, 평균 리바운드 45.7개 대 41.7개, 3점 성공률 37.1% 대 34.5%. 평균 득점 차 4.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "HOU",
                "name": "휴스턴 로키츠",
                "side": "away",
                "record": "11승 4패",
                "venueRecord": "원정 4승 3패",
                "last5": "4승 1패",
                "lastGame": "110-128 패",
                "ppg": 117.8,
                "rpg": 45.7,
                "tp": 37.1,
                "injuries": [
                  {
                    "player": "Clint Capela",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Amen Thompson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Julian Phillips",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              },
              {
                "abbr": "DEN",
                "name": "덴버 너기츠",
                "side": "home",
                "record": "7승 5패",
                "venueRecord": "홈 2승 3패",
                "last5": "3승 2패",
                "lastGame": "105-117 패",
                "ppg": 113.8,
                "rpg": 41.7,
                "tp": 34.5,
                "injuries": [
                  {
                    "player": "Julian Strawther",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 휴스턴 로키츠 승률 52.9%, 덴버 너기츠 47.1%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-sac-lal-20261121",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-21T12:00:00+09:00",
          "venue": "crypto.com Arena",
          "away": {
            "name": "새크라멘토 킹스",
            "abbr": "SAC",
            "record": "1승 12패",
            "badges": [
              {
                "text": "원정 1승 4패",
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
              "text": "결장 4명",
              "tone": "warn"
            },
            {
              "text": "평균 107.8점 · 122.5점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**새크라멘토 킹스** 1승 12패(원정 1승 4패, 최근 5경기 0승 5패), **LA 레이커스** 13승 2패(홈 6승 1패, 최근 5경기 5승 0패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "새크라멘토 킹스 4명(결장 2명), LA 레이커스 2명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 6명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **107.8점 대 122.5점**, 평균 리바운드 39.7개 대 41.4개, 3점 성공률 34.3% 대 38.1%. 평균 득점 차 14.7점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "SAC",
                "name": "새크라멘토 킹스",
                "side": "away",
                "record": "1승 12패",
                "venueRecord": "원정 1승 4패",
                "last5": "0승 5패",
                "lastGame": "103-125 패",
                "ppg": 107.8,
                "rpg": 39.7,
                "tp": 34.3,
                "injuries": [
                  {
                    "player": "Maxime Raynaud",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "De'Andre Hunter",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Precious Achiuwa",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Ben Simmons",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "LAL",
                "name": "LA 레이커스",
                "side": "home",
                "record": "13승 2패",
                "venueRecord": "홈 6승 1패",
                "last5": "5승 0패",
                "lastGame": "118-114 승",
                "ppg": 122.5,
                "rpg": 41.4,
                "tp": 38.1,
                "injuries": [
                  {
                    "player": "Walker Kessler",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Austin Reaves",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 새크라멘토 킹스 승률 10.5%, LA 레이커스 89.5%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-21 END */
      ]
    },

    /* ── 2026-11-22 (일) ─────────────────────────────────── */
    {
      date: "2026-11-22",
      games: [
        /* VOLLEY-AUTO 2026-11-22 START */
        {
          "id": "vball-2553016",
          "sport": "volleyball",
          "league": "GER",
          "leagueFull": "독일 1. 분데스리가",
          "source": "thesportsdb",
          "start": "2026-11-22T01:00:00+09:00",
          "away": {
            "name": "Barock Volleys MTV Ludwigsburg",
            "abbr": "BVML",
            "badges": []
          },
          "home": {
            "name": "Berlin Recycling Volleys",
            "abbr": "BRV",
            "badges": []
          },
          "tags": [
            {
              "text": "GER · 독일 1. 분데스리가",
              "tone": "info"
            },
            {
              "text": "5라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Barock Volleys MTV Ludwigsburg** 대 **Berlin Recycling Volleys**, 독일 1. 분데스리가 5라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BVML",
                "name": "Barock Volleys MTV Ludwigsburg",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "BRV",
                "name": "Berlin Recycling Volleys",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553018",
          "sport": "volleyball",
          "league": "GER",
          "leagueFull": "독일 1. 분데스리가",
          "source": "thesportsdb",
          "start": "2026-11-22T02:00:00+09:00",
          "away": {
            "name": "VfB Friedrichshafen",
            "abbr": "VF",
            "badges": []
          },
          "home": {
            "name": "Helios Grizzlys Giesen",
            "abbr": "HGG",
            "badges": []
          },
          "tags": [
            {
              "text": "GER · 독일 1. 분데스리가",
              "tone": "info"
            },
            {
              "text": "5라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**VfB Friedrichshafen** 대 **Helios Grizzlys Giesen**, 독일 1. 분데스리가 5라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "VF",
                "name": "VfB Friedrichshafen",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "HGG",
                "name": "Helios Grizzlys Giesen",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553019",
          "sport": "volleyball",
          "league": "GER",
          "leagueFull": "독일 1. 분데스리가",
          "source": "thesportsdb",
          "start": "2026-11-22T03:00:00+09:00",
          "away": {
            "name": "SWD Powervolleys Düren",
            "abbr": "SPDR",
            "badges": []
          },
          "home": {
            "name": "FT 1844 Freiburg",
            "abbr": "F1F",
            "badges": []
          },
          "tags": [
            {
              "text": "GER · 독일 1. 분데스리가",
              "tone": "info"
            },
            {
              "text": "5라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**SWD Powervolleys Düren** 대 **FT 1844 Freiburg**, 독일 1. 분데스리가 5라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "SPDR",
                "name": "SWD Powervolleys Düren",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "F1F",
                "name": "FT 1844 Freiburg",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553020",
          "sport": "volleyball",
          "league": "GER",
          "leagueFull": "독일 1. 분데스리가",
          "source": "thesportsdb",
          "start": "2026-11-22T23:00:00+09:00",
          "away": {
            "name": "Barock Volleys MTV Ludwigsburg",
            "abbr": "BVML",
            "badges": []
          },
          "home": {
            "name": "VC Olympia Berlin",
            "abbr": "VOB",
            "badges": []
          },
          "tags": [
            {
              "text": "GER · 독일 1. 분데스리가",
              "tone": "info"
            },
            {
              "text": "5라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Barock Volleys MTV Ludwigsburg** 대 **VC Olympia Berlin**, 독일 1. 분데스리가 5라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BVML",
                "name": "Barock Volleys MTV Ludwigsburg",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "VOB",
                "name": "VC Olympia Berlin",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        }
        /* VOLLEY-AUTO 2026-11-22 END */,

        /* SOCCER-AUTO 2026-11-22 START */
        {
          "id": "soccer-cry-cov-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T00:00:00+09:00",
          "venue": "Coventry Building Society Arena",
          "away": {
            "name": "크리스털 팰리스",
            "abbr": "CRY",
            "record": "2승 1무 7패",
            "badges": [
              {
                "text": "리그 20위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "코번트리 시티",
            "abbr": "COV",
            "record": "3승 0무 7패",
            "badges": [
              {
                "text": "리그 17위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**크리스털 팰리스** 2승 1무 7패(리그 20위), **코번트리 시티** 3승 0무 7패(리그 17위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.0골 대 1.0골**, 평균 실점 2.4골 대 1.9골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "CRY",
                "name": "크리스털 팰리스",
                "side": "away",
                "record": "2승 1무 7패",
                "badges": [
                  {
                    "text": "리그 20위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 1무 7패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "20위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-무-패-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.4골"
                  },
                  {
                    "label": "득실차",
                    "value": "-14"
                  }
                ]
              },
              {
                "abbr": "COV",
                "name": "코번트리 시티",
                "side": "home",
                "record": "3승 0무 7패",
                "badges": [
                  {
                    "text": "리그 17위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 0무 7패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "17위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.9골"
                  },
                  {
                    "label": "득실차",
                    "value": "-9"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-ips-tot-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T00:00:00+09:00",
          "venue": "Tottenham Hotspur Stadium",
          "away": {
            "name": "입스위치 타운",
            "abbr": "IPS",
            "record": "3승 2무 5패",
            "badges": [
              {
                "text": "리그 14위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "토트넘 홋스퍼",
            "abbr": "TOT",
            "record": "3승 3무 4패",
            "badges": [
              {
                "text": "리그 11위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**입스위치 타운** 3승 2무 5패(리그 14위), **토트넘 홋스퍼** 3승 3무 4패(리그 11위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.5골 대 1.0골**, 평균 실점 2.0골 대 1.1골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "IPS",
                "name": "입스위치 타운",
                "side": "away",
                "record": "3승 2무 5패",
                "badges": [
                  {
                    "text": "리그 14위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 2무 5패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "14위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-무-무-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.5골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.0골"
                  },
                  {
                    "label": "득실차",
                    "value": "-5"
                  }
                ]
              },
              {
                "abbr": "TOT",
                "name": "토트넘 홋스퍼",
                "side": "home",
                "record": "3승 3무 4패",
                "badges": [
                  {
                    "text": "리그 11위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 3무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "11위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-승-승-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.1골"
                  },
                  {
                    "label": "득실차",
                    "value": "-1"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-lee-che-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T00:00:00+09:00",
          "venue": "Stamford Bridge",
          "away": {
            "name": "리즈 유나이티드",
            "abbr": "LEE",
            "record": "3승 5무 2패",
            "badges": [
              {
                "text": "리그 9위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "첼시",
            "abbr": "CHE",
            "record": "5승 1무 4패",
            "badges": [
              {
                "text": "리그 5위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**리즈 유나이티드** 3승 5무 2패(리그 9위), **첼시** 5승 1무 4패(리그 5위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.0골 대 1.9골**, 평균 실점 0.8골 대 1.6골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "LEE",
                "name": "리즈 유나이티드",
                "side": "away",
                "record": "3승 5무 2패",
                "badges": [
                  {
                    "text": "리그 9위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 5무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "9위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-무-무-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "+2"
                  }
                ]
              },
              {
                "abbr": "CHE",
                "name": "첼시",
                "side": "home",
                "record": "5승 1무 4패",
                "badges": [
                  {
                    "text": "리그 5위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "5승 1무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "5위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-승-패-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.9골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.6골"
                  },
                  {
                    "label": "득실차",
                    "value": "+3"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-nfo-bou-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T00:00:00+09:00",
          "venue": "Vitality Stadium",
          "away": {
            "name": "노팅엄 포리스트",
            "abbr": "NFO",
            "record": "2승 3무 5패",
            "badges": [
              {
                "text": "리그 16위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "본머스",
            "abbr": "BOU",
            "record": "4승 3무 3패",
            "badges": [
              {
                "text": "리그 7위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**노팅엄 포리스트** 2승 3무 5패(리그 16위), **본머스** 4승 3무 3패(리그 7위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **0.9골 대 1.6골**, 평균 실점 1.3골 대 1.4골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "NFO",
                "name": "노팅엄 포리스트",
                "side": "away",
                "record": "2승 3무 5패",
                "badges": [
                  {
                    "text": "리그 16위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 3무 5패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "16위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-무-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.9골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.3골"
                  },
                  {
                    "label": "득실차",
                    "value": "-4"
                  }
                ]
              },
              {
                "abbr": "BOU",
                "name": "본머스",
                "side": "home",
                "record": "4승 3무 3패",
                "badges": [
                  {
                    "text": "리그 7위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "4승 3무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "7위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-승-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.6골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.4골"
                  },
                  {
                    "label": "득실차",
                    "value": "+2"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-sun-avl-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T00:00:00+09:00",
          "venue": "Villa Park",
          "away": {
            "name": "선덜랜드",
            "abbr": "SUN",
            "record": "2승 2무 6패",
            "badges": [
              {
                "text": "리그 19위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "애스턴 빌라",
            "abbr": "AVL",
            "record": "3승 4무 3패",
            "badges": [
              {
                "text": "리그 10위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**선덜랜드** 2승 2무 6패(리그 19위), **애스턴 빌라** 3승 4무 3패(리그 10위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **0.8골 대 1.4골**, 평균 실점 1.7골 대 1.7골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "SUN",
                "name": "선덜랜드",
                "side": "away",
                "record": "2승 2무 6패",
                "badges": [
                  {
                    "text": "리그 19위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 2무 6패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "19위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-패-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.7골"
                  },
                  {
                    "label": "득실차",
                    "value": "-9"
                  }
                ]
              },
              {
                "abbr": "AVL",
                "name": "애스턴 빌라",
                "side": "home",
                "record": "3승 4무 3패",
                "badges": [
                  {
                    "text": "리그 10위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 4무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "10위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-무-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.7골"
                  },
                  {
                    "label": "득실차",
                    "value": "-3"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-val-ray-20261122",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-22T00:15:00+09:00",
          "venue": "Estadio de Vallecas",
          "away": {
            "name": "발렌시아",
            "abbr": "VAL",
            "record": "2승 3무 7패",
            "badges": [
              {
                "text": "리그 19위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "라요 바예카노",
            "abbr": "RAY",
            "record": "3승 3무 5패",
            "badges": [
              {
                "text": "리그 14위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**발렌시아** 2승 3무 7패(리그 19위), **라요 바예카노** 3승 3무 5패(리그 14위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **0.7골 대 1.4골**, 평균 실점 1.7골 대 1.9골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "VAL",
                "name": "발렌시아",
                "side": "away",
                "record": "2승 3무 7패",
                "badges": [
                  {
                    "text": "리그 19위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 3무 7패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "19위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-승-패-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.7골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.7골"
                  },
                  {
                    "label": "득실차",
                    "value": "-12"
                  }
                ]
              },
              {
                "abbr": "RAY",
                "name": "라요 바예카노",
                "side": "home",
                "record": "3승 3무 5패",
                "badges": [
                  {
                    "text": "리그 14위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 3무 5패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "14위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-승-승-패-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.9골"
                  },
                  {
                    "label": "득실차",
                    "value": "-6"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-ars-new-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T02:30:00+09:00",
          "venue": "St. James' Park",
          "away": {
            "name": "아스널",
            "abbr": "ARS",
            "record": "9승 0무 1패",
            "badges": [
              {
                "text": "리그 1위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "뉴캐슬 유나이티드",
            "abbr": "NEW",
            "record": "3승 3무 4패",
            "badges": [
              {
                "text": "리그 12위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**아스널** 9승 0무 1패(리그 1위), **뉴캐슬 유나이티드** 3승 3무 4패(리그 12위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.5골 대 1.3골**, 평균 실점 0.5골 대 1.6골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ARS",
                "name": "아스널",
                "side": "away",
                "record": "9승 0무 1패",
                "badges": [
                  {
                    "text": "리그 1위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "9승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "1위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.5골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.5골"
                  },
                  {
                    "label": "득실차",
                    "value": "+10"
                  }
                ]
              },
              {
                "abbr": "NEW",
                "name": "뉴캐슬 유나이티드",
                "side": "home",
                "record": "3승 3무 4패",
                "badges": [
                  {
                    "text": "리그 12위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 3무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "12위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-패-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.3골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.6골"
                  },
                  {
                    "label": "득실차",
                    "value": "-3"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-bet-sev-20261122",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-22T02:30:00+09:00",
          "venue": "Ramón Sánchez Pizjuán Stadium",
          "away": {
            "name": "레알 베티스",
            "abbr": "BET",
            "record": "8승 2무 2패",
            "badges": [
              {
                "text": "리그 4위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "세비야",
            "abbr": "SEV",
            "record": "5승 3무 4패",
            "badges": [
              {
                "text": "리그 6위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**레알 베티스** 8승 2무 2패(리그 4위), **세비야** 5승 3무 4패(리그 6위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.7골 대 1.4골**, 평균 실점 1.2골 대 1.6골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BET",
                "name": "레알 베티스",
                "side": "away",
                "record": "8승 2무 2패",
                "badges": [
                  {
                    "text": "리그 4위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "8승 2무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "4위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.7골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "+5"
                  }
                ]
              },
              {
                "abbr": "SEV",
                "name": "세비야",
                "side": "home",
                "record": "5승 3무 4패",
                "badges": [
                  {
                    "text": "리그 6위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "5승 3무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "6위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-승-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.6골"
                  },
                  {
                    "label": "득실차",
                    "value": "-2"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-cel-rma-20261122",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-22T05:00:00+09:00",
          "venue": "Santiago Bernabéu",
          "away": {
            "name": "셀타 비고",
            "abbr": "CEL",
            "record": "2승 7무 3패",
            "badges": [
              {
                "text": "리그 11위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "레알 마드리드",
            "abbr": "RMA",
            "record": "10승 0무 2패",
            "badges": [
              {
                "text": "리그 2위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**셀타 비고** 2승 7무 3패(리그 11위), **레알 마드리드** 10승 0무 2패(리그 2위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **0.8골 대 2.6골**, 평균 실점 0.8골 대 0.8골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "CEL",
                "name": "셀타 비고",
                "side": "away",
                "record": "2승 7무 3패",
                "badges": [
                  {
                    "text": "리그 11위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 7무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "11위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-무-패-패-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "0"
                  }
                ]
              },
              {
                "abbr": "RMA",
                "name": "레알 마드리드",
                "side": "home",
                "record": "10승 0무 2패",
                "badges": [
                  {
                    "text": "리그 2위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "10승 0무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "2위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.6골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "+21"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-vil-bar-20261122",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-22T22:00:00+09:00",
          "venue": "Spotify Camp Nou",
          "away": {
            "name": "비야레알",
            "abbr": "VIL",
            "record": "4승 3무 5패",
            "badges": [
              {
                "text": "리그 8위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "바르셀로나",
            "abbr": "BAR",
            "record": "11승 0무 1패",
            "badges": [
              {
                "text": "리그 1위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 4.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**비야레알** 4승 3무 5패(리그 8위), **바르셀로나** 11승 0무 1패(리그 1위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.4골 대 4.0골**, 평균 실점 1.2골 대 1.1골. ESPN 오버언더는 4.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "VIL",
                "name": "비야레알",
                "side": "away",
                "record": "4승 3무 5패",
                "badges": [
                  {
                    "text": "리그 8위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "4승 3무 5패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "8위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-패-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "+2"
                  }
                ]
              },
              {
                "abbr": "BAR",
                "name": "바르셀로나",
                "side": "home",
                "record": "11승 0무 1패",
                "badges": [
                  {
                    "text": "리그 1위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "11승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "1위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "4.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.1골"
                  },
                  {
                    "label": "득실차",
                    "value": "+35"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-bha-hul-20261122",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-22T23:00:00+09:00",
          "venue": "The MKM Stadium",
          "away": {
            "name": "브라이턴",
            "abbr": "BHA",
            "record": "7승 1무 2패",
            "badges": [
              {
                "text": "리그 2위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "헐 시티",
            "abbr": "HUL",
            "record": "2승 5무 3패",
            "badges": [
              {
                "text": "리그 13위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**브라이턴** 7승 1무 2패(리그 2위), **헐 시티** 2승 5무 3패(리그 13위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **2.6골 대 1.1골**, 평균 실점 0.7골 대 1.1골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BHA",
                "name": "브라이턴",
                "side": "away",
                "record": "7승 1무 2패",
                "badges": [
                  {
                    "text": "리그 2위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "7승 1무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "2위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-승-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.6골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.7골"
                  },
                  {
                    "label": "득실차",
                    "value": "+19"
                  }
                ]
              },
              {
                "abbr": "HUL",
                "name": "헐 시티",
                "side": "home",
                "record": "2승 5무 3패",
                "badges": [
                  {
                    "text": "리그 13위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 5무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "13위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-무-무-패-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.1골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.1골"
                  },
                  {
                    "label": "득실차",
                    "value": "0"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        }
        /* SOCCER-AUTO 2026-11-22 END */,

        /* NBA-AUTO 2026-11-22 START */
        {
          "id": "nba-mil-phi-20261122",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-22T03:00:00+09:00",
          "venue": "Xfinity Mobile Arena",
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
            "name": "필라델피아 세븐티식서스",
            "abbr": "PHI",
            "record": "12승 3패",
            "badges": [
              {
                "text": "홈 6승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 106.1점 · 114.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**밀워키 벅스** 1승 13패(원정 0승 6패, 최근 5경기 0승 5패), **필라델피아 세븐티식서스** 12승 3패(홈 6승 2패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "밀워키 벅스 1명(결장 1명), 필라델피아 세븐티식서스 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 5명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **106.1점 대 114.1점**, 평균 리바운드 45.4개 대 43.1개, 3점 성공률 34.1% 대 35.2%. 평균 득점 차 8.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MIL",
                "name": "밀워키 벅스",
                "side": "away",
                "record": "1승 13패",
                "venueRecord": "원정 0승 6패",
                "last5": "0승 5패",
                "lastGame": "106-113 패",
                "ppg": 106.1,
                "rpg": 45.4,
                "tp": 34.1,
                "injuries": [
                  {
                    "player": "Ousmane Dieng",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "PHI",
                "name": "필라델피아 세븐티식서스",
                "side": "home",
                "record": "12승 3패",
                "venueRecord": "홈 6승 2패",
                "last5": "4승 1패",
                "lastGame": "135-123 승",
                "ppg": 114.1,
                "rpg": 43.1,
                "tp": 35.2,
                "injuries": [
                  {
                    "player": "Dominick Barlow",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylen Brown",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Adem Bona",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ariel Hukporti",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 밀워키 벅스 승률 14.8%, 필라델피아 세븐티식서스 85.2%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-por-nyk-20261122",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-22T09:30:00+09:00",
          "venue": "Madison Square Garden",
          "away": {
            "name": "포틀랜드 트레일블레이저스",
            "abbr": "POR",
            "record": "9승 5패",
            "badges": [
              {
                "text": "원정 6승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "뉴욕 닉스",
            "abbr": "NYK",
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
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 117.0점 · 110.0점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**포틀랜드 트레일블레이저스** 9승 5패(원정 6승 3패, 최근 5경기 3승 2패), **뉴욕 닉스** 8승 6패(홈 4승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "포틀랜드 트레일블레이저스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 뉴욕 닉스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.0점 대 110.0점**, 평균 리바운드 44.7개 대 47.5개, 3점 성공률 36.0% 대 36.0%. 평균 득점 차 7.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "POR",
                "name": "포틀랜드 트레일블레이저스",
                "side": "away",
                "record": "9승 5패",
                "venueRecord": "원정 6승 3패",
                "last5": "3승 2패",
                "lastGame": "105-106 패",
                "ppg": 117.0,
                "rpg": 44.7,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Deni Avdija",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chris Youngblood",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Vit Krejci",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ja Morant",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Shaedon Sharpe",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "NYK",
                "name": "뉴욕 닉스",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 4승 3패",
                "last5": "3승 2패",
                "lastGame": "111-102 승",
                "ppg": 110.0,
                "rpg": 47.5,
                "tp": 36.0,
                "injuries": []
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 포틀랜드 트레일블레이저스 승률 34.3%, 뉴욕 닉스 65.7%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-lac-dal-20261122",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-22T10:00:00+09:00",
          "venue": "American Airlines Center",
          "away": {
            "name": "LA 클리퍼스",
            "abbr": "LAC",
            "record": "4승 9패",
            "badges": [
              {
                "text": "원정 0승 5패",
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
              "text": "결장 7명",
              "tone": "warn"
            },
            {
              "text": "평균 111.9점 · 112.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**LA 클리퍼스** 4승 9패(원정 0승 5패, 최근 5경기 3승 2패), **댈러스 매버릭스** 7승 7패(홈 5승 2패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "LA 클리퍼스 4명(결장 4명), 댈러스 매버릭스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 9명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.9점 대 112.1점**으로 비슷하고, 평균 리바운드 39.5개 대 43.3개, 3점 성공률 39.0% 대 33.5%. 3점 성공률 차 5.5%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "LAC",
                "name": "LA 클리퍼스",
                "side": "away",
                "record": "4승 9패",
                "venueRecord": "원정 0승 5패",
                "last5": "3승 2패",
                "lastGame": "107-132 패",
                "ppg": 111.9,
                "rpg": 39.5,
                "tp": 39.0,
                "injuries": [
                  {
                    "player": "Yanic Konan Niederhauser",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Brandon Ingram",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bradley Beal",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jordan Miller",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "DAL",
                "name": "댈러스 매버릭스",
                "side": "home",
                "record": "7승 7패",
                "venueRecord": "홈 5승 2패",
                "last5": "2승 3패",
                "lastGame": "94-131 패",
                "ppg": 112.1,
                "rpg": 43.3,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Sergio de Larrea",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Walter Clayton Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Dereck Lively II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Tobi Lawal",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tarik Biberovic",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — LA 클리퍼스 승률 28.3%, 댈러스 매버릭스 71.7%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-mem-min-20261122",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-22T10:00:00+09:00",
          "venue": "Target Center",
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
            "name": "미네소타 팀버울브스",
            "abbr": "MIN",
            "record": "11승 4패",
            "badges": [
              {
                "text": "홈 7승 2패",
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
              "text": "평균 121.7점 · 116.7점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**멤피스 그리즐리스** 10승 4패(원정 7승 0패, 최근 5경기 4승 1패), **미네소타 팀버울브스** 11승 4패(홈 7승 2패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "멤피스 그리즐리스 5명(결장 5명), 미네소타 팀버울브스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **121.7점 대 116.7점**, 평균 리바운드 47.4개 대 48.6개, 3점 성공률 39.5% 대 37.0%. 평균 득점 차 5.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MEM",
                "name": "멤피스 그리즐리스",
                "side": "away",
                "record": "10승 4패",
                "venueRecord": "원정 7승 0패",
                "last5": "4승 1패",
                "lastGame": "136-120 승",
                "ppg": 121.7,
                "rpg": 47.4,
                "tp": 39.5,
                "injuries": [
                  {
                    "player": "GG Jackson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Isaiah Stewart",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ty Jerome",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Scotty Pippen Jr.",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Richie Saunders",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "MIN",
                "name": "미네소타 팀버울브스",
                "side": "home",
                "record": "11승 4패",
                "venueRecord": "홈 7승 2패",
                "last5": "4승 1패",
                "lastGame": "106-105 승",
                "ppg": 116.7,
                "rpg": 48.6,
                "tp": 37.0,
                "injuries": [
                  {
                    "player": "Zyon Pullin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Kuminga",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylen Clark",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Anthony Edwards",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Donte DiVincenzo",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 멤피스 그리즐리스 승률 26.7%, 미네소타 팀버울브스 73.3%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-nop-sas-20261122",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-22T10:00:00+09:00",
          "venue": "Frost Bank Center",
          "away": {
            "name": "뉴올리언스 펠리컨스",
            "abbr": "NOP",
            "record": "5승 10패",
            "badges": [
              {
                "text": "원정 1승 4패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "샌안토니오 스퍼스",
            "abbr": "SAS",
            "record": "12승 3패",
            "badges": [
              {
                "text": "홈 5승 3패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 7명",
              "tone": "warn"
            },
            {
              "text": "평균 115.8점 · 117.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**뉴올리언스 펠리컨스** 5승 10패(원정 1승 4패, 최근 5경기 1승 4패), **샌안토니오 스퍼스** 12승 3패(홈 5승 3패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "뉴올리언스 펠리컨스 5명(결장 5명), 샌안토니오 스퍼스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **115.8점 대 117.1점**으로 비슷하고, 평균 리바운드 42.1개 대 48.2개, 3점 성공률 33.3% 대 33.5%. 3점 성공률 차 0.2%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "NOP",
                "name": "뉴올리언스 펠리컨스",
                "side": "away",
                "record": "5승 10패",
                "venueRecord": "원정 1승 4패",
                "last5": "1승 4패",
                "lastGame": "115-94 승",
                "ppg": 115.8,
                "rpg": 42.1,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Bennedict Mathurin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bryce McGowens",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trendon Watford",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trey Murphy III",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Dejounte Murray",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "SAS",
                "name": "샌안토니오 스퍼스",
                "side": "home",
                "record": "12승 3패",
                "venueRecord": "홈 5승 3패",
                "last5": "4승 1패",
                "lastGame": "93-105 패",
                "ppg": 117.1,
                "rpg": 48.2,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Dylan Harper",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobias Harris",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jayden Quaintance",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 뉴올리언스 펠리컨스 승률 8.2%, 샌안토니오 스퍼스 91.8%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-bos-sac-20261122",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-22T12:00:00+09:00",
          "venue": "Golden 1 Center",
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
              "text": "결장 2명",
              "tone": "warn"
            },
            {
              "text": "평균 114.8점 · 107.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**보스턴 셀틱스** 11승 3패(원정 5승 2패, 최근 5경기 4승 1패), **새크라멘토 킹스** 1승 12패(홈 0승 8패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "새크라멘토 킹스 4명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 보스턴 셀틱스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 107.8점**, 평균 리바운드 44.9개 대 39.7개, 3점 성공률 38.2% 대 34.3%. 평균 득점 차 7.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BOS",
                "name": "보스턴 셀틱스",
                "side": "away",
                "record": "11승 3패",
                "venueRecord": "원정 5승 2패",
                "last5": "4승 1패",
                "lastGame": "105-115 패",
                "ppg": 114.8,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": []
              },
              {
                "abbr": "SAC",
                "name": "새크라멘토 킹스",
                "side": "home",
                "record": "1승 12패",
                "venueRecord": "홈 0승 8패",
                "last5": "0승 5패",
                "lastGame": "103-125 패",
                "ppg": 107.8,
                "rpg": 39.7,
                "tp": 34.3,
                "injuries": [
                  {
                    "player": "Maxime Raynaud",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "De'Andre Hunter",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Precious Achiuwa",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Ben Simmons",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 보스턴 셀틱스 승률 90.2%, 새크라멘토 킹스 9.8%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-22 END */
      ]
    },

    /* ── 2026-11-23 (월) ─────────────────────────────────── */
    {
      date: "2026-11-23",
      games: [
        /* VOLLEY-AUTO 2026-11-23 START */
        {
          "id": "vball-2553021",
          "sport": "volleyball",
          "league": "GER",
          "leagueFull": "독일 1. 분데스리가",
          "source": "thesportsdb",
          "start": "2026-11-23T00:00:00+09:00",
          "away": {
            "name": "TV Rottenburg",
            "abbr": "TR",
            "badges": []
          },
          "home": {
            "name": "Netzhoppers KW",
            "abbr": "NK",
            "badges": []
          },
          "tags": [
            {
              "text": "GER · 독일 1. 분데스리가",
              "tone": "info"
            },
            {
              "text": "5라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**TV Rottenburg** 대 **Netzhoppers KW**, 독일 1. 분데스리가 5라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "TR",
                "name": "TV Rottenburg",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "NK",
                "name": "Netzhoppers KW",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "독일 1. 분데스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "5"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2554206",
          "sport": "volleyball",
          "league": "ITA",
          "leagueFull": "이탈리아 수페르레가",
          "source": "thesportsdb",
          "start": "2026-11-23T02:00:00+09:00",
          "away": {
            "name": "Cisterna Volley",
            "abbr": "CV",
            "badges": []
          },
          "home": {
            "name": "Modena Volley",
            "abbr": "MV",
            "badges": []
          },
          "tags": [
            {
              "text": "ITA · 이탈리아 수페르레가",
              "tone": "info"
            },
            {
              "text": "6라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Cisterna Volley** 대 **Modena Volley**, 이탈리아 수페르레가 6라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "CV",
                "name": "Cisterna Volley",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "이탈리아 수페르레가"
                  },
                  {
                    "label": "라운드",
                    "value": "6"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "MV",
                "name": "Modena Volley",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "이탈리아 수페르레가"
                  },
                  {
                    "label": "라운드",
                    "value": "6"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          },
          "venue": "PalaPanini"
        }
        /* VOLLEY-AUTO 2026-11-23 END */,

        /* SOCCER-AUTO 2026-11-23 START */
        {
          "id": "soccer-rso-rac-20261123",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-23T00:15:00+09:00",
          "venue": "El Sardineros",
          "away": {
            "name": "레알 소시에다드",
            "abbr": "RSO",
            "record": "7승 1무 4패",
            "badges": [
              {
                "text": "리그 5위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "라싱 산탄데르",
            "abbr": "RAC",
            "record": "4승 2무 6패",
            "badges": [
              {
                "text": "리그 10위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**레알 소시에다드** 7승 1무 4패(리그 5위), **라싱 산탄데르** 4승 2무 6패(리그 10위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.8골 대 1.4골**, 평균 실점 1.7골 대 2.5골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "RSO",
                "name": "레알 소시에다드",
                "side": "away",
                "record": "7승 1무 4패",
                "badges": [
                  {
                    "text": "리그 5위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "7승 1무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "5위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-무-패-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.7골"
                  },
                  {
                    "label": "득실차",
                    "value": "+1"
                  }
                ]
              },
              {
                "abbr": "RAC",
                "name": "라싱 산탄데르",
                "side": "home",
                "record": "4승 2무 6패",
                "badges": [
                  {
                    "text": "리그 10위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "4승 2무 6패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "10위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-승-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.5골"
                  },
                  {
                    "label": "득실차",
                    "value": "-13"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-man-liv-20261123",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-23T01:30:00+09:00",
          "venue": "Anfield",
          "away": {
            "name": "맨체스터 유나이티드",
            "abbr": "MAN",
            "record": "1승 5무 4패",
            "badges": [
              {
                "text": "리그 18위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "리버풀",
            "abbr": "LIV",
            "record": "5승 3무 2패",
            "badges": [
              {
                "text": "리그 4위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**맨체스터 유나이티드** 1승 5무 4패(리그 18위), **리버풀** 5승 3무 2패(리그 4위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.4골 대 1.4골**, 평균 실점 1.9골 대 1.0골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MAN",
                "name": "맨체스터 유나이티드",
                "side": "away",
                "record": "1승 5무 4패",
                "badges": [
                  {
                    "text": "리그 18위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "1승 5무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "18위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.9골"
                  },
                  {
                    "label": "득실차",
                    "value": "-5"
                  }
                ]
              },
              {
                "abbr": "LIV",
                "name": "리버풀",
                "side": "home",
                "record": "5승 3무 2패",
                "badges": [
                  {
                    "text": "리그 4위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "5승 3무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "4위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-패-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.4골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.0골"
                  },
                  {
                    "label": "득실차",
                    "value": "+4"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-mcf-osa-20261123",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-23T02:30:00+09:00",
          "venue": "El Sadar",
          "away": {
            "name": "말라가",
            "abbr": "MCF",
            "record": "0승 5무 7패",
            "badges": [
              {
                "text": "리그 20위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "오사수나",
            "abbr": "OSA",
            "record": "3승 3무 6패",
            "badges": [
              {
                "text": "리그 16위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**말라가** 0승 5무 7패(리그 20위), **오사수나** 3승 3무 6패(리그 16위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **0.8골 대 1.0골**, 평균 실점 1.9골 대 1.9골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MCF",
                "name": "말라가",
                "side": "away",
                "record": "0승 5무 7패",
                "badges": [
                  {
                    "text": "리그 20위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "0승 5무 7패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "20위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-승-무-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.9골"
                  },
                  {
                    "label": "득실차",
                    "value": "-14"
                  }
                ]
              },
              {
                "abbr": "OSA",
                "name": "오사수나",
                "side": "home",
                "record": "3승 3무 6패",
                "badges": [
                  {
                    "text": "리그 16위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 3무 6패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "16위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-승-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.9골"
                  },
                  {
                    "label": "득실차",
                    "value": "-11"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-atm-get-20261123",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-23T05:00:00+09:00",
          "venue": "Estadio Coliseum",
          "away": {
            "name": "아틀레티코 마드리드",
            "abbr": "ATM",
            "record": "9승 1무 2패",
            "badges": [
              {
                "text": "리그 3위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "헤타페",
            "abbr": "GET",
            "record": "3승 3무 6패",
            "badges": [
              {
                "text": "리그 15위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**아틀레티코 마드리드** 9승 1무 2패(리그 3위), **헤타페** 3승 3무 6패(리그 15위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.9골 대 0.7골**, 평균 실점 0.8골 대 1.5골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ATM",
                "name": "아틀레티코 마드리드",
                "side": "away",
                "record": "9승 1무 2패",
                "badges": [
                  {
                    "text": "리그 3위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "9승 1무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "3위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-승-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.9골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "+13"
                  }
                ]
              },
              {
                "abbr": "GET",
                "name": "헤타페",
                "side": "home",
                "record": "3승 3무 6패",
                "badges": [
                  {
                    "text": "리그 15위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 3무 6패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "15위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-승-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.7골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.5골"
                  },
                  {
                    "label": "득실차",
                    "value": "-10"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        }
        /* SOCCER-AUTO 2026-11-23 END */,

        /* NBA-AUTO 2026-11-23 START */
        {
          "id": "nba-det-atl-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T05:30:00+09:00",
          "venue": "State Farm Arena",
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
            "name": "애틀랜타 호크스",
            "abbr": "ATL",
            "record": "8승 6패",
            "badges": [
              {
                "text": "홈 3승 3패",
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
              "text": "평균 114.8점 · 117.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**디트로이트 피스턴스** 9승 4패(원정 6승 2패, 최근 5경기 3승 2패), **애틀랜타 호크스** 8승 6패(홈 3승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "디트로이트 피스턴스 5명(결장 5명), 애틀랜타 호크스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 117.8점**, 평균 리바운드 44.3개 대 44.9개, 3점 성공률 36.0% 대 33.8%. 평균 득점 차 3.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DET",
                "name": "디트로이트 피스턴스",
                "side": "away",
                "record": "9승 4패",
                "venueRecord": "원정 6승 2패",
                "last5": "3승 2패",
                "lastGame": "105-93 승",
                "ppg": 114.8,
                "rpg": 44.3,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Isaiah Joe",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Duncan Robinson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Taurean Prince",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ronald Holland II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Duren",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "ATL",
                "name": "애틀랜타 호크스",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 3승 3패",
                "last5": "3승 2패",
                "lastGame": "113-106 승",
                "ppg": 117.8,
                "rpg": 44.9,
                "tp": 33.8,
                "injuries": [
                  {
                    "player": "Jock Landale",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kingston Flemings",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Asa Newell",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "CJ McCollum",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Mouhamed Gueye",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 디트로이트 피스턴스 승률 51.5%, 애틀랜타 호크스 48.5%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-okc-mia-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T08:00:00+09:00",
          "venue": "Kaseya Center",
          "away": {
            "name": "오클라호마시티 썬더",
            "abbr": "OKC",
            "record": "9승 5패",
            "badges": [
              {
                "text": "원정 4승 5패",
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
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 112.1점 · 119.4점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**오클라호마시티 썬더** 9승 5패(원정 4승 5패, 최근 5경기 2승 3패), **마이애미 히트** 8승 6패(홈 4승 3패, 최근 5경기 5승 0패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "오클라호마시티 썬더 5명(결장 5명), 마이애미 히트 3명이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.1점 대 119.4점**, 평균 리바운드 46.1개 대 42.6개, 3점 성공률 34.2% 대 34.3%. 평균 득점 차 7.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "OKC",
                "name": "오클라호마시티 썬더",
                "side": "away",
                "record": "9승 5패",
                "venueRecord": "원정 4승 5패",
                "last5": "2승 3패",
                "lastGame": "125-103 승",
                "ppg": 112.1,
                "rpg": 46.1,
                "tp": 34.2,
                "injuries": [
                  {
                    "player": "Thomas Sorber",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylin Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Cason Wallace",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chet Holmgren",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "MIA",
                "name": "마이애미 히트",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 4승 3패",
                "last5": "5승 0패",
                "lastGame": "128-110 승",
                "ppg": 119.4,
                "rpg": 42.6,
                "tp": 34.3,
                "injuries": [
                  {
                    "player": "Myron Gardner",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Nikola Jovic",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Bam Adebayo",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 오클라호마시티 썬더 승률 59.1%, 마이애미 히트 40.9%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-orl-was-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T09:00:00+09:00",
          "venue": "Capital One Arena",
          "away": {
            "name": "올랜도 매직",
            "abbr": "ORL",
            "record": "6승 7패",
            "badges": [
              {
                "text": "원정 5승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "워싱턴 위저즈",
            "abbr": "WAS",
            "record": "4승 11패",
            "badges": [
              {
                "text": "홈 2승 5패",
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
              "text": "평균 108.8점 · 111.3점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**올랜도 매직** 6승 7패(원정 5승 3패, 최근 5경기 4승 1패), **워싱턴 위저즈** 4승 11패(홈 2승 5패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "올랜도 매직 4명(결장 4명), 워싱턴 위저즈 5명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 9명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **108.8점 대 111.3점**으로 비슷하고, 평균 리바운드 43.2개 대 41.7개, 3점 성공률 34.0% 대 31.5%. 3점 성공률 차 2.5%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ORL",
                "name": "올랜도 매직",
                "side": "away",
                "record": "6승 7패",
                "venueRecord": "원정 5승 3패",
                "last5": "4승 1패",
                "lastGame": "115-105 승",
                "ppg": 108.8,
                "rpg": 43.2,
                "tp": 34.0,
                "injuries": [
                  {
                    "player": "Izaiyah Nelson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Isaac",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Noah Penda",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Paolo Banchero",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "WAS",
                "name": "워싱턴 위저즈",
                "side": "home",
                "record": "4승 11패",
                "venueRecord": "홈 2승 5패",
                "last5": "0승 5패",
                "lastGame": "120-136 패",
                "ppg": 111.3,
                "rpg": 41.7,
                "tp": 31.5,
                "injuries": [
                  {
                    "player": "Felix Okpara",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tristan Vukcevic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Reece Beekman",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Justin Champagnie",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jamir Watkins",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 올랜도 매직 승률 60.6%, 워싱턴 위저즈 39.4%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-den-chi-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T09:00:00+09:00",
          "venue": "United Center",
          "away": {
            "name": "덴버 너기츠",
            "abbr": "DEN",
            "record": "7승 5패",
            "badges": [
              {
                "text": "원정 4승 2패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "시카고 불스",
            "abbr": "CHI",
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
              "text": "결장 3명",
              "tone": "warn"
            },
            {
              "text": "평균 113.8점 · 114.6점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**덴버 너기츠** 7승 5패(원정 4승 2패, 최근 5경기 3승 2패), **시카고 불스** 3승 10패(홈 1승 4패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "덴버 너기츠 1명(결장 1명), 시카고 불스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 4명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **113.8점 대 114.6점**으로 비슷하고, 평균 리바운드 41.7개 대 43.8개, 3점 성공률 34.5% 대 30.8%. 3점 성공률 차 3.7%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DEN",
                "name": "덴버 너기츠",
                "side": "away",
                "record": "7승 5패",
                "venueRecord": "원정 4승 2패",
                "last5": "3승 2패",
                "lastGame": "105-117 패",
                "ppg": 113.8,
                "rpg": 41.7,
                "tp": 34.5,
                "injuries": [
                  {
                    "player": "Julian Strawther",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "CHI",
                "name": "시카고 불스",
                "side": "home",
                "record": "3승 10패",
                "venueRecord": "홈 1승 4패",
                "last5": "2승 3패",
                "lastGame": "115-126 패",
                "ppg": 114.6,
                "rpg": 43.8,
                "tp": 30.8,
                "injuries": [
                  {
                    "player": "Patrick Williams",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobe Awaka",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Caleb Wilson",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 덴버 너기츠 승률 70.1%, 시카고 불스 29.9%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-dal-utah-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T09:00:00+09:00",
          "venue": "Delta Center",
          "away": {
            "name": "댈러스 매버릭스",
            "abbr": "DAL",
            "record": "7승 7패",
            "badges": [
              {
                "text": "원정 2승 5패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "유타 재즈",
            "abbr": "UTAH",
            "record": "2승 13패",
            "badges": [
              {
                "text": "홈 1승 7패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 7명",
              "tone": "warn"
            },
            {
              "text": "평균 112.1점 · 108.7점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**댈러스 매버릭스** 7승 7패(원정 2승 5패, 최근 5경기 2승 3패), **유타 재즈** 2승 13패(홈 1승 7패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "댈러스 매버릭스 5명(결장 3명), 유타 재즈 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 9명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.1점 대 108.7점**, 평균 리바운드 43.3개 대 44.3개, 3점 성공률 33.5% 대 35.1%. 평균 득점 차 3.4점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DAL",
                "name": "댈러스 매버릭스",
                "side": "away",
                "record": "7승 7패",
                "venueRecord": "원정 2승 5패",
                "last5": "2승 3패",
                "lastGame": "94-131 패",
                "ppg": 112.1,
                "rpg": 43.3,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Sergio de Larrea",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Walter Clayton Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Dereck Lively II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Tobi Lawal",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tarik Biberovic",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "UTAH",
                "name": "유타 재즈",
                "side": "home",
                "record": "2승 13패",
                "venueRecord": "홈 1승 7패",
                "last5": "1승 4패",
                "lastGame": "132-107 승",
                "ppg": 108.7,
                "rpg": 44.3,
                "tp": 35.1,
                "injuries": [
                  {
                    "player": "Jaxson Hayes",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Lauri Markkanen",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jusuf Nurkic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaren Jackson Jr.",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 댈러스 매버릭스 승률 57.2%, 유타 재즈 42.8%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-ind-nyk-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T10:00:00+09:00",
          "venue": "Madison Square Garden",
          "away": {
            "name": "인디애나 페이서스",
            "abbr": "IND",
            "record": "5승 9패",
            "badges": [
              {
                "text": "원정 3승 4패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "뉴욕 닉스",
            "abbr": "NYK",
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
              "text": "결장 3명",
              "tone": "warn"
            },
            {
              "text": "평균 112.1점 · 110.0점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**인디애나 페이서스** 5승 9패(원정 3승 4패, 최근 5경기 2승 3패), **뉴욕 닉스** 8승 6패(홈 4승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "인디애나 페이서스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 뉴욕 닉스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.1점 대 110.0점**으로 비슷하고, 평균 리바운드 41.6개 대 47.5개, 3점 성공률 32.8% 대 36.0%. 3점 성공률 차 3.2%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "IND",
                "name": "인디애나 페이서스",
                "side": "away",
                "record": "5승 9패",
                "venueRecord": "원정 3승 4패",
                "last5": "2승 3패",
                "lastGame": "124-131 패",
                "ppg": 112.1,
                "rpg": 41.6,
                "tp": 32.8,
                "injuries": [
                  {
                    "player": "T.J. McConnell",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Andrew Nembhard",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tyrese Haliburton",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Johnny Furphy",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ben Sheppard",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "NYK",
                "name": "뉴욕 닉스",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 4승 3패",
                "last5": "3승 2패",
                "lastGame": "111-102 승",
                "ppg": 110.0,
                "rpg": 47.5,
                "tp": 36.0,
                "injuries": []
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 인디애나 페이서스 승률 16.9%, 뉴욕 닉스 83.1%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-bos-gsw-20261123",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-23T10:30:00+09:00",
          "venue": "Chase Center",
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
            "name": "골든스테이트 워리어스",
            "abbr": "GSW",
            "record": "8승 6패",
            "badges": [
              {
                "text": "홈 6승 1패",
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
              "text": "평균 114.8점 · 115.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**보스턴 셀틱스** 11승 3패(원정 5승 2패, 최근 5경기 4승 1패), **골든스테이트 워리어스** 8승 6패(홈 6승 1패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "골든스테이트 워리어스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 보스턴 셀틱스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 115.1점**으로 비슷하고, 평균 리바운드 44.9개 대 44.9개, 3점 성공률 38.2% 대 38.2%. 3점 성공률 차 0.0%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BOS",
                "name": "보스턴 셀틱스",
                "side": "away",
                "record": "11승 3패",
                "venueRecord": "원정 5승 2패",
                "last5": "4승 1패",
                "lastGame": "105-115 패",
                "ppg": 114.8,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": []
              },
              {
                "abbr": "GSW",
                "name": "골든스테이트 워리어스",
                "side": "home",
                "record": "8승 6패",
                "venueRecord": "홈 6승 1패",
                "last5": "2승 3패",
                "lastGame": "94-115 패",
                "ppg": 115.1,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": [
                  {
                    "player": "Draymond Green",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Al Horford",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Stephen Curry",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Brandon Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kristaps Porzingis",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 보스턴 셀틱스 승률 75.3%, 골든스테이트 워리어스 24.7%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-23 END */
      ]
    },

    /* ── 2026-11-24 (화) ─────────────────────────────────── */
    {
      date: "2026-11-24",
      games: [
        /* VOLLEY-AUTO 2026-11-24 START */
        {
          "id": "vball-2553961",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-24T03:30:00+09:00",
          "away": {
            "name": "Ślepsk Suwałki",
            "abbr": "LSK",
            "badges": []
          },
          "home": {
            "name": "Bogdanka LUK Lublin",
            "abbr": "BLL",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "8라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Ślepsk Suwałki** 대 **Bogdanka LUK Lublin**, 폴란드 플루스리가 8라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "LSK",
                "name": "Ślepsk Suwałki",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "8"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "BLL",
                "name": "Bogdanka LUK Lublin",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "8"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        }
        /* VOLLEY-AUTO 2026-11-24 END */,

        /* SOCCER-AUTO 2026-11-24 START */
        {
          "id": "soccer-elc-lev-20261124",
          "sport": "soccer",
          "league": "LALIGA",
          "leagueFull": "라리가",
          "source": "espn",
          "start": "2026-11-24T05:00:00+09:00",
          "venue": "Estadi Ciutat de València",
          "away": {
            "name": "엘체",
            "abbr": "ELC",
            "record": "2승 4무 6패",
            "badges": [
              {
                "text": "리그 18위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "레반테",
            "abbr": "LEV",
            "record": "2승 5무 5패",
            "badges": [
              {
                "text": "리그 17위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "LALIGA · 라리가",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**엘체** 2승 4무 6패(리그 18위), **레반테** 2승 5무 5패(리그 17위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.2골 대 1.3골**, 평균 실점 1.7골 대 1.8골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "ELC",
                "name": "엘체",
                "side": "away",
                "record": "2승 4무 6패",
                "badges": [
                  {
                    "text": "리그 18위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 4무 6패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "18위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-승-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.7골"
                  },
                  {
                    "label": "득실차",
                    "value": "-6"
                  }
                ]
              },
              {
                "abbr": "LEV",
                "name": "레반테",
                "side": "home",
                "record": "2승 5무 5패",
                "badges": [
                  {
                    "text": "리그 17위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "2승 5무 5패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "17위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-무-패-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.3골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "-5"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-eve-bre-20261124",
          "sport": "soccer",
          "league": "EPL",
          "leagueFull": "프리미어리그",
          "source": "espn",
          "start": "2026-11-24T05:00:00+09:00",
          "venue": "Gtech Community Stadium",
          "away": {
            "name": "에버턴",
            "abbr": "EVE",
            "record": "4승 4무 2패",
            "badges": [
              {
                "text": "리그 6위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "브렌트퍼드",
            "abbr": "BRE",
            "record": "3승 5무 2패",
            "badges": [
              {
                "text": "리그 8위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "EPL · 프리미어리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**에버턴** 4승 4무 2패(리그 6위), **브렌트퍼드** 3승 5무 2패(리그 8위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.2골 대 1.6골**, 평균 실점 1.0골 대 1.1골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "EVE",
                "name": "에버턴",
                "side": "away",
                "record": "4승 4무 2패",
                "badges": [
                  {
                    "text": "리그 6위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "4승 4무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "6위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-승-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.0골"
                  },
                  {
                    "label": "득실차",
                    "value": "+2"
                  }
                ]
              },
              {
                "abbr": "BRE",
                "name": "브렌트퍼드",
                "side": "home",
                "record": "3승 5무 2패",
                "badges": [
                  {
                    "text": "리그 8위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "시즌 전적",
                    "value": "3승 5무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "8위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-무-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.6골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.1골"
                  },
                  {
                    "label": "득실차",
                    "value": "+5"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        }
        /* SOCCER-AUTO 2026-11-24 END */,

        /* NBA-AUTO 2026-11-24 START */
        {
          "id": "nba-mem-cha-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T09:00:00+09:00",
          "venue": "Spectrum Center",
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
            "name": "샬럿 호네츠",
            "abbr": "CHA",
            "record": "4승 10패",
            "badges": [
              {
                "text": "홈 3승 4패",
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
              "text": "평균 121.7점 · 100.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**멤피스 그리즐리스** 10승 4패(원정 7승 0패, 최근 5경기 4승 1패), **샬럿 호네츠** 4승 10패(홈 3승 4패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "멤피스 그리즐리스 5명(결장 5명), 샬럿 호네츠 3명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **121.7점 대 100.1점**, 평균 리바운드 47.4개 대 46.9개, 3점 성공률 39.5% 대 31.4%. 평균 득점 차 21.6점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MEM",
                "name": "멤피스 그리즐리스",
                "side": "away",
                "record": "10승 4패",
                "venueRecord": "원정 7승 0패",
                "last5": "4승 1패",
                "lastGame": "136-120 승",
                "ppg": 121.7,
                "rpg": 47.4,
                "tp": 39.5,
                "injuries": [
                  {
                    "player": "GG Jackson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Isaiah Stewart",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ty Jerome",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Scotty Pippen Jr.",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Richie Saunders",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "CHA",
                "name": "샬럿 호네츠",
                "side": "home",
                "record": "4승 10패",
                "venueRecord": "홈 3승 4패",
                "last5": "1승 4패",
                "lastGame": "114-118 패",
                "ppg": 100.1,
                "rpg": 46.9,
                "tp": 31.4,
                "injuries": [
                  {
                    "player": "Grayson Allen",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kon Knueppel",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Dennis Schroder",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 멤피스 그리즐리스 승률 59.8%, 샬럿 호네츠 40.2%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-por-phi-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T09:00:00+09:00",
          "venue": "Xfinity Mobile Arena",
          "away": {
            "name": "포틀랜드 트레일블레이저스",
            "abbr": "POR",
            "record": "9승 5패",
            "badges": [
              {
                "text": "원정 6승 3패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "필라델피아 세븐티식서스",
            "abbr": "PHI",
            "record": "12승 3패",
            "badges": [
              {
                "text": "홈 6승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 9명",
              "tone": "warn"
            },
            {
              "text": "평균 117.0점 · 114.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**포틀랜드 트레일블레이저스** 9승 5패(원정 6승 3패, 최근 5경기 3승 2패), **필라델피아 세븐티식서스** 12승 3패(홈 6승 2패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "포틀랜드 트레일블레이저스 5명(결장 5명), 필라델피아 세븐티식서스 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 9명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.0점 대 114.1점**으로 비슷하고, 평균 리바운드 44.7개 대 43.1개, 3점 성공률 36.0% 대 35.2%. 3점 성공률 차 0.8%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "POR",
                "name": "포틀랜드 트레일블레이저스",
                "side": "away",
                "record": "9승 5패",
                "venueRecord": "원정 6승 3패",
                "last5": "3승 2패",
                "lastGame": "105-106 패",
                "ppg": 117.0,
                "rpg": 44.7,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Deni Avdija",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chris Youngblood",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Vit Krejci",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ja Morant",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Shaedon Sharpe",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "PHI",
                "name": "필라델피아 세븐티식서스",
                "side": "home",
                "record": "12승 3패",
                "venueRecord": "홈 6승 2패",
                "last5": "4승 1패",
                "lastGame": "135-123 승",
                "ppg": 114.1,
                "rpg": 43.1,
                "tp": 35.2,
                "injuries": [
                  {
                    "player": "Dominick Barlow",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylen Brown",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Adem Bona",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ariel Hukporti",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 포틀랜드 트레일블레이저스 승률 45.2%, 필라델피아 세븐티식서스 54.8%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-okc-ind-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T09:30:00+09:00",
          "venue": "Gainbridge Fieldhouse",
          "away": {
            "name": "오클라호마시티 썬더",
            "abbr": "OKC",
            "record": "9승 5패",
            "badges": [
              {
                "text": "원정 4승 5패",
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
              "text": "결장 8명",
              "tone": "warn"
            },
            {
              "text": "평균 112.1점 · 112.1점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**오클라호마시티 썬더** 9승 5패(원정 4승 5패, 최근 5경기 2승 3패), **인디애나 페이서스** 5승 9패(홈 2승 4패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "오클라호마시티 썬더 5명(결장 5명), 인디애나 페이서스 5명(결장 3명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 10명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.1점 대 112.1점**으로 비슷하고, 평균 리바운드 46.1개 대 41.6개, 3점 성공률 34.2% 대 32.8%. 3점 성공률 차 1.4%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "OKC",
                "name": "오클라호마시티 썬더",
                "side": "away",
                "record": "9승 5패",
                "venueRecord": "원정 4승 5패",
                "last5": "2승 3패",
                "lastGame": "125-103 승",
                "ppg": 112.1,
                "rpg": 46.1,
                "tp": 34.2,
                "injuries": [
                  {
                    "player": "Thomas Sorber",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylin Williams",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Cason Wallace",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Chet Holmgren",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "IND",
                "name": "인디애나 페이서스",
                "side": "home",
                "record": "5승 9패",
                "venueRecord": "홈 2승 4패",
                "last5": "2승 3패",
                "lastGame": "124-131 패",
                "ppg": 112.1,
                "rpg": 41.6,
                "tp": 32.8,
                "injuries": [
                  {
                    "player": "T.J. McConnell",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Andrew Nembhard",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tyrese Haliburton",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Johnny Furphy",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ben Sheppard",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 오클라호마시티 썬더 승률 78.6%, 인디애나 페이서스 21.4%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-mil-tor-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T09:30:00+09:00",
          "venue": "Scotiabank Arena",
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
              "text": "결장 3명",
              "tone": "warn"
            },
            {
              "text": "평균 106.1점 · 112.9점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**밀워키 벅스** 1승 13패(원정 0승 6패, 최근 5경기 0승 5패), **토론토 랩터스** 5승 9패(홈 2승 5패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "밀워키 벅스 1명(결장 1명), 토론토 랩터스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 4명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **106.1점 대 112.9점**, 평균 리바운드 45.4개 대 40.6개, 3점 성공률 34.1% 대 33.3%. 평균 득점 차 6.8점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "MIL",
                "name": "밀워키 벅스",
                "side": "away",
                "record": "1승 13패",
                "venueRecord": "원정 0승 6패",
                "last5": "0승 5패",
                "lastGame": "106-113 패",
                "ppg": 106.1,
                "rpg": 45.4,
                "tp": 34.1,
                "injuries": [
                  {
                    "player": "Ousmane Dieng",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "TOR",
                "name": "토론토 랩터스",
                "side": "home",
                "record": "5승 9패",
                "venueRecord": "홈 2승 5패",
                "last5": "0승 5패",
                "lastGame": "102-111 패",
                "ppg": 112.9,
                "rpg": 40.6,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Kawhi Leonard",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Nate Bittle",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Kevin McCullar Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 밀워키 벅스 승률 23.6%, 토론토 랩터스 76.4%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-bkn-min-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T09:30:00+09:00",
          "venue": "Target Center",
          "away": {
            "name": "브루클린 네츠",
            "abbr": "BKN",
            "record": "3승 10패",
            "badges": [
              {
                "text": "원정 2승 6패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "미네소타 팀버울브스",
            "abbr": "MIN",
            "record": "11승 4패",
            "badges": [
              {
                "text": "홈 7승 2패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 111.2점 · 116.7점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**브루클린 네츠** 3승 10패(원정 2승 6패, 최근 5경기 1승 4패), **미네소타 팀버울브스** 11승 4패(홈 7승 2패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "미네소타 팀버울브스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 브루클린 네츠는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.2점 대 116.7점**, 평균 리바운드 42.2개 대 48.6개, 3점 성공률 36.2% 대 37.0%. 평균 득점 차 5.5점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BKN",
                "name": "브루클린 네츠",
                "side": "away",
                "record": "3승 10패",
                "venueRecord": "원정 2승 6패",
                "last5": "1승 4패",
                "lastGame": "123-135 패",
                "ppg": 111.2,
                "rpg": 42.2,
                "tp": 36.2,
                "injuries": []
              },
              {
                "abbr": "MIN",
                "name": "미네소타 팀버울브스",
                "side": "home",
                "record": "11승 4패",
                "venueRecord": "홈 7승 2패",
                "last5": "4승 1패",
                "lastGame": "106-105 승",
                "ppg": 116.7,
                "rpg": 48.6,
                "tp": 37.0,
                "injuries": [
                  {
                    "player": "Zyon Pullin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Kuminga",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylen Clark",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Anthony Edwards",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Donte DiVincenzo",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 브루클린 네츠 승률 15.5%, 미네소타 팀버울브스 84.5%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 2경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-cle-chi-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T10:00:00+09:00",
          "venue": "United Center",
          "away": {
            "name": "클리블랜드 캐벌리어스",
            "abbr": "CLE",
            "record": "8승 7패",
            "badges": [
              {
                "text": "원정 2승 5패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "시카고 불스",
            "abbr": "CHI",
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
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 118.1점 · 114.6점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**클리블랜드 캐벌리어스** 8승 7패(원정 2승 5패, 최근 5경기 3승 2패), **시카고 불스** 3승 10패(홈 1승 4패, 최근 5경기 2승 3패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "클리블랜드 캐벌리어스 5명(결장 3명), 시카고 불스 3명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 8명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **118.1점 대 114.6점**, 평균 리바운드 45.9개 대 43.8개, 3점 성공률 36.7% 대 30.8%. 평균 득점 차 3.5점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "CLE",
                "name": "클리블랜드 캐벌리어스",
                "side": "away",
                "record": "8승 7패",
                "venueRecord": "원정 2승 5패",
                "last5": "3승 2패",
                "lastGame": "126-115 승",
                "ppg": 118.1,
                "rpg": 45.9,
                "tp": 36.7,
                "injuries": [
                  {
                    "player": "Nae'Qwan Tomlin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaylon Tyson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Sam Merrill",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Peyton Watson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Evan Mobley",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "CHI",
                "name": "시카고 불스",
                "side": "home",
                "record": "3승 10패",
                "venueRecord": "홈 1승 4패",
                "last5": "2승 3패",
                "lastGame": "115-126 패",
                "ppg": 114.6,
                "rpg": 43.8,
                "tp": 30.8,
                "injuries": [
                  {
                    "player": "Patrick Williams",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobe Awaka",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Caleb Wilson",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 클리블랜드 캐벌리어스 승률 76.4%, 시카고 불스 23.6%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-phx-nop-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T10:00:00+09:00",
          "venue": "Smoothie King Center",
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
              "text": "결장 6명",
              "tone": "warn"
            },
            {
              "text": "평균 113.0점 · 115.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**피닉스 선즈** 6승 7패(원정 1승 3패, 최근 5경기 3승 2패), **뉴올리언스 펠리컨스** 5승 10패(홈 4승 6패, 최근 5경기 1승 4패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "피닉스 선즈 1명(결장 1명), 뉴올리언스 펠리컨스 5명(결장 5명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 6명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **113.0점 대 115.8점**으로 비슷하고, 평균 리바운드 40.1개 대 42.1개, 3점 성공률 36.6% 대 33.3%. 3점 성공률 차 3.3%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "PHX",
                "name": "피닉스 선즈",
                "side": "away",
                "record": "6승 7패",
                "venueRecord": "원정 1승 3패",
                "last5": "3승 2패",
                "lastGame": "117-105 승",
                "ppg": 113.0,
                "rpg": 40.1,
                "tp": 36.6,
                "injuries": [
                  {
                    "player": "Mark Williams",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "NOP",
                "name": "뉴올리언스 펠리컨스",
                "side": "home",
                "record": "5승 10패",
                "venueRecord": "홈 4승 6패",
                "last5": "1승 4패",
                "lastGame": "115-94 승",
                "ppg": 115.8,
                "rpg": 42.1,
                "tp": 33.3,
                "injuries": [
                  {
                    "player": "Bennedict Mathurin",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bryce McGowens",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trendon Watford",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Trey Murphy III",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Dejounte Murray",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 피닉스 선즈 승률 64.2%, 뉴올리언스 펠리컨스 35.8%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-lac-hou-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T10:30:00+09:00",
          "venue": "Toyota Center (Houston)",
          "away": {
            "name": "LA 클리퍼스",
            "abbr": "LAC",
            "record": "4승 9패",
            "badges": [
              {
                "text": "원정 0승 5패",
                "tone": ""
              }
            ]
          },
          "home": {
            "name": "휴스턴 로키츠",
            "abbr": "HOU",
            "record": "11승 4패",
            "badges": [
              {
                "text": "홈 7승 1패",
                "tone": ""
              }
            ]
          },
          "tags": [
            {
              "text": "결장 5명",
              "tone": "warn"
            },
            {
              "text": "평균 111.9점 · 117.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**LA 클리퍼스** 4승 9패(원정 0승 5패, 최근 5경기 3승 2패), **휴스턴 로키츠** 11승 4패(홈 7승 1패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "LA 클리퍼스 4명(결장 4명), 휴스턴 로키츠 3명(결장 1명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 7명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **111.9점 대 117.8점**, 평균 리바운드 39.5개 대 45.7개, 3점 성공률 39.0% 대 37.1%. 평균 득점 차 5.9점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "LAC",
                "name": "LA 클리퍼스",
                "side": "away",
                "record": "4승 9패",
                "venueRecord": "원정 0승 5패",
                "last5": "3승 2패",
                "lastGame": "107-132 패",
                "ppg": 111.9,
                "rpg": 39.5,
                "tp": 39.0,
                "injuries": [
                  {
                    "player": "Yanic Konan Niederhauser",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Brandon Ingram",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Bradley Beal",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jordan Miller",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "HOU",
                "name": "휴스턴 로키츠",
                "side": "home",
                "record": "11승 4패",
                "venueRecord": "홈 7승 1패",
                "last5": "4승 1패",
                "lastGame": "110-128 패",
                "ppg": 117.8,
                "rpg": 45.7,
                "tp": 37.1,
                "injuries": [
                  {
                    "player": "Clint Capela",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Amen Thompson",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Julian Phillips",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — LA 클리퍼스 승률 13.5%, 휴스턴 로키츠 86.5%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-utah-lal-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T12:00:00+09:00",
          "venue": "crypto.com Arena",
          "away": {
            "name": "유타 재즈",
            "abbr": "UTAH",
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
              "text": "유타 재즈 4명(결장 4명), LA 레이커스 2명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 6명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **108.7점 대 122.5점**, 평균 리바운드 44.3개 대 41.4개, 3점 성공률 35.1% 대 38.1%. 평균 득점 차 13.8점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "UTAH",
                "name": "유타 재즈",
                "side": "away",
                "record": "2승 13패",
                "venueRecord": "원정 1승 6패",
                "last5": "1승 4패",
                "lastGame": "132-107 승",
                "ppg": 108.7,
                "rpg": 44.3,
                "tp": 35.1,
                "injuries": [
                  {
                    "player": "Jaxson Hayes",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Lauri Markkanen",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jusuf Nurkic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jaren Jackson Jr.",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "LAL",
                "name": "LA 레이커스",
                "side": "home",
                "record": "13승 2패",
                "venueRecord": "홈 6승 1패",
                "last5": "5승 0패",
                "lastGame": "118-114 승",
                "ppg": 122.5,
                "rpg": 41.4,
                "tp": 38.1,
                "injuries": [
                  {
                    "player": "Walker Kessler",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Austin Reaves",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 유타 재즈 승률 14.2%, LA 레이커스 85.8%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 1-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-sas-sac-20261124",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-24T12:00:00+09:00",
          "venue": "Golden 1 Center",
          "away": {
            "name": "샌안토니오 스퍼스",
            "abbr": "SAS",
            "record": "12승 3패",
            "badges": [
              {
                "text": "원정 7승 0패",
                "tone": "hot"
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
              "text": "결장 4명",
              "tone": "warn"
            },
            {
              "text": "평균 117.1점 · 107.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**샌안토니오 스퍼스** 12승 3패(원정 7승 0패, 최근 5경기 4승 1패), **새크라멘토 킹스** 1승 12패(홈 0승 8패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "샌안토니오 스퍼스 3명(결장 2명), 새크라멘토 킹스 4명(결장 2명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 7명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **117.1점 대 107.8점**, 평균 리바운드 48.2개 대 39.7개, 3점 성공률 33.5% 대 34.3%. 평균 득점 차 9.3점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "SAS",
                "name": "샌안토니오 스퍼스",
                "side": "away",
                "record": "12승 3패",
                "venueRecord": "원정 7승 0패",
                "last5": "4승 1패",
                "lastGame": "93-105 패",
                "ppg": 117.1,
                "rpg": 48.2,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Dylan Harper",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tobias Harris",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jayden Quaintance",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "SAC",
                "name": "새크라멘토 킹스",
                "side": "home",
                "record": "1승 12패",
                "venueRecord": "홈 0승 8패",
                "last5": "0승 5패",
                "lastGame": "103-125 패",
                "ppg": 107.8,
                "rpg": 39.7,
                "tp": 34.3,
                "injuries": [
                  {
                    "player": "Maxime Raynaud",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "De'Andre Hunter",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Precious Achiuwa",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Ben Simmons",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 샌안토니오 스퍼스 승률 90.8%, 새크라멘토 킹스 9.2%.",
              "**시즌 맞대결** — 이번 시즌 상대 전적 2-0."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-24 END */
      ]
    },

    /* ── 2026-11-25 (수) ─────────────────────────────────── */
    {
      date: "2026-11-25",
      games: [
        /* VOLLEY-AUTO 2026-11-25 START */
        {
          "id": "vball-2553966",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-25T00:30:00+09:00",
          "away": {
            "name": "Norwid Częstochowa",
            "abbr": "NCS",
            "badges": []
          },
          "home": {
            "name": "Trefl Gdańsk",
            "abbr": "TGS",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "8라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Norwid Częstochowa** 대 **Trefl Gdańsk**, 폴란드 플루스리가 8라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "NCS",
                "name": "Norwid Częstochowa",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "8"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "TGS",
                "name": "Trefl Gdańsk",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "8"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        },
        {
          "id": "vball-2553963",
          "sport": "volleyball",
          "league": "POL",
          "leagueFull": "폴란드 플루스리가",
          "source": "thesportsdb",
          "start": "2026-11-25T03:30:00+09:00",
          "away": {
            "name": "Jastrzębie Barkom",
            "abbr": "JBB",
            "badges": []
          },
          "home": {
            "name": "Aluron CMC Warta Zawiercie",
            "abbr": "ACWZ",
            "badges": []
          },
          "tags": [
            {
              "text": "POL · 폴란드 플루스리가",
              "tone": "info"
            },
            {
              "text": "8라운드",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**Jastrzębie Barkom** 대 **Aluron CMC Warta Zawiercie**, 폴란드 플루스리가 8라운드 경기입니다."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "TheSportsDB 에는 배구 부상·결장 명단이 없습니다. 출전 명단은 구단 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "TheSportsDB 에는 이 리그의 팀 전적·순위 값이 없어 수치 비교는 넣지 않았습니다. 세트 스코어는 경기 후에 표시됩니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "JBB",
                "name": "Jastrzębie Barkom",
                "side": "away",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "8"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              },
              {
                "abbr": "ACWZ",
                "name": "Aluron CMC Warta Zawiercie",
                "side": "home",
                "cells": [
                  {
                    "label": "리그",
                    "value": "폴란드 플루스리가"
                  },
                  {
                    "label": "라운드",
                    "value": "8"
                  },
                  {
                    "label": "시즌",
                    "value": "2026-2027"
                  }
                ]
              }
            ],
            "note": "일정은 TheSportsDB 기준이며 리그 현지 시각에서 KST로 옮긴 값입니다. 전적·순위·부상 정보는 이 리그에 제공되는 값이 없어 표시하지 않습니다."
          }
        }
        /* VOLLEY-AUTO 2026-11-25 END */,

        /* SOCCER-AUTO 2026-11-25 START */
        {
          "id": "soccer-avl-gal-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T02:45:00+09:00",
          "venue": "RAMS Park",
          "away": {
            "name": "애스턴 빌라",
            "abbr": "AVL",
            "record": "3승 0무 1패",
            "badges": [
              {
                "text": "리그 6위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "갈라타사라이",
            "abbr": "GAL",
            "record": "2승 0무 2패",
            "badges": [
              {
                "text": "리그 18위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**애스턴 빌라** 3승 0무 1패(리그 6위), **갈라타사라이** 2승 0무 2패(리그 18위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **3.0골 대 2.0골**, 평균 실점 1.5골 대 2.2골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "AVL",
                "name": "애스턴 빌라",
                "side": "away",
                "record": "3승 0무 1패",
                "badges": [
                  {
                    "text": "리그 6위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "3승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "6위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-무-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "3.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.5골"
                  },
                  {
                    "label": "득실차",
                    "value": "+6"
                  }
                ]
              },
              {
                "abbr": "GAL",
                "name": "갈라타사라이",
                "side": "home",
                "record": "2승 0무 2패",
                "badges": [
                  {
                    "text": "리그 18위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "2승 0무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "18위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "-1"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-las-bodo-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T02:45:00+09:00",
          "venue": "Aspmyra Stadion",
          "away": {
            "name": "LASK 린츠",
            "abbr": "LAS",
            "record": "2승 0무 2패",
            "badges": [
              {
                "text": "리그 16위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "보되/글림트",
            "abbr": "BODO",
            "record": "1승 1무 2패",
            "badges": [
              {
                "text": "리그 25위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**LASK 린츠** 2승 0무 2패(리그 16위), **보되/글림트** 1승 1무 2패(리그 25위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **2.5골 대 1.0골**, 평균 실점 2.2골 대 2.2골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "LAS",
                "name": "LASK 린츠",
                "side": "away",
                "record": "2승 0무 2패",
                "badges": [
                  {
                    "text": "리그 16위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "2승 0무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "16위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-승-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.5골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "+1"
                  }
                ]
              },
              {
                "abbr": "BODO",
                "name": "보되/글림트",
                "side": "home",
                "record": "1승 1무 2패",
                "badges": [
                  {
                    "text": "리그 25위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 1무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "25위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-무-승-패-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "-5"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-aek-como-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "Giuseppe Sinigaglia",
          "away": {
            "name": "AEK 아테네",
            "abbr": "AEK",
            "record": "1승 0무 3패",
            "badges": [
              {
                "text": "리그 29위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "코모",
            "abbr": "COMO",
            "record": "3승 0무 1패",
            "badges": [
              {
                "text": "리그 4위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**AEK 아테네** 1승 0무 3패(리그 29위), **코모** 3승 0무 1패(리그 4위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.2골 대 4.8골**, 평균 실점 2.8골 대 1.5골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "AEK",
                "name": "AEK 아테네",
                "side": "away",
                "record": "1승 0무 3패",
                "badges": [
                  {
                    "text": "리그 29위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "29위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-패-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "-6"
                  }
                ]
              },
              {
                "abbr": "COMO",
                "name": "코모",
                "side": "home",
                "record": "3승 0무 1패",
                "badges": [
                  {
                    "text": "리그 4위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "3승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "4위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-승-승-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "4.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.5골"
                  },
                  {
                    "label": "득실차",
                    "value": "+13"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-bet-slb-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "Národny Futbalovy Stadión",
          "away": {
            "name": "레알 베티스",
            "abbr": "BET",
            "record": "3승 0무 1패",
            "badges": [
              {
                "text": "리그 11위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "슬로반 브라티슬라바",
            "abbr": "SLB",
            "record": "0승 0무 4패",
            "badges": [
              {
                "text": "리그 36위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**레알 베티스** 3승 0무 1패(리그 11위), **슬로반 브라티슬라바** 0승 0무 4패(리그 36위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **2.0골 대 0.2골**, 평균 실점 1.5골 대 4.2골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BET",
                "name": "레알 베티스",
                "side": "away",
                "record": "3승 0무 1패",
                "badges": [
                  {
                    "text": "리그 11위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "3승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "11위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.5골"
                  },
                  {
                    "label": "득실차",
                    "value": "+2"
                  }
                ]
              },
              {
                "abbr": "SLB",
                "name": "슬로반 브라티슬라바",
                "side": "home",
                "record": "0승 0무 4패",
                "badges": [
                  {
                    "text": "리그 36위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "0승 0무 4패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "36위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-패-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "4.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "-16"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-dor-ars-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "Emirates Stadium",
          "away": {
            "name": "도르트문트",
            "abbr": "DOR",
            "record": "3승 0무 1패",
            "badges": [
              {
                "text": "리그 12위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "아스널",
            "abbr": "ARS",
            "record": "3승 1무 0패",
            "badges": [
              {
                "text": "리그 3위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**도르트문트** 3승 0무 1패(리그 12위), **아스널** 3승 1무 0패(리그 3위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.8골 대 2.0골**, 평균 실점 1.2골 대 0.8골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DOR",
                "name": "도르트문트",
                "side": "away",
                "record": "3승 0무 1패",
                "badges": [
                  {
                    "text": "리그 12위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "3승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "12위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-무-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.2골"
                  },
                  {
                    "label": "득실차",
                    "value": "+2"
                  }
                ]
              },
              {
                "abbr": "ARS",
                "name": "아스널",
                "side": "home",
                "record": "3승 1무 0패",
                "badges": [
                  {
                    "text": "리그 3위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "3승 1무 0패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "3위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-패-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "2.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "0.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "+5"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-fcp-fey-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "De Kuip",
          "away": {
            "name": "FC 포르투",
            "abbr": "FCP",
            "record": "1승 0무 3패",
            "badges": [
              {
                "text": "리그 26위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "페예노르트",
            "abbr": "FEY",
            "record": "1승 0무 3패",
            "badges": [
              {
                "text": "리그 32위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 2.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**FC 포르투** 1승 0무 3패(리그 26위), **페예노르트** 1승 0무 3패(리그 32위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.5골 대 1.0골**, 평균 실점 1.8골 대 2.8골. ESPN 오버언더는 2.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "FCP",
                "name": "FC 포르투",
                "side": "away",
                "record": "1승 0무 3패",
                "badges": [
                  {
                    "text": "리그 26위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "26위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.5골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "-1"
                  }
                ]
              },
              {
                "abbr": "FEY",
                "name": "페예노르트",
                "side": "home",
                "record": "1승 0무 3패",
                "badges": [
                  {
                    "text": "리그 32위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "32위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-무-무-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "-7"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-nap-mnc-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "Etihad Stadium",
          "away": {
            "name": "나폴리",
            "abbr": "NAP",
            "record": "1승 0무 3패",
            "badges": [
              {
                "text": "리그 27위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "맨체스터 시티",
            "abbr": "MNC",
            "record": "3승 0무 1패",
            "badges": [
              {
                "text": "리그 7위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**나폴리** 1승 0무 3패(리그 27위), **맨체스터 시티** 3승 0무 1패(리그 7위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.5골 대 3.0골**, 평균 실점 2.8골 대 1.8골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "NAP",
                "name": "나폴리",
                "side": "away",
                "record": "1승 0무 3패",
                "badges": [
                  {
                    "text": "리그 27위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "27위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-패-패-승-무"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.5골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "-5"
                  }
                ]
              },
              {
                "abbr": "MNC",
                "name": "맨체스터 시티",
                "side": "home",
                "record": "3승 0무 1패",
                "badges": [
                  {
                    "text": "리그 7위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "3승 0무 1패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "7위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "무-승-패-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "3.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "+5"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-psv-rma-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "Santiago Bernabéu",
          "away": {
            "name": "PSV 에인트호번",
            "abbr": "PSV",
            "record": "1승 1무 2패",
            "badges": [
              {
                "text": "리그 24위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "레알 마드리드",
            "abbr": "RMA",
            "record": "4승 0무 0패",
            "badges": [
              {
                "text": "리그 2위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 4.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**PSV 에인트호번** 1승 1무 2패(리그 24위), **레알 마드리드** 4승 0무 0패(리그 2위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **0.8골 대 3.2골**, 평균 실점 1.0골 대 1.8골. ESPN 오버언더는 4.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "PSV",
                "name": "PSV 에인트호번",
                "side": "away",
                "record": "1승 1무 2패",
                "badges": [
                  {
                    "text": "리그 24위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 1무 2패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "24위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-승-무-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "0.8골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.0골"
                  },
                  {
                    "label": "득실차",
                    "value": "-1"
                  }
                ]
              },
              {
                "abbr": "RMA",
                "name": "레알 마드리드",
                "side": "home",
                "record": "4승 0무 0패",
                "badges": [
                  {
                    "text": "리그 2위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "4승 0무 0패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "2위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-승-승-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "3.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "1.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "+6"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        },
        {
          "id": "soccer-rcl-rbl-20261125",
          "sport": "soccer",
          "league": "UCL",
          "leagueFull": "UEFA 챔피언스리그",
          "source": "espn",
          "start": "2026-11-25T05:00:00+09:00",
          "venue": "Red Bull Arena",
          "away": {
            "name": "랑스",
            "abbr": "RCL",
            "record": "1승 0무 3패",
            "badges": [
              {
                "text": "리그 33위",
                "tone": "rank"
              }
            ]
          },
          "home": {
            "name": "RB 라이프치히",
            "abbr": "RBL",
            "record": "1승 0무 3패",
            "badges": [
              {
                "text": "리그 30위",
                "tone": "rank"
              }
            ]
          },
          "tags": [
            {
              "text": "UCL · UEFA 챔피언스리그",
              "tone": "info"
            },
            {
              "text": "오버언더 3.5골",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**랑스** 1승 0무 3패(리그 33위), **RB 라이프치히** 1승 0무 3패(리그 30위)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "ESPN 축구 데이터에는 부상·결장 명단이 없습니다. 라인업은 경기 전 공식 발표를 확인하세요."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 평균 득점 **1.0골 대 1.2골**, 평균 실점 4.0골 대 2.8골. ESPN 오버언더는 3.5골입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "RCL",
                "name": "랑스",
                "side": "away",
                "record": "1승 0무 3패",
                "badges": [
                  {
                    "text": "리그 33위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "33위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "패-패-패-승-패"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.0골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "4.0골"
                  },
                  {
                    "label": "득실차",
                    "value": "-12"
                  }
                ]
              },
              {
                "abbr": "RBL",
                "name": "RB 라이프치히",
                "side": "home",
                "record": "1승 0무 3패",
                "badges": [
                  {
                    "text": "리그 30위",
                    "tone": "rank"
                  }
                ],
                "cells": [
                  {
                    "label": "리그 페이즈 전적",
                    "value": "1승 0무 3패"
                  },
                  {
                    "label": "리그 순위",
                    "value": "30위"
                  },
                  {
                    "label": "최근 흐름",
                    "value": "승-패-승-승-승"
                  }
                ],
                "nums": [
                  {
                    "label": "평균 득점",
                    "value": "1.2골"
                  },
                  {
                    "label": "평균 실점",
                    "value": "2.8골"
                  },
                  {
                    "label": "득실차",
                    "value": "-6"
                  }
                ]
              }
            ],
            "note": "일정·전적·순위는 ESPN 2026-11-18 23:24 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다."
          }
        }
        /* SOCCER-AUTO 2026-11-25 END */,

        /* NBA-AUTO 2026-11-25 START */
        {
          "id": "nba-det-orl-20261125",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-25T09:00:00+09:00",
          "venue": "Kia Center",
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
              "text": "결장 9명",
              "tone": "warn"
            },
            {
              "text": "평균 114.8점 · 108.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**디트로이트 피스턴스** 9승 4패(원정 6승 2패, 최근 5경기 3승 2패), **올랜도 매직** 6승 7패(홈 1승 4패, 최근 5경기 4승 1패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "디트로이트 피스턴스 5명(결장 5명), 올랜도 매직 4명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 9명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 108.8점**, 평균 리바운드 44.3개 대 43.2개, 3점 성공률 36.0% 대 34.0%. 평균 득점 차 6.0점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DET",
                "name": "디트로이트 피스턴스",
                "side": "away",
                "record": "9승 4패",
                "venueRecord": "원정 6승 2패",
                "last5": "3승 2패",
                "lastGame": "105-93 승",
                "ppg": 114.8,
                "rpg": 44.3,
                "tp": 36.0,
                "injuries": [
                  {
                    "player": "Isaiah Joe",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Duncan Robinson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Taurean Prince",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Ronald Holland II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jalen Duren",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "ORL",
                "name": "올랜도 매직",
                "side": "home",
                "record": "6승 7패",
                "venueRecord": "홈 1승 4패",
                "last5": "4승 1패",
                "lastGame": "115-105 승",
                "ppg": 108.8,
                "rpg": 43.2,
                "tp": 34.0,
                "injuries": [
                  {
                    "player": "Izaiyah Nelson",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jonathan Isaac",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Noah Penda",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Paolo Banchero",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 디트로이트 피스턴스 승률 57.9%, 올랜도 매직 42.1%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-bos-was-20261125",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-25T10:00:00+09:00",
          "venue": "Capital One Arena",
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
            "name": "워싱턴 위저즈",
            "abbr": "WAS",
            "record": "4승 11패",
            "badges": [
              {
                "text": "홈 2승 5패",
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
              "text": "평균 114.8점 · 111.3점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**보스턴 셀틱스** 11승 3패(원정 5승 2패, 최근 5경기 4승 1패), **워싱턴 위저즈** 4승 11패(홈 2승 5패, 최근 5경기 0승 5패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "워싱턴 위저즈 5명(결장 4명)이 ESPN 부상 명단에 올라 있습니다. 보스턴 셀틱스는 올라온 선수가 없습니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **114.8점 대 111.3점**, 평균 리바운드 44.9개 대 41.7개, 3점 성공률 38.2% 대 31.5%. 평균 득점 차 3.5점이 실제 경기 템포로 이어지는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "BOS",
                "name": "보스턴 셀틱스",
                "side": "away",
                "record": "11승 3패",
                "venueRecord": "원정 5승 2패",
                "last5": "4승 1패",
                "lastGame": "105-115 패",
                "ppg": 114.8,
                "rpg": 44.9,
                "tp": 38.2,
                "injuries": []
              },
              {
                "abbr": "WAS",
                "name": "워싱턴 위저즈",
                "side": "home",
                "record": "4승 11패",
                "venueRecord": "홈 2승 5패",
                "last5": "0승 5패",
                "lastGame": "120-136 패",
                "ppg": 111.3,
                "rpg": 41.7,
                "tp": 31.5,
                "injuries": [
                  {
                    "player": "Felix Okpara",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tristan Vukcevic",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Reece Beekman",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Justin Champagnie",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Jamir Watkins",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 보스턴 셀틱스 승률 80.9%, 워싱턴 위저즈 19.1%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 4경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        },
        {
          "id": "nba-dal-den-20261125",
          "sport": "basketball",
          "league": "NBA",
          "source": "espn",
          "start": "2026-11-25T12:00:00+09:00",
          "venue": "Ball Arena",
          "away": {
            "name": "댈러스 매버릭스",
            "abbr": "DAL",
            "record": "7승 7패",
            "badges": [
              {
                "text": "원정 2승 5패",
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
              "text": "결장 4명",
              "tone": "warn"
            },
            {
              "text": "평균 112.1점 · 113.8점",
              "tone": "info"
            }
          ],
          "rows": [
            {
              "kind": "flow",
              "label": "흐름",
              "text": "**댈러스 매버릭스** 7승 7패(원정 2승 5패, 최근 5경기 2승 3패), **덴버 너기츠** 7승 5패(홈 2승 3패, 최근 5경기 3승 2패)."
            },
            {
              "kind": "inj",
              "label": "부상 변수",
              "text": "댈러스 매버릭스 5명(결장 3명), 덴버 너기츠 1명(결장 1명)이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 6명입니다."
            },
            {
              "kind": "watch",
              "label": "관전 포인트",
              "text": "두 팀 시즌 평균 득점 **112.1점 대 113.8점**으로 비슷하고, 평균 리바운드 43.3개 대 41.7개, 3점 성공률 33.5% 대 34.5%. 3점 성공률 차 1.0%p가 외곽 승부를 가르는지가 관전 포인트입니다."
            }
          ],
          "details": {
            "teams": [
              {
                "abbr": "DAL",
                "name": "댈러스 매버릭스",
                "side": "away",
                "record": "7승 7패",
                "venueRecord": "원정 2승 5패",
                "last5": "2승 3패",
                "lastGame": "94-131 패",
                "ppg": 112.1,
                "rpg": 43.3,
                "tp": 33.5,
                "injuries": [
                  {
                    "player": "Sergio de Larrea",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Walter Clayton Jr.",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Dereck Lively II",
                    "status": "OUT",
                    "note": "결장"
                  },
                  {
                    "player": "Tobi Lawal",
                    "status": "DAY-TO-DAY",
                    "note": "당일 체크"
                  },
                  {
                    "player": "Tarik Biberovic",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              },
              {
                "abbr": "DEN",
                "name": "덴버 너기츠",
                "side": "home",
                "record": "7승 5패",
                "venueRecord": "홈 2승 3패",
                "last5": "3승 2패",
                "lastGame": "105-117 패",
                "ppg": 113.8,
                "rpg": 41.7,
                "tp": 34.5,
                "injuries": [
                  {
                    "player": "Julian Strawther",
                    "status": "OUT",
                    "note": "결장"
                  }
                ]
              }
            ],
            "checkpoints": [
              "**ESPN 매치업 예측** — 댈러스 매버릭스 승률 30.1%, 덴버 너기츠 69.9%.",
              "**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 3경기 중 첫 경기입니다."
            ],
            "note": "출전 여부는 ESPN 2026-11-18 23:08 기준이며 경기 전까지 변동될 수 있습니다."
          }
        }
        /* NBA-AUTO 2026-11-25 END */
      ]
    }
  ]
};
