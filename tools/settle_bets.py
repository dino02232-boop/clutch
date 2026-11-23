#!/usr/bin/env python3
"""Settle virtual CLUTCH parlays from final results in data.js using Admin SDK."""
import json
import os
import re
from datetime import datetime, timedelta, timezone

import firebase_admin
from firebase_admin import credentials, firestore

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))


def load_games():
    src = open(os.path.join(ROOT, "data.js"), encoding="utf-8").read()
    match = re.search(r"window\.CLUTCH_DATA\s*=\s*(\{.*?\})\s*;", src, re.S)
    if not match:
        raise RuntimeError("window.CLUTCH_DATA JSON not found")
    data = json.loads(match.group(1))
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
        if not picks or len({p.get("gameId") for p in picks}) != len(picks):
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
    main()
