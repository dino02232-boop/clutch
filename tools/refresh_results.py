#!/usr/bin/env python3
"""CLUTCH — 경기 결과만 다시 받아 data.js 를 갱신합니다.

  python3 work/refresh_results.py            # 미리보기(바뀌는 경기만 출력)
  python3 work/refresh_results.py --write    # data.js 갱신

하는 일
  · data.js 의 경기 중 state 가 final 이 아닌 것(예정·진행 중)만 골라
    ESPN summary 를 다시 받아 상태·최종 스코어·쿼터 스코어·주요 선수 기록을 갱신합니다.
  · 경기 전 분석(흐름·전적·결장·관전 포인트·배당)은 건드리지 않습니다.
  · 배구(V리그)는 KOVO 일정 응답에 결과가 함께 오므로 이 스크립트는 손대지 않습니다.
    (필요하면 fetch_volley.py 로 다시 생성)

소요 시간: 경기 1건당 요청 1회(캐시 없을 때). 경기 10건이면 20초 안팎입니다.
푸시: data.js 가 바뀌므로 git commit + push 가 필요합니다(자동 푸시는 하지 않습니다).
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from photo_sources import load_cache as load_photo_cache, resolve as photo_resolve, save_cache as save_photo_cache  # noqa: E402

ROOT = os.path.dirname(HERE)
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
RETRIES = int(os.environ.get("CLUTCH_RETRIES") or 3)
NBA_HEADSHOT = "https://a.espncdn.com/i/headshots/nba/players/full/%s.png"


def _headshot(ath, sport="basketball", club="", cache=None):
    """박스스코어 선수 객체 → 얼굴 사진 URL.

    농구는 ESPN headshot(없으면 CDN 경로), 축구는 ESPN 축구 CDN 이 대부분 404 라
    photo_sources 로 위키백과/위키데이터/TheSportsDB 까지 확인해 쓴다.
    """
    a = (ath or {}).get("athlete") or {}
    if sport == "soccer":
        name = a.get("displayName") or a.get("fullName") or ""
        if not name:
            return ""
        return photo_resolve(name, club=club, cache=cache).get("photo") or ""
    href = (a.get("headshot") or {}).get("href")
    if href:
        return href
    return NBA_HEADSHOT % a["id"] if a.get("id") else ""
KST = timezone(timedelta(hours=9))

SUM = {
    "basketball": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=%s",
    "soccer": "https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event=%s",
}
HDR = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def fetch(url):
    req = urllib.request.Request(url, headers=HDR)
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if attempt + 1 >= RETRIES:
                raise
            time.sleep(2 * (attempt + 1))


def game_spans(src):
    """data.js 안의 경기 객체(JSON) 위치를 찾는다. (start, end) 목록."""
    spans = []
    for m in re.finditer(r'\n        \{\n          "id": "', src):
        start = m.start() + 9
        depth = 0
        i = start
        in_str = False
        while i < len(src):
            ch = src[i]
            if in_str:
                if ch == "\\":
                    i += 2
                    continue
                if ch == '"':
                    in_str = False
            elif ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    spans.append((start, i + 1))
                    break
            i += 1
    return spans


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--started-only", action="store_true",
                    help="이미 시작 시각이 지난 경기만 확인한다(자동 갱신용, 요청 수를 줄인다)")
    ap.add_argument("--max-age-hours", type=float, default=12.0,
                    help="--started-only 일 때 시작한 지 이 시간이 넘은 경기는 건너뛴다")
    args = ap.parse_args()
    now_kst = datetime.now(KST)
    stale = 0

    src = open(DATA_JS, encoding="utf-8").read()
    spans = game_spans(src)
    out = []
    last = 0
    changed = 0
    pending = 0

    for (a, b) in spans:
        chunk = src[a:b]
        try:
            g = json.loads(chunk)
        except json.JSONDecodeError:
            out.append(src[last:b]); last = b
            continue
        out.append(src[last:a]); last = b
        status = g.get("status")
        eid = g.get("espnId")
        if status == "final" or not eid or g.get("sport") not in SUM:
            out.append(chunk)
            continue
        if args.started_only:
            try:
                kick = datetime.fromisoformat(g["start"])
            except (KeyError, ValueError):
                kick = None
            if kick is None or kick > now_kst + timedelta(minutes=15):
                out.append(chunk)
                continue
            if now_kst - kick > timedelta(hours=args.max_age_hours):
                stale += 1
                out.append(chunk)
                continue
        if g["sport"] == "soccer":
            lg = g.get("espnLeague") or {"EPL": "eng.1", "LALIGA": "esp.1",
                                         "UCL": "uefa.champions", "SERIEA": "ita.1",
                                         "BUNDES": "ger.1"}.get(g.get("league"), "eng.1")
            url = SUM["soccer"].format(league=lg) % eid
        else:
            url = SUM["basketball"] % eid
        try:
            d = fetch(url)
        except Exception as e:
            print("! %s 요청 실패: %s" % (g["id"], e))
            out.append(chunk)
            continue
        comp = ((d.get("header") or {}).get("competitions") or [{}])[0]
        st = (comp.get("status") or {}).get("type") or {}
        if st.get("state") != "post" and not st.get("completed"):
            out.append(chunk)
            pending += 1
            continue
        comps = {c.get("homeAway"): c for c in comp.get("competitors") or []}
        if "home" not in comps or "away" not in comps:
            out.append(chunk)
            continue

        def sc(c):
            v = c.get("score")
            return v.get("displayValue") if isinstance(v, dict) else v

        try:
            a_sc, h_sc = int(float(sc(comps["away"]))), int(float(sc(comps["home"])))
        except (TypeError, ValueError):
            out.append(chunk)
            continue
        g["status"] = "final"
        res = {"state": "final", "detail": st.get("detail") or st.get("shortDetail") or "",
               "awayScore": a_sc, "homeScore": h_sc}
        lines = {}
        for side in ("away", "home"):
            arr = [str(x.get("displayValue")) for x in (comps[side].get("linescores") or [])
                   if x.get("displayValue") is not None]
            if arr:
                lines[side] = arr
        if lines:
            res["lines"] = lines
        res["winner"] = "away" if a_sc > h_sc else ("home" if h_sc > a_sc else None)
        # 주요 선수 기록
        tops = []
        photo_cache = load_photo_cache() if g["sport"] == "soccer" else None
        for team in ((d.get("boxscore") or {}).get("players") or []):
            abbr = ((team.get("team") or {}).get("abbreviation")) or ""
            team_name = ((team.get("team") or {}).get("displayName")) or ""
            for stt in team.get("statistics") or []:
                labels = stt.get("labels") or []
                for ath in stt.get("athletes") or []:
                    stats = dict(zip(labels, ath.get("stats") or []))
                    try:
                        pts = int(float(stats.get("PTS") or 0))
                    except (TypeError, ValueError):
                        pts = 0
                    if pts <= 0:
                        continue
                    photo = _headshot(ath, g["sport"], team_name, photo_cache)
                    tops.append({"name": ((ath.get("athlete") or {}).get("displayName") or ""),
                                 "team": abbr, "min": stats.get("MIN"), "pts": pts,
                                 "reb": stats.get("REB"), "ast": stats.get("AST"),
                                 **({"photo": photo} if photo else {})})
        tops.sort(key=lambda x: x["pts"], reverse=True)
        if photo_cache is not None:
            save_photo_cache(photo_cache)
        if tops:
            res["top"] = tops[:6]
        # details 앞에 결과를 넣는다(키 순서 유지)
        g.pop("result", None)
        ordered = {}
        for k, v in g.items():
            if k == "details":
                ordered["result"] = res
            ordered[k] = v
        if "details" not in g:
            ordered["result"] = res
        g = ordered
        body = json.dumps(g, ensure_ascii=False, indent=2)
        body = "\n".join("        " + ln for ln in body.splitlines())
        out.append(body)
        changed += 1
        print("· %s → 종료 %d-%d (%s)" % (g["id"], a_sc, h_sc, res["detail"]))
        time.sleep(0.2)

    out.append(src[last:])
    new_src = "".join(out)
    if changed and args.write:
        new_src = re.sub(r'updatedAt:\s*"[^"]*"',
                         'updatedAt: "%s"' % datetime.now(KST).isoformat(timespec="seconds"),
                         new_src, count=1)
        open(DATA_JS, "w", encoding="utf-8").write(new_src)
        print("data.js 저장 완료 · %d경기 갱신 · 아직 안 끝난 %d경기" % (changed, pending))
    else:
        print("%d경기 갱신 대상 · 아직 안 끝난 %d경기 %s" % (
            changed, pending, "(미리보기, --write 로 저장)" if changed else ""))
        if stale:
            print("· 시작한 지 %g시간이 넘어 건너뛴 경기 %d건" % (args.max_age_hours, stale))


if __name__ == "__main__":
    main()
