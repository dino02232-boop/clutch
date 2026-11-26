#!/usr/bin/env python3
"""CLUTCH — 축구 '경기 후 브리핑'에 풋몹(FotMob) 경기 후 리뷰·선수 한 줄 평을 채웁니다.

  python3 tools/fotmob_postgame.py                 # 미리보기(바뀌는 경기만 출력)
  python3 tools/fotmob_postgame.py --write         # data.js 갱신
  python3 tools/fotmob_postgame.py --write --days 3   # 최근 3일 끝난 경기까지 채움

무엇을 넣나
  · postgame.review       FotMob matchDetails 의 content.matchFacts.postReview (Opta 리뷰)
                          { title, description, titleEn, descriptionEn, source, url, lang, auto, updatedAt }
                          한국어는 무료 구글 번역 엔드포인트로 옮기고, 실패하면 영문 원문을 그대로 둔다.
  · postgame.playerOfTheMatch   같은 응답의 playerOfTheMatch (이름·팀·평점)
  · postgame.carry / .low  이긴 팀에서 이끈 선수·진 팀에서 아쉬웠던 선수를 FotMob 경기 스탯
                          (골·도움·평점·유효슈팅·기회창출·선방·출전 시간)으로 골라 한 줄 평(line)과
                          칩(facts)을 붙인다. 화면(app.js)은 이 문구를 그대로 그린다.

원칙
  · 값이 없는 항목은 만들지 않는다(없는 평점·기회창출을 지어내지 않는다).
  · postReview 가 아직 없는 경기는 리뷰를 비워 두고, 다음 결과 갱신에서 다시 확인한다.
    이미 review 와 carry 가 다 채워진 경기는 건드리지 않는다(같은 요청을 반복하지 않는다).
  · 키·회원가입 없이 접근하는 비공식 엔드포인트라 예고 없이 막힐 수 있다. 실패해도 결과 갱신을
    막지 않고 그 경기만 건너뛴다.

tools/auto_update.py 가 결과 갱신(results)·일일 갱신(daily) 뒤에 호출합니다.
"""

import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fetch_nba import KST, get_json  # noqa: E402  (공용 캐시·재시도 유틸)

ROOT = os.path.dirname(HERE)
DATA_JS = os.environ.get("CLUTCH_DATA_JS") or os.path.join(ROOT, "data.js")
FOTMOB_MATCH = "https://www.fotmob.com/api/data/matchDetails?matchId=%s"
TRANSLATE = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=%s&tl=ko&dt=t&q=%s"
SOURCE = "FotMob · Opta"
GAP = float(os.environ.get("CLUTCH_FOTMOB_GAP") or 0.25)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "application/json"}

# FotMob usualPosition: 0 골키퍼 · 1 수비수 · 2 미드필더 · 3 공격수 (fotmob_injuries.POS_CODES 와 같다)
POS = {0: "GK", 1: "DF", 2: "MF", 3: "FW"}


# ── data.js 안의 경기 객체 다루기 ────────────────────────────────────
GAME_RE = re.compile(r'\n([ \t]*)\{\n[ \t]*"id": "')


def game_spans(src):
    """경기 객체의 (시작, 끝, 들여쓰기) 목록. 날짜 블록마다 들여쓰기가 달라도 찾는다."""
    out = []
    for m in GAME_RE.finditer(src):
        start = src.index("{", m.start())
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
                    out.append((start, i + 1, m.group(1)))
                    break
            i += 1
    return out


def _value_end(text, start):
    """start 위치(값의 첫 글자)에서 값이 끝나는 위치. 문자열이면 닫는 따옴표까지."""
    ch = text[start]
    if ch in "{[":
        depth = 0
        i = start
        in_str = False
        while i < len(text):
            c = text[i]
            if in_str:
                if c == "\\":
                    i += 2
                    continue
                if c == '"':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c in "{[":
                depth += 1
            elif c in "}]":
                depth -= 1
                if depth == 0:
                    return i + 1
            i += 1
        return len(text)
    if ch == '"':
        i = start + 1
        while i < len(text):
            if text[i] == "\\":
                i += 2
                continue
            if text[i] == '"':
                return i + 1
            i += 1
        return len(text)
    # 숫자·true/false/null
    i = start
    while i < len(text) and text[i] not in ",}\n\r":
        i += 1
    return i


def _block(key, value, inner):
    """'  "key": { ... }' 형태의 텍스트(파일 들여쓰기 inner 기준)."""
    lines = json.dumps(value, ensure_ascii=False, indent=2).splitlines()
    head = inner + json.dumps(key, ensure_ascii=False) + ": " + lines[0]
    rest = [inner + ln for ln in lines[1:]]
    return "\n".join([head] + rest)


def _members(chunk):
    """루트 객체(depth 1)의 멤버 목록과 루트 닫는 위치.

    멤버: (이름, 줄 시작, 값 시작, 값 끝, 쉼표까지 끝, 그 줄의 들여쓰기)
    """
    n = len(chunk)
    i, depth, in_str = 0, 0, False
    out, close = [], None
    while i < n:
        ch = chunk[i]
        if ch == '"':
            j = i + 1
            while j < n:
                if chunk[j] == "\\":
                    j += 2
                    continue
                if chunk[j] == '"':
                    break
                j += 1
            if depth == 1:
                k = j + 1
                while k < n and chunk[k] in " \t":
                    k += 1
                if k < n and chunk[k] == ":":
                    try:
                        name = json.loads(chunk[i:j + 1])
                    except json.JSONDecodeError:
                        name = None
                    vs = k + 1
                    while vs < n and chunk[vs] in " \t\n\r":
                        vs += 1
                    ve = _value_end(chunk, vs)
                    after = ve
                    while after < n and chunk[after] in " \t":
                        after += 1
                    end = after + 1 if after < n and chunk[after] == "," else ve
                    line_start = chunk.rfind("\n", 0, i) + 1
                    out.append((name, line_start, vs, ve, end, chunk[line_start:i]))
                    i = ve
                    continue
            i = j + 1
            continue
        if ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
            if depth == 0:
                close = i
                break
        i += 1
    return out, close


def set_member(chunk, key, value):
    """경기 객체 텍스트(chunk)의 루트에서 key 멤버를 value 로 바꾸거나, 없으면 맨 끝에 더한다.

    날짜 블록마다 들여쓰기가 달라서(예: 여는 중괄호 16칸, 멤버 10칸) 들여쓰기로 위치를
    찾지 않고 JSON 구조(depth 1)로 찾는다.
    """
    members, close = _members(chunk)
    if close is None:
        return chunk
    for name, line_start, _vs, _ve, end, inner in members:
        if name == key:
            return chunk[:line_start] + _block(key, value, inner) + chunk[end:]
    inner = members[0][5] if members else "  "
    nl = chunk.rfind("\n", 0, close)
    if nl < 0:
        nl = close
    return chunk[:nl] + ",\n" + _block(key, value, inner) + chunk[nl:]


# ── FotMob 응답 ─────────────────────────────────────────────────────
def _details(match_id, refresh):
    return get_json(FOTMOB_MATCH % match_id, "fotmob-match-%s" % match_id, refresh)


def review_of(match_facts):
    """postReview 목록 → 영문 리뷰 하나. 없으면 None."""
    items = [x for x in (match_facts.get("postReview") or []) if isinstance(x, dict)]
    if not items:
        return None
    en = [x for x in items if str(x.get("lang") or "").lower() == "en"]
    return (en[0] if en else items[0])


def _translate(text, src_lang="en"):
    """무료 구글 번역 엔드포인트. 실패하면 None(원문 유지)."""
    if not text or os.environ.get("CLUTCH_TRANSLATE") == "0":
        return None
    q = urllib.parse.quote(str(text)[:1800])
    url = TRANSLATE % (src_lang or "auto", q)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA["User-Agent"]})
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.loads(r.read().decode("utf-8"))
        out = "".join(seg[0] for seg in (data[0] or []) if seg and seg[0])
        out = out.strip()
        return out or None
    except Exception:
        return None


def _localize(text, pairs):
    """번역문에 남은 영문 팀 이름을 카드의 한글 팀 이름으로 바꾼다(있는 것만)."""
    if not text:
        return text
    for en, ko in pairs:
        if not en or not ko or en == ko or not re.search(r"[가-힣]", ko):
            continue
        text = re.sub(r"\b" + re.escape(en) + r"\b", ko, text)
    return text


def team_pairs(game):
    """(영문 팀 이름, 카드의 팀 이름) — 번역문의 팀 이름을 맞추는 데 쓴다."""
    pairs = []
    for side in ("away", "home"):
        ko = ((game.get(side) or {}).get("name") or "").strip()
        en = ((game.get("_fm_names") or {}).get(side) or "").strip()
        if en and ko:
            pairs.append((en, ko))
    return pairs


# ── 선수 스탯 ────────────────────────────────────────────────────────
def _num(v):
    if isinstance(v, dict):
        v = v.get("value")
    try:
        if v is None or v == "":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def _int(v):
    n = _num(v)
    return None if n is None else int(round(n))


def _stat_map(entry):
    """playerStats 한 사람의 stats 그룹들 → {키: stat} (라벨과 key 둘 다로 찾을 수 있게)."""
    out = {}
    for grp in entry.get("stats") or []:
        for label, s in (grp.get("stats") or {}).items():
            stat = s.get("stat") or {}
            out[label] = stat
            if s.get("key"):
                out[s["key"]] = stat
    return out


def _ratings(lineup):
    """라인업(선발+후보) → {선수 id: (이름, 평점, 포지션, 선발)}. 평점 없는 선수는 뺀다."""
    out = {}
    for key, starter in (("starters", True), ("subs", False)):
        for p in (lineup or {}).get(key) or []:
            rating = _num((p.get("performance") or {}).get("rating"))
            if rating is None or not 0 < rating <= 10:
                continue
            pos = POS.get(p.get("usualPlayingPositionId"))
            out[p.get("id")] = ((p.get("name") or "").strip(), round(rating, 1), pos, starter)
    return out


def players_of(content, details):
    """이 경기 선수별 FotMob 스탯. side 는 카드 기준(home/away)으로 맞춘다."""
    lineup = (content or {}).get("lineup") or {}
    home, away = lineup.get("homeTeam") or {}, lineup.get("awayTeam") or {}
    if not home or not away:
        return []
    swapped = bool((details or {}).get("fotmobSwapped"))
    # FotMob 팀 id → 카드의 side
    side_of = {}
    for side, team in (("home", home), ("away", away)):
        our = ("away" if side == "home" else "home") if swapped else side
        side_of[team.get("id")] = our
    ratings = _ratings(home)
    ratings.update(_ratings(away))
    out = []
    for pid, entry in ((content or {}).get("playerStats") or {}).items():
        if not isinstance(entry, dict):
            continue
        try:
            pkey = int(pid)
        except (TypeError, ValueError):
            pkey = entry.get("id")
        name, rating, pos, _starter = ratings.get(pkey, ((entry.get("name") or "").strip(), None, None, None))
        if not name:
            name = (entry.get("name") or "").strip()
        st = _stat_map(entry)
        minute = _int(st.get("Minutes played") or st.get("minutes_played"))
        if not minute:
            continue
        row = {
            "name": name,
            "side": side_of.get(entry.get("teamId")),
            "pos": pos or POS.get(entry.get("usualPosition")),
            "rating": rating,
            "min": minute,
            "g": _int(st.get("Goals") or st.get("goals")) or 0,
            "a": _int(st.get("Assists") or st.get("assists")) or 0,
            "sh": _int(st.get("Total shots") or st.get("total_shots")),
            "sog": _int(st.get("Shots on target") or st.get("ShotsOnTarget")),
            "cc": _int(st.get("Chances created") or st.get("chances_created")),
            "sv": _int(st.get("Saves") or st.get("saves")),
            "ga": _int(st.get("Goals conceded") or st.get("goals_conceded")),
        }
        if row["side"] is None:
            continue
        out.append(row)
    return out


# ── 한국어 조사 ─────────────────────────────────────────────────────
def _acronym(word):
    """'Sabah FK'·'PSG' 처럼 마지막 낱말이 약어면 한글로 읽을 때 모음으로 끝난다고 본다."""
    parts = str(word or "").strip().split()
    s = parts[-1] if parts else ""
    return bool(s) and s.isupper() and 2 <= len(s) <= 4 and not re.search(r"[가-힣]", s)


def _has_final(word):
    """한글 이름은 받침으로, 로마자는 끝소리로 받침 여부를 근사한다."""
    s = str(word or "").strip()
    if not s:
        return False
    if _acronym(s):
        return False
    c = s[-1]
    o = ord(c)
    if 0xAC00 <= o <= 0xD7A3:
        return (o - 0xAC00) % 28 != 0
    last = c.lower()
    if last.isdigit():
        # 0 영 1 일 3 삼 6 육 7 칠 8 팔 → 받침 있음, 2 이 4 사 5 오 9 구 → 없음
        return last in "013678"
    vowelish = "aeiouywzsxéáíóúèêàâ"
    return last not in vowelish


def josa(word, with_final, without_final):
    return str(word) + (with_final if _has_final(word) else without_final)


def ro(word):
    """'…으로/로' — 숫자·퍼센트·받침에 맞춘다."""
    s = str(word)
    if re.search(r"\d$", s):
        return s + ("로" if s[-1] in "0178" else "으로")
    if s.endswith("%"):
        return s + "로"
    return josa(s, "으로", "로")


# ── 선수 고르기와 한 줄 평 ───────────────────────────────────────────
def _name_key(name):
    """선수 이름 비교용 — 발음기호를 떼고 소문자·공백만 남긴다."""
    s = unicodedata.normalize("NFKD", str(name or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.lower().split())


def _score_hi(p):
    """평점을 먼저 보고, 같으면 골·도움·기회창출 순으로 본다."""
    return (p.get("rating") or 0, p.get("g") or 0, p.get("a") or 0, p.get("cc") or 0)


def pick_carry(players, win_side):
    pool = [p for p in players
            if p["side"] == win_side and p["min"] >= 25 and (p.get("rating") or 0) > 0]
    if not pool:
        return None
    return sorted(pool, key=_score_hi, reverse=True)[0]


def pick_low(players, lose_side):
    """진 팀에서 아쉬웠던 선수. 근거가 약하면(평점이 높으면) 고르지 않는다.

    골키퍼는 '선방이 적은데 여러 골을 먹은' 경우에만 넣는다 — 선방을 많이 하고도
    실점한 골키퍼는 잘한 쪽이라 아쉬웠던 선수로 세우지 않는다.
    """
    pool = [p for p in players if p["side"] == lose_side and p["min"] >= 45 and (p.get("rating") or 0) > 0]
    if not pool:
        return None, ""
    gk = [p for p in pool if p["pos"] == "GK" and
          ((p.get("ga") or 0) >= 3 and (p.get("sv") or 0) <= 2 or p["rating"] <= 6.3)]
    if gk:
        return sorted(gk, key=lambda p: p["rating"])[0], "gk"
    field = [p for p in pool if p["pos"] != "GK"] or pool
    low = sorted(field, key=lambda p: (p["rating"], -(p.get("sh") or 0)))[0]
    if low["rating"] <= 6.9:
        if (low.get("sh") or 0) >= 3 and (low.get("g") or 0) == 0 and (low.get("sog") or 0) <= 1:
            return low, "shots"
        return low, "rating"
    # 평점이 나쁘지 않으면 슈팅만 많고 골이 없는 선수를 본다.
    shots = [p for p in field
             if (p.get("sh") or 0) >= 4 and (p.get("g") or 0) == 0 and (p.get("sog") or 0) <= 1]
    if shots:
        return sorted(shots, key=lambda p: (-(p.get("sh") or 0), p["rating"]))[0], "shots"
    return None, ""


def _facts(p, kind):
    out = []
    if p.get("rating"):
        out.append("평점 %.1f" % p["rating"])
    if p.get("g"):
        out.append("골 %d" % p["g"])
    if p.get("a"):
        out.append("도움 %d" % p["a"])
    if p.get("pos") == "GK":
        if p.get("sv") is not None:
            out.append("선방 %d" % p["sv"])
        if p.get("ga") is not None:
            out.append("실점 %d" % p["ga"])
    else:
        if p.get("sog"):
            out.append("유효슈팅 %d" % p["sog"])
        elif p.get("sh"):
            out.append("슈팅 %d" % p["sh"])
        if p.get("cc"):
            out.append("기회창출 %d" % p["cc"])
    out.append("%d분" % p["min"])
    return out


def carry_line(p, score):
    """이긴 팀에서 이끈 선수 — 한 줄 평.

    로마자 이름·팀 이름 뒤에 '이/가'를 붙이면 받침이 틀리기 쉬워서, 선수 이름은 '의'
    로만 잇고 팀은 카드의 팀 칩이 보여 준다. 조사는 숫자(평점·개수)에만 붙인다.
    """
    n, r = p["name"], p.get("rating")
    g, a = p.get("g") or 0, p.get("a") or 0
    cc, sv = p.get("cc") or 0, p.get("sv") or 0
    rt = "평점 %.1f" % r if r else ""
    if p.get("pos") == "GK" and sv:
        keep = "무실점" if not (p.get("ga") or 0) else "%d실점" % (p.get("ga") or 0)
        return "%s의 선방 %d개(%s)로 %s 승리를 지켰습니다." % (n, sv, rt, keep)
    if g >= 3:
        return "%s의 해트트릭(%s)에 힘입어 %s 승리를 거뒀습니다." % (n, rt, score)
    if g == 2 and a >= 1:
        return "%s의 두 골에 도움까지(%s), %s 승리를 혼자 만들어 냈습니다." % (n, rt, score)
    if g == 2:
        return "%s의 멀티골(%s)에 힘입어 %s 승리를 거뒀습니다." % (n, rt, score)
    if g == 1 and a >= 1:
        return "%s의 골과 도움 하나씩(%s)으로 승리에 힘을 보탰습니다." % (n, rt)
    if g == 1:
        return "%s의 골(%s)에 힘입어 %s 승리를 챙겼습니다." % (n, rt, score)
    if a >= 2:
        return "%s의 도움 %d개(%s)에 힘입어 %s 승리를 거뒀습니다." % (n, a, rt, score)
    if cc >= 4:
        return "%s의 기회창출 %d회(%s)로 공격의 물꼬를 텄습니다." % (n, cc, rt)
    return "%s의 %s 팀에서 가장 앞섰습니다. %s 승리였습니다." % (
        n, josa(rt or "기록", "이", "가"), score)


def low_line(p, why):
    """진 팀에서 아쉬웠던 선수 — 한 줄 평."""
    n, r = p["name"], p.get("rating")
    rt = "평점 %.1f" % r if r else ""
    if why == "gk":
        sv = "선방 %d개" % p["sv"] if p.get("sv") is not None else "선방"
        ga = p.get("ga") or 0
        if ga >= 3:
            return "%s의 %s·%d실점(%s)으로 골문이 흔들렸습니다." % (n, sv, ga, rt)
        return "%s의 %s·%d실점(%s) — 팀에서 가장 낮은 평점이었습니다." % (n, sv, ga, rt)
    if why == "shots":
        return "%s의 슈팅 %d개(유효 %d)가 골로 이어지지 못했습니다(%s)." % (
            n, p.get("sh") or 0, p.get("sog") or 0, rt)
    return "%s의 %s 팀에서 가장 낮았습니다." % (n, josa(rt or "기록", "이", "가"))


def _entry(p, side, team, line, tag):
    row = {
        "name": p["name"],
        "team": team,
        "side": side,
        "tag": tag,
        "line": line,
        "facts": _facts(p, ""),
    }
    if p.get("pos"):
        row["pos"] = p["pos"]
    if p.get("rating"):
        row["rating"] = p["rating"]
    if p.get("min"):
        row["min"] = p["min"]
    for k in ("g", "a", "sh", "sog", "cc", "sv", "ga"):
        if p.get(k) is not None:
            row["goals" if k == "g" else ("assists" if k == "a" else
                {"sh": "shots", "sog": "shotsOnTarget", "cc": "chancesCreated",
                 "sv": "saves", "ga": "conceded"}[k])] = p[k]
    return row


# ── 한 경기 ─────────────────────────────────────────────────────────
def build_postgame(game, refresh=False, translate=True):
    """경기 하나의 postgame 객체. 채울 게 없으면 None."""
    details = game.get("details") or {}
    match_id = details.get("fotmobId")
    if not match_id:
        return None
    try:
        det = _details(match_id, refresh)
    except Exception as e:
        print("  ! FotMob %s 상세 실패: %s" % (match_id, e))
        return None
    content = det.get("content") or {}
    facts = content.get("matchFacts") or {}
    lineup = content.get("lineup") or {}
    home, away = lineup.get("homeTeam") or {}, lineup.get("awayTeam") or {}
    swapped = bool(details.get("fotmobSwapped"))
    fm = {"home": away.get("name") if swapped else home.get("name"),
          "away": home.get("name") if swapped else away.get("name")}
    game = dict(game, _fm_names=fm)

    out = {}
    item = review_of(facts)
    if item:
        title = (item.get("title") or "").strip()
        desc = (item.get("description") or "").strip()
        ko_title, ko_desc = None, None
        if translate:
            src = "en" if str(item.get("lang") or "").lower() == "en" else (item.get("lang") or "auto")
            ko_title = _translate(title, src)
            ko_desc = _translate(desc, src)
            time.sleep(GAP)
            pairs = team_pairs(game)
            ko_title = _localize(ko_title, pairs)
            ko_desc = _localize(ko_desc, pairs)
        auto = bool(ko_title or ko_desc)
        out["review"] = {
            "title": ko_title or title,
            "description": ko_desc or desc,
            "titleEn": title,
            "descriptionEn": desc,
            "source": SOURCE,
            "url": (item.get("shareUrl") or item.get("contentUrl") or "").split("?")[0] or
                   "https://www.fotmob.com/match/%s" % match_id,
            "lang": "ko" if auto else "en",
            "auto": auto,
            "updatedAt": item.get("dateUpdated") or "",
        }

    res = game.get("result") or {}
    aa, hh = _int(res.get("awayScore")), _int(res.get("homeScore"))
    players = players_of(content, details)
    if players and aa is not None and hh is not None:
        win = "away" if aa > hh else ("home" if hh > aa else None)
        score = "%d-%d" % (max(aa, hh), min(aa, hh))
        teams = {"away": (game.get("away") or {}).get("name", ""),
                 "home": (game.get("home") or {}).get("name", "")}

        potm = facts.get("playerOfTheMatch") or {}
        if potm.get("name"):
            pname = ((potm.get("name") or {}).get("fullName") or
                     ((potm.get("name") or {}).get("firstName", "") + " " +
                      (potm.get("name") or {}).get("lastName", "")).strip())
            side = "away" if fm.get("away") == potm.get("teamName") else (
                "home" if fm.get("home") == potm.get("teamName") else None)
            row = {"name": pname.strip()}
            if potm.get("teamName"):
                row["teamEn"] = potm.get("teamName")
            if side:
                row["team"] = teams[side]
                row["side"] = side
            rating = _num((potm.get("rating") or {}).get("num"))
            if rating:
                row["rating"] = round(rating, 1)
            if row["name"]:
                out["playerOfTheMatch"] = row

        if win:
            carry = pick_carry(players, win)
            if carry:
                out["carry"] = _entry(carry, win, teams[win], carry_line(carry, score), "up")
                potm_name = (out.get("playerOfTheMatch") or {}).get("name") or ""
                if potm_name and _name_key(potm_name) == _name_key(carry["name"]):
                    out["carry"]["mvp"] = True
            low, why = pick_low(players, "home" if win == "away" else "away")
            lose = "home" if win == "away" else "away"
            if low:
                out["low"] = _entry(low, lose, teams[lose], low_line(low, why), "down")
        else:
            # 무승부: 양 팀 통틀어 가장 눈에 띈 선수를 한 장으로.
            best = sorted([p for p in players if (p.get("rating") or 0) > 0],
                          key=_score_hi, reverse=True)
            if best:
                top = best[0]
                team = teams[top["side"]]
                rt = "평점 %.1f" % top["rating"] if top.get("rating") else ""
                line = "%s의 %s 양 팀 통틀어 가장 높았습니다. 경기는 %d-%d 무승부였습니다." % (
                    top["name"], josa(rt or "기록", "이", "가"), max(aa, hh), min(aa, hh))
                out["carry"] = _entry(top, top["side"], team, line, "top")
    return out or None


def needs_fill(game):
    pg = game.get("postgame") or {}
    return not (pg.get("review") and pg.get("carry"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--refresh", action="store_true", help="FotMob 캐시를 무시하고 다시 받는다")
    ap.add_argument("--days", type=float, default=0, help="최근 N일 안에 시작한 끝난 경기까지")
    ap.add_argument("--hours", type=float, default=0, help="최근 N시간 안에 시작한 끝난 경기만")
    ap.add_argument("--max", type=int, default=0, help="이번 실행에서 확인할 경기 수 상한")
    ap.add_argument("--no-translate", action="store_true")
    ap.add_argument("--id", action="append", help="이 경기 id 만 확인(여러 번 쓸 수 있음)")
    args = ap.parse_args()

    now = datetime.now(KST)
    if args.hours:
        since = now - timedelta(hours=args.hours)
    elif args.days:
        since = now - timedelta(days=args.days)
    else:
        since = now - timedelta(hours=4)

    src = open(DATA_JS, encoding="utf-8").read()
    out, last, filled, checked = [], 0, 0, 0
    for a, b, indent in game_spans(src):
        chunk = src[a:b]
        try:
            g = json.loads(chunk)
        except json.JSONDecodeError:
            continue
        if g.get("sport") != "soccer":
            continue
        res = g.get("result") or {}
        if res.get("state") != "final" and g.get("status") != "final":
            continue
        if args.id:
            if g.get("id") not in args.id:
                continue
        else:
            try:
                kick = datetime.fromisoformat(g["start"])
            except (KeyError, ValueError):
                kick = None
            if kick is None or kick < since:
                continue
        if not needs_fill(g):
            continue
        if args.max and checked >= args.max:
            continue
        checked += 1
        print("· %s %s" % (g["id"], "%s vs %s" % ((g.get("away") or {}).get("name"),
                                                  (g.get("home") or {}).get("name"))))
        pg = build_postgame(g, refresh=args.refresh, translate=not args.no_translate)
        if not pg:
            print("  · 채울 리뷰·선수 기록이 아직 없습니다")
            time.sleep(GAP)
            continue
        # 기존 postgame 이 있으면 새 값으로 덮어쓴다(부분 갱신이 아니라 한 번에 다 채운다).
        new_chunk = set_member(chunk, "postgame", pg)
        out.append(src[last:a])
        out.append(new_chunk)
        last = b
        filled += 1
        if pg.get("review"):
            print("  · 리뷰: %s" % pg["review"]["title"][:90])
        if pg.get("carry"):
            print("  · 캐리: %s — %s" % (pg["carry"]["name"], pg["carry"]["line"]))
        if pg.get("low"):
            print("  · 아쉬움: %s — %s" % (pg["low"]["name"], pg["low"]["line"]))
        time.sleep(GAP)
    out.append(src[last:])
    new_src = "".join(out)

    if filled and args.write:
        new_src = re.sub(r'updatedAt:\s*"[^"]*"',
                         'updatedAt: "%s"' % datetime.now(KST).isoformat(timespec="seconds"),
                         new_src, count=1)
        open(DATA_JS, "w", encoding="utf-8").write(new_src)
        print("data.js 저장 완료 · %d경기 postgame 반영(확인 %d경기)" % (filled, checked))
    else:
        print("%d경기 반영 대상(확인 %d경기)%s" % (filled, checked,
              "" if not filled else " — 미리보기, --write 로 저장"))


if __name__ == "__main__":
    main()
