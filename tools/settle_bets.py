#!/usr/bin/env python3
"""Settle virtual CLUTCH parlays from final results in data.js using Admin SDK."""
import json
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


def settle_pick(pick, game, bet_created):
    """Return (win/loss/push) after validating the submitted selection against data.js."""
    odds = game.get("odds") or {}
    market, side, line = pick.get("market"), pick.get("pick"), str(pick.get("line") or "")
    if game.get("result", {}).get("state") != "final":
        return None
    start = datetime.fromisoformat(game["start"])
    if bet_created and bet_created >= start:
        raise ValueError("bet was created after fixture start")
    result = game["result"]
    away, home = float(result["awayScore"]), float(result["homeScore"])
    if market == "moneyline":
        source = odds.get("moneyline") or {}
        if side not in ("away", "home", "draw") or source.get(side) is None:
            raise ValueError("invalid moneyline selection")
        american = source[side]
        if away == home:
            outcome = "win" if side == "draw" else ("loss" if source.get("draw") is not None else "push")
        else:
            outcome = "win" if (side == "away") == (away > home) else "loss"
    elif market == "spread":
        source = odds.get("spread") or {}
        if side not in ("away", "home") or source.get(side) is None or str(source.get(side + "Line")) != line:
            raise ValueError("invalid spread selection")
        american = source[side]
        handicap = float(line)
        margin = (home + handicap - away) if side == "home" else (away + handicap - home)
        outcome = "push" if margin == 0 else ("win" if margin > 0 else "loss")
    elif market == "total":
        source = odds.get("total") or {}
        if side not in ("over", "under") or source.get(side) is None or str(source.get("line")) != line:
            raise ValueError("invalid total selection")
        american = source[side]
        total, threshold = away + home, float(line)
        outcome = "push" if total == threshold else ("win" if (side == "over") == (total > threshold) else "loss")
    else:
        raise ValueError("invalid market")
    if abs(float(pick.get("decimal", 0)) - decimal(american)) > 0.005 or float(pick.get("odds", 0)) != float(american):
        raise ValueError("selection odds do not match data.js")
    return outcome


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
    changed = 0
    for doc in db.collection_group("items").where("status", "==", "open").stream():
        bet = doc.to_dict()
        picks = bet.get("picks") or []
        # 같은 경기의 다른 마켓(승무패·핸디·언오버)은 한 슬립에 함께 담을 수 있다.
        # 막을 것은 gameId+market+pick 이 완전히 같은 중복 leg 뿐이다.
        leg_keys = {(p.get("gameId"), p.get("market"), p.get("pick"), str(p.get("line") or "")) for p in picks}
        if not picks or len(leg_keys) != len(picks):
            continue
        try:
            created = bet.get("createdAt")
            outcomes = [settle_pick(p, games[p["gameId"]], created) for p in picks]
        except (KeyError, TypeError, ValueError):
            # Do not pay malformed or forged client documents.
            continue
        if any(o is None for o in outcomes):
            continue
        lost = "loss" in outcomes
        mult = 1.0
        if not lost:
            for pick, outcome in zip(picks, outcomes):
                mult *= 1.0 if outcome == "push" else decimal(pick["odds"])
        payout = 0 if lost else int(bet["stake"] * mult)
        status = "lost" if lost else ("push" if all(o == "push" for o in outcomes) else "won")
        user_ref = db.collection("users").document(bet["uid"])

        @firestore.transactional
        def finalize(transaction):
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
    print(f"settled={changed} ranked={len(totals)}")


if __name__ == "__main__":
    if "--verify" in sys.argv:
        # Firestore 쓰기 없이 data.js 파싱만 확인한다 (tools/settle_bets.py --verify).
        games = load_games()
        finals = sum(1 for g in games.values() if (g.get("result") or {}).get("state") == "final")
        print(f"games={len(games)} finals={finals}")
    else:
        main()
