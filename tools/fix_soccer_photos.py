#!/usr/bin/env python3
"""CLUTCH — data.js 축구 선수 사진 보완 (기존 경기 카드용)

  python3 tools/fix_soccer_photos.py            # 미리보기(바뀔 선수 수만)
  python3 tools/fix_soccer_photos.py --write    # data.js 반영

하는 일
  · 축구 경기의 details.keyPlayers[].players[] 와 result.top[] 을 훑어
    photo 필드만 확인된 얼굴 URL 로 채웁니다.
  · 사진을 못 찾으면 photo 키를 뺍니다(화면은 이니셜 원). 죽은 ESPN URL 을 남기지 않습니다.
  · 다른 필드는 절대 건드리지 않습니다 — photo 키를 뺀 사본끼리 깊은 비교로 확인합니다.

사진 출처 우선순위는 photo_sources.py 참고(ESPN → 위키백과 → 위키데이터 → TheSportsDB).
결과는 tools/cache/player_photos.json 캐시에 남아 다음 실행·자동 갱신에서 재사용됩니다.
"""

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from photo_sources import club_for, club_map, load_cache, resolve, save_cache  # noqa: E402

DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
GAME_START = re.compile(r'\n[ \t]*\{\n[ \t]*"id": "')


def game_spans(src):
    """data.js 안의 경기 객체(JSON) 위치. refresh_results.py 와 같은 규칙."""
    spans = []
    for m in GAME_START.finditer(src):
        start = src.index("{", m.start())
        depth, i, in_str = 0, start, False
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


def _with_photo(item, photo):
    """photo 키만 갈아 끼운 새 dict(키 순서는 name, id, photo, ... 유지)."""
    out = {}
    for k, v in item.items():
        if k == "photo":
            continue
        out[k] = v
        if k == "id" or (k == "team" and "id" not in item):
            if photo:
                out["photo"] = photo
    if photo and "photo" not in out:
        out["photo"] = photo
    return out


def strip_photo(obj):
    """비교용: 모든 photo 키를 뺀 사본."""
    if isinstance(obj, dict):
        return {k: strip_photo(v) for k, v in obj.items() if k != "photo"}
    if isinstance(obj, list):
        return [strip_photo(v) for v in obj]
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--refresh", action="store_true", help="캐시를 무시하고 다시 조회")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    src = open(DATA_JS, encoding="utf-8").read()
    spans = game_spans(src)
    cache = load_cache()
    clubs = club_map()

    out, last = [], 0
    games = changed_games = changed_players = 0
    lost_photo = 0
    by_src = {}
    problems = []

    for (a, b) in spans:
        chunk = src[a:b]
        out.append(src[last:a])
        last = b
        try:
            g = json.loads(chunk)
        except json.JSONDecodeError:
            out.append(chunk)
            continue
        games += 1
        if g.get("sport") != "soccer":
            out.append(chunk)
            continue

        det = g.get("details") or {}
        touched = False
        for blk in det.get("keyPlayers") or []:
            club = club_for(blk.get("team") or "", clubs)
            players = blk.get("players") or []
            for idx, p in enumerate(players):
                name = p.get("name") or ""
                if not name:
                    continue
                espn = p.get("photo") or ""
                r = resolve(name, espn_photo=espn if "espncdn.com" in espn else "",
                            club=club, cache=cache, refresh=args.refresh, quiet=args.quiet)
                want = r.get("photo") or ""
                if want == (p.get("photo") or ""):
                    continue
                if not want:
                    lost_photo += 1
                players[idx] = _with_photo(p, want)
                changed_players += 1
                touched = True
                by_src[r.get("src") or "none"] = by_src.get(r.get("src") or "none", 0) + 1
                if not args.quiet:
                    print("  · %-26s %-10s %s" % (name, r.get("src"), (want or "(이니셜)")[:70]))
        for p in (g.get("result") or {}).get("top") or []:
            name = p.get("name") or ""
            if not name:
                continue
            club = club_for(p.get("team") or "", clubs) or club_for(
                (g.get("home") or {}).get("name") or "", clubs)
            r = resolve(name, espn_photo=(p.get("photo") or "") if "espncdn.com" in (p.get("photo") or "") else "",
                        club=club, cache=cache, refresh=args.refresh, quiet=args.quiet)
            want = r.get("photo") or ""
            if want == (p.get("photo") or ""):
                continue
            players_idx = (g["result"]["top"]).index(p)
            g["result"]["top"][players_idx] = _with_photo(p, want)
            changed_players += 1
            touched = True

        if touched:
            if strip_photo(g) != strip_photo(json.loads(chunk)):
                problems.append(g.get("id"))
                out.append(chunk)
                continue
            changed_games += 1
            body = json.dumps(g, ensure_ascii=False, indent=2)
            out.append("\n".join("        " + ln for ln in body.splitlines()))
        else:
            out.append(chunk)

    out.append(src[last:])
    new_src = "".join(out)
    save_cache(cache)

    print("경기 %d건 · 사진 바뀐 선수 %d명 · 바뀐 경기 카드 %d개 · 사진 없음으로 바뀐 항목 %d"
          % (games, changed_players, changed_games, lost_photo))
    print("출처별:", ", ".join("%s %d" % (k, v) for k, v in sorted(by_src.items())))
    if problems:
        print("! photo 외 값이 달라진 경기:", ", ".join(problems))

    if args.write and problems:
        print("! 검증 실패 — 저장하지 않습니다")
        return 1
    if args.write:
        open(DATA_JS, "w", encoding="utf-8").write(new_src)
        print("data.js 저장 완료")
    else:
        print("(미리보기 — --write 로 저장)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
