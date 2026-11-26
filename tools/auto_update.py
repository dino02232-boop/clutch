#!/usr/bin/env python3
"""CLUTCH — data.js 자동 갱신 오케스트레이터 (GitHub Actions 용)

  python3 tools/auto_update.py --mode results   # 30분마다: 끝난 경기 결과·상태 반영 + 순위표 갱신
  python3 tools/auto_update.py --mode daily     # 하루 1회: 오늘~+6일 경기 블록 재생성 + 오래된 날짜 정리

동작 방식
  · 스포츠(농구·축구·배구)별로 '임시 사본'에 먼저 써 보고, 경기 수가 줄었거나 결과 파일이
    깨졌으면 그 스포츠의 갱신을 버립니다. 그래서 한 소스(ESPN/KOVO)가 잠깐 실패해도
    사이트에 있던 경기가 사라지지 않습니다.
  · results 모드에서는 순위표(standings-data.js)도 fetch_standings.py 로 다시 받습니다.
    순위는 경기 결과에 따라 바뀌므로 결과와 같은 주기로 돕니다. 값이 실제로 바뀐 경우에만
    파일을 쓰고 커밋하므로 30분마다 같은 내용을 다시 커밋하지 않습니다.
  · 끝난 축구 경기의 경기 후 리뷰(postGame)는 fotmob_postgame.py 가 채웁니다.
    results 모드는 방금 끝난 경기(4시간 안), daily 모드는 최근 3일을 봅니다.
  · 내용이 실제로 바뀐 경우에만 data.js 를 씁니다(updatedAt 만 바뀌면 커밋하지 않음).
  · data.js 구조(스키마)는 건드리지 않고 값만 갱신합니다.

환경변수
  CLUTCH_DATA_JS        대상 data.js 경로(기본: 저장소 루트)
  CLUTCH_STANDINGS_JS   대상 standings-data.js 경로(기본: 저장소 루트)
  CLUTCH_CACHE_DIR      임시 캐시 폴더(러너에서는 $RUNNER_TEMP 사용)
  CLUTCH_DAYS_AHEAD     새로 만드는 날짜 범위(기본 6)
  CLUTCH_KEEP_PAST      지난 날짜 보관 일수(기본 3)
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
STANDINGS_JS = os.environ.get("CLUTCH_STANDINGS_JS") or os.path.join(ROOT, "standings-data.js")
KST = timezone(timedelta(hours=9))
DAYS_AHEAD = int(os.environ.get("CLUTCH_DAYS_AHEAD") or 6)
KEEP_PAST = int(os.environ.get("CLUTCH_KEEP_PAST") or 3)

PY = sys.executable or "python3"


def log(msg):
    print(msg, flush=True)


# ── data.js 읽기/검증 ────────────────────────────────────────────────
def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def strip_updated_at(src):
    return re.sub(r'updatedAt:\s*"[^"]*"', "updatedAt: \"\"", src, count=1)


GAME_RE = re.compile(r'\n[ \t]*\{\n[ \t]*"id": "')


def games_of(src):
    """data.js 안의 경기 객체를 (date, sport) 기준으로 세고, 파싱 실패 수도 돌려준다."""
    counts = {}
    broken = 0
    for m in GAME_RE.finditer(src):
        start = src.index("{", m.start())
        depth = 0
        i = start
        in_str = False
        end = None
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
                    end = i + 1
                    break
            i += 1
        if end is None:
            broken += 1
            continue
        try:
            g = json.loads(src[start:end])
        except json.JSONDecodeError:
            broken += 1
            continue
        key = ((g.get("start") or "")[:10], g.get("sport") or g.get("league") or "?")
        counts[key] = counts.get(key, 0) + 1
    return counts, broken


def sanity(src):
    """data.js 가 최소한의 형태를 갖췄는지."""
    if not src.lstrip().startswith("/*"):
        return "머리 주석이 사라졌습니다"
    if "window.CLUTCH_DATA" not in src:
        return "window.CLUTCH_DATA 가 없습니다"
    days = re.findall(r'\n      date: "(\d{4}-\d{2}-\d{2})",', src)
    if not days:
        return "날짜 블록이 없습니다"
    if re.search(r'(?m)^    \}\r?\n\r?\n(?=    /\* ── \d{4}-\d{2}-\d{2})', src):
        return "날짜 블록 사이 쉼표가 없습니다"
    if not src.rstrip().endswith("};"):
        return "끝이 }; 로 닫히지 않았습니다"
    counts, broken = games_of(src)
    if broken:
        return "JSON 으로 읽히지 않는 경기 객체 %d개" % broken
    if sum(counts.values()) == 0:
        return "경기가 하나도 없습니다"
    return None


def day_dates(src):
    """날짜 블록(      date: "YYYY-MM-DD",)을 센다 — 같은 날짜 블록이 둘 생기는 것을 잡기 위해."""
    seen = {}
    for m in re.finditer(r'\n      date: "(\d{4}-\d{2}-\d{2})",\n      games: \[', src):
        seen[m.group(1)] = seen.get(m.group(1), 0) + 1
    return seen


def validate(before_src, after_src, sport_label):
    err = sanity(after_src)
    if err:
        return "%s 결과가 깨졌습니다: %s" % (sport_label, err)
    old, _ = games_of(before_src)
    new, _ = games_of(after_src)
    lost = []
    for key, n in old.items():
        if n and new.get(key, 0) < n:
            lost.append("%s %s %d→%d" % (key[0], key[1], n, new.get(key, 0)))
    if lost:
        return "%s 경기가 줄었습니다: %s" % (sport_label, ", ".join(sorted(lost)[:6]))
    old_days, new_days = day_dates(before_src), day_dates(after_src)
    dup = [d for d, n in new_days.items() if n > 1 and n > old_days.get(d, 0)]
    if dup:
        return "%s 같은 날짜 블록이 중복됐습니다: %s" % (sport_label, ", ".join(sorted(dup)[:5]))
    return None


# ── 단계 실행 ────────────────────────────────────────────────────────
def run_script(cur_src, argv, label):
    """cur_src 를 임시 파일에 복사해 스크립트를 돌리고, 검증을 통과하면 새 내용을 돌려준다."""
    tmpdir = tempfile.mkdtemp(prefix="clutch-")
    stage = os.path.join(tmpdir, "data.js")
    write(stage, cur_src)
    env = dict(os.environ)
    env["CLUTCH_DATA_JS"] = stage
    env.setdefault("CLUTCH_CACHE_DIR", os.path.join(tempfile.gettempdir(), "clutch-cache"))
    env.setdefault("CLUTCH_OUT_JSON", os.path.join(tmpdir, "out.json"))
    try:
        r = subprocess.run([PY] + argv, cwd=HERE, env=env, capture_output=True, text=True)
        out = (r.stdout or "") + (r.stderr or "")
        for line in out.strip().splitlines()[-12:]:
            log("    " + line)
        if r.returncode != 0:
            log("  ! %s 실패(종료코드 %d) — 이번 갱신은 건너뜁니다" % (label, r.returncode))
            return None
        after = read(stage)
        problem = validate(cur_src, after, label)
        if problem:
            log("  ! %s — %s" % (label, problem))
            return None
        return after
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_with_retry(cur_src, argv, label, retry_extra=("--refresh",)):
    after = run_script(cur_src, argv, label)
    if after is None and retry_extra:
        log("  · %s 한 번 더 시도합니다(캐시 무시)" % label)
        after = run_script(cur_src, argv + list(retry_extra), label + " 재시도")
    return after


def refresh_header(src, today):
    """data.js 머리 주석의 날짜 범위·생성기 경로가 실제 내용과 맞도록 고쳐 쓴다."""
    days = sorted(day_dates(src))
    if not days:
        return src
    first, last = days[0], days[-1]
    src = src.replace("work/fetch_", "tools/fetch_")
    src = re.sub(r'(✅ 실제 데이터 \(KST )\d{4}-\d{2}-\d{2}( ~ )\d{2}-\d{2}(\))',
                 lambda m: m.group(1) + first + m.group(2) + last[5:] + m.group(3),
                 src, count=1)
    today_s = today.isoformat()
    past = [d for d in days if d < today_s]
    future = [d for d in days if d >= today_s]
    if future:
        if past:
            span = past[0][5:].replace("-", "/")
            if past[-1] != past[0]:
                span += "~" + past[-1][5:].replace("-", "/")
            line = ("      지난 날짜(%s)는 끝난 경기 결과가 들어 있고, %s 이후는 예정 경기입니다."
                    % (span, future[0][5:].replace("-", "/")))
        else:
            line = ("      지난 날짜는 아직 없고, %s 이후는 예정 경기입니다."
                    % future[0][5:].replace("-", "/"))
        src = re.sub(r'      지난 날짜.*?예정 경기입니다\.', lambda m: line, src, count=1)
        src = re.sub(r'(python3 tools/fetch_nba\.py --from )\d{4}-\d{2}-\d{2}( --to )\d{4}-\d{2}-\d{2}',
                     lambda m: m.group(1) + future[0] + m.group(2) + last, src, count=1)
    return src


# ── 날짜 블록 정리 ───────────────────────────────────────────────────
DAY_SPLIT = re.compile(r'\n    /\* ── (\d{4}-\d{2}-\d{2}) ')


def prune(src, keep_from, keep_to):
    head, rest = src.split("  days: [", 1)
    body, tail = rest.split("\n  ]", 1)
    parts = DAY_SPLIT.split(body)
    lead, blocks = parts[0], parts[1:]
    kept, dropped = [], []
    for i in range(0, len(blocks), 2):
        date, body_txt = blocks[i], blocks[i + 1]
        if keep_from <= date <= keep_to:
            kept.append("    /* ── " + date + " " + body_txt.rstrip().rstrip(",").rstrip())
        else:
            dropped.append(date)
    if not kept:
        log("  ! 정리 후 남는 날짜가 없습니다 — 정리를 건너뜁니다")
        return src
    new_body = ",\n\n".join(kept)
    if dropped:
        log("  · 범위 밖 날짜 블록 정리: %s" % ", ".join(dropped))
    return head + "  days: [\n\n" + new_body + "\n  ]" + tail


# ── 순위표(standings-data.js) ──────────────────────────────────────
def strip_standings_stamp(src):
    """생성 시각만 다른 경우를 같게 보기 위해 시각 값을 비운다."""
    src = re.sub(r'(?m)^(   생성 시각\(기준\):).*$', r'\1', src, count=1)
    return re.sub(r'"updated":\s*"[^"]*"', '"updated": ""', src, count=1)


def standings_data(src):
    m = re.search(r'window\.CLUTCH_STANDINGS\s*=\s*(\{.*\})\s*;\s*$', src, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def standings_counts(src):
    data = standings_data(src) or {}
    out = {}
    for lg in data.get("leagues") or []:
        out[lg.get("key")] = sum(len(g.get("rows") or []) for g in (lg.get("groups") or []))
    return out


def standings_sanity(src):
    """순위표가 최소한의 형태를 갖췄는지 — 리그마다 팀 순위 행이 있어야 한다."""
    if not src.lstrip().startswith("/*"):
        return "머리 주석이 사라졌습니다"
    if "window.CLUTCH_STANDINGS" not in src:
        return "window.CLUTCH_STANDINGS 가 없습니다"
    data = standings_data(src)
    if data is None:
        return "JSON 으로 읽히지 않습니다"
    leagues = data.get("leagues") or []
    if not leagues:
        return "리그가 없습니다"
    for lg in leagues:
        key = lg.get("key") or "?"
        if not (lg.get("groups") or []):
            return "%s 그룹이 없습니다" % key
        if not standings_counts(src).get(key):
            return "%s 팀 순위 행이 비었습니다" % key
    return None


def validate_standings(before_src, after_src):
    err = standings_sanity(after_src)
    if err:
        return "순위표 결과가 깨졌습니다: %s" % err
    old, new = standings_counts(before_src), standings_counts(after_src)
    lost = [k for k, n in old.items() if n and new.get(k, 0) < n]
    if lost:
        return "순위표 행이 줄었습니다: %s" % ", ".join(sorted(lost))
    return None


def refresh_standings():
    """순위표를 새로 받아 실제 값이 바뀐 경우에만 standings-data.js 를 쓴다."""
    before = read(STANDINGS_JS) if os.path.exists(STANDINGS_JS) else None
    tmpdir = tempfile.mkdtemp(prefix="clutch-standings-")
    stage = os.path.join(tmpdir, "standings-data.js")
    env = dict(os.environ)
    env["CLUTCH_STANDINGS_JS"] = stage
    env.setdefault("CLUTCH_CACHE_DIR", os.path.join(tempfile.gettempdir(), "clutch-cache"))
    try:
        r = subprocess.run([PY, "fetch_standings.py"], cwd=HERE, env=env, capture_output=True, text=True)
        for line in ((r.stdout or "") + (r.stderr or "")).strip().splitlines()[-15:]:
            log("    " + line)
        if r.returncode != 0 or not os.path.exists(stage):
            log("  ! 순위표 생성 실패(종료코드 %d) — 이번 순위표는 건너뜁니다" % r.returncode)
            return False
        after = read(stage)
        problem = validate_standings(before, after) if before is not None else standings_sanity(after)
        if problem:
            log("  ! 순위표 — %s" % problem)
            return False
        if before is not None and strip_standings_stamp(before) == strip_standings_stamp(after):
            log("  · 순위표에 바뀐 내용 없음 — 파일을 그대로 둡니다")
            return False
        write(STANDINGS_JS, after)
        log("  · standings-data.js 갱신 완료")
        return True
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ── 모드 ────────────────────────────────────────────────────────────
def mode_daily(cur, today):
    d0 = today
    d1 = today + timedelta(days=DAYS_AHEAD)
    a, b = d0.isoformat(), d1.isoformat()
    log("· 새 날짜 블록 재생성 %s ~ %s" % (a, b))
    for argv, label in (
        (["fetch_nba.py", "--from", a, "--to", b, "--write"], "농구(NBA)"),
        (["fetch_soccer.py", "--from", a, "--to", b, "--write"], "축구"),
        (["fetch_volley.py", "--from", a, "--to", b, "--write"], "배구(V리그)"),
    ):
        after = run_with_retry(cur, argv, label)
        if after is not None:
            cur = after
    # 날짜 블록을 새로 만들면 끝난 경기의 경기 후 리뷰(postgame)가 빠지므로 다시 채운다.
    after = run_with_retry(cur, ["fotmob_postgame.py", "--write", "--days", "3"],
                           "축구 경기 후 리뷰")
    if after is not None:
        cur = after
    return cur


def mode_results(cur, today):
    log("· 끝난 경기 결과 갱신 (시작한 경기만 확인)")
    after = run_script(cur, ["refresh_results.py", "--write", "--started-only",
                             "--max-age-hours", "30"], "결과 갱신")
    if after is not None:
        cur = after
    else:
        after = run_script(cur, ["refresh_results.py", "--write", "--started-only",
                                 "--max-age-hours", "30"], "결과 갱신 재시도")
        if after is not None:
            cur = after
    # 방금 끝난 축구 경기의 풋몹 경기 후 리뷰·선수 한 줄 평(4시간 안에 시작한 경기만 본다).
    after = run_with_retry(cur, ["fotmob_postgame.py", "--write", "--hours", "4"],
                           "축구 경기 후 리뷰")
    if after is not None:
        cur = after
    y = (today - timedelta(days=1)).isoformat()
    after = run_script(cur, ["fetch_volley.py", "--from", y, "--to", today.isoformat(),
                             "--write"], "배구(V리그) 당일 결과")
    if after is not None:
        cur = after
    return cur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=("daily", "results"), required=True)
    ap.add_argument("--today", help="기준 날짜(KST) YYYY-MM-DD, 시험용")
    args = ap.parse_args()

    today = (datetime.strptime(args.today, "%Y-%m-%d").date() if args.today
             else datetime.now(KST).date())
    log("CLUTCH data.js 자동 갱신 — mode=%s, 기준 %s KST" % (args.mode, today))

    original = read(DATA_JS)
    err = sanity(original)
    if err:
        log("! 현재 data.js 상태가 이상합니다: %s — 아무것도 하지 않습니다" % err)
        return 1

    cur = mode_daily(original, today) if args.mode == "daily" else mode_results(original, today)

    # 순위표는 경기 결과에 따라 바뀌므로 결과 갱신과 같은 주기(results)에 돕니다.
    if args.mode == "results":
        log("· 순위표 갱신 (ESPN·KOVO)")
        refresh_standings()

    if args.mode == "daily":
        keep_from = (today - timedelta(days=KEEP_PAST)).isoformat()
        keep_to = (today + timedelta(days=DAYS_AHEAD + 1)).isoformat()
        cur = prune(cur, keep_from, keep_to)
        cur = refresh_header(cur, today)

    if strip_updated_at(cur) == strip_updated_at(original):
        log("· 바뀐 내용 없음 — data.js 를 그대로 둡니다")
        return 0

    err = sanity(cur)
    if err:
        log("! 결과가 이상합니다: %s — 이전 data.js 를 유지합니다" % err)
        return 1

    now = datetime.now(KST).isoformat(timespec="seconds")
    cur = re.sub(r'updatedAt:\s*"[^"]*"', 'updatedAt: "%s"' % now, cur, count=1)
    write(DATA_JS, cur)
    counts, _ = games_of(cur)
    log("· data.js 갱신 완료 (경기 %d건, 기준 %s KST)" % (sum(counts.values()), now))
    return 0


if __name__ == "__main__":
    sys.exit(main())
