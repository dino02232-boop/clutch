# CLUTCH data.js 자동 갱신

사이트 카드 데이터(`data.js`)를 사람 손 없이 매일 채우는 도구입니다.
GitHub Actions 러너가 ESPN(농구 NBA·축구)과 KOVO(배구 V리그) 공개 API를 읽어 `data.js` 값만 갱신하고,
바뀐 경우에만 `main` 에 커밋·푸시합니다. **data.js 의 구조(스키마)는 건드리지 않습니다.**

## 워크플로

| 파일 | 주기 | 하는 일 |
| --- | --- | --- |
| `.github/workflows/data-results.yml` | 30분마다 | 이미 시작한 경기의 상태·최종 스코어·쿼터 스코어·주요 선수 기록 갱신 + V리그 오늘/어제 결과 |
| `.github/workflows/data-daily.yml` | 매일 05:30 KST (20:30 UTC 전날) | 오늘~+6일 경기 카드(일정·전적·배당·프리뷰) 재생성, 3일보다 오래된 날짜 블록 정리 |

둘 다 `workflow_dispatch` 로 수동 실행할 수 있고, `concurrency` 로 동시에 돌지 않습니다.
Actions → 워크플로 선택 → Run workflow.

## 구조

- `auto_update.py` — 오케스트레이터. 스포츠별로 **임시 사본**에 먼저 써 보고 경기 수가 줄거나 파일이 깨지면
  그 갱신을 버립니다(부분 실패 시 사이트 유지). 내용이 실제로 바뀐 경우에만 `data.js` 를 씁니다.
- `fetch_nba.py` / `fetch_soccer.py` / `fetch_volley.py` — 종목별 카드 생성(기존 작업 스크립트 이식).
- `players.py`, `odds_common.py` — 공용 도우미(선수 스탯·배당).
- `refresh_results.py` — 끝난 경기 결과만 갱신(`--started-only` 로 확인 범위를 좁힘).
- `commit_data.sh` — `data.js` 가 바뀐 경우에만 커밋, push 직전 최신 main 으로 rebase(충돌 시 최신 main 에서 재생성).

## 직접 돌려 보기

```bash
CLUTCH_CACHE_DIR=/tmp/clutch-cache python3 tools/auto_update.py --mode results   # 결과만
CLUTCH_CACHE_DIR=/tmp/clutch-cache python3 tools/auto_update.py --mode daily     # 날짜 블록까지
```

환경변수: `CLUTCH_DATA_JS`(대상 파일), `CLUTCH_CACHE_DIR`(임시 캐시), `CLUTCH_DAYS_AHEAD`(기본 6),
`CLUTCH_KEEP_PAST`(기본 3), `CLUTCH_RETRIES`(기본 3).
