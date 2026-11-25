#!/usr/bin/env python3
"""Settle virtual CLUTCH parlays from final results in data.js using Admin SDK."""
import json
import math
import os
import re
import sys
from datetime import datetime, timedelta, timezone

# firebase_admin 은 실제 정산(main)에서만 쓴다 — load_games 만 확인할 때는 필요 없다.

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))


def _object_literal(src, start):
    """start 위치의 '{' 에서 짝이 맞는 '}' 까지를 잘라 낸다.

    문자열과 주석 안의 중괄호는 세지 않는다. data.js 는 JS 객체 리터럴이라
    안에 '};' 처럼 보이는 문자열이 있어도 여기서는 안전하다.
    """
    depth = 0
    i = start
    quote = None
    n = len(src)
    while i < n:
        c = src[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == "/" and src[i + 1:i + 2] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        elif c == "/" and src[i + 1:i + 2] == "//":
            j = src.find("\n", i + 2)
            i = n if j < 0 else j
            continue
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[start:i + 1]
        i += 1
    raise RuntimeError("window.CLUTCH_DATA object literal is not closed")


def _js_to_json(src):
    """JS 객체 리터럴을 JSON 으로 바꾼다.

    data.js 는 거의 JSON 이지만 최상위 키가 따옴표 없이(`version: 1,`) 적혀 있고
    `/* 자동 갱신 */` 주석이 섞여 있다. 문자열 안은 건드리지 않고 키와 주석만 정리한다.
    """
    out = []
    i = 0
    n = len(src)
    expect_key = False          # '{' 나 ',' 바로 뒤 = 키가 올 수 있는 자리
    while i < n:
        c = src[i]
        if c == "/" and src[i + 1:i + 2] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c == "/" and src[i + 1:i + 2] == "//":
            j = src.find("\n", i + 2)
            i = n if j < 0 else j
            continue
        if c in "\"'":
            q = c
            j = i + 1
            buf = [c]
            while j < n:
                ch = src[j]
                if ch == "\\":
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                buf.append(ch)
                j += 1
                if ch == q:
                    break
            text = "".join(buf)
            if q == "'":              # JS 작은따옴표 문자열 → JSON 큰따옴표
                inner = text[1:-1].replace("\\'", "'").replace('"', '\\"')
                text = '"' + inner + '"'
            out.append(text)
            i = j
            expect_key = False
            continue
        if c in "{,":
            out.append(c)
            i += 1
            expect_key = True
            continue
        if c in "[:":
            out.append(c)
            i += 1
            expect_key = False
            continue
        if expect_key and (c.isalpha() or c in "_$"):
            j = i
            while j < n and (src[j].isalnum() or src[j] in "_$"):
                j += 1
            word = src[i:j]
            k = j
            while k < n and src[k] in " \t\r\n":
                k += 1
            if k < n and src[k] == ":":
                out.append('"' + word + '"')
                i = j
                expect_key = False
                continue
            out.append(word)                      # true / false / null
            i = j
            expect_key = False
            continue
        out.append(c)
        if c not in " \t\r\n":
            expect_key = False
        i += 1
    return "".join(out)


def load_games():
    """data.js 의 window.CLUTCH_DATA 를 읽어 경기 id → 경기 사전을 돌려준다.

    data.js 는 JSON 이 아니라 JS 객체 리터럴이라 json.loads 로는 늘 실패했다
    (`version: 1,`). 먼저 그대로 JSON 으로 시도하고, 실패하면 키를 따옴표로
    바꾸고 주석을 지운 뒤 다시 읽는다.
    """
    path = os.path.join(ROOT, "data.js")
    with open(path, encoding="utf-8") as f:
        src = f.read()
    # 파일 위쪽 설명 주석에도 'window.CLUTCH_DATA' 와 '{' 가 나오므로,
    # 실제 대입문(`window.CLUTCH_DATA = {`)을 찾는다.
    found = re.search(r"window\.CLUTCH_DATA\s*=\s*\{", src)
    if not found:
        raise RuntimeError("window.CLUTCH_DATA assignment not found in data.js")
    literal = _object_literal(src, found.end() - 1)
    try:
        data = json.loads(literal)
    except json.JSONDecodeError:
        data = json.loads(_js_to_json(literal))
    return {g["id"]: g for day in data.get("days", []) for g in day.get("games", [])}


def decimal(american):
    a = float(american)
    return 1 + (a / 100 if a > 0 else 100 / abs(a))


# 픽에 적힌 마켓과 그 마켓에서 고를 수 있는 선택지. 여기 없는 값은 위조로 보고 정산하지 않는다.
PICK_SIDES = {"moneyline": ("away", "home", "draw"), "spread": ("away", "home"), "total": ("over", "under")}
MIN_DECIMAL, MAX_DECIMAL = 1.01, 100.0     # 소수 배당으로 바꿨을 때 받아 줄 범위
DRAWABLE_SPORTS = ("soccer",)               # 무승부가 있는 종목(승무패가 3지선다)


def _number(value):
    """숫자 하나를 float 로. bool·문자열 숫자가 아닌 값은 ValueError."""
    if isinstance(value, bool) or value is None:
        raise ValueError("number expected")
    try:
        n = float(value)
    except (TypeError, ValueError):
        raise ValueError("number expected")
    if not math.isfinite(n):
        raise ValueError("number expected")
    return n


def american_decimal(american):
    """미국식 배당을 검증하고 소수 배당으로 돌려준다.

    0 은 배당이 아니고, |100| 보다 작은 값은 미국식 표기가 아니다(예: +99, -50).
    소수로 바꾼 값이 1.01~100.0 을 벗어나면 위조로 본다.
    """
    a = _number(american)
    if a == 0 or abs(a) < 100:
        raise ValueError("invalid american odds")
    d = decimal(a)
    if not (MIN_DECIMAL <= d <= MAX_DECIMAL):
        raise ValueError("odds out of range")
    return d


def parse_line(value):
    """핸디캡·언오버 기준점('-1.5', '+1.5', '2.5', 2.5)을 float 로."""
    text = str(value if value is not None else "").strip().replace("\u2212", "-")
    if not text:
        raise ValueError("missing line")
    try:
        line = float(text.lstrip("+"))
    except (TypeError, ValueError):
        raise ValueError("invalid line")
    if not math.isfinite(line) or abs(line) > 1000:
        raise ValueError("invalid line")
    return line


def draw_available(game):
    """그 경기의 승무패에 무승부가 있는지(data.js 배당이 내려가도 종목으로 판단)."""
    odds = game.get("odds")
    ml = odds.get("moneyline") if isinstance(odds, dict) else None
    if isinstance(ml, dict) and ml.get("draw") is not None:
        return True
    return str(game.get("sport") or "").lower() in DRAWABLE_SPORTS


def settle_pick(pick, game, bet_created):
    """한 픽의 결과(win/loss/push)를 돌려준다. 경기가 아직 끝나지 않았으면 None.

    정산은 **베팅할 때 저장한 선택(마켓·선택지·기준점·배당)** 으로 한다. 경기가 끝나면
    ESPN 이 data.js 의 odds 를 내리고(None), 경기 전에도 배당·기준점이 움직이므로
    지금 data.js 의 배당과 같은지로 정산 여부를 가르면 베팅이 영원히 'open' 에 남는다.
    대신 마켓·선택지·기준점·미국식 배당·소수 배당의 형식을 검증해, 위조·손상된 문서만 건너뛴다.
    """
    if not isinstance(pick, dict) or not isinstance(game, dict):
        raise ValueError("invalid pick")
    result = game.get("result") or {}
    if result.get("state") != "final":
        return None

    start = datetime.fromisoformat(str(game["start"]))
    if bet_created is None:
        raise ValueError("bet has no createdAt")
    if bet_created >= start:
        raise ValueError("bet was created after fixture start")

    market, side = pick.get("market"), pick.get("pick")
    if market not in PICK_SIDES:
        raise ValueError("invalid market")
    if side not in PICK_SIDES[market]:
        raise ValueError("invalid selection")

    # 저장된 미국식 배당과 소수 배당이 서로 맞는지(클라이언트는 소수 4자리로 적는다).
    expected = american_decimal(pick.get("odds"))
    claimed = _number(pick.get("decimal"))
    if abs(claimed - expected) > max(0.02, expected * 0.01):
        raise ValueError("selection decimal does not match odds")

    away, home = _number(result["awayScore"]), _number(result["homeScore"])
    if market == "moneyline":
        if away == home:
            if side == "draw":
                outcome = "win"
            else:
                outcome = "loss" if draw_available(game) else "push"
        elif side == "draw":
            outcome = "loss"
        else:
            outcome = "win" if (side == "away") == (away > home) else "loss"
    elif market == "spread":
        line = parse_line(pick.get("line"))
        margin = (home + line - away) if side == "home" else (away + line - home)
        outcome = "push" if abs(margin) < 1e-9 else ("win" if margin > 0 else "loss")
    else:  # total
        line = parse_line(pick.get("line"))
        total = away + home
        outcome = "push" if abs(total - line) < 1e-9 else ("win" if (side == "over") == (total > line) else "loss")
    return outcome


def settle_bet(picks, games, created, stake):
    """슬립 하나를 정산한다. (status, payout) 또는 아직 기다려야 하면 None.

    다폴에서 한 leg 라도 미적중이 확정되면 다른 경기가 아직 안 끝났어도 바로 lost 다
    (그 슬립은 더 볼 것 없이 획득 0). 반대로 아직 끝나지 않은 경기가 있고 미적중이
    없으면 결과를 기다린다.
    """
    if not isinstance(picks, list) or not picks:
        return None
    if not all(isinstance(p, dict) for p in picks):
        return None            # 손상된 픽 목록은 정산하지 않는다
    leg_keys = {(p.get("gameId"), p.get("market"), p.get("pick"), str(p.get("line") or "")) for p in picks}
    if len(leg_keys) != len(picks):
        return None            # 완전히 같은 leg 를 두 번 담은 문서는 정산하지 않는다
    outcomes = [settle_pick(p, games[p["gameId"]], created) for p in picks]
    if "loss" in outcomes:
        return "lost", 0
    if any(o is None for o in outcomes):
        return None
    mult = 1.0
    for pick, outcome in zip(picks, outcomes):
        mult *= 1.0 if outcome == "push" else decimal(pick["odds"])
    payout = int(stake * mult)
    status = "push" if all(o == "push" for o in outcomes) else "won"
    return status, payout


def kst_week_start(now):
    local = now.astimezone(KST)
    monday = (local - timedelta(days=local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return monday


def main():
    import firebase_admin
    from firebase_admin import credentials, firestore

    service_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not service_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT secret is required")
    cred = credentials.Certificate(json.loads(service_json))
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {"projectId": "versus-3f808"})
    db = firestore.client()
    games = load_games()
    now = datetime.now(timezone.utc)
    changed = 0      # 이번에 정산한 슬립 수
    waiting = 0      # 아직 안 끝난 경기가 있어 결과를 기다리는 슬립 수
    unverified = 0   # 형식이 맞지 않아 정산하지 않은(위조·손상 의심) 슬립 수
    for doc in db.collection_group("items").where("status", "==", "open").stream():
        bet = doc.to_dict()
        picks = bet.get("picks") or []
        # 같은 경기의 다른 마켓(승무패·핸디·언오버)은 한 슬립에 함께 담을 수 있다.
        # 막을 것은 gameId+market+pick 이 완전히 같은 중복 leg 뿐이다(settle_bet 안에서 확인).
        stake, uid = bet.get("stake"), bet.get("uid")
        if not isinstance(uid, str) or not uid:
            continue
        if not isinstance(stake, int) or isinstance(stake, bool) or stake < 0:
            continue
        try:
            settled = settle_bet(picks, games, bet.get("createdAt"), stake)
        except (KeyError, TypeError, ValueError):
            # Do not pay malformed or forged client documents.
            unverified += 1
            continue
        if settled is None:
            waiting += 1
            continue
        status, payout = settled
        user_ref = db.collection("users").document(uid)

        @firestore.transactional
        def finalize(transaction, doc=doc, user_ref=user_ref, status=status, payout=payout):
            current = doc.reference.get(transaction=transaction)
            if not current.exists or current.get("status") != "open":
                return False
            transaction.update(doc.reference, {"status": status, "payout": payout, "settledAt": firestore.SERVER_TIMESTAMP})
            if payout:
                transaction.update(user_ref, {"points": firestore.Increment(payout)})
            return True

        if finalize(db.transaction()):
            changed += 1

    # Rebuild ranking stats from settled records to keep weekly profit current.
    week_start = kst_week_start(now)
    totals = {}
    for doc in db.collection_group("items").stream():
        b = doc.to_dict()
        if b.get("status") not in ("won", "lost", "push"):
            continue
        uid = b.get("uid")
        if not uid:
            continue
        t = totals.setdefault(uid, {"profit": 0, "week": 0, "won": 0, "settled": 0, "max": 0.0})
        profit = int(b.get("payout", 0)) - int(b.get("stake", 0))
        t["profit"] += profit
        t["settled"] += 1
        t["won"] += 1 if b.get("status") == "won" else 0
        t["max"] = max(t["max"], float(b.get("combinedOdds", 0)))
        settled_at = b.get("settledAt")
        if settled_at and settled_at.astimezone(KST) >= week_start:
            t["week"] += profit
    for uid, stats in totals.items():
        db.collection("users").document(uid).set({
            "totalProfit": stats["profit"], "weekProfit": stats["week"],
            "winRate": round(100 * stats["won"] / stats["settled"], 2) if stats["settled"] else 0,
            "maxOdds": round(stats["max"], 4),
        }, merge=True)
    # 값은 개수뿐이다(uid·픽·금액은 로그에 남기지 않는다). open 이 남았는지 이 줄로 확인한다.
    print(f"settled={changed} ranked={len(totals)} waiting={waiting} unverified={unverified}")


if __name__ == "__main__":
    if "--verify" in sys.argv:
        # Firestore 쓰기 없이 data.js 파싱만 확인한다 (tools/settle_bets.py --verify).
        games = load_games()
        finals = sum(1 for g in games.values() if (g.get("result") or {}).get("state") == "final")
        print(f"games={len(games)} finals={finals}")
    else:
        main()
