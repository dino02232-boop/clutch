#!/usr/bin/env python3
"""CLUTCH — NBA 선수 스탯 도우미

  · 시즌 평균: ESPN byathlete 리더보드(전 선수) 5페이지에서 받아 팀별로 묶습니다.
      site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete
  · 직전 경기: 그 팀이 마지막으로 치른 경기의 summary boxscore 에서 선수별 기록.

값은 ESPN 응답 그대로만 씁니다. 없으면 None 으로 두고 화면에서 생략합니다.
"""

import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get("CLUTCH_CACHE_DIR") or os.path.join(HERE, "cache")
RETRIES = int(os.environ.get("CLUTCH_RETRIES") or 3)

BYATH = ("https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/"
         "byathlete?region=us&lang=en&contentorigin=espn&isqualified=false"
         "&page={p}&limit=100&sort=offensive.avgPoints%3Adesc")
SUM = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={e}"
HDR = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json",
}


def _get(url, key, refresh=False):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + ".json")
    if not refresh and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(url, headers=HDR)
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
        json.dump(data, f)
    return data


def _cat_index(data, cat_name, stat_name):
    for c in data.get("categories") or []:
        if c.get("name") != cat_name:
            continue
        names = c.get("names") or []
        if stat_name in names:
            return names.index(stat_name)
    return None


def season(refresh=False):
    """{athlete_id: {name, pos, team_id, gp, ppg, rpg, apg, fg, tp}} / 팀별 득점 순위 포함."""
    first = _get(BYATH.format(p=1), "players-1", refresh)
    pages = ((first.get("pagination") or {}).get("pages")) or 1
    rows = list(first.get("athletes") or [])
    for p in range(2, pages + 1):
        time.sleep(0.3)
        d = _get(BYATH.format(p=p), "players-%d" % p, refresh)
        rows.extend(d.get("athletes") or [])

    # 통계 이름은 응답 최상단 categories(전 응답 공통)에 있고,
    # 선수 행에는 values 배열만 있다. 이름 → 자리 순서로 값을 뽑는다.
    names_by_cat = {c.get("name"): (c.get("names") or []) for c in first.get("categories") or []}

    out = {}
    for row in rows:
        ath = row.get("athlete") or {}
        aid = str(ath.get("id") or "")
        if not aid:
            continue
        cats = {c.get("name"): c for c in row.get("categories") or []}
        gen = cats.get("general") or {}
        off = cats.get("offensive") or {}
        dfn = cats.get("defensive") or {}

        def val(cat, catdata, name):
            names = names_by_cat.get(cat) or []
            if name not in names:
                return None
            i = names.index(name)
            vals = catdata.get("values") or []
            if i < len(vals):
                return vals[i]
            return None

        out[aid] = {
            "name": ath.get("displayName") or ath.get("fullName"),
            "pos": ((ath.get("position") or {}).get("abbreviation") or ""),
            "team_id": str(ath.get("teamId") or ""),
            "gp": val("general", gen, "gamesPlayed"),
            "min": val("general", gen, "avgMinutes"),
            "ppg": val("offensive", off, "avgPoints"),
            "rpg": val("general", gen, "avgRebounds"),
            "apg": val("offensive", off, "avgAssists"),
            "fg": val("offensive", off, "fieldGoalPct"),
            "tp": val("offensive", off, "threePointFieldGoalPct"),
            "spg": val("defensive", dfn, "avgSteals"),
            "bpg": val("defensive", dfn, "avgBlocks"),
        }
    return out


def team_ranks(players):
    """팀별 시즌 평균 득점 순위 → {(team_id, athlete_id): rank}"""
    by_team = {}
    for aid, p in players.items():
        if not p.get("team_id") or p.get("ppg") is None:
            continue
        by_team.setdefault(p["team_id"], []).append((p["ppg"], aid))
    out = {}
    for tid, lst in by_team.items():
        lst.sort(reverse=True)
        for i, (_, aid) in enumerate(lst, 1):
            out[(tid, aid)] = i
    return out


def last_game_stats(event_id, refresh=False):
    """그 경기 boxscore → {athlete_id: {min, pts, reb, ast, fg, tp}}"""
    try:
        d = _get(SUM.format(e=event_id), "gsum-%s" % event_id, refresh)
    except Exception:
        return {}
    out = {}
    for team in ((d.get("boxscore") or {}).get("players") or []):
        for st in team.get("statistics") or []:
            labels = st.get("labels") or []
            for a in st.get("athletes") or []:
                ath = a.get("athlete") or {}
                aid = str(ath.get("id") or "")
                stats = a.get("stats") or []
                if not aid or not stats:
                    continue
                rec = {}
                for i, lab in enumerate(labels):
                    if i < len(stats):
                        rec[lab] = stats[i]
                out[aid] = {
                    "min": rec.get("MIN"),
                    "pts": rec.get("PTS"),
                    "reb": rec.get("REB"),
                    "ast": rec.get("AST"),
                    "fg": rec.get("FG"),
                    "tp": rec.get("3PT"),
                }
    return out


SCHED = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{t}/schedule"


def team_schedule(team_id, refresh=False):
    """팀의 시즌 경기 결과(최신이 앞). 끝난 경기만. {id,date,opp,opp_ab,ha,score,res}"""
    if not team_id:
        return []
    try:
        d = _get(SCHED.format(t=team_id), "tsched-%s" % team_id, refresh)
    except Exception:
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
            v = x.get("score")
            if isinstance(v, dict):
                return v.get("displayValue")
            return v

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
        opp = comps["away" if me == "home" else "home"].get("team") or {}
        out.append({
            "id": str(ev.get("id") or ""),
            "date": (ev.get("date") or c.get("date") or "")[:10],
            "opp": opp.get("displayName") or "",
            "opp_ab": opp.get("abbreviation") or "",
            "ha": "home" if me == "home" else "away",
            "myscore": hsi if me == "home" else asi,
            "opscore": asi if me == "home" else hsi,
            "res": res,
        })
    out.sort(key=lambda r: r["date"], reverse=True)
    return out


def game_summary(event_id, refresh=False):
    """직전 경기 요약: 날짜·연장 여부·스코어·양 팀 상위 득점자(박스스코어 실제 값)."""
    if not event_id:
        return None
    try:
        d = _get(SUM.format(e=event_id), "gsum-%s" % event_id, refresh)
    except Exception:
        return None
    comp = ((d.get("header") or {}).get("competitions") or [{}])[0]
    st = (comp.get("status") or {}).get("type") or {}
    comps = {c.get("homeAway"): c for c in comp.get("competitors") or []}
    if "home" not in comps or "away" not in comps:
        return None

    def sc(c):
        v = c.get("score")
        if isinstance(v, dict):
            return v.get("displayValue")
        return v

    tops = []
    for team in ((d.get("boxscore") or {}).get("players") or []):
        abbr = ((team.get("team") or {}).get("abbreviation")) or ""
        for stt in team.get("statistics") or []:
            labels = stt.get("labels") or []
            for a in stt.get("athletes") or []:
                stats = dict(zip(labels, a.get("stats") or []))
                try:
                    pts = int(float(stats.get("PTS") or 0))
                except (TypeError, ValueError):
                    pts = 0
                if pts <= 0:
                    continue
                tops.append({
                    "name": ((a.get("athlete") or {}).get("displayName") or ""),
                    "team": abbr,
                    "min": stats.get("MIN"),
                    "pts": pts,
                    "reb": stats.get("REB"),
                    "ast": stats.get("AST"),
                })
    tops.sort(key=lambda x: x["pts"], reverse=True)
    return {
        "date": (comp.get("date") or "")[:10],
        "detail": st.get("detail") or st.get("shortDetail") or "",
        "home": (comps["home"].get("team") or {}).get("abbreviation"),
        "away": (comps["away"].get("team") or {}).get("abbreviation"),
        "homeScore": sc(comps["home"]),
        "awayScore": sc(comps["away"]),
        "top": tops[:6],
    }


def recent(event_ids, refresh=False):
    """최근 경기 boxscore 들로 선수별 평균을 직접 계산한다.

    {athlete_id: {gp, pts, reb, ast, fgm, fga, fgpct, tpm, tpa, tppct}}
    ESPN 의 athletes/{id}/stats 는 시즌 필터를 무시하므로 쓰지 않는다.
    """
    agg = {}
    for eid in event_ids:
        if not eid:
            continue
        games = last_game_stats(eid, refresh)
        for aid, g in games.items():
            if not g.get("min") or g.get("min") in ("0", "0:00"):
                continue
            a = agg.setdefault(aid, {"gp": 0, "pts": 0.0, "reb": 0.0, "ast": 0.0,
                                     "fgm": 0, "fga": 0, "tpm": 0, "tpa": 0})
            a["gp"] += 1

            def num(v):
                try:
                    return float(v)
                except (TypeError, ValueError):
                    return 0.0

            a["pts"] += num(g.get("pts"))
            a["reb"] += num(g.get("reb"))
            a["ast"] += num(g.get("ast"))
            fg = str(g.get("fg") or "")
            if "-" in fg:
                m, t = fg.split("-")[:2]
                a["fgm"] += int(num(m)); a["fga"] += int(num(t))
            tp = str(g.get("3pt") or g.get("tp") or "")
            if "-" in tp:
                m, t = tp.split("-")[:2]
                a["tpm"] += int(num(m)); a["tpa"] += int(num(t))
    out = {}
    for aid, a in agg.items():
        gp = a["gp"]
        if not gp:
            continue
        out[aid] = {
            "gp": gp,
            "pts": round(a["pts"] / gp, 1),
            "reb": round(a["reb"] / gp, 1),
            "ast": round(a["ast"] / gp, 1),
            "fgpct": round(a["fgm"] / a["fga"] * 100, 1) if a["fga"] else None,
            "tppct": round(a["tpm"] / a["tpa"] * 100, 1) if a["tpa"] else None,
        }
    return out


def fmt1(v):
    if v is None:
        return None
    try:
        return round(float(v), 1)
    except (TypeError, ValueError):
        return None


def line_of(p, with_fg=True):
    """선수 시즌 스탯 한 줄: '21.4점 · 6.1리바운드 · 3.2어시스트'"""
    bits = []
    ppg, rpg, apg = fmt1(p.get("ppg")), fmt1(p.get("rpg")), fmt1(p.get("apg"))
    if ppg is not None:
        bits.append("%s점" % ppg)
    if rpg is not None:
        bits.append("%s리바운드" % rpg)
    if apg is not None:
        bits.append("%s어시스트" % apg)
    s = " · ".join(bits)
    if with_fg:
        fg, tp = fmt1(p.get("fg")), fmt1(p.get("tp"))
        extra = []
        if fg is not None:
            extra.append("야투 %s%%" % fg)
        if tp is not None:
            extra.append("3점 %s%%" % tp)
        if extra:
            s += (" · " + " · ".join(extra)) if s else " · ".join(extra)
    return s or None


def last_line_of(g):
    """직전 경기 한 줄: '27분 21점 6리바운드, 야투 8/17'"""
    if not g:
        return None
    bits = []
    if g.get("min"):
        bits.append("%s분" % g["min"])
    if g.get("pts"):
        bits.append("%s점" % g["pts"])
    if g.get("reb"):
        bits.append("%s리바운드" % g["reb"])
    if g.get("ast"):
        bits.append("%s어시스트" % g["ast"])
    s = " ".join(bits)
    if g.get("fg"):
        s += (", 야투 %s" % g["fg"]) if s else ("야투 %s" % g["fg"])
    return s or None


if __name__ == "__main__":
    ps = season()
    ranks = team_ranks(ps)
    print("선수", len(ps), "팀", len({p["team_id"] for p in ps.values()}))
    for aid, p in list(ps.items())[:5]:
        print(aid, p["name"], p["team_id"], p["pos"], line_of(p), "팀내", ranks.get((p["team_id"], aid)))
