#!/usr/bin/env python3
"""CLUTCH — 축구 부상·결장 명단 (FotMob 공개 엔드포인트)

FotMob 웹/앱이 쓰는 공개 JSON 엔드포인트에서 경기별 '출전 불가 선수(unavailable)'를
받아 data.js 축구 경기 카드의 details.teams[].injuries / injurySummary / injuryNote 를
채웁니다. 키·회원가입·결제 없이 접근합니다(비공식 엔드포인트).

  · 경기 목록  https://www.fotmob.com/api/data/matches?date=YYYYMMDD
  · 경기 상세  https://www.fotmob.com/api/data/matchDetails?matchId=...
               content.lineup.{homeTeam,awayTeam}.unavailable[]
               → { name, unavailability: { type, expectedReturn, injuryId } }
               type: "injury" | "suspension" | "internationalDuty"

ESPN 축구 응답에는 결장 명단이 없어서(빈 배열) 일정·전적은 ESPN, 결장은 FotMob 으로
나눠 받습니다. 두 소스의 경기는 킥오프 시각(UTC)·리그·팀 이름으로 짝지웁니다.

원칙
  · 출처에 없는 값은 만들지 않습니다. 결장 명단이 비어 있으면 "결장 없음",
    경기를 못 찾으면 "FotMob 에서 이 경기를 찾지 못함"처럼 사실만 적습니다.
  · expectedReturn 은 확인된 표현만 한국어로 옮기고, 모르는 표현은 원문을 그대로 둡니다.
  · 비공식 엔드포인트라 예고 없이 막히거나 바뀔 수 있습니다. 실패해도 생성 자체를
    막지 않고, 그 사실을 note 에 남깁니다.

tools/fetch_soccer.py 가 경기를 만든 뒤 annotate() 를 호출합니다.
"""

import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timedelta
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fetch_nba import KST, get_json  # noqa: E402  (공용 캐시·재시도 유틸)

FOTMOB_DATE = "https://www.fotmob.com/api/data/matches?date=%s"
FOTMOB_MATCH = "https://www.fotmob.com/api/data/matchDetails?matchId=%s"

# 사이트가 다루는 리그만 쓴다.  키: FotMob league id, 값: ESPN 리그 코드
FM_LEAGUES = {
    47: "eng.1",
    87: "esp.1",
    55: "ita.1",
    1000005083: "ger.1",
    943230: "uefa.champions",
}
ESPN_TO_FM = {v: k for k, v in FM_LEAGUES.items()}
# 사이트 카드의 짧은 리그 표기 → ESPN 리그 코드
SHORT_TO_ESPN = {
    "EPL": "eng.1",
    "LALIGA": "esp.1",
    "SERIEA": "ita.1",
    "BUNDES": "ger.1",
    "UCL": "uefa.champions",
}

SOURCE_NAME = "FotMob"
REQUEST_GAP = float(os.environ.get("CLUTCH_FOTMOB_GAP") or 0.25)
# fetch_soccer.build_team() 이 관전 포인트에 넣는 문장. 명단을 채우면 이 문장을 실제 값으로 바꾼다.
BASE_FOCUS = "결장 명단은 경기 전 확정 발표로 확인해야 합니다."

# ── 팀 이름 짝짓기 ─────────────────────────────────────────────────
# ESPN 영문 표기와 FotMob 표기가 다른 팀만 정규화 결과 기준으로 적어 둔다.
ALIASES = {
    "cologne": "koln",
    "bayern munich": "bayern munchen",
    "internazionale": "inter",
    "hamburg": "hamburger",
    "alaves": "deportivo alaves",
    "mainz": "mainz 05",
    "celta vigo": "celta de vigo",
    "athletic bilbao": "athletic club",
    "sporting": "sporting cp",
    "eindhoven": "psv",
}
DROP_TOKENS = {"fc", "cf", "afc", "sc", "ac", "as", "club", "de", "the", "1", "04", "05", "07",
               "1899", "sv", "vfl", "vfb", "fk", "tsg"}


def _norm(name):
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return " ".join(t for t in s.split() if t not in DROP_TOKENS)


def _key(name):
    n = _norm(name)
    return ALIASES.get(n, n)


def _sim(a, b):
    ka, kb = _key(a), _key(b)
    if not ka or not kb:
        return 0.0
    if ka == kb:
        return 1.0
    ratio = SequenceMatcher(None, ka, kb).ratio()
    ta, tb = set(ka.split()), set(kb.split())
    jac = len(ta & tb) / max(1, len(ta | tb))
    return max(ratio, jac)


# ── 복귀 시점 표기 변환 ────────────────────────────────────────────
MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}
PLAIN = {"복귀 시점 미정", "시즌 아웃", "훈련 복귀"}


def _ko_eta(raw):
    """FotMob expectedReturn 문구 → 한국어. 확인한 표현만 옮기고 나머지는 원문 유지."""
    if not raw:
        return None
    s = str(raw).strip()
    low = s.lower()
    if low == "unknown":
        return "복귀 시점 미정"
    if low == "doubtful":
        return "출전 불투명"
    if low == "back in training":
        return "훈련 복귀"
    if low == "out for season":
        return "시즌 아웃"
    if low == "a few days":
        return "며칠"
    if low == "a few weeks":
        return "몇 주"
    m = re.match(r"^(early|mid|late|end of)\s+([a-z]+)\s+(\d{4})$", low)
    if m and m.group(2) in MONTHS:
        part, month, year = m.groups()
        tail = {"early": "초", "mid": "중순", "late": "말", "end of": "말"}[part]
        return "%s년 %d월 %s" % (year, MONTHS[month], tail)
    m = re.match(r"^about\s+(?:(\d+)(?:\s*[-~]\s*(\d+))?|a)\s+(week|weeks|month|months|day|days)$", low)
    if m:
        a, b, unit = m.groups()
        span = "1" if a is None else (a if not b else "%s~%s" % (a, b))
        unit_ko = "주" if unit.startswith("week") else ("개월" if unit.startswith("month") else "일")
        return "약 %s%s" % (span, unit_ko)
    return s


def _line_for(typ, eta):
    """결장 사유 + 복귀 시점 → 카드에 보여 줄 한 줄."""
    if typ == "internationalduty":
        return "대표팀 차출"
    reason = "징계 출장정지" if typ == "suspension" else ""
    if not eta or eta == "출전 불투명":
        # 출전 불투명은 status 칩(DOUBTFUL)이 이미 말해 준다.
        return reason or None
    if eta in PLAIN:
        when = eta
    else:
        when = "복귀 예상 " + eta
    return (reason + " · " + when) if reason else when


def _players(side):
    """FotMob 팀 lineup → [{player, status, line}] (중복 이름 제거)."""
    rows, seen = [], set()
    for u in (side or {}).get("unavailable") or []:
        name = (u.get("name") or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        un = u.get("unavailability") or {}
        typ = str(un.get("type") or "").lower()
        eta = _ko_eta(un.get("expectedReturn"))
        status = "DOUBTFUL" if (typ == "injury" and eta == "출전 불투명") else "OUT"
        row = {"player": name, "status": status}
        line = _line_for(typ, eta)
        if line:
            row["line"] = line
        rows.append(row)
    return rows


def _summary(rows):
    outs = sum(1 for r in rows if r["status"] == "OUT")
    doubt = sum(1 for r in rows if r["status"] == "DOUBTFUL")
    if outs and doubt:
        return "결장 %d명 · 불확실 %d명" % (outs, doubt)
    if outs:
        return "결장 %d명" % outs
    if doubt:
        return "출전 불확실 %d명" % doubt
    return None


# ── FotMob 경기 목록 ───────────────────────────────────────────────
def _utc_date(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(KST).date()


def _date_list(ymd, refresh):
    data = get_json(FOTMOB_DATE % ymd, "fotmob-date-%s" % ymd, refresh)
    out = []
    for lg in data.get("leagues") or []:
        if lg.get("id") not in FM_LEAGUES:
            continue
        for m in lg.get("matches") or []:
            utc = (m.get("status") or {}).get("utcTime")
            if not utc:
                continue
            out.append({
                "id": m.get("id"),
                "league": lg.get("id"),
                "utc": datetime.fromisoformat(utc.replace("Z", "+00:00")),
                "home": ((m.get("home") or {}).get("name") or ""),
                "away": ((m.get("away") or {}).get("name") or ""),
                "finished": bool((m.get("status") or {}).get("finished")),
            })
    return out


def _pick(game, candidates):
    """킥오프 ±15분 안의 후보 중 양 팀 이름이 가장 잘 맞는 경기."""
    start = datetime.fromisoformat(game["start"].replace("Z", "+00:00"))
    en = game.get("_en") or {}
    best, best_score = None, 0.0
    for m in candidates:
        if abs((m["utc"] - start).total_seconds()) > 15 * 60:
            continue
        score = min(_sim(en.get("home", ""), m["home"]), _sim(en.get("away", ""), m["away"]))
        if score > best_score:
            best, best_score = m, score
    if best and best_score < 0.55:
        return None, best_score
    return best, best_score


def _details(match_id, refresh):
    return get_json(FOTMOB_MATCH % match_id, "fotmob-match-%s" % match_id, refresh)


# ── 카드에 반영 ────────────────────────────────────────────────────
def _note(kind, stamp):
    if kind == "no-match":
        return "%s에서 이 경기를 찾지 못해 결장 명단이 없습니다." % SOURCE_NAME
    if kind == "no-lineup":
        return "%s에 이 경기 결장 명단이 아직 없습니다." % SOURCE_NAME
    return "결장 명단을 확인하지 못했습니다(%s 응답 없음)." % SOURCE_NAME


# ── 선수 평점 (FotMob 0~10) ───────────────────────────────────────
# 이름 유사도가 이 값 이상일 때만 같은 선수로 본다. 확신이 안 되면 비워 둔다.
RATING_MATCH = 0.86


def _rating_map(side):
    """FotMob 라인업 한 팀 → {선수 이름: 이 경기 평점}. 평점 없는 선수는 넣지 않는다."""
    out = {}
    for group in ("starters", "subs"):
        for p in (side or {}).get(group) or []:
            rating = (p.get("performance") or {}).get("rating")
            if rating is None:
                continue
            try:
                rating = round(float(rating), 1)
            except (TypeError, ValueError):
                continue
            if not 0 < rating <= 10:
                continue
            name = (p.get("name") or "").strip()
            if name:
                out[name] = rating
    return out


def _apply_ratings(game, home_side, away_side):
    """이 경기 평점을 카드에 붙인다. 붙인 선수 수를 돌려준다.

    · details.keyPlayers 가 있으면 그 선수(ESPN 시즌 기록으로 뽑힌 주요 선수)에 rating 만 붙인다.
      이름이 충분히 비슷하지 않으면 그 선수는 그대로 두고 평점을 만들지 않는다.
    · 끝난 경기는 ESPN 에 시즌 리더가 없어 keyPlayers 가 빈 경우가 많다. 그때는 팀 블록의
      '주요 선수' 자리에 FotMob 이 경기 평점 상위 선수 3명을 넣는다(평점이 확인된 선수만).
    """
    details = game.get("details") or {}
    maps = {"home": _rating_map(home_side), "away": _rating_map(away_side)}
    if not maps["home"] and not maps["away"]:
        return 0

    groups = details.get("keyPlayers") or []
    if groups:
        filled = 0
        for group in groups:
            side = "home" if group.get("side") == "home" else "away"
            table = maps[side]
            if not table:
                continue
            for p in group.get("players") or []:
                name = (p.get("name") or "").strip()
                if not name:
                    continue
                best_name, best_score = None, 0.0
                for cand in table:
                    score = _sim(name, cand)
                    if score > best_score:
                        best_name, best_score = cand, score
                if best_name is not None and best_score >= RATING_MATCH:
                    p["rating"] = table[best_name]
                    filled += 1
        return filled

    teams = {t.get("side"): t for t in details.get("teams") or [] if isinstance(t, dict)}
    filled = 0
    for side in ("home", "away"):
        team, table = teams.get(side), maps[side]
        if not team or not table:
            continue
        top = sorted(table.items(), key=lambda kv: kv[1], reverse=True)[:3]
        team["players"] = [{"name": name, "rating": rating} for name, rating in top]
        filled += len(top)
    return filled


def add_ratings(game, refresh=False):
    """이미 끝난 경기의 평점을 details.fotmobId 로 받아 붙인다(결과 갱신 워크플로용)."""
    details = game.get("details") or {}
    match_id = details.get("fotmobId")
    if not match_id:
        return 0
    det = _details(match_id, refresh)
    lineup = ((det.get("content") or {}).get("lineup")) or {}
    home_side, away_side = lineup.get("homeTeam"), lineup.get("awayTeam")
    if not isinstance(home_side, dict) or not isinstance(away_side, dict):
        return 0
    swapped = bool(details.get("fotmobSwapped"))
    return _apply_ratings(game, away_side if swapped else home_side,
                          home_side if swapped else away_side)


def _apply(game, home_rows, away_rows, stamp, kind):
    """경기 카드의 두 팀 블록에 결장 명단을 넣는다."""
    teams = (game.get("details") or {}).get("teams") or []
    by_side = {t.get("side"): t for t in teams if isinstance(t, dict)}
    total_outs = 0
    for side, rows in (("home", home_rows), ("away", away_rows)):
        team = by_side.get(side)
        if not team:
            continue
        total_outs += sum(1 for r in rows if r["status"] == "OUT")
        team["injuries"] = rows
        if rows:
            summary = _summary(rows)
            if summary:
                team["injurySummary"] = summary
            team["injuryNote"] = "%s 결장 명단(%s) 기준입니다." % (SOURCE_NAME, stamp)
        else:
            team.pop("injurySummary", None)
            team["injuryNote"] = ("%s 결장 명단에 올라온 선수가 없습니다." % SOURCE_NAME
                                  if kind == "ok" else _note(kind, stamp))

        # 관전 포인트의 '결장 명단은 확정 발표로' 문장을 실제 결과로 바꾼다.
        focus = team.get("focus")
        if kind == "ok" and isinstance(focus, str) and BASE_FOCUS in focus:
            outs = sum(1 for r in rows if r["status"] == "OUT")
            repl = ("%s 기준 결장 %d명입니다." % (SOURCE_NAME, outs)) if outs \
                else ("%s 결장 명단에 올라온 선수가 없습니다." % SOURCE_NAME)
            team["focus"] = focus.replace(BASE_FOCUS, repl)

    if total_outs:
        tags = game.setdefault("tags", [])
        if not any(str(t.get("text", "")).startswith("결장") for t in tags):
            tags.append({"text": "결장 %d명" % total_outs, "tone": "warn"})

    # 경기 상세 note 의 'ESPN 에 결장 정보 없음' 문장을 출처 표기로 바꾼다.
    details = game.get("details") or {}
    note = details.get("note")
    if kind == "ok" and isinstance(note, str):
        details["note"] = note.replace(
            "부상·결장 정보는 ESPN 축구 데이터에 없습니다.",
            "부상·결장 명단과 선수 평점은 %s %s 기준입니다." % (SOURCE_NAME, stamp))


def annotate(games, refresh=False, verbose=True):
    """경기 카드 목록에 FotMob 결장 명단을 채운다. 실패해도 예외를 밖으로 던지지 않는다."""
    stats = {"total": 0, "matched": 0, "ok": 0, "empty": 0, "no_match": 0, "failed": 0, "rated": 0}
    targets = [g for g in games if g.get("sport") == "soccer" and g.get("_en")]
    stats["total"] = len(targets)
    if not targets:
        return stats
    stamp = datetime.now(KST).strftime("%Y-%m-%d %H:%M")

    dates = set()
    for g in targets:
        d = _utc_date(g["start"])
        for k in (-1, 0, 1):
            dates.add((d + timedelta(days=k)).strftime("%Y%m%d"))

    by_league, seen = {}, set()
    for ymd in sorted(dates):
        try:
            items = _date_list(ymd, refresh)
        except Exception as e:  # 목록을 못 받으면 그 날짜만 건너뛴다
            if verbose:
                print("  ! FotMob %s 목록 실패: %s" % (ymd, e))
            continue
        for m in items:
            if m["id"] in seen:
                continue
            seen.add(m["id"])
            by_league.setdefault(m["league"], []).append(m)
        time.sleep(REQUEST_GAP)

    if not by_league:
        for g in targets:
            _apply(g, [], [], stamp, "failed")
            stats["failed"] += 1
        return stats

    for g in targets:
        league = ESPN_TO_FM.get(SHORT_TO_ESPN.get(g.get("league", ""), ""))
        cands = by_league.get(league) or []
        match, _score = _pick(g, cands)
        if not match:
            _apply(g, [], [], stamp, "no-match")
            stats["no_match"] += 1
            continue
        stats["matched"] += 1
        try:
            det = _details(match["id"], refresh)
        except Exception as e:
            if verbose:
                print("  ! FotMob %s 상세 실패: %s" % (match["id"], e))
            _apply(g, [], [], stamp, "failed")
            stats["failed"] += 1
            continue
        time.sleep(REQUEST_GAP)

        lineup = ((det.get("content") or {}).get("lineup")) or {}
        home_side, away_side = lineup.get("homeTeam"), lineup.get("awayTeam")
        if not isinstance(home_side, dict) or not isinstance(away_side, dict):
            _apply(g, [], [], stamp, "no-lineup")
            continue

        # FotMob 기준 홈/원정이 ESPN 과 뒤집혔는지 확인
        en = g.get("_en") or {}
        swapped = _sim(en.get("home", ""), home_side.get("name", "")) < \
            _sim(en.get("home", ""), away_side.get("name", ""))
        rows_home = _players(away_side if swapped else home_side)
        rows_away = _players(home_side if swapped else away_side)

        if rows_home or rows_away:
            stats["ok"] += 1
        else:
            stats["empty"] += 1
        _apply(g, rows_home, rows_away, stamp, "ok")

        # 다음 결과 갱신에서도 같은 FotMob 경기를 찾을 수 있게 id 를 남긴다.
        details = g.get("details") or {}
        details["fotmobId"] = match["id"]
        details["fotmobSwapped"] = swapped
        # 평점은 끝난 경기에서만 붙인다(진행 중 평점은 경기가 끝나면서 바뀐다).
        if match.get("finished"):
            stats["rated"] += _apply_ratings(
                g, away_side if swapped else home_side, home_side if swapped else away_side)
    return stats
