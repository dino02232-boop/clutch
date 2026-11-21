#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CLUTCH — 리그 순위표 데이터 생성기 (팀 순위 + 개인 순위)

  python3 tools/fetch_standings.py

ESPN 공개 API 에서 아래를 받아 standings-data.js 를 새로 씁니다.
  · 팀 순위  : /apis/v2/sports/soccer/{league}/standings
               /apis/v2/sports/basketball/nba/standings
  · 개인 순위: 축구 /apis/site/v2/sports/soccer/{league}/statistics?season=2026
               NBA  /apis/common/v3/sports/basketball/nba/statistics/byathlete
                    (isqualified=true, sort=...)

값은 응답에 있는 그대로만 넣고, 없는 값은 null 로 둡니다.
팀 이름은 기존 data.js 와 같은 표기를 쓰기 위해 fetch_soccer.py / fetch_nba.py 의
TEAM_KO 사전을 그대로 가져다 씁니다(없으면 ESPN 영문명).

한 리그라도 실패하면 기존 standings-data.js 를 덮어쓰지 않고 종료 코드 1 로 끝납니다
(자동 갱신에서 부분 데이터가 올라가지 않게).
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from fetch_soccer import TEAM_KO as SOCCER_KO  # noqa: E402  (data.js 와 같은 한글 팀명)
from fetch_nba import TEAM_KO as NBA_KO        # noqa: E402
from fetch_volley import TEAMS as VOLLEY_TEAMS  # noqa: E402  (KOVO 팀 코드 → (약어, 한글명))

OUT = os.environ.get("CLUTCH_STANDINGS_JS") or os.path.join(ROOT, "standings-data.js")
KST = timezone(timedelta(hours=9))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
RETRIES = int(os.environ.get("CLUTCH_RETRIES") or 3)

STANDINGS = "https://site.api.espn.com/apis/v2/sports/%s/standings"
SOCCER_STATS = "https://site.api.espn.com/apis/site/v2/sports/soccer/%s/statistics?season=2026"
NBA_BYATHLETE = ("https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete"
                 "?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=20&sort=%s")
HEADSHOT_SOCCER = "https://a.espncdn.com/i/headshots/soccer/players/full/%s.png"
HEADSHOT_NBA = "https://a.espncdn.com/i/headshots/nba/players/full/%s.png"
KOVO_RANK = "https://user-api.kovo.co.kr/stat/league/team-rank?seasonCode=%s&leagueCode=201"

# 탭 순서 그대로. (key, ESPN 리그 코드, 화면 이름, 영문 이름)
SOCCER_LEAGUES = [
    ("EPL", "eng.1", "프리미어리그", "English Premier League"),
    ("LALIGA", "esp.1", "라리가", "Spanish LALIGA"),
    ("BUNDES", "ger.1", "분데스리가", "German Bundesliga"),
    ("SERIEA", "ita.1", "세리에 A", "Italian Serie A"),
    ("UCL", "uefa.champions", "UCL", "UEFA Champions League"),
]

# ESPN note.description → 화면 띠 이름. 여기 없는 설명은 띠를 그리지 않는다(의미 불확실).
ZONE_KO = {
    "Champions League": "챔피언스리그",
    "Europa League": "유로파리그",
    "Conference League qualifying": "컨퍼런스리그 예선",
    "Relegation": "강등",
    "Relegated": "강등",
    "Relegation playoff": "강등 플레이오프",
    "Qualifies for round of 16": "16강 진출",
    "Knockout phase playoffs - seeded": "녹아웃 PO 시드",
    "Knockout phase playoffs - unseeded": "녹아웃 PO 비시드",
    "Eliminated": "탈락",
}


# ── HTTP ────────────────────────────────────────────────────────────
def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    last = None
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # 일시적인 연결 끊김·타임아웃은 다시 시도
            last = e
            if attempt + 1 < RETRIES:
                time.sleep(2 * (attempt + 1))
    raise last


# ── 값 가공 ─────────────────────────────────────────────────────────
def stat_map(entry):
    return {s.get("name"): s for s in (entry.get("stats") or [])}


def num(entry, name):
    s = stat_map(entry).get(name)
    if not s:
        return None
    v = s.get("value")
    if v is None:
        dv = s.get("displayValue")
        try:
            return float(dv)
        except (TypeError, ValueError):
            return None
    return v


def disp(entry, name):
    s = stat_map(entry).get(name)
    return None if not s else s.get("displayValue")


def clean_color(c):
    if not c:
        return None
    c = str(c).strip().lstrip("#")
    if len(c) in (3, 6) and all(ch in "0123456789abcdefABCDEF" for ch in c):
        return "#" + c
    return None


def zone_of(entry):
    note = entry.get("note") or {}
    desc = (note.get("description") or "").strip()
    label = ZONE_KO.get(desc)
    if not label:
        return None
    return {"label": label, "color": clean_color(note.get("color")), "src": desc}


def logo_of(team):
    for l in (team.get("logos") or []):
        href = l.get("href")
        if href:
            return href
    return None


def team_row(entry, soccer):
    t = entry.get("team") or {}
    abbr = t.get("abbreviation") or ""
    if soccer:
        name = SOCCER_KO.get(t.get("displayName") or "") or SOCCER_KO.get(t.get("name") or "") \
            or t.get("displayName") or t.get("name") or abbr
        played = num(entry, "gamesPlayed")
        win, draw, loss = num(entry, "wins"), num(entry, "ties"), num(entry, "losses")
        points = num(entry, "points")
        diff = num(entry, "pointDifferential")
    else:
        name = NBA_KO.get(abbr) or t.get("displayName") or abbr
        win, loss = num(entry, "wins"), num(entry, "losses")
        played = (win or 0) + (loss or 0) if (win is not None or loss is not None) else None
        draw = None
        points = None
        diff = num(entry, "pointDifferential")
    rank = num(entry, "rank") if soccer else num(entry, "playoffSeed")
    return {
        "rank": int(rank) if rank is not None else None,
        "team": name,
        "abbr": abbr,
        "logo": logo_of(t),
        "played": int(played) if played is not None else None,
        "win": int(win) if win is not None else None,
        "draw": int(draw) if draw is not None else None,
        "loss": int(loss) if loss is not None else None,
        "points": int(points) if points is not None else None,
        "diff": int(diff) if diff is not None else None,
        "pct": disp(entry, "winPercent") if not soccer else None,
        "gb": disp(entry, "gamesBehind") if not soccer else None,
        "zone": zone_of(entry),
    }


def sort_rows(rows):
    # ESPN 이 준 rank 를 그대로 쓴다. rank 가 비어 있으면 원래 순서를 유지.
    if any(r["rank"] is not None for r in rows):
        return sorted(rows, key=lambda r: (r["rank"] is None, r["rank"] or 0))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


def season_label(text):
    """'2026-27 English Premier League' → '2026-27'"""
    if not text:
        return None
    first = str(text).split(" ")[0]
    return first if "-" in first else None


# ── 축구 ────────────────────────────────────────────────────────────
def soccer_team_board(key, code):
    d = get_json(STANDINGS % ("soccer/" + code))
    children = d.get("children") or []
    if not children:
        raise ValueError("standings 응답에 children 이 없습니다")
    st = children[0].get("standings") or {}
    entries = st.get("entries") or []
    if not entries:
        raise ValueError("standings 응답에 entries 가 없습니다")
    rows = sort_rows([team_row(e, True) for e in entries])
    season = season_label((st.get("seasonDisplayName") or "") or (children[0].get("name") or ""))
    return {
        "groups": [{"name": "", "rows": rows}],
        "season": season,
        "full": st.get("name") or (children[0].get("name") or ""),
    }


def soccer_leaders(code):
    d = get_json(SOCCER_STATS % code)
    by_name = {s.get("name"): s for s in (d.get("stats") or [])}
    season = season_label((d.get("season") or {}).get("displayName"))

    def board(stat_name, key, label, unit):
        src = by_name.get(stat_name) or {}
        out = []
        for i, l in enumerate((src.get("leaders") or [])[:20], 1):
            a = l.get("athlete") or {}
            team = a.get("team") or {}
            tname = team.get("displayName") or team.get("name") or ""
            aid = a.get("id") or ""
            hs = (a.get("headshot") or {}).get("href")
            photo = hs or (HEADSHOT_SOCCER % aid if aid else None)
            appearances = None
            for s in (a.get("statistics") or []):
                if s.get("name") == "appearances":
                    appearances = s.get("value")
            v = l.get("value")
            out.append({
                "rank": i,
                "name": a.get("displayName") or a.get("shortName") or "",
                "id": aid,
                "photo": photo,
                "team": SOCCER_KO.get(tname) or tname,
                "teamAbbr": team.get("abbreviation") or "",
                "value": v,
                "display": ("%g%s" % (v, unit)) if isinstance(v, (int, float)) else None,
                "played": int(appearances) if appearances is not None else None,
            })
        return {"key": key, "label": label, "unit": unit, "aggregate": "누적", "rows": out}

    return {
        "season": season,
        "boards": [
            board("goalsLeaders", "goals", "득점", "골"),
            board("assistsLeaders", "assists", "도움", "도움"),
        ],
    }


# ── NBA ─────────────────────────────────────────────────────────────
def nba_team_boards():
    d = get_json(STANDINGS % "basketball/nba")
    children = d.get("children") or []
    if len(children) < 2:
        raise ValueError("NBA standings 응답의 컨퍼런스 children 이 부족합니다")
    groups = []
    season = season_label((d.get("season") or {}).get("displayName")) if isinstance(d.get("season"), dict) else None
    for ch in children:
        entries = (ch.get("standings") or {}).get("entries") or []
        if not entries:
            raise ValueError("NBA %s entries 가 없습니다" % ch.get("name"))
        name = "동부" if "east" in (ch.get("name") or "").lower() else (
            "서부" if "west" in (ch.get("name") or "").lower() else (ch.get("name") or ""))
        groups.append({"name": name, "rows": sort_rows([team_row(e, False) for e in entries])})
    groups.sort(key=lambda g: 0 if g["name"] == "동부" else 1)
    return {"groups": groups, "season": season, "full": d.get("name") or "National Basketball Association"}


def nba_leaders():
    """byathlete 는 카테고리별 값 배열만 주므로 categories[].names 로 위치를 찾는다."""
    specs = [
        ("offensive.avgPoints:desc", "points", "득점", "점", "avgPoints", "offensive"),
        ("general.avgRebounds:desc", "rebounds", "리바운드", "리바운드", "avgRebounds", "general"),
        ("offensive.avgAssists:desc", "assists", "어시스트", "어시스트", "avgAssists", "offensive"),
    ]
    boards = []
    season = None
    for sort, key, label, unit, field, cat in specs:
        d = get_json(NBA_BYATHLETE % urllib.parse.quote(sort, safe=""))
        if season is None and isinstance(d.get("currentSeason"), dict):
            season = d["currentSeason"].get("displayName")
        cats = {c.get("name"): c for c in (d.get("categories") or [])}
        names = (cats.get(cat) or {}).get("names") or []
        idx = names.index(field) if field in names else None
        rows = []
        for i, a in enumerate((d.get("athletes") or [])[:20], 1):
            ath = a.get("athlete") or {}
            block = None
            for c in (a.get("categories") or []):
                if c.get("name") == cat:
                    block = c
                    break
            val = None
            if block and idx is not None and idx < len(block.get("values") or []):
                val = block["values"][idx]
            aid = ath.get("id") or ""
            photo = (ath.get("headshot") or {}).get("href") or (HEADSHOT_NBA % aid if aid else None)
            teams = ath.get("teams") or []
            abbr = (teams[0].get("abbreviation") if teams else None) or ath.get("teamShortName") or ""
            tname = NBA_KO.get(abbr) or (teams[0].get("displayName") if teams else None) or ath.get("teamName") or ""
            gp = None
            for c in (a.get("categories") or []):
                if c.get("name") == "general":
                    gn = (cats.get("general") or {}).get("names") or []
                    if "gamesPlayed" in gn:
                        j = gn.index("gamesPlayed")
                        if j < len(c.get("values") or []):
                            gp = c["values"][j]
            rows.append({
                "rank": i,
                "name": ath.get("displayName") or ath.get("shortName") or "",
                "id": aid,
                "photo": photo,
                "team": tname,
                "teamAbbr": abbr,
                "value": val,
                "display": ("%.1f%s" % (val, unit)) if isinstance(val, (int, float)) else None,
                "played": int(gp) if gp is not None else None,
            })
        boards.append({"key": key, "label": label, "unit": unit, "aggregate": "경기당", "rows": rows})
    return {"season": season, "boards": boards}


# ── 배구 (KOVO) ────────────────────────────────────────────────────
def voleague_boards():
    """KOVO 팀 순위 — 한 응답에 남자부(spart 1)·여자부(spart 2)가 같이 온다.
    시즌 코드는 2005년=001 처럼 3자리이고, 해가 바뀌어도 이전 시즌 코드가 남아 있어
    후보 두 개를 받아 '가장 최근 경기를 치른 시즌'을 고른다."""
    year = datetime.now(KST).year
    best = None
    for code in ("%03d" % (year - 2004), "%03d" % (year - 2003)):
        try:
            d = get_json(KOVO_RANK % code)
        except Exception:
            continue
        rows = d.get("payload") or []
        if not rows:
            continue
        last = max(str(r.get("udate") or "") for r in rows)
        if best is None or last > best[0]:
            best = (last, code, rows)
    if not best or not best[2]:
        raise ValueError("KOVO 팀 순위 응답이 비었습니다")

    _, code, rows = best
    groups = []
    for spart, name in (("1", "남자부"), ("2", "여자부")):
        g = []
        for r in rows:
            if str(r.get("spart")) != spart:
                continue
            tcode = str(r.get("tcode") or "")
            abbr, ko = VOLLEY_TEAMS.get(tcode, (tcode, r.get("tsname") or tcode))
            win, lost = r.get("win"), r.get("lost")
            swin, slost = r.get("swin"), r.get("slost")
            winp = r.get("winp")
            g.append({
                "rank": r.get("rank"),
                "team": ko.strip(),
                "abbr": abbr,
                "logo": r.get("emblemUrl") or None,
                "played": (win or 0) + (lost or 0) if (win is not None or lost is not None) else None,
                "win": win, "draw": None, "loss": lost, "diff": None,
                # KOVO 의 winp 는 승률이 아니라 승점이다(예: 5승1패 → 14점).
                "points": int(winp) if isinstance(winp, (int, float)) else None,
                "pct": None,
                "gb": None,
                "sets": ("%d-%d" % (swin or 0, slost or 0)) if (swin is not None or slost is not None) else None,
                "zone": None,
            })
        g.sort(key=lambda x: (x["rank"] is None, x["rank"] or 0))
        groups.append({"name": name, "rows": g})
    if not any(x["rows"] for x in groups):
        raise ValueError("KOVO 팀 순위에 남자부·여자부 행이 없습니다")
    return {"groups": groups, "season": "%s-%s" % (year, str(year + 1)[2:]),
            "full": "KOVO V-League"}


# ── 출력 ────────────────────────────────────────────────────────────
def dump(data):
    head = (
        "/* =============================================================\n"
        "   CLUTCH — 리그 순위표 데이터 (자동 생성 파일)\n"
        "   -------------------------------------------------------------\n"
        "   팀 순위 · 개인 순위를 ESPN 공개 API 에서 받아 그대로 넣습니다.\n"
        "   손으로 고치지 말고 생성기를 다시 돌리세요(값을 지어내지 않습니다).\n"
        "     python3 tools/fetch_standings.py\n"
        "   생성 시각(기준): %s\n"
        "   ============================================================= */\n"
        % data["updated"]
    )
    return head + "window.CLUTCH_STANDINGS = " + json.dumps(
        data, ensure_ascii=False, indent=2, allow_nan=False) + ";\n"


def main():
    t0 = time.time()
    print("CLUTCH 순위표 생성 — ESPN 공개 API")
    leagues = []
    errors = []

    for key, code, name, full in SOCCER_LEAGUES:
        try:
            t = soccer_team_board(key, code)
            l = soccer_leaders(code)
            leagues.append({
                "key": key, "sport": "soccer", "name": name, "source": "ESPN",
                "full": full, "season": l.get("season") or t.get("season"),
                "groups": t["groups"], "leaders": l["boards"],
            })
            n = sum(len(g["rows"]) for g in t["groups"])
            print("  · %-7s 팀 %2d행 · 개인 %s" % (
                key, n, ", ".join("%s %d" % (b["label"], len(b["rows"])) for b in l["boards"])))
        except Exception as e:
            errors.append("%s: %s" % (key, e))
            print("  ! %-7s 실패 — %s" % (key, e))

    try:
        t = nba_team_boards()
        l = nba_leaders()
        leagues.append({
            "key": "NBA", "sport": "basketball", "name": "NBA", "source": "ESPN",
            "full": "National Basketball Association",
            "season": l.get("season") or t.get("season"),
            "groups": t["groups"], "leaders": l["boards"],
        })
        print("  · %-7s 팀 %2d행(%s) · 개인 %s" % (
            "NBA", sum(len(g["rows"]) for g in t["groups"]),
            ", ".join("%s %d" % (g["name"], len(g["rows"])) for g in t["groups"]),
            ", ".join("%s %d" % (b["label"], len(b["rows"])) for b in l["boards"])))
    except Exception as e:
        errors.append("NBA: %s" % e)
        print("  ! %-7s 실패 — %s" % ("NBA", e))

    try:
        t = voleague_boards()
        leagues.append({
            "key": "VLEAGUE", "sport": "volleyball", "name": "V리그", "source": "KOVO",
            "full": t["full"], "season": t["season"],
            "groups": t["groups"], "leaders": [],
        })
        print("  · %-7s 팀 %2d행(%s)" % (
            "VLEAGUE", sum(len(g["rows"]) for g in t["groups"]),
            ", ".join("%s %d" % (g["name"], len(g["rows"])) for g in t["groups"])))
    except Exception as e:
        errors.append("VLEAGUE: %s" % e)
        print("  ! %-7s 실패 — %s" % ("VLEAGUE", e))

    if errors:
        print("실패한 리그가 있어 %s 를 덮어쓰지 않았습니다." % os.path.basename(OUT))
        for e in errors:
            print("  - " + e)
        print("소요 %.1f초 · 결과 실패" % (time.time() - t0))
        return 1

    data = {
        "updated": datetime.now(KST).isoformat(timespec="seconds"),
        "source": "ESPN",
        "leagues": leagues,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(dump(data))

    total_team = sum(len(g["rows"]) for lg in leagues for g in lg["groups"])
    total_lead = sum(len(b["rows"]) for lg in leagues for b in lg["leaders"])
    print("저장: %s (팀 %d행 · 개인 %d행 · 리그 %d개)" % (
        os.path.relpath(OUT, ROOT), total_team, total_lead, len(leagues)))
    print("소요 %.1f초 · 결과 성공" % (time.time() - t0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
