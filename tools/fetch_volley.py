#!/usr/bin/env python3
"""CLUTCH — 배구(KOVO V리그) 실제 데이터 생성기

  python3 work/fetch_volley.py --from 2026-11-19 --to 2026-11-25 --write
  python3 work/fetch_volley.py --date 2026-11-21            # 미리보기
  python3 work/fetch_volley.py --from ... --to ... --write --refresh

쓰는 엔드포인트 (KOVO 한국배구연맹 공식 사이트가 쓰는 API)
  · https://user-api.kovo.co.kr/stat/game-schedule?page=N&size=2000
      경기 일정·결과·경기장·라운드·세트 스코어. (헤더 X-Service-Name: user)
  · https://user-api.kovo.co.kr/stat/league/team-rank?seasonCode={시즌}&leagueCode=201
      팀 순위·승/패·세트 승/패·승점·득실점.
  · https://user-api.kovo.co.kr/stat/game-schedule/{gnum}?gcode={gcode}&seasonCode={시즌}&lang=ko
      끝난 경기의 기록지. payload.player[] 에 선수별 득점·공격(시도/성공/성공률/효율)·
      블로킹·서브·디그·리시브·세트·범실이 온다(이름은 Accept-Language: ko 로 한글).
      gcode 는 /main/game/season 응답값(2026-27 시즌 001).

해외 리그(독일·폴란드·이탈리아)는 넣지 않습니다. 값이 없는 항목(부상·결장·배당)은
비우고 화면에서 "정보 없음"으로 표시합니다. 지어내지 않습니다.

끝난 경기는 같은 응답의 result(W/L)·hspoint/aspoint(세트 승수)·hsNpoint/asNpoint(세트별
점수)·score 로 카드의 result(state: final, awayScore/homeScore, 세트별 lines)를 채웁니다.
선수별 기록은 경기 기록지(game-schedule/{gnum})에서 받아 result.players 로 넣습니다.
(일정 응답에는 없습니다. 기록지가 없으면 players 를 넣지 않고, 화면은 문구만 띄웁니다.)
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_nba import KST, weekday_ko  # 공용 유틸
from odds_common import cache_at  # 캐시 기준 시각

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
CACHE = os.environ.get("CLUTCH_CACHE_DIR") or os.path.join(HERE, "cache")
OUT_JSON = os.environ.get("CLUTCH_OUT_JSON") or os.path.join(HERE, "volley-data.json")
RETRIES = int(os.environ.get("CLUTCH_RETRIES") or 3)

BASE = "https://user-api.kovo.co.kr"
HDR = {
    "X-Service-Name": "user",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
}
PAGE_SIZE = 2000

# 팀 코드 → (짧은 표기, 화면용 한글 이름). KOVO 팀 코드는 시즌이 바뀌어도 같습니다.
TEAMS = {
    "1001": ("KAL", "대한항공"),
    "1002": ("SAM", "삼성화재"),
    "1004": ("KB", "KB손해보험"),
    "1005": ("HYC", "현대캐피탈"),
    "1006": ("KEP", "한국전력"),
    "1008": ("OK", "OK저축은행"),
    "1009": ("WOO", "우리카드"),
    "2001": ("HDC", "현대건설"),
    "2002": ("DOW", "도로공사"),
    "2003": ("JKG", "정관장"),
    "2004": ("HUN", "흥국생명"),
    "2005": ("GSC", "GS칼텍스"),
    "2006": ("IBK", "IBK기업은행"),
    "2008": ("SOOP", "SOOP"),
}

GENDER = {"1": ("VLEAGUE", "V리그 남자부"), "2": ("VLEAGUE", "V리그 여자부")}


def get_json(url, cache_key, refresh=False, headers=None):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, cache_key + ".json")
    if not refresh and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(url, headers=dict(HDR, **(headers or {})))
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.loads(r.read().decode("utf-8"))
            break
        except Exception:
            if attempt + 1 >= RETRIES:
                raise
            time.sleep(2 * (attempt + 1))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return data


def schedule_all(refresh=False):
    """전체 경기 일정(페이지를 끝까지)."""
    first = get_json(BASE + "/stat/game-schedule?page=0&size=%d" % PAGE_SIZE,
                     "kovo-schedule-0", refresh)
    payload = first["payload"]
    pages = (payload.get("page") or {}).get("totalPages") or 1
    content = list(payload.get("content") or [])
    for p in range(1, pages):
        d = get_json(BASE + "/stat/game-schedule?page=%d&size=%d" % (p, PAGE_SIZE),
                     "kovo-schedule-%d" % p, refresh)
        content.extend((d.get("payload") or {}).get("content") or [])
    return content


def game_code(refresh=False):
    """현재 시즌 gcode. 기록지 조회에 필요하다(2026-27 시즌 001)."""
    d = get_json(BASE + "/main/game/season", "kovo-gcode", refresh)
    return str((d.get("payload") or {}).get("gcode") or "001")


def game_record(gnum, season, gcode, refresh=False):
    """끝난 경기의 선수별 기록지(payload.player[]). 없으면 빈 목록."""
    d = get_json(BASE + "/stat/game-schedule/%s?gcode=%s&seasonCode=%s&lang=ko"
                 % (gnum, gcode, season), "kovo-game-%s" % gnum, refresh,
                 headers={"Accept-Language": "ko"})
    p = d.get("payload") or {}
    return p.get("player") or []


def _i(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def _r1(v):
    try:
        return round(float(v), 1)
    except (TypeError, ValueError):
        return 0.0


def build_players(rows, hcode, acode):
    """기록지 player[] → 카드용 선수 기록(출전 선수만, 짧은 키).

    pt 득점 · at 공격시도 · asn 공격성공 · ap 공격성공률(%) · ep 공격효율(%)
    bk 블로킹 · sv 서브득점 · dg 디그 · rc 리시브성공 · rt 리시브시도 · set 세트성공 · er 범실
    """
    out = []
    for p in rows:
        tcode = str(p.get("tcode"))
        side = "home" if tcode == hcode else ("away" if tcode == acode else "")
        if not side:
            continue
        pt, at, ats = _i(p.get("point")), _i(p.get("att")), _i(p.get("ats"))
        sv_t, rt_t, st_t = _i(p.get("st")), _i(p.get("rt")), _i(p.get("sett"))
        bk_t, dg_t = _i(p.get("bt")), _i(p.get("dt"))
        # 출전 여부: 공격·서브·리시브·세트·블로킹·디그 중 하나라도 시도했거나 득점이 있으면 출전
        if pt == 0 and at == 0 and sv_t == 0 and rt_t == 0 and st_t == 0 and bk_t == 0 and dg_t == 0:
            continue
        out.append({
            "n": str(p.get("pname") or "").strip(),
            "p": str(p.get("position") or "").strip(),
            "s": side,
            "pt": pt, "at": at, "asn": ats,
            "ap": _r1(p.get("atsp")), "ep": _r1(p.get("atgp")),
            "bk": _i(p.get("bs")), "sv": _i(p.get("ss")),
            "dg": _i(p.get("ds")), "rc": _i(p.get("rs")), "rt": rt_t,
            "set": _i(p.get("sets")), "er": _i(p.get("err")),
        })
    return [x for x in out if x["n"]]


def team_rank(season, refresh=False):
    d = get_json(BASE + "/stat/league/team-rank?seasonCode=%s&leagueCode=201" % season,
                 "kovo-rank-%s" % season, refresh)
    return d.get("payload") or []


def rank_map(rows, gender):
    out = {}
    for r in rows:
        if str(r.get("spart")) != gender:
            continue
        out[str(r.get("tcode"))] = r
    return out


def _wp(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return "—"
    return ("%d" % f) if f == int(f) else ("%.1f" % f)


def rec_text(win, lost):
    return "%d승 %d패" % (win or 0, lost or 0)


def _pt(v):
    """KOVO 일정 응답의 점수 값 → 정수. 비었거나 숫자가 아니면 None."""
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def build_result(g):
    """KOVO 일정 응답에 이미 실려 있는 결과값만으로 카드의 result 를 만든다.

    쓰는 값(응답 필드 그대로)
      · result     'W'/'L' — 홈 팀 기준 승패. 끝난 경기에만 값이 있다(예정 경기는 '').
      · hspoint/aspoint  세트 승수(홈/원정)
      · hsNpoint/asNpoint 세트별 점수(N=1~5). 치르지 않은 세트는 0.
      · score      '홈 : 원정' 세트 스코어. 위 값과 어긋나면 결과를 만들지 않는다.

    선수별 기록(공격·블로킹·서브)은 이 응답에 없으므로 top 은 넣지 않는다.
    """
    res = str(g.get("result") or "").strip().upper()
    if res not in ("W", "L"):
        return None
    hp, ap = _pt(g.get("hspoint")), _pt(g.get("aspoint"))
    if hp is None or ap is None or hp < 0 or ap < 0 or hp + ap <= 0 or hp + ap > 5:
        return None
    # score 는 '홈 : 원정' 순서. 값이 있는데 세트 승수와 다르면 만들지 않는다.
    sc = str(g.get("score") or "").strip()
    m = re.match(r"^(\d+)\s*:\s*(\d+)$", sc)
    if m and (int(m.group(1)) != hp or int(m.group(2)) != ap):
        print("  ! %s score(%s)와 세트 승수(%d:%d)가 달라 결과를 넣지 않습니다" % (
            g.get("gnum"), sc, hp, ap))
        return None
    sets = hp + ap
    hl = [_pt(g.get("hs%dpoint" % i)) for i in range(1, sets + 1)]
    al = [_pt(g.get("as%dpoint" % i)) for i in range(1, sets + 1)]
    lines = None
    # 세트 점수는 한 세트도 0점으로 끝나지 않는다. 0/빈 값이 섞이면 세트 표를 넣지 않는다.
    if all(x is not None and x > 0 for x in hl + al):
        lines = {"away": [str(x) for x in al], "home": [str(x) for x in hl]}
    out = {
        "state": "final",
        "detail": "Final",
        "awayScore": ap,
        "homeScore": hp,
        "winner": "home" if hp > ap else ("away" if ap > hp else None),
    }
    if lines:
        out["lines"] = lines
    out["kovoNumber"] = str(g.get("gnum"))
    out["source"] = "kovo"
    return out


def build_game(g, ranks, at_iso, all_games=None, gcode="001", refresh=False):
    gnum = str(g.get("gnum"))
    gender = str(g.get("gender"))
    league_short, league_full = GENDER.get(gender, ("VLEAGUE", "V리그"))

    away_code, home_code = str(g.get("acode")), str(g.get("hcode"))
    away_name = TEAMS.get(away_code, (away_code, g.get("aname")))[1]
    home_name = TEAMS.get(home_code, (home_code, g.get("hname")))[1]
    away_abbr = TEAMS.get(away_code, (g.get("asname") or away_code, ""))[0]
    home_abbr = TEAMS.get(home_code, (g.get("hsname") or home_code, ""))[0]

    ar = ranks.get(away_code) or {}
    hr = ranks.get(home_code) or {}

    def recent5(code):
        rows = [x for x in (all_games or [])
                if str(x.get("gdate")) < str(g.get("gdate"))
                and code in (str(x.get("acode")), str(x.get("hcode")))]
        rows.sort(key=lambda x: (str(x.get("gdate")), str(x.get("gstime"))), reverse=True)
        out = []
        for x in rows[:5]:
            home = str(x.get("hcode")) == code
            my = x.get("hspoint") if home else x.get("aspoint")
            op = x.get("aspoint") if home else x.get("hspoint")
            try:
                my, op = int(my), int(op)
            except (TypeError, ValueError):
                continue
            opp_code = str(x.get("acode") if home else x.get("hcode"))
            opp_name = TEAMS.get(opp_code, (opp_code, x.get("aname") if home else x.get("hname")))[1]
            out.append({"date": x.get("gdate"), "opp": opp_name,
                        "ha": "홈" if home else "원정",
                        "score": "%d-%d" % (my, op),
                        "res": "승" if my > op else ("패" if my < op else "무")})
        return out

    def team_side(code, name, abbr, side, r):
        out = {"name": name, "abbr": abbr, "side": side}
        if r:
            out["record"] = rec_text(r.get("win"), r.get("lost"))
            out["badges"] = [{"text": "리그 %s위" % r.get("rank"), "tone": "rank"}]
            out["cells"] = [
                {"label": "시즌 전적", "value": rec_text(r.get("win"), r.get("lost"))},
                {"label": "리그 순위", "value": "%s위" % r.get("rank")},
                {"label": "세트", "value": "%s-%s" % (r.get("swin"), r.get("slost"))},
                {"label": "최근 흐름", "value": r.get("con") or "—"},
            ]
            out["nums"] = [
                {"label": "승점", "value": r.get("winp")},
                {"label": "득점", "value": r.get("point")},
                {"label": "실점", "value": r.get("lpoint")},
            ]
        l5 = recent5(code)
        if l5:
            out["last5Detail"] = l5
            out["last5"] = "%d승 %d패" % (sum(1 for x in l5 if x["res"] == "승"),
                                          sum(1 for x in l5 if x["res"] == "패"))
            head = l5[0]["res"]
            n = 0
            for x in l5:
                if x["res"] == head:
                    n += 1
                else:
                    break
            if n >= 2 and head in ("승", "패"):
                out["streak"] = "%d연%s" % (n, head)
        # KOVO 일정 API 에는 부상·결장 명단이 없다 → 화면은 "부상 정보 없음"
        out["injuryNote"] = "KOVO 공식 기록에는 부상·결장 명단이 없습니다. 출전 명단은 경기 전 구단 발표를 확인하세요."
        return out

    away = team_side(away_code, away_name, away_abbr, "away", ar)
    home = team_side(home_code, home_name, home_abbr, "home", hr)

    venue = g.get("place") or ""
    round_no = g.get("round")
    start = "%sT%s:00+09:00" % (g.get("gdate"), (g.get("gstime") or "19:00")[:5])

    # ── 흐름: 실제 순위·전적·최근 흐름만 ──────────────────────────
    def flow_part(name, r):
        if not r:
            return "**%s** 순위표 값이 없습니다" % name
        return "**%s** %s(리그 %s위, 최근 흐름 %s)" % (
            name, rec_text(r.get("win"), r.get("lost")), r.get("rank"), r.get("con") or "—")

    flow = "%s, %s. %s %s %s." % (
        flow_part(away_name, ar), flow_part(home_name, hr),
        league_full, str(round_no) + "라운드" if round_no else "", venue + "에서 열립니다" if venue else "")

    watch = ""
    if ar and hr:
        try:
            gap = abs(float(ar.get("winp") or 0) - float(hr.get("winp") or 0))
            rk = abs(int(ar.get("rank")) - int(hr.get("rank")))
            sw = abs(int(ar.get("swin") or 0) - int(hr.get("swin") or 0))
            bits = []
            if rk == 1:
                bits.append("리그 %s·%s위로 바로 옆 순위" % (ar.get("rank"), hr.get("rank")))
            if gap <= 3:
                bits.append("승점 차가 %s점" % ("%g" % gap))
            if sw:
                bits.append("세트 승리 수 차가 %d" % sw)
            if bits:
                watch = "%s입니다. 이 경기 결과가 순위표 승점에 바로 반영되는 구간입니다." % (
                    ", ".join(bits))
        except (TypeError, ValueError):
            watch = ""
    if not watch:
        watch = "순위표 값이 일부 비어 있어 수치 비교는 넣지 않았습니다. KOVO 기록실의 순위표를 확인하세요."

    rows = [
        {"kind": "flow", "label": "흐름", "text": flow},
        {"kind": "watch", "label": "관전 포인트", "text": watch},
    ]

    checks = []
    if venue:
        checks.append("**경기장** — %s에서 열립니다." % venue)
    if ar and hr:
        checks.append("**순위표** — %s %s승 %s패·%s위·승점 %s, %s %s승 %s패·%s위·승점 %s." % (
            away_name, ar.get("win"), ar.get("lost"), ar.get("rank"), _wp(ar.get("winp")),
            home_name, hr.get("win"), hr.get("lost"), hr.get("rank"), _wp(hr.get("winp"))))

    start_iso = datetime.fromisoformat(start).isoformat()
    game = {
        "id": "vball-kovo-%s" % gnum,
        "sport": "volleyball",
        "league": league_short,
        "leagueFull": league_full,
        "source": "kovo",
        "start": start_iso,
        "venue": venue,
        "away": {k: v for k, v in away.items() if k not in ("side", "cells", "nums")},
        "home": {k: v for k, v in home.items() if k not in ("side", "cells", "nums")},
        "tags": [
            {"text": "%s · %s" % (league_full, round_no and (str(round_no) + "라운드") or "정규리그"), "tone": "info"},
        ],
        "rows": rows,
        "details": {
            "teams": [away, home],
            "checkpoints": checks,
            "note": "일정·순위는 KOVO 공식 데이터 %s 기준입니다. 부상·결장·배당 정보는 이 소스에 없습니다." % (
                (at_iso or "")[:16].replace("T", " ") if at_iso else "—"),
        },
    }
    if not venue:
        del game["venue"]
    # 끝난 경기면 스코어·세트 스코어를 카드에 넣는다(예정 경기는 넣지 않는다).
    result = build_result(g)
    if result:
        try:
            rows = game_record(gnum, g.get("seasonCode"), gcode, refresh)
            players = build_players(rows, home_code, away_code)
            if players:
                result["players"] = players
            else:
                print("  · %s 기록지에 선수 기록이 없습니다" % gnum)
        except Exception as e:
            print("  ! %s 기록지 실패: %s" % (gnum, e))
        # 다른 종목 카드와 같은 자리에 둔다: status 는 start 뒤, result 는 details 앞.
        ordered = {}
        for k, v in game.items():
            if k == "details":
                ordered["result"] = result
            ordered[k] = v
            if k == "start":
                ordered["status"] = "final"
        game = ordered
    return game


# ── data.js 갱신 ────────────────────────────────────────────────────
def marker(day, edge):
    return "/* VOLLEY-AUTO %s %s */" % (day, edge)


def game_json(g):
    """경기 하나를 data.js 구간에 넣을 JSON 으로. 선수 기록은 한 줄에 하나씩 적어 길이를 줄인다."""
    players = ((g.get("result") or {}).get("players")) or None
    if players:
        g = json.loads(json.dumps(g))
        g["result"]["players"] = "__VOLLEY_PLAYERS__"
    txt = json.dumps(g, ensure_ascii=False, indent=2)
    if players:
        one = ",\n".join("          " + json.dumps(p, ensure_ascii=False, separators=(", ", ": "))
                         for p in players)
        txt = txt.replace('"__VOLLEY_PLAYERS__"', "[\n" + one + "\n        ]")
    return txt


def games_text(games):
    lines = []
    for n, g in enumerate(games):
        txt = game_json(g)
        txt = "\n".join("        " + ln for ln in txt.splitlines())
        lines.append(txt + ("," if n < len(games) - 1 else ""))
    return "\n".join(lines)


def auto_block(games, day):
    return "        %s\n%s\n        %s" % (marker(day, "START"), games_text(games), marker(day, "END"))


def write_block(src, day, games):
    """이미 있는 VOLLEY-AUTO 구간을 새 내용으로 바꾼다.

    구간은 없는데 그 날짜 블록은 있으면 games 배열 맨 앞에 넣는다(같은 날짜 블록을 두 번 만들지 않도록).
    없는 날짜면 None.
    """
    start_tag, end_tag = marker(day, "START"), marker(day, "END")
    i = src.find(start_tag)
    if i < 0:
        anchor = '      date: "%s",\n      games: [\n' % day
        k = src.find(anchor)
        if k < 0:
            return None
        insert_at = k + len(anchor)
        return src[:insert_at] + auto_block(games, day) + ",\n\n" + src[insert_at:]
    j = src.find(end_tag, i)
    if j < 0:
        return None
    line_start = src.rfind("\n", 0, i) + 1
    return src[:line_start] + auto_block(games, day) + src[j + len(end_tag):]


def remove_block(src, day):
    """그 날짜에 배구 경기가 없을 때 구간을 통째로 지운다(앞의 쉼표까지)."""
    start_tag, end_tag = marker(day, "START"), marker(day, "END")
    i = src.find(start_tag)
    if i < 0:
        return None
    j = src.find(end_tag, i)
    if j < 0:
        return None
    line_start = src.rfind("\n", 0, i) + 1
    tail = src[j + len(end_tag):]
    # 구간 뒤에 쉼표가 있으면 그 쉼표까지 지운다. 없으면 앞 쉼표를 지운다.
    m = re.match(r"[ \t]*,[ \t]*\r?\n", tail)
    if m:
        return src[:line_start] + tail[m.end():]
    head = src[:line_start]
    m2 = re.search(r",[ \t]*\r?\n[ \t]*$", head)
    if m2:
        head = head[:m2.start()] + "\n"
    return head + tail


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
    ap.add_argument("--write", action="store_true", help="data.js 를 고친다")
    ap.add_argument("--refresh", action="store_true", help="캐시를 무시하고 다시 받는다")
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
    if d1 < d0:
        raise SystemExit("--to 가 --from 보다 앞입니다.")

    days = []
    d = d0
    while d <= d1:
        days.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)

    content = schedule_all(args.refresh)
    in_range = [g for g in content if d0.strftime("%Y-%m-%d") <= g.get("gdate", "") <= d1.strftime("%Y-%m-%d")]
    if not in_range:
        print("· KOVO 일정에 이 구간 경기가 없습니다.")
    seasons = sorted({str(g.get("seasonCode")) for g in in_range})
    ranks = {}
    for s in seasons:
        rows = team_rank(s, args.refresh)
        for gender in ("1", "2"):
            ranks[gender] = rank_map(rows, gender)

    at_iso = None
    for key in ("kovo-schedule-0",):
        at_iso = cache_at(CACHE, key)

    gcode = game_code(args.refresh) if in_range else "001"
    by_day = {day: [] for day in days}
    for g in in_range:
        built = build_game(g, ranks.get(str(g.get("gender"))) or {}, at_iso, content,
                           gcode=gcode, refresh=args.refresh)
        by_day[built["start"][:10]].append(built)
    for day in days:
        by_day[day].sort(key=lambda x: (x["start"], x["id"]))

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
                   "days": {k: v for k, v in by_day.items() if v}}, f, ensure_ascii=False, indent=2)

    if not args.write:
        for day in days:
            print("%s (%s) 배구 %d경기" % (day, weekday_ko(day), len(by_day[day])))
            for g in by_day[day]:
                r = g.get("result")
                if r:
                    ls = r.get("lines") or {}
                    sets = " / ".join("%s-%s" % (a, h) for a, h in
                                      zip(ls.get("away") or [], ls.get("home") or []))
                    tail = "결과 %s:%s%s" % (r["awayScore"], r["homeScore"], (" (" + sets + ")") if sets else "")
                else:
                    tail = "예정"
                np = len(((r or {}).get("players")) or []) if r else 0
                if r:
                    tail += " · 선수 %d명" % np
                print("   ", g["start"][11:16], g["details"]["teams"][0]["name"], "@",
                      g["details"]["teams"][1]["name"], "|", g.get("venue"), "|", tail)
        return

    src = open(DATA_JS, encoding="utf-8").read()
    for day in days:
        games = by_day[day]
        if not games:
            out = remove_block(src, day)
            if out is not None:
                src = out
                print("· %s — KOVO 경기 없음, 구간 삭제" % day)
            else:
                print("· %s — 배구 경기 없음, 구간 없음" % day)
            continue
        out = write_block(src, day, games)
        if out is None:
            src = append_day(src, day, games)
            print("· %s — 날짜 블록 새로 만들고 %d경기" % (day, len(games)))
        else:
            src = out
            print("· %s — %d경기 갱신" % (day, len(games)))

    now = datetime.now(KST)
    src = re.sub(r'updatedAt:\s*"[^"]*"', 'updatedAt: "%s"' % now.isoformat(timespec="seconds"), src, count=1)
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write(src)
    print("data.js 저장 완료 (배구 %d경기, 기준 %s KST)" % (
        sum(len(v) for v in by_day.values()), now.strftime("%Y-%m-%d %H:%M")))


if __name__ == "__main__":
    main()
