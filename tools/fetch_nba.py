#!/usr/bin/env python3
"""CLUTCH — NBA 실제 데이터 생성기

ESPN 공개 API(키 없음)에서 값을 받아 data.js 의 NBA-AUTO 구간을 다시 채웁니다.

  python3 work/fetch_nba.py --date 2026-11-19 --write      # data.js 갱신
  python3 work/fetch_nba.py --date 2026-11-19              # 결과만 표준출력
  python3 work/fetch_nba.py --date 2026-11-19 --write --refresh   # 캐시 무시하고 다시 받기

쓰는 ESPN 엔드포인트
  · scoreboard  site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD
      경기 목록·시작시각·경기장·팀 전적·시즌 평균(득점/리바운드/3점 성공률)
  · summary     site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={id}
      팀별 부상 명단(injuries), 최근 5경기(lastFiveGames), 매치업 예측(predictor),
      시즌 맞대결(seasonseries)

값은 모두 ESPN 이 준 그대로만 씁니다. 없으면 항목을 비우고, 지어내지 않습니다.
응답은 work/cache/ 에 저장해 두고 같은 실행 안에서 재사용합니다(--refresh 로 갱신).
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
SB = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={d}"
SUM = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={e}"
NBA_HEADSHOT = "https://a.espncdn.com/i/headshots/nba/players/full/%s.png"

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from odds_common import cache_at, implied as odds_implied, odds_of  # 배당(odds) 추출
import players as plmod  # 선수 시즌 스탯·직전 경기 기록
ROOT = os.path.dirname(HERE)
# CI(GitHub Actions)에서는 data.js 와 캐시 위치를 환경변수로 바꿔 씁니다.
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
CACHE = os.environ.get("CLUTCH_CACHE_DIR") or os.path.join(HERE, "cache")
# 자동 갱신은 실패를 줄이려고 네트워크 요청을 몇 번 다시 시도합니다.
RETRIES = int(os.environ.get("CLUTCH_RETRIES") or 3)

# ESPN 팀 약어 → 화면에 보이는 한글 팀 이름.
# (data.js 의 기존 경기 카드에서 쓰던 표기를 그대로 이어 씁니다.)
TEAM_KO = {
    "ATL": "애틀랜타 호크스", "BOS": "보스턴 셀틱스", "BKN": "브루클린 네츠",
    "CHA": "샬럿 호네츠", "CHI": "시카고 불스", "CLE": "클리블랜드 캐벌리어스",
    "DAL": "댈러스 매버릭스", "DEN": "덴버 너기츠", "DET": "디트로이트 피스턴스",
    "GS": "골든스테이트 워리어스", "GSW": "골든스테이트 워리어스", "HOU": "휴스턴 로키츠",
    "IND": "인디애나 페이서스", "LAC": "LA 클리퍼스", "LAL": "LA 레이커스",
    "MEM": "멤피스 그리즐리스", "MIA": "마이애미 히트", "MIL": "밀워키 벅스",
    "MIN": "미네소타 팀버울브스", "NO": "뉴올리언스 펠리컨스", "NOP": "뉴올리언스 펠리컨스",
    "NY": "뉴욕 닉스", "NYK": "뉴욕 닉스", "OKC": "오클라호마시티 썬더",
    "ORL": "올랜도 매직", "PHI": "필라델피아 세븐티식서스", "PHX": "피닉스 선즈",
    "POR": "포틀랜드 트레일블레이저스", "SAC": "새크라멘토 킹스", "SA": "샌안토니오 스퍼스",
    "SAS": "샌안토니오 스퍼스", "TOR": "토론토 랩터스", "UTA": "유타 재즈",
    "UTAH": "유타 재즈", "WAS": "워싱턴 위저즈", "WSH": "워싱턴 위저즈",
}


# ── HTTP ────────────────────────────────────────────────────────────
def get_json(url, cache_key, refresh=False):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, cache_key + ".json")
    if not refresh and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "application/json",
    })
    last = None
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode("utf-8")
            data = json.loads(raw)
            break
        except Exception as e:  # 일시적인 연결 끊김·타임아웃은 다시 시도
            last = e
            if attempt + 1 >= RETRIES:
                raise
            time.sleep(2 * (attempt + 1))
    else:  # pragma: no cover
        raise last
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


# ── 값 가공 ─────────────────────────────────────────────────────────
def ko(abbr, fallback):
    return TEAM_KO.get(abbr, fallback)


def num(v, digits=1):
    """'117.8' 같은 표시 문자열 → float. 값이 없으면 None."""
    if v is None:
        return None
    try:
        return round(float(str(v).replace("%", "").strip()), digits)
    except (TypeError, ValueError):
        return None


def rec_text(summary):
    """'11-4' → '11승 4패'"""
    if not summary or "-" not in str(summary):
        return None
    w, l = str(summary).split("-")[:2]
    return "%s승 %s패" % (w, l)


def shift_rec(summary, won):
    """끝난 경기의 결과를 빼서 '경기 전' 전적을 만든다. ('13-2', True) → '12-2'."""
    if not summary or "-" not in str(summary):
        return summary
    w, l = str(summary).split("-")[:2]
    try:
        w, l = int(w), int(l)
    except ValueError:
        return summary
    if won is True:
        w -= 1
    elif won is False:
        l -= 1
    return "%d-%d" % (max(w, 0), max(l, 0))


def record_of(competitor):
    out = {}
    for r in competitor.get("records") or []:
        out[r.get("type")] = r.get("summary")
    return out


def stat_of(competitor, name):
    for s in competitor.get("statistics") or []:
        if s.get("name") == name:
            return s.get("displayValue")
    return None


def fmt_score(team_score, opp_score, result):
    if team_score is None or opp_score is None:
        return None
    tag = {"W": "승", "L": "패", "T": "무"}.get(str(result or "").upper(), "")
    return "%s-%s %s" % (team_score, opp_score, tag) if tag else "%s-%s" % (team_score, opp_score)


def kst_date(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(KST).strftime("%Y-%m-%d")


def kst_hhmm(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(KST).strftime("%H:%M")


INJ_NOTE = {
    "OUT": "결장",
    "DOUBTFUL": "출전 불투명",
    "DAY-TO-DAY": "당일 체크",
    "QUESTIONABLE": "당일 체크",
    "PROBABLE": "출전 가능",
}


def inj_status(inj):
    t = (inj.get("type") or {})
    cand = (t.get("abbreviation") or inj.get("status") or "").strip().upper()
    if cand in ("O", "OUT"):
        return "OUT"
    if cand in ("DD", "DTD", "DAY-TO-DAY", "GTD"):
        return "DAY-TO-DAY"
    if cand in ("D", "DOUBTFUL"):
        return "DOUBTFUL"
    if cand in ("Q", "QUESTIONABLE"):
        return "DAY-TO-DAY"
    if cand in ("P", "PROBABLE"):
        return "DAY-TO-DAY"
    s = (inj.get("status") or "").strip().upper()
    return {"OUT": "OUT", "DAY-TO-DAY": "DAY-TO-DAY", "DOUBTFUL": "DOUBTFUL"}.get(s, s or "—")


def team_block(abbr_disp, name, side, competitor, summary, ps=None, by_team=None, ranks=None,
               exclude=None, won=None, final=False):
    """경기 카드 details.teams[] 의 한 팀."""
    tid = str(((competitor.get("team") or {}).get("id")) or "")
    recs = record_of(competitor)
    total_rec = shift_rec(recs.get("total"), won) if final else recs.get("total")
    venue_raw = shift_rec(recs.get("home" if side == "home" else "road"), won) if final else recs.get("home" if side == "home" else "road")
    venue_rec = rec_text(venue_raw)
    block = {
        "abbr": abbr_disp,
        "name": name,
        "side": side,
        "record": rec_text(total_rec),
        "venueRecord": (("홈 " if side == "home" else "원정 ") + venue_rec) if venue_rec else None,
        "last5": None,
        "lastGame": None,
        "ppg": num(stat_of(competitor, "avgPoints")),
        "rpg": num(stat_of(competitor, "avgRebounds")),
        "tp": num(stat_of(competitor, "threePointPct") or stat_of(competitor, "threePointFieldGoalPct")),
        "injuries": [],
    }
    if final:
        # 끝난 경기의 boxscore 통계는 그 경기 기록이라 시즌 평균으로 표시할 수 없다.
        block["ppg"] = block["rpg"] = block["tp"] = None
    if not block["record"]:
        del block["record"]
    if not block["venueRecord"]:
        del block["venueRecord"]
    for k in ("ppg", "rpg", "tp"):
        if block[k] is None:
            del block[k]

    last_lines = {}
    # 최근 5경기 / 직전 경기 / 최근 5경기 상세(상대·홈원정·스코어)
    got_l5 = False
    if summary:
        for t in summary.get("lastFiveGames") or []:
            team_obj = t.get("team") or {}
            if (team_obj.get("abbreviation") or "").upper() not in (abbr_disp.upper(), *ALIASES.get(abbr_disp.upper(), ())):
                continue
            evs = [e for e in (t.get("events") or []) if str(e.get("id")) != str(exclude or "")]
            wins = sum(1 for e in evs if str(e.get("gameResult", "")).upper() == "W")
            losses = sum(1 for e in evs if str(e.get("gameResult", "")).upper() == "L")
            if evs:
                block["last5"] = "%d승 %d패" % (wins, losses)
                last = evs[-1]
                me_home = str(last.get("homeTeamId")) == str(team_obj.get("id"))
                ts = last.get("homeTeamScore") if me_home else last.get("awayTeamScore")
                os_ = last.get("awayTeamScore") if me_home else last.get("homeTeamScore")
                block["lastGame"] = fmt_score(ts, os_, last.get("gameResult"))
                detail = []
                for e in evs:
                    mh = str(e.get("homeTeamId")) == str(team_obj.get("id"))
                    my = e.get("homeTeamScore") if mh else e.get("awayTeamScore")
                    op = e.get("awayTeamScore") if mh else e.get("homeTeamScore")
                    op_id = e.get("awayTeamId") if mh else e.get("homeTeamId")
                    op_ab = IDMAP.get(str(op_id), "")
                    try:
                        my_i, op_i = int(my), int(op)
                    except (TypeError, ValueError):
                        my_i = op_i = None
                    res = str(e.get("gameResult") or "").upper()
                    detail.append({
                        "date": (e.get("gameDate") or "")[:10],
                        "opp": ko(op_ab, op_ab) if op_ab else "상대 미상",
                        "ha": "홈" if mh else "원정",
                        "score": ("%d-%d" % (my_i, op_i)) if my_i is not None else (e.get("score") or ""),
                        "res": {"W": "승", "L": "패"}.get(res, res),
                    })
                detail.reverse()  # 최신이 앞
                block["_eventIds"] = [str(e.get("id") or "") for e in evs if e.get("id")]
                last_ev = str(last.get("id") or "")
                if last_ev:
                    block["_lastEvent"] = last_ev
                    last_lines = plmod.last_game_stats(last_ev)
                    gi = plmod.game_summary(last_ev)
                    if gi and gi.get("home") and gi.get("away"):
                        mine_home = abbr_disp.upper() in (
                            str(gi["home"]).upper(), *ALIASES.get(abbr_disp.upper(), ()))
                        my = gi["homeScore"] if mine_home else gi["awayScore"]
                        op = gi["awayScore"] if mine_home else gi["homeScore"]
                        op_ab = gi["away"] if mine_home else gi["home"]
                        my_ab = gi["home"] if mine_home else gi["away"]
                        try:
                            res = "승" if int(float(my)) > int(float(op)) else "패"
                        except (TypeError, ValueError):
                            res = ""
                        block["_lastInfo"] = {
                            "date": gi.get("date"),
                            "detail": gi.get("detail") or "",
                            "opp": ko(str(op_ab), str(op_ab)),
                            "my": my, "op": op, "res": res,
                            "top": [t for t in (gi.get("top") or []) if str(t.get("team")) == str(my_ab)][:2],
                        }
                block["last5Detail"] = detail
                seq = [d["res"] for d in detail]
                if seq:
                    head = seq[0]
                    n = 0
                    for x in seq:
                        if x == head:
                            n += 1
                        else:
                            break
                    if n >= 2 and head == "승":
                        block["streak"] = "%d연승" % n
                    elif n >= 2 and head == "패":
                        block["streak"] = "%d연패" % n
                got_l5 = True
            break

    # 끝난 경기는 summary 에 lastFiveGames 가 없다 → 팀 일정에서 직접 계산한다.
    if not got_l5 and tid:
        rows = [r for r in plmod.team_schedule(tid) if r["id"] != str(exclude or "")]
        rows = rows[:5]
        if rows:
            detail = []
            for r in rows:
                detail.append({
                    "date": r["date"],
                    "opp": ko(r["opp_ab"], r["opp"]) if r["opp_ab"] else (r["opp"] or "상대 미상"),
                    "ha": "홈" if r["ha"] == "home" else "원정",
                    "score": "%d-%d" % (r["myscore"], r["opscore"]),
                    "res": {"W": "승", "L": "패", "D": "무"}.get(r["res"], r["res"]),
                })
            block["last5Detail"] = detail
            w = sum(1 for d in detail if d["res"] == "승")
            l = sum(1 for d in detail if d["res"] == "패")
            block["last5"] = "%d승 %d패" % (w, l)
            block["lastGame"] = "%s %s" % (detail[0]["score"], detail[0]["res"])
            head = detail[0]["res"]
            n = 0
            for d in detail:
                if d["res"] == head:
                    n += 1
                else:
                    break
            if n >= 2 and head == "승":
                block["streak"] = "%d연승" % n
            elif n >= 2 and head == "패":
                block["streak"] = "%d연패" % n
            block["_eventIds"] = [r["id"] for r in rows]
            last_ev = rows[0]["id"]
            block["_lastEvent"] = last_ev
            last_lines = plmod.last_game_stats(last_ev)
            gi = plmod.game_summary(last_ev)
            if gi and gi.get("home") and gi.get("away"):
                mine_home = abbr_disp.upper() in (str(gi["home"]).upper(), *ALIASES.get(abbr_disp.upper(), ()))
                my = gi["homeScore"] if mine_home else gi["awayScore"]
                op = gi["awayScore"] if mine_home else gi["homeScore"]
                op_ab = gi["away"] if mine_home else gi["home"]
                my_ab = gi["home"] if mine_home else gi["away"]
                try:
                    res = "승" if int(float(my)) > int(float(op)) else "패"
                except (TypeError, ValueError):
                    res = ""
                block["_lastInfo"] = {
                    "date": gi.get("date"), "detail": gi.get("detail") or "",
                    "opp": ko(str(op_ab), str(op_ab)), "my": my, "op": op, "res": res,
                    "top": [t for t in (gi.get("top") or []) if str(t.get("team")) == str(my_ab)][:2],
                }

    # 부상 명단 — ESPN 배열에 있는 선수만. 팀 내 득점 순위·시즌 평균은 byathlete 로 계산한 값.
    tid = str(((competitor.get("team") or {}).get("id")) or "")
    if summary:
        for t in summary.get("injuries") or []:
            team_obj = t.get("team") or {}
            if (team_obj.get("abbreviation") or "").upper() not in (abbr_disp.upper(), *ALIASES.get(abbr_disp.upper(), ())):
                continue
            for inj in t.get("injuries") or []:
                ath = inj.get("athlete") or {}
                player = ath.get("fullName") or ath.get("displayName")
                if not player:
                    continue
                st = inj_status(inj)
                item = {"player": player, "status": st}
                if INJ_NOTE.get(st):
                    item["note"] = INJ_NOTE[st]
                pos = ((ath.get("position") or {}).get("abbreviation")) or ""
                if pos:
                    item["pos"] = pos
                item["_aid"] = str(ath.get("id") or "")
                pstat = (ps or {}).get(item["_aid"])
                if pstat:
                    rk = (ranks or {}).get((tid, str(ath.get("id"))))
                    bits = []
                    if rk:
                        bits.append("팀 내 %d옵션" % rk)
                    ppg, rpg = plmod.fmt1(pstat.get("ppg")), plmod.fmt1(pstat.get("rpg"))
                    if ppg is not None:
                        bits.append("%s점" % ppg)
                    if rpg is not None:
                        bits.append("%s리바운드" % rpg)
                    if bits:
                        item["line"] = " · ".join(bits)
                block.setdefault("injuries", []).append(item)
            break

    # 결장 인원 요약 — '결장 2명(팀 득점 2·3위)' / '결장 없음'
    ins = block.get("injuries") or []
    outs = [i for i in ins if i.get("status") == "OUT"]
    dtds = [i for i in ins if i.get("status") in ("DAY-TO-DAY", "DOUBTFUL")]

    def rk_list(lst):
        rr = []
        for i in lst:
            r = (ranks or {}).get((tid, i.get("_aid"))) if i.get("_aid") else None
            if r:
                rr.append(r)
        return rr

    if outs:
        rr = rk_list(outs)
        head = ("결장 %d명(팀 득점 %s위)" % (len(outs), "·".join(str(x) for x in sorted(rr)))
                if rr and len(rr) == len(outs) else "결장 %d명" % len(outs))
        if dtds:
            head += " · 출전 불투명 %d명" % len(dtds)
        block["injurySummary"] = head
    elif dtds:
        block["injurySummary"] = "결장 없음 · 출전 불투명 %d명" % len(dtds)
    else:
        block["injurySummary"] = "결장 없음"

    # 결장 선수 시즌 평균 득점 합계(계산 가능한 선수만)
    tot_ppg, n_ppg = 0.0, 0
    for i in outs:
        pstat = (ps or {}).get(i.get("_aid") or "")
        v = plmod.fmt1((pstat or {}).get("ppg"))
        if v is not None:
            tot_ppg += v
            n_ppg += 1
    if outs:
        block["injuryOut"] = len(outs)
        if n_ppg:
            block["injuryPpg"] = round(tot_ppg, 1)

    # 주요 선수 2~3명 — 시즌 평균 + 직전 경기 기록
    plist = []
    for aid in (by_team or {}).get(tid, [])[:3]:
        p = (ps or {}).get(aid)
        if not p:
            continue
        item = {"name": p.get("name") or "", "_aid": aid}
        if aid:  # 얼굴 사진 — ESPN CDN 경로(선수 id). 없으면 화면에서 이니셜로 대체한다.
            item["id"] = aid
            item["photo"] = NBA_HEADSHOT % aid
        if p.get("pos"):
            item["pos"] = p["pos"]
        line = plmod.line_of(p, with_fg=False)
        if line:
            item["stat"] = line
        fg, tp = plmod.fmt1(p.get("fg")), plmod.fmt1(p.get("tp"))
        sub = []
        if fg is not None:
            sub.append("야투 %s%%" % fg)
        if tp is not None:
            sub.append("3점 %s%%" % tp)
        rk = (ranks or {}).get((tid, aid))
        if rk:
            sub.append("팀 내 %d옵션" % rk)
        if sub:
            item["sub"] = " · ".join(sub)
        g = (last_lines or {}).get(aid)
        last = plmod.last_line_of(g)
        if last:
            item["last"] = "직전 " + last
        plist.append(item)
    if plist:
        rec = plmod.recent(block.get("_eventIds") or [])
        focus = []
        star = plist[0]
        r0 = rec.get(star.get("_aid") or "")
        if r0 and r0.get("gp"):
            seg = "최근 %d경기 %s의 평균은 %s점" % (r0["gp"], star["name"], r0["pts"])
            if r0.get("fgpct") is not None:
                seg += "·야투 %s%%" % r0["fgpct"]
            if r0.get("tppct") is not None:
                seg += "·3점 %s%%" % r0["tppct"]
            focus.append(seg + ("입니다." if "평균은" in seg else "를 기록했습니다."))
        if outs and n_ppg:
            focus.append("결장 %d명의 시즌 평균 득점 합계는 %s점입니다." % (len(outs), round(tot_ppg, 1)))
        elif outs:
            focus.append("결장 %d명이 명단에서 빠집니다." % len(outs))
        li = block.get("_lastInfo") or {}
        if li.get("top"):
            t0 = li["top"][0]
            seg = "직전 경기에서는 %s가 %s점" % (t0["name"], t0["pts"])
            if t0.get("reb"):
                seg += "·%s리바운드" % t0["reb"]
            if t0.get("ast"):
                seg += "·%s어시스트" % t0["ast"]
            focus.append(seg + ("입니다." if "평균은" in seg else "를 기록했습니다."))
        if plist[1:]:
            others = [p2["name"] for p2 in plist[1:3]]
            focus.append("이어서 %s가 뒤를 받칩니다." % ", ".join(others))
        if focus:
            block["focus"] = " ".join(focus[:3])
        for item in plist:
            aid = item.pop("_aid", None)
            r = rec.get(aid) if aid else None
            if not r or not r.get("gp"):
                continue
            bits = ["%s점" % r["pts"]]
            if r.get("fgpct") is not None:
                bits.append("야투 %s%%" % r["fgpct"])
            item["recent"] = "최근 %d경기 %s" % (r["gp"], " · ".join(bits))
        block["players"] = plist

    # 표시 순서: 알려진 항목을 앞에 두고 없는 항목은 빼 둔다
    for i in block.get("injuries") or []:
        i.pop("_aid", None)
    block.pop("_eventIds", None)
    block.pop("_lastEvent", None)
    order = ["abbr", "name", "side", "record", "venueRecord", "streak", "last5", "lastGame", "last5Detail",
             "ppg", "rpg", "tp", "players", "focus", "injurySummary", "injuryOut", "injuryPpg", "injuries",
             "_lastInfo"]
    return {k: block[k] for k in order if k in block}


ALIASES = {
    "GSW": ("GS",), "GS": ("GSW",), "NOP": ("NO",), "NO": ("NOP",),
    "NYK": ("NY",), "NY": ("NYK",), "SAS": ("SA",), "SA": ("SAS",),
    "WSH": ("WAS",), "WAS": ("WSH",), "UTA": ("UTAH",), "UTAH": ("UTA",),
}
DISP = {"GS": "GSW", "NO": "NOP", "NY": "NYK", "SA": "SAS", "WSH": "WAS", "UTA": "UTA"}

# ESPN 팀 id → 약어. scoreboard 응답에서 채운다(최근 5경기 상대 팀 이름에 쓴다).
IDMAP = {}

# 선수 시즌 스탯(byathlete) — 실행 시작 때 한 번 채운다.
PS = {}
BY_TEAM = {}
RANKS = {}


# ── 경기 카드 ───────────────────────────────────────────────────────
def josa(word, with_final, without_final):
    """받침 유무에 맞는 조사를 돌려준다. 예: josa("유타 재즈","은","는") → "는"."""
    w = str(word or "")
    if not w:
        return without_final
    ch = w[-1]
    if "가" <= ch <= "힣":
        return with_final if (ord(ch) - 0xAC00) % 28 else without_final
    return without_final


def inj_note(at_iso):
    """부상 명단을 ESPN 에서 실제로 받아온 시각을 문장으로."""
    stamp = "—"
    if at_iso:
        stamp = datetime.fromisoformat(at_iso).strftime("%Y-%m-%d %H:%M")
    return "출전 여부는 ESPN %s 기준이며 경기 전까지 변동될 수 있습니다." % stamp


def watch_text(home, away, h_ppg, a_ppg, h_rpg, a_rpg, h_tp, a_tp):
    """관전 포인트 문장 — 팀 이름과 홈/원정을 붙이고 홈 팀을 앞에 두어

    '113.7점 대 121.9점'처럼 숫자만 늘어놓아 어느 팀 값인지 알 수 없는 표현을 만들지 않는다.
    값이 모자라면 빈 문자열(관전 포인트를 넣지 않음).
    """
    def f(*vals):
        return all(isinstance(x, float) for x in vals)

    if f(h_ppg, a_ppg, h_rpg, a_rpg, h_tp, a_tp):
        diff = round(abs(a_ppg - h_ppg), 1)
        numbers = ("시즌 평균 득점은 **%s**(홈) %s점 · **%s**(원정) %s점, "
                   "평균 리바운드는 홈 %s개 · 원정 %s개, "
                   "3점 성공률은 홈 %s%% · 원정 %s%%"
                   % (home, h_ppg, away, a_ppg,
                      h_rpg, a_rpg, h_tp, a_tp))
        if diff >= 3:
            return "%s. 평균 득점 차 %s점이 실제 경기 템포로 이어지는지가 관전 포인트입니다." % (numbers, diff)
        tdiff = round(abs(h_tp - a_tp), 1)
        return "%s. 평균 득점 차가 %s점으로 작고, 3점 성공률 차 %s%%p가 외곽 승부를 가르는지가 관전 포인트입니다." % (numbers, diff, tdiff)
    if f(h_ppg, a_ppg):
        return "시즌 평균 득점은 **%s**(홈) %s점 · **%s**(원정) %s점입니다." % (home, h_ppg, away, a_ppg)
    return ""


def build_game(event, day):
    comp = event["competitions"][0]
    eid = event["id"]
    summary = get_json(SUM.format(e=eid), "summary-%s" % eid)
    # ESPN 이 이 경기에 실어 보낸 해외 배당(없으면 None → 화면은 "배당 정보 없음")을
    odds = odds_of(comp, event.get("_oddsAt"))
    if odds:
        imp = odds_implied(odds)
        if imp:
            odds["implied"] = imp
    inj_at = cache_at(CACHE, "summary-%s" % eid)

    sides = {}
    for c in comp["competitors"]:
        sides[c["homeAway"]] = c
    away_c, home_c = sides.get("away"), sides.get("home")
    if not away_c or not home_c:
        return None

    def disp(abbr):
        return DISP.get(abbr.upper(), abbr.upper())

    away_abbr = disp(away_c["team"].get("abbreviation", ""))
    home_abbr = disp(home_c["team"].get("abbreviation", ""))
    away_name = ko(away_abbr, away_c["team"].get("displayName", ""))
    home_name = ko(home_abbr, home_c["team"].get("displayName", ""))

    # 경기 상태 — pre / in / post
    st = (comp.get("status") or {}).get("type") or {}
    state = st.get("state") or "pre"
    finished = bool(st.get("completed")) or state == "post"

    def side_score(c):
        v = c.get("score")
        if isinstance(v, dict):
            v = v.get("displayValue")
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return None

    a_sc, h_sc = side_score(away_c), side_score(home_c)
    a_won = h_won = None
    if finished and a_sc is not None and h_sc is not None:
        a_won = a_sc > h_sc
        h_won = h_sc > a_sc

    away_b = team_block(away_abbr, away_name, "away", away_c, summary, PS, BY_TEAM, RANKS,
                        exclude=eid, won=a_won, final=finished)
    home_b = team_block(home_abbr, home_name, "home", home_c, summary, PS, BY_TEAM, RANKS,
                        exclude=eid, won=h_won, final=finished)

    def badge(b):
        vr = b.get("venueRecord")
        if not vr:
            return []
        return [{"text": vr, "tone": "hot" if " 0패" in vr else ""}]

    def team_json(b, name, abbr):
        o = {"name": name, "abbr": abbr}
        if b.get("record"):
            o["record"] = b["record"]
        o["badges"] = badge(b)
        return o

    out_it = [i for b in (away_b, home_b) for i in b.get("injuries", []) if i.get("status") == "OUT"]
    all_inj = [i for b in (away_b, home_b) for i in b.get("injuries", [])]
    ppg = [b.get("ppg") for b in (away_b, home_b)]
    rpg = [b.get("rpg") for b in (away_b, home_b)]
    tp = [b.get("tp") for b in (away_b, home_b)]

    tags = []
    if all_inj:
        tags.append({"text": "결장 %d명" % len(out_it) if out_it else "부상 %d명" % len(all_inj), "tone": "warn"})
    if all(isinstance(x, float) for x in ppg) and not finished:
        tags.append({"text": "평균 %s점 · %s점" % (ppg[0], ppg[1]), "tone": "info"})

    # 흐름 — 홈 팀을 앞에 두고 홈/원정 라벨을 붙인다(어느 팀 이야기인지 이름만으로도 분명하게).
    def flow_part(b, name, side):
        bits = []
        if b.get("record"):
            bits.append(b["record"])
        inner = []
        if b.get("venueRecord"):
            inner.append(b["venueRecord"])
        if b.get("last5"):
            inner.append("최근 5경기 " + b["last5"])
        if b.get("streak"):
            inner.append(b["streak"])
        s = "**%s**(%s) %s" % (name, "홈" if side == "home" else "원정", bits[0] if bits else "")
        if inner:
            s += "(" + ", ".join(inner) + ")"
        return s
    flow = "%s, %s." % (flow_part(home_b, home_name, "home"), flow_part(away_b, away_name, "away"))
    def last_sentence(b, name, abbr):
        li = b.get("_lastInfo") or {}
        if not li.get("my"):
            return ""
        when = (li.get("date") or "").replace("-", ".")[5:]
        parts = []
        for t in (li.get("top") or [])[:2]:
            seg = "%s %s점" % (t["name"], t["pts"])
            if t.get("reb"):
                seg += "·%s리바운드" % t["reb"]
            if t.get("ast"):
                seg += "·%s어시스트" % t["ast"]
            parts.append(seg)
        verb = {"승": "이겼고", "패": "졌고", "무": "비겼고"}.get(li.get("res") or "", "치렀고")
        s = "직전 경기(%s) **%s**%s %s에 %s-%s로 %s" % (
            when, name, josa(name, "은", "는"), li.get("opp") or "", li.get("my"), li.get("op"), verb)
        if parts:
            s += ", " + ", ".join(parts) + "를 기록했습니다."
        else:
            s += "."
        return (" " + s)

    flow += last_sentence(away_b, away_name, away_abbr)
    flow += last_sentence(home_b, home_name, home_abbr)

    # 부상 변수
    def inj_count(b):
        ins = b.get("injuries", [])
        if not ins:
            return None
        outs = [i for i in ins if i.get("status") == "OUT"]
        return ("%d명(결장 %d명)" % (len(ins), len(outs))) if outs else ("%d명" % len(ins))
    a_cnt, h_cnt = inj_count(away_b), inj_count(home_b)
    if a_cnt and h_cnt:
        inj_text = "%s %s, %s %s이 ESPN 부상 명단에 올라 있습니다. 양 팀 합쳐 %d명입니다." % (
            away_name, a_cnt, home_name, h_cnt, len(all_inj))
    elif a_cnt or h_cnt:
        named, cnt, other = (away_name, a_cnt, home_name) if a_cnt else (home_name, h_cnt, away_name)
        inj_text = "%s %s이 ESPN 부상 명단에 올라 있습니다. %s는 올라온 선수가 없습니다." % (named, cnt, other)
    else:
        inj_text = "양 팀 모두 ESPN 부상 명단에 올라온 선수가 없습니다."

    # 관전 포인트 — 실제 수치 차이만. 팀 이름과 홈/원정을 붙이고 홈 팀을 앞에 둔다.
    watch = watch_text(home_name, away_name, ppg[1], ppg[0], rpg[1], rpg[0], tp[1], tp[0])

    rows_text = []
    if odds and odds.get("implied"):
        imp = odds["implied"]
        p = []
        if imp.get("away") is not None:
            p.append("%s 승 %s%%" % (away_name, imp["away"]))
        if imp.get("home") is not None:
            p.append("%s 승 %s%%" % (home_name, imp["home"]))
        rows_text.append("해외 배당을 확률로 환산하면 " + " · ".join(p) + "입니다.")
    if watch:
        rows_text.append(watch)

    rows = [{"kind": "flow", "label": "흐름", "text": flow}]

    # 체크포인트 — 팀 블록과 겹치지 않는 새 정보만
    checks = list(rows_text)
    pred = summary.get("predictor") or {}
    home_pred = (pred.get("homeTeam") or {}).get("gameProjection")
    away_pred = (pred.get("awayTeam") or {}).get("gameProjection")
    try:
        if home_pred is not None and away_pred is not None:
            hp, ap = float(home_pred), float(away_pred)
            checks.append("**ESPN 매치업 예측** — %s 승률 %s%%, %s %s%%." % (away_name, ap, home_name, hp))
    except (TypeError, ValueError):
        pass

    for ser in summary.get("seasonseries") or []:
        if ser.get("type") != "season":
            continue
        score = (ser.get("seriesScore") or "").strip()
        total = ser.get("totalCompetitions")
        if score in ("0-0", ""):
            if total:
                checks.append("**시즌 맞대결** — 이번 시즌 첫 맞대결입니다. 정규시즌 %d경기 중 첫 경기입니다." % int(total))
            else:
                checks.append("**시즌 맞대결** — 이번 시즌 첫 맞대결입니다.")
        else:
            checks.append("**시즌 맞대결** — 이번 시즌 상대 전적 %s." % score)
        break

    start_iso = comp.get("date") or event.get("date")
    venue = (comp.get("venue") or {}).get("fullName")
    game = {
        "id": "nba-%s-%s-%s" % (away_abbr.lower(), home_abbr.lower(), day.replace("-", "")),
        "espnId": eid,
        "sport": "basketball",
        "league": "NBA",
        "source": "espn",
        "start": datetime.fromisoformat(start_iso.replace("Z", "+00:00")).astimezone(KST).isoformat(),
        "status": ("final" if finished else ("live" if state == "in" else "scheduled")),
        "venue": venue,
        **({"odds": odds} if odds else {}),
        "away": team_json(away_b, away_name, away_abbr),
        "home": team_json(home_b, home_name, home_abbr),
        "tags": tags,
        "rows": rows,
        "details": {
            "teams": [away_b, home_b],
            "checkpoints": checks,
            "note": inj_note(inj_at),
        },
    }
    if finished or state == "in":
        result = {
            "state": "final" if finished else "live",
            "detail": st.get("detail") or st.get("shortDetail") or "",
            "awayScore": a_sc, "homeScore": h_sc,
        }
        lines = {}
        for side, c in (("away", away_c), ("home", home_c)):
            arr = []
            for ls in c.get("linescores") or []:
                v = ls.get("displayValue")
                arr.append(str(v) if v is not None else "")
            if arr:
                lines[side] = arr
        if lines:
            result["lines"] = lines
        gi = plmod.game_summary(eid)
        if gi and gi.get("top"):
            result["top"] = gi["top"][:6]
        if finished:
            result["winner"] = "away" if (a_sc or 0) > (h_sc or 0) else ("home" if (h_sc or 0) > (a_sc or 0) else None)
        game["result"] = result
    if not game["venue"]:
        del game["venue"]
    if not tags:
        del game["tags"]
    for b in (away_b, home_b):
        b.pop("_lastInfo", None)
    order = ["id", "espnId", "sport", "league", "leagueFull", "source", "start", "status", "venue",
             "odds", "away", "home", "tags", "rows", "result", "details"]
    return {k: game[k] for k in order if k in game}


# ── data.js 갱신 ────────────────────────────────────────────────────
def marker(day, edge):
    return "/* NBA-AUTO %s %s */" % (day, edge)


WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"]


def weekday_ko(day):
    return WEEKDAY_KO[datetime.strptime(day, "%Y-%m-%d").weekday()]


def games_text(games, updated_at):
    """경기 카드들을 data.js 안에 넣을 JSON 텍스트로."""
    for g in games:
        # build_game 이 캐시를 받아온 실제 시각을 이미 넣었으면 그대로 쓴다.
        if not g["details"].get("note"):
            g["details"]["note"] = ("출전 여부는 ESPN %s 기준이며 경기 전까지 변동될 수 있습니다."
                                    % updated_at.strftime("%Y-%m-%d %H:%M"))
    lines = []
    for n, g in enumerate(games):
        txt = json.dumps(g, ensure_ascii=False, indent=2)
        txt = "\n".join("        " + ln for ln in txt.splitlines())
        lines.append(txt + ("," if n < len(games) - 1 else ""))
    return "\n".join(lines)


def auto_block(games, day, updated_at):
    return ("        %s\n%s\n        %s" % (marker(day, "START"),
                                            games_text(games, updated_at),
                                            marker(day, "END")))


def replace_block(src, day, games, updated_at):
    """이미 있는 NBA-AUTO 구간을 새 내용으로 바꾼다.

    구간은 없는데 그 날짜 블록은 있으면(축구만 있던 날 등) 그 날 games 배열 맨 앞에 넣는다.
    없는 날짜면 None → 새 날짜 블록을 만든다.
    """
    start_tag, end_tag = marker(day, "START"), marker(day, "END")
    i = src.find(start_tag)
    j = src.find(end_tag)
    if i < 0 or j < 0:
        anchor = '      date: "%s",\n      games: [\n' % day
        k = src.find(anchor)
        if k < 0:
            return None
        insert_at = k + len(anchor)
        return src[:insert_at] + auto_block(games, day, updated_at) + ",\n\n" + src[insert_at:]
    line_start = src.rfind("\n", 0, i) + 1  # 표식 줄의 들여쓰기부터 통째로 교체
    return src[:line_start] + auto_block(games, day, updated_at) + src[j + len(end_tag):]


def new_day_block(day, games, updated_at):
    """날짜 블록이 없을 때 새로 만든다(그 날짜는 NBA 경기만 있는 날)."""
    head = "    /* ── %s (%s) ─────────────────────────────────── */" % (day, weekday_ko(day))
    return ("%s\n    {\n      date: \"%s\",\n      games: [\n%s\n      ]\n    }"
            % (head, day, auto_block(games, day, updated_at)))


def insert_day(src, day, games, updated_at):
    """days 배열 안에서 날짜 순서에 맞는 자리에 새 날짜 블록을 넣는다."""
    head = "\n    /* ── %s (%s) ─────────────────────────────────── */" % (day, weekday_ko(day))
    block = "%s\n    {\n      date: \"%s\",\n      games: [\n%s\n      ]\n    }" % (
        head, day, auto_block(games, day, updated_at))
    # 각 날짜 블록의 시작 위치를 찾아 순서대로 비교
    marks = [m.start() for m in re.finditer(r'\n    /\* ── \d{4}-\d{2}-\d{2}', src)]
    for pos in marks:
        d = src[pos + 11:pos + 21]
        if d > day:
            return src[:pos] + "\n" + block + ",\n" + src[pos:]
    return append_day(src, day, games, updated_at)


def append_day(src, day, games, updated_at):
    """days 배열 맨 끝에 날짜 블록을 붙인다."""
    tail = "\n  ]\n};"
    k = src.rfind(tail)
    if k < 0:
        raise SystemExit("data.js 의 days 배열 끝을 찾지 못했습니다.")
    return src[:k] + ",\n\n" + new_day_block(day, games, updated_at) + src[k:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="브리핑 날짜(KST) YYYY-MM-DD 하나")
    ap.add_argument("--from", dest="dfrom", help="시작 날짜(KST) YYYY-MM-DD")
    ap.add_argument("--to", dest="dto", help="끝 날짜(KST) YYYY-MM-DD")
    ap.add_argument("--write", action="store_true", help="data.js 를 고친다")
    ap.add_argument("--refresh", action="store_true", help="캐시를 무시하고 ESPN 에서 다시 받는다")
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

    # ESPN 의 dates 는 미국 날짜다. KST 하루 전날 저녁(미국) 경기가 KST 당일 새벽·아침이 되므로
    # 하루 앞선 미국 날짜부터 받아 UTC 시각을 KST 로 바꾼 뒤 날짜별로 묶는다.
    us_dates = []
    d = d0 - timedelta(days=1)
    while d <= d1:
        us_dates.append(d.strftime("%Y%m%d"))
        d += timedelta(days=1)

    by_day = {day: [] for day in days}
    seen = set()
    for key in us_dates:
        sb = get_json(SB.format(d=key), "scoreboard-%s" % key, args.refresh)
        odds_at = cache_at(CACHE, "scoreboard-%s" % key)
        for ev in sb.get("events") or []:
            for c in (ev.get("competitions") or [{}])[0].get("competitors") or []:
                tm = c.get("team") or {}
                if tm.get("id") and tm.get("abbreviation"):
                    IDMAP[str(tm["id"])] = tm["abbreviation"]
            iso = (ev.get("competitions") or [{}])[0].get("date") or ev.get("date")
            if not iso or ev["id"] in seen:
                continue
            kday = kst_date(iso)
            if kday not in by_day:
                continue
            seen.add(ev["id"])
            ev["_oddsAt"] = odds_at
            by_day[kday].append(ev)

    global PS, BY_TEAM, RANKS
    try:
        PS = plmod.season(args.refresh)
        RANKS = plmod.team_ranks(PS)
        for aid, p in PS.items():
            if p.get("team_id"):
                BY_TEAM.setdefault(p["team_id"], []).append(aid)
        for tid in BY_TEAM:
            BY_TEAM[tid].sort(key=lambda a: (PS[a].get("ppg") or 0), reverse=True)
        print("· 선수 시즌 스탯 %d명 / %d팀" % (len(PS), len(BY_TEAM)))
    except Exception as e:
        print("! 선수 스탯을 받지 못했습니다: %s" % e)

    now = datetime.now(KST)
    built = {}
    for day in days:
        evs = sorted(by_day[day], key=lambda e: ((e["competitions"][0].get("date") or ""), e["id"]))
        built[day] = [g for g in (build_game(e, day) for e in evs) if g]

    if not args.write:
        for day in days:
            print("%s (%s) %d경기" % (day, weekday_ko(day), len(built[day])))
            for g in built[day]:
                print("   ", g["id"], g["away"]["abbr"], "@", g["home"]["abbr"],
                      g["start"][11:16])
        return

    with open(DATA_JS, "r", encoding="utf-8") as f:
        src = f.read()

    added = []
    for day in days:
        games = built[day]
        if not games:
            print("· %s — ESPN NBA 경기 없음, 날짜 블록을 만들지 않습니다" % day)
            continue
        out = replace_block(src, day, games, now)
        if out is None:
            src = insert_day(src, day, games, now)
            added.append(day)
        else:
            src = out
        print("· %s — %d경기 갱신" % (day, len(games)))

    src = re.sub(r'updatedAt:\s*"[^"]*"',
                 'updatedAt: "%s"' % now.isoformat(timespec="seconds"), src, count=1)
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write(src)
    print("data.js 저장 완료 (기준 %s KST)%s" % (
        now.strftime("%Y-%m-%d %H:%M"),
        (", 날짜 블록 추가: " + ", ".join(added)) if added else ""))


if __name__ == "__main__":
    main()
