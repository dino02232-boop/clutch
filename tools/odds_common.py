#!/usr/bin/env python3
"""CLUTCH — ESPN 배당(odds) 추출 도우미

fetch_nba.py / fetch_soccer.py 가 함께 씁니다.

ESPN scoreboard 응답의 competitions[0].odds[0] 에는 배당사(provider) 한 곳의
머니라인·핸디캡(스프레드)·총점(오버언더)이 들어 있습니다.
값은 ESPN 이 준 그대로만 옮기고, 없는 항목은 키를 빼서 화면에서 생략되게 합니다.

  moneyline : 미국식 배당(+164, -197). 무승부는 축구에만 있습니다.
  spread    : 홈/원정 핸디캡 줄과 그 배당
  total     : 총점 줄과 오버/언더 배당

ESPN 은 배당사에 따라 다른 스키마를 줍니다. DraftKings 는 moneyline/pointSpread/total
구조이고, Bet365 는 awayTeamOdds/homeTeamOdds/drawOdds 에 소수 배당(decimal)을 value 로
줍니다. 그 경우에는 value 를 미국식으로 환산해 머니라인으로 옮깁니다.
"""

import json
import os
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))


def _num(v):
    """'+164' → 164, '-197' → -197, 'EVEN' → 100. 값이 없으면 None."""
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    if s.upper() in ("EVEN", "EV"):
        return 100
    try:
        return int(round(float(s)))
    except ValueError:
        return None


def _line(v):
    """'-4.5' → '-4.5', 'o3.5' → '3.5', 3.5 → '3.5'."""
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    if s[0] in "oOuU":
        s = s[1:]
    return s


def _am_from_decimal(v):
    """소수 배당 → 미국식 배당. 4.5 → +350, 1.667 → -150, 4.2 → +320.

    소수 2.00 이상은 (dec-1)*100, 2.00 미만은 -100/(dec-1) 을 반올림합니다.
    1.00 이하(값이 될 수 없는 배당)는 None.
    """
    try:
        d = float(v)
    except (TypeError, ValueError):
        return None
    if d <= 1.0:
        return None
    if d >= 2.0:
        return int(round((d - 1) * 100))
    return -int(round(100.0 / (d - 1)))


def _side(sec, key):
    """{close:{odds,line}, open:{...}} 에서 close 우선, 없으면 open."""
    if not isinstance(sec, dict):
        return None, None
    for pick in ("close", "open"):
        part = sec.get(pick)
        if isinstance(part, dict):
            return part.get(key), part
    return None, None


def odds_of(comp, at_iso=None):
    """competition dict → 화면에 넣을 odds dict (없으면 None)."""
    odds_list = comp.get("odds") or []
    if not odds_list:
        return None
    o = odds_list[0] or {}
    prov = o.get("provider") or {}
    provider = prov.get("displayName") or prov.get("name")

    out = {}
    if provider:
        out["provider"] = provider
    if at_iso:
        out["at"] = at_iso

    # ── 머니라인 ──────────────────────────────────────────
    ml = o.get("moneyline") or {}
    home_ml = _num(_side(ml.get("home"), "odds")[0])
    away_ml = _num(_side(ml.get("away"), "odds")[0])
    draw_ml = _num(_side(ml.get("draw"), "odds")[0])
    if draw_ml is None:
        draw_ml = _num((o.get("drawOdds") or {}).get("moneyLine"))
    if all(v is None for v in (away_ml, draw_ml, home_ml)):
        # Bet365 스키마 — awayTeamOdds/homeTeamOdds/drawOdds 의 value 는 소수 배당
        away_ml = _am_from_decimal((o.get("awayTeamOdds") or {}).get("value"))
        home_ml = _am_from_decimal((o.get("homeTeamOdds") or {}).get("value"))
        draw_ml = _am_from_decimal((o.get("drawOdds") or {}).get("value"))
    if any(v is not None for v in (away_ml, draw_ml, home_ml)):
        out["moneyline"] = {"away": away_ml, "draw": draw_ml, "home": home_ml}

    # ── 핸디캡(스프레드) ─────────────────────────────────
    ps = o.get("pointSpread") or {}
    h_line, _ = _side(ps.get("home"), "line")
    a_line, _ = _side(ps.get("away"), "line")
    h_odds = _num(_side(ps.get("home"), "odds")[0])
    a_odds = _num(_side(ps.get("away"), "odds")[0])
    if h_line is not None or a_line is not None:
        out["spread"] = {
            "homeLine": _line(h_line),
            "awayLine": _line(a_line),
            "home": h_odds,
            "away": a_odds,
        }

    # ── 총점(오버언더) ───────────────────────────────────
    tot = o.get("total") or {}
    o_line, _ = _side(tot.get("over"), "line")
    u_line, _ = _side(tot.get("under"), "line")
    o_odds = _num(_side(tot.get("over"), "odds")[0])
    u_odds = _num(_side(tot.get("under"), "odds")[0])
    line = o.get("overUnder")
    if line is None:
        line = _line(o_line) or _line(u_line)
    else:
        line = _line(line)
    if line is not None or o_odds is not None or u_odds is not None:
        out["total"] = {"line": line, "over": o_odds, "under": u_odds}

    if "moneyline" not in out and "spread" not in out and "total" not in out:
        return None
    return out


def cache_at(cache_dir, cache_key):
    """캐시 파일을 실제로 받아온 시각(KST ISO). 파일이 없으면 None."""
    path = os.path.join(cache_dir, cache_key + ".json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            head = f.read(200)
        # 캐시는 json.dump 로 저장했으므로 파일 안에 시각은 없다 → 파일 수정 시각을 쓴다.
        _ = head
    except OSError:
        return None
    return datetime.fromtimestamp(os.path.getmtime(path), KST).isoformat(timespec="seconds")


def decimal(ml):
    """미국식 배당 → 소수 배당 (예: +150 → 2.50, -120 → 1.83)."""
    try:
        n = int(ml)
    except (TypeError, ValueError):
        return None
    if n > 0:
        return round(n / 100.0 + 1, 2)
    if n < 0:
        return round(100.0 / abs(n) + 1, 2)
    return None


def implied(od):
    """소수 배당 → 내재 확률(%). 배당사 마진을 걷어내도록 합이 100%가 되게 정규화한다."""
    ml = (od or {}).get("moneyline") or {}
    decs = {k: decimal(ml.get(k)) for k in ("away", "draw", "home")}
    probs = {k: 1.0 / v for k, v in decs.items() if v}
    tot = sum(probs.values())
    if not tot:
        return None
    return {k: round(v / tot * 100, 1) for k, v in probs.items()}


def describe(od):
    """터미널 확인용 짧은 문자열."""
    if not od:
        return "-"
    def am(v):
        return "—" if v is None else ("+%d" % v if v > 0 else "%d" % v)
    ml = od.get("moneyline") or {}
    sp = od.get("spread") or {}
    tt = od.get("total") or {}
    parts = [od.get("provider") or "?"]
    if ml:
        parts.append("ML 원정 %s / 무 %s / 홈 %s" % (am(ml.get("away")), am(ml.get("draw")), am(ml.get("home"))))
    if sp:
        parts.append("핸디캡 %s/%s" % (sp.get("homeLine"), sp.get("awayLine")))
    if tt:
        parts.append("총점 %s (%s/%s)" % (tt.get("line"), am(tt.get("over")), am(tt.get("under"))))
    return " · ".join(parts)


if __name__ == "__main__":
    import sys
    for p in sys.argv[1:]:
        d = json.load(open(p, encoding="utf-8"))
        for ev in (d.get("events") or [])[:20]:
            comp = (ev.get("competitions") or [{}])[0]
            print(ev.get("id"), ev.get("name"), "→", describe(odds_of(comp)))

def pickcenter_odds(summary, at_iso=None):
    """NBA summary 의 pickcenter → 화면용 odds dict (없으면 None).

    NBA scoreboard 에는 odds 가 실리지 않고 summary.pickcenter 에만 있어서
    (Draft Kings: moneyLine / spread / overUnder / overOdds / underOdds) 그걸 옮긴다.
    """
    pc = summary.get("pickcenter") or []
    if not pc:
        return None
    o = pc[0] or {}
    prov = o.get("provider") or {}
    provider = prov.get("displayName") or prov.get("name")
    away = o.get("awayTeamOdds") or {}
    home = o.get("homeTeamOdds") or {}

    out = {}
    if provider:
        out["provider"] = provider
    if at_iso:
        out["at"] = at_iso

    a_ml = _num(away.get("moneyLine"))
    h_ml = _num(home.get("moneyLine"))
    if a_ml is not None or h_ml is not None:
        out["moneyline"] = {"away": a_ml, "draw": None, "home": h_ml}

    mag = None
    if o.get("spread") is not None:
        try:
            mag = abs(float(o.get("spread")))
        except (TypeError, ValueError):
            mag = None
    if mag:
        line = "%g" % mag
        if away.get("favorite"):
            a_line, h_line = "-" + line, "+" + line
        elif home.get("favorite"):
            a_line, h_line = "+" + line, "-" + line
        else:
            a_line = h_line = None
        if a_line:
            out["spread"] = {
                "homeLine": h_line,
                "awayLine": a_line,
                "home": _num(home.get("spreadOdds")),
                "away": _num(away.get("spreadOdds")),
            }

    if o.get("overUnder") is not None:
        try:
            line = "%g" % float(o.get("overUnder"))
        except (TypeError, ValueError):
            line = None
        if line:
            out["total"] = {
                "line": line,
                "over": _num(o.get("overOdds")),
                "under": _num(o.get("underOdds")),
            }

    return out or None
