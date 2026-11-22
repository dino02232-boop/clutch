#!/usr/bin/env python3
"""CLUTCH — 이미 끝난 축구 카드의 '이 경기 평점'을 팀별 전원으로 다시 채웁니다.

  python3 tools/backfill_ratings.py            # 미리보기(바뀌는 팀만 출력)
  python3 tools/backfill_ratings.py --write    # data.js 갱신

하는 일
  · data.js 의 끝난(status=final) 축구 경기 중 details.fotmobId 가 있는 것을 골라
    FotMob matchDetails(캐시 우선)의 라인업에서 performance.rating 이 있는 선수를
    details.teams[].players 에 **전원**(선발+후보) 평점 높은 순으로 다시 넣습니다.
  · 예전에는 상위 3명만 저장했기 때문에, 이미 만들어진 카드를 새 규칙으로 맞추는 용도입니다.
    앞으로 새로 끝나는 경기는 tools/fotmob_injuries.py 가 처음부터 전원을 넣습니다.
  · 평점이 없는 선수는 넣지 않습니다(값을 만들지 않음).
  · details.teams[].players 배열만 고치고 나머지 줄은 건드리지 않습니다.
"""

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fotmob_injuries import _details, _apply_ratings  # noqa: E402

ROOT = os.path.dirname(HERE)
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")


def obj_end(s, i):
    """i 위치의 '{' 에서 시작하는 JSON 객체의 끝 위치(문자열 인식)."""
    depth = 0
    in_str = False
    while i < len(s):
        c = s[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return -1


def game_spans(src):
    """data.js 안의 경기 객체 위치. {"id": ... 로 시작하는 객체를 전부 훑는다."""
    for m in re.finditer(r'\{\s*"id":\s*"', src):
        a = m.start()
        b = obj_end(src, a)
        if b < 0:
            continue
        try:
            g = json.loads(src[a:b])
        except ValueError:
            continue
        if isinstance(g, dict) and "sport" in g and "home" in g and "away" in g:
            yield a, b, g


def players_block(players, indent):
    """팀 블록 안의 "players": [...] 를 data.js 표기 그대로 만든다."""
    body = json.dumps({"players": players}, ensure_ascii=False, indent=2)
    lines = body.splitlines()[1:-1]          # 바깥 { } 두 줄 제거
    pad = " " * (indent - 2)                 # dump 는 2칸부터 시작
    return "\n".join(pad + ln for ln in lines)


def old_block_count(chunk, players):
    """지금 파일 표기(들여쓰기 16칸 기준)와 비교해 old 블록이 유일한지 확인."""
    old = players_block(players, 16)
    return chunk.count(old), old


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    src = open(DATA_JS, encoding="utf-8").read()
    out, last = [], 0
    changed_games = 0
    changed_teams = 0
    skipped = []

    for a, b, g in game_spans(src):
        chunk = src[a:b]
        if g.get("sport") != "soccer" or g.get("status") != "final":
            continue
        details = g.get("details") or {}
        match_id = details.get("fotmobId")
        if not match_id:
            skipped.append((g.get("id"), "fotmobId 없음"))
            continue
        try:
            det = _details(match_id, False)
        except Exception as e:                                  # noqa: BLE001
            skipped.append((g.get("id"), "FotMob 상세 실패: %s" % e))
            continue
        lineup = ((det.get("content") or {}).get("lineup")) or {}
        home_side, away_side = lineup.get("homeTeam"), lineup.get("awayTeam")
        if not isinstance(home_side, dict) or not isinstance(away_side, dict):
            skipped.append((g.get("id"), "라인업 없음"))
            continue
        swapped = bool(details.get("fotmobSwapped"))
        before = {t.get("side"): list(t.get("players") or [])
                  for t in details.get("teams") or [] if isinstance(t, dict)}
        filled = _apply_ratings(g, away_side if swapped else home_side,
                                home_side if swapped else away_side)
        if not filled:
            skipped.append((g.get("id"), "평점 없음"))
            continue

        new_chunk = chunk
        game_changed = False
        for team in (g.get("details") or {}).get("teams") or []:
            if not isinstance(team, dict):
                continue
            side = team.get("side")
            new_players = team.get("players") or []
            old_players = before.get(side) or []
            if new_players == old_players:
                continue
            cnt, old = old_block_count(new_chunk, old_players)
            if cnt != 1:
                skipped.append((g.get("id"), "%s팀 기존 players 블록을 찾지 못함(%d)" % (side, cnt)))
                continue
            new_chunk = new_chunk.replace(old, players_block(new_players, 16), 1)
            changed_teams += 1
            game_changed = True
            print("· %s %s: %d명 → %d명 (최고 %s %s, 최저 %s %s)" % (
                g.get("id"), team.get("name"), len(old_players), len(new_players),
                new_players[0]["name"] if new_players else "-",
                new_players[0]["rating"] if new_players else "-",
                new_players[-1]["name"] if new_players else "-",
                new_players[-1]["rating"] if new_players else "-"))
        if game_changed:
            changed_games += 1
        out.append(src[last:a])
        out.append(new_chunk)
        last = b

    out.append(src[last:])
    new_src = "".join(out)

    if args.write and changed_teams:
        open(DATA_JS, "w", encoding="utf-8").write(new_src)
        print("data.js 저장 완료 · %d경기 %d팀 갱신" % (changed_games, changed_teams))
    else:
        print("%d경기 %d팀 갱신 대상%s" % (
            changed_games, changed_teams, " (미리보기, --write 로 저장)" if changed_teams else ""))
    for gid, why in skipped:
        print("  - 건너뜀 %s: %s" % (gid, why))


if __name__ == "__main__":
    main()
