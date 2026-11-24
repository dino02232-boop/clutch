#!/usr/bin/env python3
"""CLUTCH — 축구 실제 데이터 생성기

ESPN 공개 API(키 없음)에서 축구 일정·전적·순위·오버언더를 받아
data.js 의 SOCCER-AUTO 구간을 날짜별로 다시 채웁니다.

  python3 work/fetch_soccer.py --from 2026-11-19 --to 2026-11-25 --write
  python3 work/fetch_soccer.py --date 2026-11-25            # 결과만 미리보기
  python3 work/fetch_soccer.py --from ... --to ... --write --refresh

쓰는 ESPN 엔드포인트
  · scoreboard  site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates=YYYYMMDD
      경기·킥오프(UTC)·경기장·양 팀 전적(승-무-패)·최근 폼(form)·오버언더(odds[].overUnder)
  · standings   site.api.espn.com/apis/v2/sports/soccer/{league}/standings
      팀별 순위(rank)·경기 수·득점(pointsFor)·실점(pointsAgainst)·득실차
  · summary     site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event={id}
      최근 5경기·맞대결 + leaders(팀별 시즌 득점·도움 1위 선수) → details.keyPlayers

ESPN 축구 응답에는 부상·결장 명단이 없습니다(빈 배열). 그래서 결장 명단은
FotMob 공개 엔드포인트에서 따로 받아 tools/fotmob_injuries.py 로 채웁니다.
키·가입·결제 없는 소스만 쓰고, 받은 값이 없으면 "명단 없음"으로 정직하게 남깁니다.
K리그(kor.1)는 ESPN 에 없어서 다루지 않습니다.
"""

import argparse
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_nba import CACHE, KST, get_json, kst_date, weekday_ko  # 공용 유틸
from odds_common import cache_at, implied, odds_of  # 배당(odds) 추출
from photo_sources import load_cache as load_photo_cache, resolve as photo_resolve, save_cache as save_photo_cache
from fotmob_injuries import BASE_FOCUS, annotate as annotate_injuries

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
OUT_JSON = os.environ.get("CLUTCH_OUT_JSON") or os.path.join(HERE, "soccer-data.json")

SB = "https://site.api.espn.com/apis/site/v2/sports/soccer/%s/scoreboard?dates=%s"
ST = "https://site.api.espn.com/apis/v2/sports/soccer/%s/standings"
SBSCHED = "https://site.api.espn.com/apis/site/v2/sports/soccer/%s/teams/%s/schedule"
SUMM = "https://site.api.espn.com/apis/site/v2/sports/soccer/%s/summary?event=%s"
# ESPN 선수 얼굴 사진 CDN. 축구 응답에는 headshot 필드가 없어 id 로 경로를 만든다.
# 일부 선수만 이미지가 있고 나머지는 404 → 화면에서 이니셜로 대체한다.
HEADSHOT = "https://a.espncdn.com/i/headshots/soccer/players/full/%s.png"

# 선수 사진 캐시는 한 번만 읽고, 생성이 끝날 때 한 번만 쓴다.
_PHOTO_CACHE = None


def _photo_cache():
    global _PHOTO_CACHE
    if _PHOTO_CACHE is None:
        _PHOTO_CACHE = load_photo_cache()
    return _PHOTO_CACHE

# 리그 코드 → (짧은 표기, 한글 리그명)
LEAGUES = {
    "uefa.champions": ("UCL", "UEFA 챔피언스리그"),
    "eng.1": ("EPL", "프리미어리그"),
    "esp.1": ("LALIGA", "라리가"),
    "ita.1": ("SERIEA", "세리에 A"),
    "ger.1": ("BUNDES", "분데스리가"),
}
DEFAULT_LEAGUES = ["uefa.champions", "eng.1", "esp.1", "ger.1", "ita.1"]

# 유럽대항전 경기에서 "이 팀이 자국 리그에서 어디쯤인지"를 쓰려면 그 리그 순위표가 필요하다.
# ESPN 팀 id 는 대회가 달라도 같아서(예: 갈라타사라이 432), 아래 리그들을 훑어 id 로 맞춘다.
# 정적 '팀→리그' 표를 두지 않는 이유: 승격·강등으로 리그가 바뀌어도 그대로 맞고,
# 이 목록에 없는 팀은 못 찾은 것이니 리그를 추측하지 않고 그 문장만 생략한다.
# 앞의 6개(빅리그+터키)를 먼저 보고, 못 찾으면 나머지를 본다.
DOMESTIC_LEAGUES = {
    "eng.1": "프리미어리그",
    "esp.1": "라리가",
    "ita.1": "세리에 A",
    "ger.1": "분데스리가",
    "fra.1": "리그 1",
    "tur.1": "터키 쉬페르리그",
    "ned.1": "에레디비시",
    "por.1": "포르투갈 프리메이라리가",
    "bel.1": "벨기에 프로리그",
    "sco.1": "스코틀랜드 프리미어십",
    "gre.1": "그리스 슈퍼리그",
    "aut.1": "오스트리아 분데스리가",
    "nor.1": "노르웨이 엘리테세리엔",
    "den.1": "덴마크 슈퍼리가",
    "isr.1": "이스라엘 리그",
    "cyp.1": "키프로스 1부리그",
    "swe.1": "스웨덴 알스벤스칸",
}
DOMESTIC_FIRST = ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "tur.1"]
DOMESTIC_REST = [l for l in DOMESTIC_LEAGUES if l not in DOMESTIC_FIRST]
EURO_CUP_PREFIX = "uefa."  # 이 접두사 리그는 '자국 리그 + 이 대회' 두 축으로 설명한다

# ESPN 영문 팀명 → 한국어 표기. 확실한 팀만 적고, 없으면 영문명을 그대로 씁니다.
TEAM_KO = {
    "1. FC Union Berlin": "우니온 베를린",
    "AC Milan": "AC 밀란",
    "AEK Athens": "AEK 아테네",
    "AFC Bournemouth": "본머스",
    "AS Roma": "AS 로마",
    "Alavés": "알라베스",
    "Arsenal": "아스널",
    "Aston Villa": "애스턴 빌라",
    "Atalanta": "아탈란타",
    "Athletic Club": "아틀레틱 빌바오",
    "Atlético Madrid": "아틀레티코 마드리드",
    "Barcelona": "바르셀로나",
    "Bayer Leverkusen": "바이어 레버쿠젠",
    "Bayern Munich": "바이에른 뮌헨",
    "Bodo/Glimt": "보되/글림트",
    "Bologna": "볼로냐",
    "Borussia Dortmund": "도르트문트",
    "Borussia Mönchengladbach": "묀헨글라트바흐",
    "Brentford": "브렌트퍼드",
    "Brighton & Hove Albion": "브라이턴",
    "Cagliari": "칼리아리",
    "Celta Vigo": "셀타 비고",
    "Chelsea": "첼시",
    "Como": "코모",
    "Coventry City": "코번트리 시티",
    "Crystal Palace": "크리스털 팰리스",
    "Deportivo": "데포르티보",
    "FC Augsburg": "아우크스부르크",
    "FC Cologne": "쾰른",
    "FC Porto": "FC 포르투",
    "Fiorentina": "피오렌티나",
    "Frosinone": "프로시노네",
    "Genoa": "제노아",
    "Elche": "엘체",
    "Eintracht Frankfurt": "아인트라흐트 프랑크푸르트",
    "Espanyol": "에스파뇰",
    "Everton": "에버턴",
    "Feyenoord Rotterdam": "페예노르트",
    "Fulham": "풀럼",
    "Galatasaray": "갈라타사라이",
    "Getafe": "헤타페",
    "Hamburg SV": "함부르크",
    "Hull City": "헐 시티",
    "Internazionale": "인터 밀란",
    "Ipswich Town": "입스위치 타운",
    "Juventus": "유벤투스",
    "LASK Linz": "LASK 린츠",
    "Lazio": "라치오",
    "Lecce": "레체",
    "Leeds United": "리즈 유나이티드",
    "Lens": "랑스",
    "Levante": "레반테",
    "Liverpool": "리버풀",
    "Manchester City": "맨체스터 시티",
    "Manchester United": "맨체스터 유나이티드",
    "Mainz": "마인츠",
    "Monza": "몬차",
    "Málaga": "말라가",
    "Napoli": "나폴리",
    "Newcastle United": "뉴캐슬 유나이티드",
    "Parma": "파르마",
    "Nottingham Forest": "노팅엄 포리스트",
    "Osasuna": "오사수나",
    "PSV Eindhoven": "PSV 에인트호번",
    "RB Leipzig": "RB 라이프치히",
    "Racing Santander": "라싱 산탄데르",
    "Rayo Vallecano": "라요 바예카노",
    "Real Betis": "레알 베티스",
    "Real Madrid": "레알 마드리드",
    "Real Sociedad": "레알 소시에다드",
    "SC Freiburg": "프라이부르크",
    "SC Paderborn 07": "파더보른",
    "Sassuolo": "사수올로",
    "Schalke 04": "샬케 04",
    "Sevilla": "세비야",
    "Slovan Bratislava": "슬로반 브라티슬라바",
    "Sunderland": "선덜랜드",
    "SV Elversberg": "엘버스베르크",
    "TSG Hoffenheim": "호펜하임",
    "Torino": "토리노",
    "Tottenham Hotspur": "토트넘 홋스퍼",
    "Udinese": "우디네세",
    "Valencia": "발렌시아",
    "Venezia": "베네치아",
    "VfB Stuttgart": "슈투트가르트",
    "Villarreal": "비야레알",
    "Werder Bremen": "베르더 브레멘",
}


def ko(name):
    return TEAM_KO.get(name, name)


def rec_wdl(summary):
    """'7-0-3' (승-무-패) → '7승 0무 3패'"""
    if not summary or str(summary).count("-") < 2:
        return None
    w, d, l = str(summary).split("-")[:3]
    return "%s승 %s무 %s패" % (w, d, l)


def form_text(form):
    """'DWLWL' → '패-승-패-승-승' (ESPN 은 왼쪽이 가장 오래된 경기)"""
    m = {"W": "승", "D": "무", "L": "패"}
    seq = [m[c] for c in str(form or "").upper() if c in m]
    return "-".join(seq) if seq else None


# 리그 슬러그 → 순위표. 한 번 만든 생성 안에서 리그당 한 번만 받는다(자국 리그 탐색이
# 여러 팀에서 같은 리그를 다시 부르므로).
_STANDINGS_CACHE = {}


def standings_map(league, refresh, verbose=True):
    """팀 id → { rank, played, gf, ga, points, gd, w, d, l, name } (ESPN 순위표 기준)"""
    if league in _STANDINGS_CACHE:
        return _STANDINGS_CACHE[league]
    try:
        data = get_json(ST % league, "standings-%s" % league.replace(".", "_"), refresh)
    except Exception as e:
        if verbose:
            print("! %s 순위표를 받지 못했습니다: %s" % (league, e))
        _STANDINGS_CACHE[league] = {}
        return {}
    out = {}

    def entries(node):
        st = node.get("standings") or {}
        return st.get("entries") or []

    rows = []
    for ch in data.get("children") or []:
        rows.extend(entries(ch))
    if not rows:
        rows = entries(data)

    for e in rows:
        team = (e.get("team") or {})
        tid = team.get("id")
        if not tid:
            continue
        stats = {s.get("name"): s.get("displayValue") for s in e.get("stats") or []}
        rank = (e.get("note") or {}).get("rank") or stats.get("rank")

        def val(key):
            v = stats.get(key)
            try:
                return int(float(str(v).replace("+", "")))
            except (TypeError, ValueError):
                return None

        wdl = None
        overall = stats.get("overall")
        if overall and str(overall).count("-") == 2:
            try:
                wdl = [int(x) for x in str(overall).split("-")]
            except ValueError:
                wdl = None
        try:
            out[str(tid)] = {
                "rank": int(rank) if rank is not None else None,
                "played": val("gamesPlayed"),
                "gf": val("pointsFor"),
                "ga": val("pointsAgainst"),
                "points": val("points"),
                "gd": val("pointDifferential"),
                "w": wdl[0] if wdl else None,
                "d": wdl[1] if wdl else None,
                "l": wdl[2] if wdl else None,
                "name": team.get("displayName") or team.get("name") or "",
            }
        except (TypeError, ValueError):
            continue
    _STANDINGS_CACHE[league] = out
    return out


def _warm_tables(leagues, refresh=False):
    """순위표 여러 개를 병렬로 받아 캐시에 넣는다. 이미 받은 리그는 건너뛴다.

    실패한 리그는 standings_map() 이 빈 표로 남기므로 여기서 예외가 나지 않는다.
    """
    todo = [l for l in leagues if l not in _STANDINGS_CACHE]
    if not todo:
        return
    with ThreadPoolExecutor(max_workers=6) as ex:
        list(ex.map(lambda l: standings_map(l, refresh, verbose=False), todo))


def domestic_lookup(team_id, refresh=False, table_size=0):
    """유럽대항전 경기의 팀 id → (자국 리그 슬러그, 그 팀 순위표 줄, 그 리그 팀 수).

    빅리그·터키를 먼저 보고, 못 찾으면 나머지 유럽 리그를 본다. 어느 표에도 없으면
    None — 호출한 쪽은 자국 리그 문장만 생략한다(추측해서 쓰지 않는다).
    """
    if not team_id:
        return None
    tid = str(team_id)
    for group in (DOMESTIC_FIRST, DOMESTIC_REST):
        _warm_tables(group, refresh)
        for slug in group:
            table = _STANDINGS_CACHE.get(slug) or {}
            row = table.get(tid)
            if row:
                return slug, row, len(table)
    return None


def leader_row(league):
    """그 리그 순위표의 1위 줄. 없으면 None."""
    for row in (_STANDINGS_CACHE.get(league) or {}).values():
        if row.get("rank") == 1:
            return row
    return None


def per_game(total, played):
    if total is None or not played:
        return None
    return round(total / float(played), 1)


RES_KO = {"W": "승", "D": "무", "L": "패"}
HA_KO = {"vs": "홈", "@": "원정"}


def side_ko(side):
    return "홈" if side == "home" else "원정"


def flow_team_text(name, side, record=None, rank=None, streak=None):
    """흐름 줄의 팀 한 칸 — 팀 이름에 홈/원정 라벨을 붙이고 전적·순위·최근 흐름을 잇는다.

    숫자만 나열해 어느 팀 값인지 알 수 없는 문장을 만들지 않기 위해,
    팀을 가리키는 모든 문장은 이 함수를 거친다.
    """
    s = "**%s**(%s)" % (name, side_ko(side))
    if record:
        s += " " + str(record)
    if rank:
        s += "(리그 %s위)" % rank
    if streak:
        s += ", " + str(streak)
    return s


def goals_compare_text(home, away, h_gf, a_gf, h_ga, a_ga):
    """평균 득점·실점 대비 — 홈 팀을 앞에 두고 팀 이름과 홈/원정을 문장마다 붙인다.

    '0.8골 대 2.6골'처럼 숫자만 늘어놓으면 어느 쪽이 홈인지 알 수 없어서,
    같은 팀 이름을 실점 쪽에도 다시 적는다(생략하지 않는다).
    """
    return ("두 팀 평균 득점은 **%s**(홈) %s골 · **%s**(원정) %s골, "
            "평균 실점은 홈 %s골 · 원정 %s골"
            % (home, h_gf, away, a_gf, h_ga, a_ga))


def streak_text(results):
    """최근 경기 목록(최신이 앞) → '3연승' / '4경기 무승' / '최근 5경기 1승 3패 1무'."""
    if not results:
        return None
    res = [r.get("res") for r in results]
    head = res[0]
    n = 0
    for r in res:
        if r == head:
            n += 1
        else:
            break
    if n >= 2 and head == "승":
        return "%d연승" % n
    if n >= 2 and head == "패":
        return "%d연패" % n
    if n >= 2 and head == "무":
        return "%d경기 연속 무승부" % n
    if "승" not in res:
        return "%d경기 무승" % len(res)
    return None


def last5_score(e, team_id):
    """lastFiveGames 의 한 경기 → '내 팀-상대' 점수 문자열.

    ESPN 의 events[].score 는 홈·원정 순서도, 우리 팀 순서도 아니고 **이긴 팀 점수가 앞**으로 온다
    (예: 1-2 로 진 경기가 '2-1'). 그래서 지는 경기는 방향이 뒤집혀 승/패와 어긋난다.
    homeTeamScore/awayTeamScore 로 우리 팀 기준을 계산하고, 그 값이 없을 때만 원래 score 를 쓴다.
    """
    try:
        hs, as_ = int(float(e.get("homeTeamScore"))), int(float(e.get("awayTeamScore")))
    except (TypeError, ValueError):
        # 팀별 점수가 없는 응답 — 원래 score 는 이긴 팀이 앞이므로 진 경기만 뒤집는다
        raw = str(e.get("score") or "")
        m = re.match(r"^(\d+)-(\d+)$", raw.strip())
        if m and str(e.get("gameResult") or "").upper() == "L" and int(m.group(1)) > int(m.group(2)):
            return "%s-%s" % (m.group(2), m.group(1)), None, None
        return raw, None, None
    if str(e.get("homeTeamId") or "") == str(team_id):
        mine, theirs = hs, as_
    elif str(e.get("awayTeamId") or "") == str(team_id):
        mine, theirs = as_, hs
    else:  # 팀 id 가 없는 응답 — atVs 로 우리 쪽을 고른다
        mine, theirs = (hs, as_) if e.get("atVs") == "vs" else (as_, hs)
    return "%d-%d" % (mine, theirs), mine, theirs


def last5_detail(summary, team_id):
    """ESPN summary 의 lastFiveGames → [{date, opp, ha, score, res, comp}] (최신이 앞).

    score 는 최근 경기 목록·팀 페이지 경기 목록과 같은 '내 팀-상대' 순서다.
    """
    for blk in summary.get("lastFiveGames") or []:
        t = blk.get("team") or {}
        if str(t.get("id")) != str(team_id):
            continue
        out = []
        for e in blk.get("events") or []:
            opp = (e.get("opponent") or {}).get("displayName") or ""
            date = (e.get("gameDate") or "")[:10]
            score, mine, theirs = last5_score(e, team_id)
            res = RES_KO.get(str(e.get("gameResult") or "").upper(), "")
            if not res and mine is not None and theirs is not None:
                res = "승" if mine > theirs else ("패" if mine < theirs else "무")
            out.append({
                "date": date,
                "opp": ko(opp) if opp else "",
                "ha": HA_KO.get(e.get("atVs") or "vs", "홈"),
                "score": score,
                "res": res,
                "comp": short_comp(e.get("competitionName")),
            })
        out.sort(key=lambda r: r["date"], reverse=True)
        return out
    return []


def short_comp(name):
    """'2026-27 English Premier League' → 'EPL' 처럼 짧게. 모르면 그대로."""
    if not name:
        return ""
    s = str(name)
    table = [
        ("Premier League", "EPL"), ("Carabao Cup", "카라바오컵"), ("FA Cup", "FA컵"),
        ("UEFA Champions League", "UCL"), ("Champions League", "UCL"),
        ("Europa League", "UEL"), ("Conference League", "UECL"),
        ("LaLiga", "라리가"), ("Bundesliga", "분데스리가"), ("Serie A", "세리에A"),
        ("Copa del Rey", "코파델레이"), ("DFB Pokal", "DFB포칼"), ("Coppa Italia", "코파이탈리아"),
    ]
    for needle, short in table:
        if needle.lower() in s.lower():
            return short
    return s


def venue_split(league, team_id, side, refresh=False):
    """그 리그 경기 결과로 홈(원정) 전적을 계산 → (텍스트, 승, 무, 패)."""
    rows = team_results(league, team_id, refresh)
    want = "home" if side == "home" else "away"
    sel = [r for r in rows if r.get("me") == want]
    if not sel:
        return None
    w = sum(1 for r in sel if r["res"] == "W")
    d = sum(1 for r in sel if r["res"] == "D")
    l = sum(1 for r in sel if r["res"] == "L")
    return "%s %d승 %d무 %d패" % ("홈" if side == "home" else "원정", w, d, l)


def team_results(league, team_id, refresh=False):
    """팀의 그 리그 경기 결과(최신이 앞). 실패하면 빈 목록."""
    try:
        d = get_json(SBSCHED % (league, team_id),
                     "sched-%s-%s" % (league.replace(".", "_"), team_id), refresh)
    except Exception as e:
        print("! %s 팀 %s 일정 실패: %s" % (league, team_id, e))
        return []
    out = []
    for ev in d.get("events") or []:
        c = (ev.get("competitions") or [{}])[0]
        st = (c.get("status") or {}).get("type") or {}
        if not st.get("completed"):
            continue
        comps = {x.get("homeAway"): x for x in c.get("competitors") or []}
        if "home" not in comps or "away" not in comps:
            continue

        def sc(x):
            s = x.get("score")
            if isinstance(s, dict):
                return s.get("displayValue")
            return s

        hs, as_ = sc(comps["home"]), sc(comps["away"])
        try:
            hsi, asi = int(float(hs)), int(float(as_))
        except (TypeError, ValueError):
            continue
        me = "home" if str((comps["home"].get("team") or {}).get("id")) == str(team_id) else "away"
        if hsi == asi:
            res = "D"
        elif (hsi > asi) == (me == "home"):
            res = "W"
        else:
            res = "L"
        out.append({
            "date": (ev.get("date") or c.get("date") or "")[:10],
            "me": me, "res": res, "score": "%d-%d" % (hsi, asi),
            "opp": ((comps["away" if me == "home" else "home"].get("team") or {}).get("displayName") or ""),
        })
    out.sort(key=lambda r: r["date"], reverse=True)
    return out


def season_leaders(summary, team_id):
    """summary 의 leaders 에서 그 팀의 시즌 득점 1위·도움 1위 선수.

    응답 예) leaders[].leaders[].{name: goalsLeaders|assistsLeaders,
                                   leaders: [{athlete:{id,displayName}, statistics:[...]}]}
    한 선수가 득점·도움 1위를 모두 하면 한 줄로 합쳐 stats 에 둘 다 적는다.
    값이 0인 항목(아직 득점 없음)은 표시하지 않는다.
    """
    for blk in summary.get("leaders") or []:
        if str((blk.get("team") or {}).get("id")) != str(team_id):
            continue
        team_en = (blk.get("team") or {}).get("displayName") or ""
        groups = {g.get("name"): g for g in blk.get("leaders") or []}
        out, seen = [], {}
        for gname, label in (("goalsLeaders", "득점"), ("assistsLeaders", "도움")):
            rows = (groups.get(gname) or {}).get("leaders") or []
            if not rows:
                continue
            top = rows[0]
            ath = top.get("athlete") or {}
            name = ath.get("displayName") or ath.get("fullName") or ""
            val = None
            for s in top.get("statistics") or []:
                if s.get("name") in ("totalGoals", "goalAssists"):
                    try:
                        val = int(float(s.get("value")))
                    except (TypeError, ValueError):
                        val = None
                    break
            if val is None:  # 통계 배열이 비어 있는 응답 대비 → 'Goals: 6' 표기에서 읽는다
                m = re.search(r"(?:Goals|Assists):\s*(\d+)", str(top.get("displayValue") or ""))
                if m:
                    val = int(m.group(1))
            if not name or not val:
                continue
            aid = str(ath.get("id") or "")
            key = aid or name
            text = "%s %d" % (label, val)
            if key in seen:
                seen[key]["stats"].append(text)
                continue
            item = {"name": name}
            if aid:
                item["id"] = aid
            # 사진: ESPN 이 살아 있으면 그것, 아니면 위키백과/위키데이터/TheSportsDB.
            # 확인된 얼굴만 넣고, 못 찾으면 photo 키를 빼서 화면이 이니셜로 대체하게 둔다.
            ph = photo_resolve(name, espn_photo=(HEADSHOT % aid) if aid else "",
                               club=team_en, cache=_photo_cache())
            if ph.get("photo"):
                item["photo"] = ph["photo"]
            item["stats"] = [text]
            seen[key] = item
            out.append(item)
        return out
    return []


def h2h_block(summary):
    """ESPN summary 의 head-to-head 시리즈 → {summary, games[]}."""
    for ser in summary.get("seasonseries") or []:
        if ser.get("type") != "head-to-head":
            continue
        games = []
        for ev in ser.get("events") or []:
            comps = ev.get("competitors") or []
            names, scores = {}, {}
            for c in comps:
                ha = c.get("homeAway")
                names[ha] = ((c.get("team") or {}).get("displayName") or "")
                s = c.get("score")
                scores[ha] = s.get("displayValue") if isinstance(s, dict) else s
            if "home" not in names or "away" not in names:
                continue
            games.append({
                "date": (ev.get("date") or "")[:10],
                "home": ko(names["home"]), "away": ko(names["away"]),
                "score": "%s-%s" % (scores.get("home"), scores.get("away")),
            })
        games.sort(key=lambda g: g["date"], reverse=True)
        out = {"games": games}
        if games:
            out["summary"] = "최근 %d차례 맞대결" % len(games)
        if games or out.get("summary"):
            return out
    return None



# ── 관전 포인트(focus) 문장 ────────────────────────────────────────
# 문장은 '팀 상황 → 최근 흐름' 순서로 잇고, 값이 있는 것만 쓴다.
# 순위·연승·연패는 실제 값과 어긋나면 쓰지 않고, 상위권/중위권/하위권은
# 리그 팀 수 기준 상수로만 판정한다(느낌으로 붙이지 않는다).

def gd_text(v):
    """+9 / -3. 값이 없으면 None."""
    if v is None:
        return None
    return ("+%d" % v) if v > 0 else str(v)


def wdl_text(w, d, l):
    """(4, 0, 1) → '4승 1패' (0인 항은 뺀다). 값이 하나라도 없으면 None."""
    if w is None or d is None or l is None:
        return None
    parts = []
    if w:
        parts.append("%d승" % w)
    if d:
        parts.append("%d무" % d)
    if l:
        parts.append("%d패" % l)
    return " ".join(parts) or None


def tier_word(rank, total):
    """순위 → '상위권'·'중위권'·'하위권'. 리그 팀 수로만 판정하고, 값이 없으면 None.

    18팀 이상 리그: 1~6위 상위권, 아래 6팀 하위권, 나머지 중위권.
    그보다 작은 리그: 위·아래 각 3분의 1.
    """
    try:
        rank, total = int(rank), int(total)
    except (TypeError, ValueError):
        return None
    if rank < 1 or rank > total or total < 8:
        return None
    if total >= 18:
        top, low_from = 6, total - 5
    else:
        top = max(3, total // 3)
        low_from = total - top + 1
    if rank <= top:
        return "상위권"
    if rank >= low_from:
        return "하위권"
    return "중위권"


def stand_phrase(row, league_name):
    """'프리미어리그 12위(승점 14, 득실 -3)' · '터키 쉬페르리그 선두(승점 31, 득실 +13)'."""
    if not row or not row.get("rank") or not league_name:
        return None
    rank = int(row["rank"])
    if rank == 1:
        head = "%s 선두" % league_name
    elif str(league_name)[-1:].isdigit():  # '리그 1' + '11위'가 붙어 읽히지 않게
        head = "%s에서 %d위" % (league_name, rank)
    else:
        head = "%s %d위" % (league_name, rank)
    bits = []
    if row.get("points") is not None:
        bits.append("승점 %d" % row["points"])
    gd = gd_text(row.get("gd"))
    if gd is not None:
        bits.append("득실 %s" % gd)
    return "%s(%s)" % (head, ", ".join(bits)) if bits else head


def form_sentence(l5, streak):
    """최근 5경기 문장. 연승·연패가 5경기 전체면 그것만 쓰고, 아니면 승무패를 적는다."""
    if not l5:
        return None
    n = len(l5)
    w = sum(1 for r in l5 if r["res"] == "승")
    d = sum(1 for r in l5 if r["res"] == "무")
    l = sum(1 for r in l5 if r["res"] == "패")
    if streak in ("%d연승" % n, "%d연패" % n):
        return "최근 %d경기는 %s입니다." % (n, streak)
    body = wdl_text(w, d, l)
    if not body:
        return None
    s = "최근 %d경기는 %s" % (n, body)
    # 5경기 전체가 같은 흐름이 아닐 때만 'N연승/연패'를 덧붙인다(무승부 흐름은 숫자로 충분).
    if streak and (streak.endswith("연승") or streak.endswith("연패")):
        s += "로 %s 중입니다." % streak
    else:
        s += "입니다."
    return s


def topic_josa(name):
    """팀 이름 뒤의 '은/는' — 한글 음절은 받침으로, 숫자·영문은 끝소리로 고른다."""
    s = (name or "").strip()
    if not s:
        return "은"
    ch = s[-1]
    if "가" <= ch <= "힣":
        return "은" if (ord(ch) - 0xAC00) % 28 else "는"
    if ch.isdigit():  # 0영·1일·2이·3삼·4사·5오·6육·7칠·8팔·9구
        return "은" if ch in "13678" else "는"
    if ch.isalpha():
        return "는" if ch.lower() in "aeiouy" else "은"
    return "은"


def and_josa(name):
    """팀 이름 뒤의 '과/와'."""
    return "과" if topic_josa(name) == "은" else "와"


def sub_josa(name):
    """팀 이름 뒤의 '이/가'."""
    return "이" if topic_josa(name) == "은" else "가"


def obj_josa(word):
    """말 뒤의 '을/를'."""
    return "을" if topic_josa(word) == "은" else "를"


def series_text(w, d, l):
    """대회 전적 → '3승 1패' · '4전 전승' · '4전 전패'. 값이 없으면 None."""
    body = wdl_text(w, d, l)
    if not body:
        return None
    if w and not d and not l and w >= 2:
        return "%d전 전승" % w
    if l and not w and not d and l >= 2:
        return "%d전 전패" % l
    return body


def _form_brief(l5, streak):
    """비교 문장에 넣을 짧은 최근 흐름 — '5연승' 또는 '3무 2패'."""
    if not l5:
        return None
    n = len(l5)
    if streak in ("%d연승" % n, "%d연패" % n):
        return streak
    return wdl_text(sum(1 for r in l5 if r["res"] == "승"),
                    sum(1 for r in l5 if r["res"] == "무"),
                    sum(1 for r in l5 if r["res"] == "패"))


def _form_points(l5):
    """최근 5경기 승점(승3·무1). 값이 없으면 None."""
    if not l5:
        return None
    return sum(3 if r["res"] == "승" else (1 if r["res"] == "무" else 0) for r in l5)


def _rank_bit(name, row, tier):
    """'아스널이 5위(승점 18, 득실 +4)로 상위권' — 비교 문장용 짧은 순위 표현."""
    if not row or not row.get("rank"):
        return None
    bits = []
    if row.get("points") is not None:
        bits.append("승점 %d" % row["points"])
    gd = gd_text(row.get("gd"))
    if gd is not None:
        bits.append("득실 %s" % gd)
    s = "%s%s %d위" % (name, sub_josa(name), row["rank"])
    if bits:
        s += "(" + ", ".join(bits) + ")"
    if tier:
        s += "로 " + tier
    return s


def build_preview(home, home_st, away, away_st, league, league_full, table_size, home_dom, away_dom):
    """두 팀 관전 포인트를 합친 경기 전망 2~3문장.

    유럽대항전은 팀마다 '자국 리그에서의 위치 → 이 대회 전적'을 사실로만 적고,
    서로 다른 리그의 순위를 나란히 놓고 우열을 말하지 않는다(리그 간 격차는 알 수 없다).
    비교는 이 대회 전적·최근 5경기·홈/원정 성적·평균 득점·실점으로만 한다.
    값이 없으면 그 문장만 빼고, 배당·확률·추천은 쓰지 않는다.
    """
    ps = []
    cup = league.startswith(EURO_CUP_PREFIX)
    h_name, a_name = home["name"], away["name"]
    h_l5, a_l5 = home.get("last5Detail") or [], away.get("last5Detail") or []
    h_form = _form_brief(h_l5, home.get("streak"))
    a_form = _form_brief(a_l5, away.get("streak"))
    home_st, away_st = home_st or {}, away_st or {}

    def cup_team(name, dom, st):
        """'{팀}는 {자국 리그 위치}이고, 이 대회에서는 {전적}({순위}위)입니다.' — 한 팀만 서술."""
        head = ""
        if dom:
            sp = stand_phrase(dom[1], DOMESTIC_LEAGUES.get(dom[0]) or dom[0])
            if sp:
                tier = None if int(dom[1]["rank"]) == 1 else tier_word(dom[1].get("rank"), dom[2])
                head = "%s%s %s%s" % (name, topic_josa(name), sp, ("로 " + tier) if tier else "")
        rec = series_text(st.get("w"), st.get("d"), st.get("l"))
        rank = "%d위" % st["rank"] if st.get("rank") else None
        if rec and rank:
            tail = "%s(%s)" % (rec, rank)
        else:
            tail = rec or rank
        if head and tail:
            return "%s이고, 이 대회에서는 %s입니다." % (head, tail)
        if head:
            return head + "입니다."
        if tail:
            return "%s%s 이 대회에서 %s입니다." % (name, topic_josa(name), tail)
        return None

    if cup:
        for name, dom, st in ((h_name, home_dom, home_st), (a_name, away_dom, away_st)):
            sent = cup_team(name, dom, st)
            if sent:
                ps.append(sent)
    else:
        # 같은 리그 안에서의 위치 비교 — 리그가 같으니 순위를 나란히 놓아도 된다.
        h_tier = tier_word(home_st.get("rank"), table_size)
        a_tier = tier_word(away_st.get("rank"), table_size)
        h_rb, a_rb = _rank_bit(h_name, home_st, h_tier), _rank_bit(a_name, away_st, a_tier)
        if h_rb and a_rb:
            ps.append("%s에서는 %s, %s입니다." % (league_full, h_rb, a_rb))
        elif h_rb or a_rb:
            ps.append("%s에서는 %s입니다." % (league_full, h_rb or a_rb))

        # 홈/원정 성적 + 최근 5경기
        def venue_bit(v):
            m = re.match(r"^(?:홈|원정)\s+(\d+)승\s+(\d+)무\s+(\d+)패$", str(v or ""))
            return series_text(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None

        h_vs, a_vs = venue_bit(home.get("venueRecord")), venue_bit(away.get("venueRecord"))
        forms = None
        if h_form and a_form:
            forms = "%s %s, %s %s" % (h_name, h_form, a_name, a_form)
        if h_vs and a_vs:
            s = "홈에서 %s%s %s, 원정에서 %s%s %s" % (
                h_name, topic_josa(h_name), h_vs, a_name, topic_josa(a_name), a_vs)
            ps.append(("%s이고, 최근 5경기는 %s입니다." % (s, forms)) if forms else (s + "입니다."))
        elif forms:
            ps.append("최근 5경기는 %s입니다." % forms)

    # 마지막 문장 — 골 + 조심스러운 전망. 비교 근거는 이 대회(리그) 전적·최근 흐름뿐이다.
    h_gf, h_ga = per_game(home_st.get("gf"), home_st.get("played")), per_game(home_st.get("ga"), home_st.get("played"))
    a_gf, a_ga = per_game(away_st.get("gf"), away_st.get("played")), per_game(away_st.get("ga"), away_st.get("played"))
    goals = None
    if None not in (h_gf, h_ga, a_gf, a_ga):
        goals = "두 팀 평균 득점을 합치면 %.1f골, 평균 실점은 %.1f골" % (h_gf + a_gf, h_ga + a_ga)

    def _ppg(row):
        pts, played = (row or {}).get("points"), (row or {}).get("played")
        if pts is None or not played:
            return None
        return float(pts) / float(played)

    form_pts = (_form_points(h_l5), _form_points(a_l5))
    ppg = (_ppg(home_st), _ppg(away_st))
    signals = []
    if None not in ppg and abs(ppg[0] - ppg[1]) > 0.02:
        signals.append(("이 대회 성적" if cup else "리그 성적", "h" if ppg[0] > ppg[1] else "a"))
    if None not in form_pts and form_pts[0] != form_pts[1]:
        signals.append(("최근 흐름", "h" if form_pts[0] > form_pts[1] else "a"))

    def _name(side):
        return h_name if side == "h" else a_name

    lean = None
    if signals:
        sides = {s for _, s in signals}
        if len(signals) == 2 and len(sides) == 1:
            lead = _name(signals[0][1])
            labels = [l for l, _ in signals]
            lean = "%s 모두 %s%s 가리켜 %s 쪽이 앞선다는 계산이 나옵니다." % (
                labels[0] + and_josa(labels[0]) + " " + labels[1], lead, obj_josa(lead), lead)
        elif len(signals) == 2:
            (l1, s1), (l2, s2) = signals
            lean = "%s%s %s, %s%s %s로 갈려 어느 쪽이 앞선다고 말하기 어렵습니다." % (
                l1, topic_josa(l1), _name(s1), l2, topic_josa(l2), _name(s2))
        else:
            label, side = signals[0]
            lead = _name(side)
            lean = "%s만 보면 %s 쪽이 조금 앞선다는 계산이 나옵니다." % (label, lead)

    if cup:
        forms_cup = ("최근 5경기는 %s %s, %s %s" % (h_name, h_form, a_name, a_form)) if (h_form and a_form) else None
        if forms_cup and goals:
            ps.append(forms_cup + "이고, " + goals + "입니다.")
        elif forms_cup:
            ps.append(forms_cup + "입니다.")
        elif goals:
            ps.append(goals + "입니다.")
        if lean:
            ps.append(lean)
    elif goals and lean:
        ps.append(goals + "이고, " + lean)
    elif goals:
        ps.append(goals + "입니다.")
    elif lean:
        ps.append(lean)
    return " ".join(ps) or None


def team_focus(name, league, league_full, rec, st, table_size,
               dom, vsplit, l5, streak):
    """팀별 '관전 포인트' — 그 팀이 지금 어디에 있는지 읽히는 2~3문장.

    유럽대항전 경기: 자국 리그 순위 + 이 대회 전적을 한 문장에 묶고, 그다음 최근 흐름.
    자국 리그 경기: 리그 순위(필요하면 선두와 승점 차) + 홈/원정 성적 + 최근 흐름.
    마지막 문장은 결장 명단 안내(fotmob_injuries.BASE_FOCUS) — 그 단계가 통째로 치환한다.
    """
    fs = []
    st = st or {}
    head = name + topic_josa(name)
    form = form_sentence(l5, streak)
    if league.startswith(EURO_CUP_PREFIX):
        s1 = ""
        if dom:
            slug, drow, dsize = dom
            sp = stand_phrase(drow, DOMESTIC_LEAGUES.get(slug) or slug)
            if sp:
                # 1위는 '선두'라고 이미 적었으니 '상위권'을 겹쳐 붙이지 않는다.
                tier = None if int(drow["rank"]) == 1 else tier_word(drow.get("rank"), dsize)
                s1 = "%s %s%s이고, " % (head, sp, ("로 " + tier) if tier else "")
        body = series_text(st.get("w"), st.get("d"), st.get("l"))
        if not body and rec:  # 순위표에 승무패가 없고 '3승 0무 1패' 문자열만 있을 때
            m = re.match(r"^(\d+)승\s+(\d+)무\s+(\d+)패$", str(rec).strip())
            body = series_text(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else rec
        tail = []
        if st.get("points") is not None:
            tail.append("승점 %d" % st["points"])
        if st.get("rank"):
            tail.append("%d위" % st["rank"])
        cup_name = "챔피언스리그" if league == "uefa.champions" else (re.sub("^UEFA ", "", league_full or "") or "이 대회")
        if body:
            val = body + (("(%s)" % ", ".join(tail)) if tail else "")
            if s1:
                fs.append(s1 + "%s 리그 페이즈에서는 %s입니다." % (cup_name, val))
            else:
                fs.append("%s %s 리그 페이즈에서 %s입니다." % (head, cup_name, val))
        elif s1:
            fs.append(s1.rstrip(", ") + "입니다.")
        elif tail:
            fs.append("%s %s 리그 페이즈에서 %s입니다." % (head, cup_name, ", ".join(tail)))
    else:
        sp = stand_phrase(st, league_full)
        if sp:
            tier = None if int(st["rank"]) == 1 else tier_word(st.get("rank"), table_size)
            s1 = "%s %s%s" % (head, sp, ("로 " + tier) if tier else "")
            lead = leader_row(league)
            if (lead and st.get("rank") and int(st["rank"]) > 1
                    and lead.get("points") is not None and st.get("points") is not None
                    and lead["points"] > st["points"]):
                lead_name = ko(lead.get("name") or "")
                if lead_name:
                    s1 += "이고, 선두 %s%s는 승점 %d점 차입니다." % (
                        lead_name, and_josa(lead_name), lead["points"] - st["points"])
                else:
                    s1 += "입니다."
            else:
                s1 += "입니다."
            fs.append(s1)
        s2 = ""
        if vsplit:
            # venueRecord 는 '홈 3승 1무 2패' 그대로 두고, 문장에서는 0인 항을 뺀다.
            m = re.match(r"^(홈|원정)\s+(\d+)승\s+(\d+)무\s+(\d+)패$", str(vsplit))
            if m:
                body = series_text(int(m.group(2)), int(m.group(3)), int(m.group(4)))
                if body:
                    s2 = "%s에서 %s를 기록 중이고, " % (m.group(1), body)
            if not s2:
                s2 = "%s이고, " % vsplit
        if form:
            fs.append((s2 + form) if s2 else form)
        elif s2:
            fs.append(s2.rstrip(", ") + "입니다.")
    # 유럽대항전은 자국 리그 + 대회 전적만으로 문장이 길어져 최근 흐름을 따로 잇는다.
    if league.startswith(EURO_CUP_PREFIX) and form:
        fs.append(form)
    fs.append(BASE_FOCUS)
    return " ".join(fs)


def build_team(comp, side, table, league_short, summary, league, refresh=False, table_size=0,
               league_full=""):
    team = comp.get("team") or {}
    name_en = team.get("displayName") or team.get("name") or ""
    abbr = (team.get("abbreviation") or team.get("shortDisplayName") or name_en[:3]).upper()
    tid = str(team.get("id") or "")
    name = ko(name_en)

    rec = None
    for r in comp.get("records") or []:
        if r.get("type") == "total":
            rec = rec_wdl(r.get("summary"))
            break

    st = table.get(tid) or {}
    cells = []
    rec_label = "리그 페이즈 전적" if league_short == "UCL" else "시즌 전적"
    if rec:
        cells.append({"label": rec_label, "value": rec})
    if st.get("rank"):
        cells.append({"label": "리그 순위", "value": "%d위" % st["rank"]})
    if st.get("points") is not None:
        cells.append({"label": "승점", "value": str(st["points"])})
    if st.get("gd") is not None:
        cells.append({"label": "득실차", "value": ("+%d" % st["gd"]) if st["gd"] > 0 else str(st["gd"])})
    form = form_text(comp.get("form"))
    if form:
        cells.append({"label": "최근 흐름", "value": form})

    nums = []
    gf = ga = None
    if st:
        gf, ga = per_game(st.get("gf"), st.get("played")), per_game(st.get("ga"), st.get("played"))
        if gf is not None:
            nums.append({"label": "평균 득점", "value": "%s골" % gf})
        if ga is not None:
            nums.append({"label": "평균 실점", "value": "%s골" % ga})
        if st.get("gf") is not None and st.get("ga") is not None:
            diff = st["gf"] - st["ga"]
            nums.append({"label": "득실차", "value": ("+%d" % diff) if diff > 0 else str(diff)})

    l5 = last5_detail(summary, tid)
    streak = streak_text(l5)
    if not streak and l5:
        w = sum(1 for r in l5 if r["res"] == "승")
        d = sum(1 for r in l5 if r["res"] == "무")
        l = sum(1 for r in l5 if r["res"] == "패")
        streak = "최근 %d경기 %d승 %d무 %d패" % (len(l5), w, d, l)

    out = {"abbr": abbr, "name": name, "side": side}
    if rec:
        out["record"] = rec
    vsplit = venue_split(league, tid, side, refresh) if tid else None
    if vsplit:
        out["venueRecord"] = vsplit
    if st.get("rank"):
        out["badges"] = [{"text": "리그 %d위" % st["rank"], "tone": "rank"}]
    if cells:
        out["cells"] = cells
    if nums:
        out["nums"] = nums
    if streak:
        out["streak"] = streak
    if l5:
        out["last5"] = "%d승 %d무 %d패" % (
            sum(1 for r in l5 if r["res"] == "승"),
            sum(1 for r in l5 if r["res"] == "무"),
            sum(1 for r in l5 if r["res"] == "패"))
        out["last5Detail"] = l5
    # 팀별 관전 포인트 — 그 팀이 지금 어디에 있는지 읽히는 문장(team_focus).
    # 유럽대항전이면 자국 리그 순위표를 찾아 '리그 + 이 대회' 두 축으로 쓰고,
    # 못 찾은 팀은 그 문장만 빠진다.
    dom = domestic_lookup(tid, refresh) if league.startswith(EURO_CUP_PREFIX) else None
    out["focus"] = team_focus(name, league, league_full or LEAGUES.get(league, ("", league))[1],
                              rec, st, table_size, dom, vsplit, l5, streak)

    # 결장 명단은 FotMob 에서 받아 fotmob_injuries.annotate() 가 덮어쓴다.
    # 여기 남는 문구는 그 단계가 실패했을 때 그대로 화면에 나간다.
    out["injuryNote"] = "결장 명단을 확인하지 못했습니다."
    return out, st


def build_game(event, league, day, table, league_short, league_full, updated_at, summary,
               refresh=False):
    comp = event["competitions"][0]
    sides = {c["homeAway"]: c for c in comp.get("competitors") or []}
    if "away" not in sides or "home" not in sides:
        return None

    away, away_st = build_team(sides["away"], "away", table, league_short, summary, league,
                               refresh=refresh, table_size=len(table), league_full=league_full)
    home, home_st = build_team(sides["home"], "home", table, league_short, summary, league,
                               refresh=refresh, table_size=len(table), league_full=league_full)

    start_iso = comp.get("date") or event.get("date")
    odds = odds_of(comp, event.get("_oddsAt"))
    if odds:
        imp = implied(odds)
        if imp:
            odds["implied"] = imp
    ou = None
    for o in comp.get("odds") or []:
        if o and o.get("overUnder") is not None:
            ou = o["overUnder"]
            break

    tags = [{"text": "%s · %s" % (league_short, league_full), "tone": "info"}]
    if ou is not None:
        tags.append({"text": "오버언더 %s골" % ou, "tone": "info"})

    h2h = h2h_block(summary)

    # 경기 전망 — 두 팀 관전 포인트를 합쳐 '이 경기가 어떤 경기인지' 읽히게 한 단락.
    # 유럽대항전은 자국 리그 순위표를 다시 찾아(런당 1회 캐번) 리그 위치를 붙인다.
    home_dom = domestic_lookup(str((sides["home"].get("team") or {}).get("id") or ""), refresh) \
        if league.startswith(EURO_CUP_PREFIX) else None
    away_dom = domestic_lookup(str((sides["away"].get("team") or {}).get("id") or ""), refresh) \
        if league.startswith(EURO_CUP_PREFIX) else None
    preview = build_preview(home, home_st, away, away_st, league, league_full, len(table),
                            home_dom, away_dom)

    # 흐름 — 실제 전적·순위·최근 흐름·맞대결만. 홈 팀을 앞에 두고 홈/원정 라벨을 붙인다.
    flow = "%s, %s." % (
        flow_team_text(home["name"], "home", home.get("record"), home_st.get("rank"), home.get("streak")),
        flow_team_text(away["name"], "away", away.get("record"), away_st.get("rank"), away.get("streak")))
    if h2h and h2h.get("games"):
        g0 = h2h["games"][0]
        flow += " 최근 맞대결은 %s에 열린 %s %s-%s %s 경기입니다." % (
            g0["date"].replace("-", "."), g0["home"], g0["score"].split("-")[0],
            g0["score"].split("-")[1], g0["away"])

    watch = ""
    a_gf, a_ga = per_game(away_st.get("gf"), away_st.get("played")), per_game(away_st.get("ga"), away_st.get("played"))
    h_gf, h_ga = per_game(home_st.get("gf"), home_st.get("played")), per_game(home_st.get("ga"), home_st.get("played"))
    bits = []
    if None not in (a_gf, a_ga, h_gf, h_ga):
        bits.append(goals_compare_text(home["name"], away["name"], h_gf, a_gf, h_ga, a_ga))
    if h2h and h2h.get("score"):
        bits.append("최근 맞대결 %s" % h2h["score"])
    if odds and odds.get("implied"):
        imp = odds["implied"]
        p = []
        if imp.get("home") is not None:
            p.append("%s 승 %s%%" % (home["name"], imp["home"]))
        if imp.get("draw") is not None:
            p.append("무 %s%%" % imp["draw"])
        if imp.get("away") is not None:
            p.append("%s 승 %s%%" % (away["name"], imp["away"]))
        bits.append("해외 배당을 확률로 환산하면 " + " · ".join(p))
    if bits:
        watch = ". ".join(bits) + "."

    rows = [{"kind": "flow", "label": "흐름", "text": flow}]
    if watch:
        rows.append({"kind": "watch", "label": "관전 포인트", "text": watch})
    # 체크포인트 — 순위표 맥락(사실 계산만)
    checks = []
    for t, st in ((home, home_st), (away, away_st)):
        if not st or st.get("rank") is None:
            continue
        s = "**%s** — 리그 %d위" % (t["name"], st["rank"])
        tail = []
        if st.get("points") is not None:
            tail.append("승점 %d" % st["points"])
        if st.get("gd") is not None:
            tail.append("득실 %s" % (("+%d" % st["gd"]) if st["gd"] > 0 else st["gd"]))
        if tail:
            s += ", " + ", ".join(tail)
        s += "."
        checks.append(s)

    kick = datetime.fromisoformat(start_iso.replace("Z", "+00:00")).astimezone(KST)
    gid = "soccer-%s-%s-%s" % (away["abbr"].lower(), home["abbr"].lower(), day.replace("-", ""))
    # 핵심 선수 — 팀별 시즌 득점·도움 1위. 데이터가 없으면 아예 넣지 않는다.
    key_players = []
    for side_key, team_obj in (("home", home), ("away", away)):
        tid = str(((sides[side_key].get("team") or {}).get("id")) or "")
        plist = season_leaders(summary, tid) if tid else []
        if plist:
            key_players.append({"side": side_key, "team": team_obj["name"], "players": plist})

    det = {"teams": [away, home]}
    if key_players:  # 홈 팀 먼저
        det["keyPlayers"] = key_players
    det["checkpoints"] = checks
    det["note"] = "일정·전적·순위는 ESPN %s 기준입니다. 부상·결장 정보는 ESPN 축구 데이터에 없습니다." % updated_at.strftime("%Y-%m-%d %H:%M")
    # 위 문장은 fotmob_injuries.annotate() 가 "부상·결장 명단은 FotMob … 기준입니다"로 바꾼다.
    if h2h:
        det["h2h"] = h2h
    game = {
        "id": gid,
        "espnId": str(event.get("id") or ""),
        # FotMob 경기를 짝지을 때만 쓰는 임시 키. data.js 에 쓰기 전에 지운다.
        "_en": {"away": ((sides["away"].get("team") or {}).get("displayName") or ""),
                "home": ((sides["home"].get("team") or {}).get("displayName") or ""),},
        "sport": "soccer",
        "league": league_short,
        "leagueFull": league_full,
        "source": "espn",
        "start": kick.isoformat(),
        "venue": (comp.get("venue") or {}).get("fullName") or event.get("venue", {}).get("displayName"),
        **( {"odds": odds} if odds else {}),
        "away": {"name": away["name"], "abbr": away["abbr"],
                 **({"record": away["record"]} if away.get("record") else {}),
                 "badges": away.get("badges", [])},
        "home": {"name": home["name"], "abbr": home["abbr"],
                 **({"record": home["record"]} if home.get("record") else {}),
                 "badges": home.get("badges", [])},
        "tags": tags,
        "rows": rows,
        **({"preview": preview} if preview else {}),
        "details": det,
    }
    if not game["venue"]:
        del game["venue"]
    return game


# ── data.js 갱신 ────────────────────────────────────────────────────
def marker(day, edge):
    return "/* SOCCER-AUTO %s %s */" % (day, edge)


def games_text(games):
    lines = []
    for n, g in enumerate(games):
        txt = json.dumps(g, ensure_ascii=False, indent=2)
        txt = "\n".join("        " + ln for ln in txt.splitlines())
        lines.append(txt + ("," if n < len(games) - 1 else ""))
    return "\n".join(lines)


def auto_block(games, day):
    return "        %s\n%s\n        %s" % (marker(day, "START"), games_text(games), marker(day, "END"))


def write_block(src, day, games):
    """SOCCER-AUTO 표식이 있으면 교체, 없으면 그 날짜 games 배열 맨 앞에 넣는다."""
    start_tag, end_tag = marker(day, "START"), marker(day, "END")
    i = src.find(start_tag)
    if i >= 0:
        j = src.find(end_tag, i)
        if j < 0:
            raise SystemExit("data.js 의 %s 축구 구간이 닫히지 않았습니다." % day)
        line_start = src.rfind("\n", 0, i) + 1
        return src[:line_start] + auto_block(games, day) + src[j + len(end_tag):], False

    anchor = '      date: "%s",\n      games: [\n' % day
    k = src.find(anchor)
    if k < 0:
        return src, None  # 날짜 블록 자체가 없음 → 호출한 쪽에서 새로 만든다
    insert_at = k + len(anchor)
    return src[:insert_at] + auto_block(games, day) + ",\n\n" + src[insert_at:], True


def new_day_block(day, games):
    head = "    /* ── %s (%s) ─────────────────────────────────── */" % (day, weekday_ko(day))
    return ('%s\n    {\n      date: "%s",\n      games: [\n%s\n      ]\n    }'
            % (head, day, auto_block(games, day)))


def append_day(src, day, games):
    tail = "\n  ]\n};"
    k = src.rfind(tail)
    if k < 0:
        raise SystemExit("data.js 의 days 배열 끝을 찾지 못했습니다.")
    return src[:k] + ",\n\n" + new_day_block(day, games) + src[k:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="브리핑 날짜(KST) YYYY-MM-DD 하나")
    ap.add_argument("--from", dest="dfrom", help="시작 날짜(KST)")
    ap.add_argument("--to", dest="dto", help="끝 날짜(KST)")
    ap.add_argument("--leagues", default=",".join(DEFAULT_LEAGUES),
                    help="ESPN 리그 코드(쉼표). 기본: " + ",".join(DEFAULT_LEAGUES))
    ap.add_argument("--write", action="store_true", help="data.js 를 고친다")
    ap.add_argument("--refresh", action="store_true", help="캐시를 무시하고 다시 받는다")
    ap.add_argument("--no-injuries", dest="no_injuries", action="store_true",
                    help="FotMob 결장 명단 조회를 건너뛴다")
    args = ap.parse_args()

    if args.dfrom or args.dto:
        if not (args.dfrom and args.dto):
            raise SystemExit("--from 과 --to 를 함께 주세요.")
        d0 = datetime.strptime(args.dfrom, "%Y-%m-%d").date()
        d1 = datetime.strptime(args.dto, "%Y-%m-%d").date()
    elif args.date:
        d0 = d1 = datetime.strptime(args.date, "%Y-%m-%d").date()
    else:
        raise SystemExit("--date 또는 --from/--to 가 필요합니다.")

    leagues = [l.strip() for l in args.leagues.split(",") if l.strip()]
    for l in leagues:
        if l not in LEAGUES:
            raise SystemExit("모르는 리그 코드입니다: %s" % l)

    days = []
    d = d0
    while d <= d1:
        days.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)

    us_dates = []
    d = d0 - timedelta(days=1)
    while d <= d1:
        us_dates.append(d.strftime("%Y%m%d"))
        d += timedelta(days=1)

    now = datetime.now(KST)
    by_day = {day: [] for day in days}
    seen = set()
    for lg in leagues:
        table = standings_map(lg, args.refresh)
        short, full = LEAGUES[lg]
        for key in us_dates:
            cache_key = "soccer-%s-%s" % (lg.replace(".", "_"), key)
            try:
                sb = get_json(SB % (lg, key), cache_key, args.refresh)
            except Exception as e:
                print("! %s %s 응답 실패: %s" % (lg, key, e))
                continue
            odds_at = cache_at(CACHE, cache_key)
            sb_at = datetime.fromisoformat(odds_at) if odds_at else now
            for ev in sb.get("events") or []:
                iso = ev.get("date") or (ev.get("competitions") or [{}])[0].get("date")
                if not iso or ev.get("id") in seen:
                    continue
                kday = kst_date(iso)
                if kday not in by_day:
                    continue
                seen.add(ev.get("id"))
                ev["_oddsAt"] = odds_at
                try:
                    summ = get_json(SUMM % (lg, ev.get("id")), "sum-%s" % ev.get("id"), args.refresh)
                except Exception as e:
                    print("! %s summary 실패: %s" % (ev.get("id"), e))
                    summ = {}
                g = build_game(ev, lg, kday, table, short, full, sb_at, summ, refresh=args.refresh)
                if g:
                    by_day[kday].append(g)

    for day in days:
        by_day[day].sort(key=lambda g: (g["start"], g["id"]))

    # 부상·결장 명단 — ESPN 축구에는 없으므로 FotMob 에서 받아 팀 블록에 채운다.
    if not args.no_injuries:
        stats = annotate_injuries([g for gs in by_day.values() for g in gs], refresh=args.refresh)
        print("· 부상·결장 명단(FotMob): %d경기 중 %d경기 짝짓기, %d경기 명단 있음, %d경기 비어 있음, %d경기 못 찾음, 끝난 경기 선수 평점 %d개" % (
            stats["total"], stats["matched"], stats["ok"], stats["empty"], stats["no_match"], stats["rated"]))
    for gs in by_day.values():
        for g in gs:
            g.pop("_en", None)

    dump = {day: games for day, games in by_day.items() if games}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"generatedAt": now.isoformat(timespec="seconds"),
                   "leagues": leagues, "days": dump}, f, ensure_ascii=False, indent=2)

    if not args.write:
        for day in days:
            print("%s (%s) 축구 %d경기" % (day, weekday_ko(day), len(by_day[day])))
            for g in by_day[day]:
                print("   ", g["start"][11:16], g["league"], g["away"]["name"], "@", g["home"]["name"],
                      "|", [c["label"] + ":" + c["value"] for c in (g["details"]["teams"][1].get("cells") or [])])
        return

    with open(DATA_JS, "r", encoding="utf-8") as f:
        src = f.read()

    added = []
    for day in days:
        games = by_day[day]
        if not games:
            print("· %s — ESPN 축구 경기 없음, 구간을 만들지 않습니다" % day)
            continue
        src, inserted = write_block(src, day, games)
        if inserted is None:
            src = append_day(src, day, games)
            added.append(day)
            print("· %s — 날짜 블록 새로 만들고 %d경기" % (day, len(games)))
        else:
            print("· %s — %d경기 %s" % (day, len(games), "추가" if inserted else "갱신"))

    src = re.sub(r'updatedAt:\s*"[^"]*"',
                 'updatedAt: "%s"' % now.isoformat(timespec="seconds"), src, count=1)
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write(src)
    print("data.js 저장 완료 (축구 %d경기, 기준 %s KST)%s" % (
        sum(len(v) for v in by_day.values()), now.strftime("%Y-%m-%d %H:%M"),
        (", 날짜 블록 추가: " + ", ".join(added)) if added else ""))
    if _PHOTO_CACHE is not None:
        save_photo_cache(_PHOTO_CACHE)


if __name__ == "__main__":
    main()
