#!/usr/bin/env python3
"""CLUTCH — 축구 선수 사진 보완 (ESPN → Wikipedia → Wikidata)

ESPN 축구 headshot CDN 은 실측 커버리지가 매우 낮아(198명 중 한 자릿수) 대부분
이니셜 원으로 표시됩니다. 이 모듈은 선수 이름으로 무료 출처에서 얼굴 사진을 찾아
URL 만 돌려줍니다. 못 찾으면 빈 문자열 — 화면은 기존처럼 이니셜로 대체합니다.

순서
  1) ESPN URL 이 실제로 200 + image/* 인 경우 그대로 사용
  2) Wikipedia pageimages (pithumbsize=200, redirects=1) — 영문 → 국문
  3) 그 문서의 Wikidata P18 → commons Special:FilePath?width=200
  4) TheSportsDB 무료 API (searchplayers) — 이름이 완전히 같고 종목이 Soccer 이며
     클럽까지 맞는 선수만. (무료 키는 분량 제한이 있어 2.2초 간격으로 부름)

안전장치
  · 문서 첫 문단(extract)에 '축구 선수'임을 뜻하는 말이 있어야 채택합니다.
    동명이인 문서(동음이의), 다른 종목 선수, 정치인·배우 문서는 버립니다.
  · 클럽 이름이 함께 나오면 더 강한 근거로 기록합니다(conf=club).
  · 확인되지 않으면 photo 를 비웁니다. 추측 URL 은 만들지 않습니다.

예의
  · 요청 사이 최소 0.4초(CLUTCH_PHOTO_GAP), User-Agent 에 사이트 식별자
  · 429/5xx 는 지수 백오프로 최대 3회, 그 뒤에는 조용히 실패(빈 값)

캐시
  tools/cache/player_photos.json (CLUTCH_PHOTO_CACHE 로 변경 가능)
  { "players": { "<이름 소문자>": {photo, src, conf, title, espnId, checked} } }
  실패도 checked 와 함께 남겨 다음 실행에서 재조회를 줄입니다(30일 뒤 재시도).
"""

import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.environ.get("CLUTCH_PHOTO_CACHE") or os.path.join(HERE, "cache", "player_photos.json")
UA = "clutch/1.0 (personal site; +https://dino02232-boop.github.io/clutch/)"
GAP = float(os.environ.get("CLUTCH_PHOTO_GAP") or 0.4)
TSDB_KEY = os.environ.get("CLUTCH_TSDB_KEY") or "123"  # 공개 테스트 키
TSDB_GAP = float(os.environ.get("CLUTCH_TSDB_GAP") or 2.2)
TSDB = "https://www.thesportsdb.com/api/v1/json/%s/searchplayers.php?p=" % TSDB_KEY
RETRIES = int(os.environ.get("CLUTCH_RETRIES") or 3)
RECHECK_DAYS = int(os.environ.get("CLUTCH_PHOTO_RECHECK_DAYS") or 30)
KST = timezone(timedelta(hours=9))

# 영문 위키를 먼저, 없으면 국문 위키. (다른 언어 위키는 동명이인 문서가 섞여
#  "다른 사람 사진"이 들어갈 위험이 커서 쓰지 않는다 — 확인 못 하면 비워 둔다.)
LANGS = ("en", "ko")

FOOT_WORDS = {
    "en": ("footballer", "football player", "soccer player", "association football",
           "football club", "plays as a", "soccer"),
    "de": ("fußballspieler", "fussballspieler", "fußball", "fussball"),
    "it": ("calciatore", "calciatrice", "calcio"),
    "es": ("futbolista", "fútbol"),
    "fr": ("footballeur", "footballeuse", "football"),
}
# 축구가 아닌 다른 종목·직업 문서를 걸러내는 말
OTHER_WORDS = ("rugby", "american football", "gridiron", "australian rules", "gaelic",
               "cricketer", "cricket", "basketball player", "baseball player",
               "politician", "actor", "actress", "singer", "racchetta", "tennista",
               "rugbista", "cestista", "politico", "cantante", "attore")

_last_call = [0.0]
_tsdb_last = [0.0]


# ── HTTP ────────────────────────────────────────────────────────────
def _throttle():
    wait = GAP - (time.time() - _last_call[0])
    if wait > 0:
        time.sleep(wait)
    _last_call[0] = time.time()


def _fetch(url, accept="application/json", timeout=25):
    """(status, content-type, bytes) — 429/5xx 는 백오프 후 재시도, 실패하면 예외."""
    _throttle()
    last = None
    for attempt in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, (r.headers.get("Content-Type") or ""), r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 502, 503, 504) and attempt + 1 < RETRIES:
                time.sleep(2 * (2 ** attempt))
                continue
            raise
        except Exception as e:  # 시간 초과·연결 오류
            last = e
            if attempt + 1 < RETRIES:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise last


def _json(url):
    _, _, body = _fetch(url)
    return json.loads(body.decode("utf-8"))


def image_ok(url):
    """그 URL 이 실제 이미지인지 확인한다(깨진 ESPN 경로 걸러내기)."""
    if not url or not url.startswith("https://"):
        return False
    try:
        status, ctype, body = _fetch(url, accept="image/*, */*")
        return status == 200 and ctype.lower().startswith("image/") and len(body) > 500
    except Exception:
        return False


# ── Wikipedia / Wikidata ────────────────────────────────────────────
def wiki_page(name, lang="en"):
    """문서 첫 문단·썸네일·wikibase id. 없으면 None."""
    url = ("https://%s.wikipedia.org/w/api.php?action=query&titles=%s"
           "&prop=pageimages|extracts|pageprops&pithumbsize=200&redirects=1"
           "&exintro=1&explaintext=1&format=json&formatversion=2"
           % (lang, urllib.parse.quote(name)))
    try:
        d = _json(url)
    except Exception:
        return None
    pages = (d.get("query") or {}).get("pages") or []
    if not pages:
        return None
    p = pages[0]
    if p.get("missing") or p.get("invalid"):
        return None
    return {
        "title": p.get("title") or name,
        "thumb": (p.get("thumbnail") or {}).get("source") or "",
        "extract": (p.get("extract") or "").strip(),
        "qid": ((p.get("pageprops") or {}).get("wikibase_item")) or "",
        "lang": lang,
    }


def wikidata_p18(qid):
    """Wikidata P18 파일명 → 위키미디어 썸네일 URL."""
    if not qid:
        return ""
    try:
        d = _json("https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=%s"
                  "&property=P18&format=json" % qid)
    except Exception:
        return ""
    for c in (d.get("claims") or {}).get("P18") or []:
        val = (((c.get("mainsnak") or {}).get("datavalue") or {}).get("value"))
        if isinstance(val, str) and val:
            return ("https://commons.wikimedia.org/wiki/Special:FilePath/%s?width=200"
                    % urllib.parse.quote(val.replace(" ", "_")))
    return ""


def _norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).strip()


def club_words(club):
    """'1. FC Köln' → ['koln'] 처럼 클럽을 가리키는 핵심 낱말만."""
    if not club:
        return []
    drop = {"fc", "cf", "afc", "ac", "as", "ss", "ssc", "cd", "rc", "rcd", "sv", "vfl",
            "vfb", "tsg", "sc", "us", "ud", "sl", "ogc", "stade", "club", "de", "the",
            "1", "2", "04", "05", "07", "09", "1899", "1900"}
    words = [w for w in _norm(club).split() if w not in drop and len(w) > 2]
    return words


# 위키백과 문단에 실제로 쓰이는 다른 표기. (예: Internazionale → 'Inter Milan')
CLUB_ALIASES = {
    "internazionale": ("inter milan", "internazionale"),
    "ac milan": ("ac milan",),
    "athletic club": ("athletic bilbao", "athletic club"),
    "fc cologne": ("1 fc koln", "koln", "cologne"),
    "hamburg sv": ("hamburger sv", "hamburg"),
    "borussia monchengladbach": ("monchengladbach",),
    "psv eindhoven": ("psv",),
    "feyenoord rotterdam": ("feyenoord",),
    "sporting cp": ("sporting cp", "sporting lisbon"),
    "1 fc union berlin": ("union berlin",),
    "bayer leverkusen": ("bayer leverkusen", "leverkusen"),
    "bayern munich": ("bayern munich", "bayern"),
    "manchester city": ("manchester city", "man city"),
    "manchester united": ("manchester united", "man utd"),
    "nottingham forest": ("nottingham forest",),
    "tottenham hotspur": ("tottenham", "spurs"),
    "wolverhampton": ("wolves", "wolverhampton"),
    "real sociedad": ("real sociedad", "sociedad"),
    "real betis": ("real betis", "betis"),
    "real madrid": ("real madrid",),
    "atletico madrid": ("atletico madrid", "atletico"),
    "racing santander": ("racing santander",),
    "rayo vallecano": ("rayo vallecano",),
    "celta vigo": ("celta", "celta vigo"),
}
# 너무 흔해 아무 문서에나 걸리는 낱말은 클럽 확인에 쓰지 않는다.
WEAK_WORDS = {"milan", "united", "city", "real", "sporting", "inter", "paris", "roma",
              "lazio", "lille", "lens", "como", "parma", "monza", "elche", "lecce",
              "genoa", "torino", "udinese", "bologna", "sassuolo", "fiorentina", "leipzig"}


def club_terms(club):
    """클럽 비교용 표기 목록(소문자·기호 제거). 긴 표기를 앞에 둔다."""
    if not club:
        return []
    n = _norm(club)
    terms = [n]
    terms.extend(CLUB_ALIASES.get(n, ()))
    for w in club_words(club):
        if w not in WEAK_WORDS:
            terms.append(w)
    out = []
    for t in terms:
        if t and t not in out:
            out.append(t)
    out.sort(key=len, reverse=True)
    return out


def club_mentioned(club, text):
    """클럽 표기가 문단에 '낱말 단위'로 나오는지."""
    low = " " + _norm(text) + " "
    for t in club_terms(club):
        if re.search(r"\b%s\b" % re.escape(t), low):
            return True
    return False


def check_article(page, club=None):
    """그 문서가 '이 선수의 축구 선수 문서'인지 판단한다. (ok, conf, reason)"""
    text = (page.get("extract") or "")
    low = _norm(text)
    if not low:
        return False, "", "문서 첫 문단이 비어 있음"
    if re.search(r"\bmay refer to\b|\bdisambiguation\b|\bcan refer to\b", low):
        return False, "", "동음이의 문서"
    foot = FOOT_WORDS.get(page.get("lang") or "en", FOOT_WORDS["en"])
    hit = next((w for w in foot if _norm(w) in low), "")
    if not hit:
        return False, "", "축구 선수 언급 없음"
    # 다른 종목·직업이 축구보다 먼저 나오면 그 사람이 아닐 가능성이 크다.
    first_foot = low.find(_norm(hit))
    for w in OTHER_WORDS:
        k = low.find(_norm(w))
        if 0 <= k < first_foot:
            return False, "", "다른 종목·직업 문서(%s)" % w
    conf = "footballer"
    if club_mentioned(club, text):
        conf = "club"
    return True, conf, hit


def wiki_search(name, club="", lang="en"):
    """이름이 정확히 일치하는 문서가 없을 때(예: 'Miguel Gutiérrez (footballer)').

    검색 결과 중 제목에서 괄호를 뺀 이름이 같고, 첫 문단이 축구 선수이며
    클럽 이름까지 나오는 문서만 돌려준다. 하나라도 어긋나면 None.
    """
    cw = club_words(club)
    if not cw:  # 클럽 근거 없이는 동명이인을 가릴 수 없어 검색을 쓰지 않는다
        return None
    url = ("https://%s.wikipedia.org/w/api.php?action=query&generator=search"
           "&gsrsearch=%s&gsrlimit=3"
           "&prop=pageimages|extracts|pageprops&pithumbsize=200"
           "&exintro=1&explaintext=1&format=json&formatversion=2"
           % (lang, urllib.parse.quote('intitle:"%s" footballer' % name)))
    try:
        d = _json(url)
    except Exception:
        return None
    for p in (d.get("query") or {}).get("pages") or []:
        title = p.get("title") or ""
        if not _title_matches(title, name):
            continue
        page = {"title": title,
                "thumb": (p.get("thumbnail") or {}).get("source") or "",
                "extract": (p.get("extract") or "").strip(),
                "qid": ((p.get("pageprops") or {}).get("wikibase_item")) or "",
                "lang": lang}
        ok, conf, _why = check_article(page, club)
        if ok and conf == "club":  # 클럽까지 맞아야 채택
            return page
    return None


def _title_matches(title, name):
    """'Miguel Gutiérrez (footballer)' 처럼 괄호만 붙은 같은 이름인지."""
    t = _norm(re.sub(r"\s*\([^)]*\)\s*$", "", title or ""))
    n = _norm(name)
    if not t or not n:
        return False
    if t == n:
        return True
    nt, nn = set(t.split()), set(n.split())
    return nn <= nt and len(nn) >= 2


class RateLimited(Exception):
    """TheSportsDB 가 분당 한도를 넘겼다 — 이 선수는 캐시에 남기지 않고 다음에 다시 본다."""


def _tsdb_json(url):
    """TheSportsDB 전용: 2.2초 간격, 429 면 20초 쉬고 한 번만 더."""
    wait = TSDB_GAP - (time.time() - _tsdb_last[0])
    if wait > 0:
        time.sleep(wait)
    _tsdb_last[0] = time.time()
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                      "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 0:
                time.sleep(20)
                continue
            if e.code == 429:
                raise RateLimited()
            raise
        except Exception:
            if attempt == 0:
                time.sleep(3)
                continue
            raise
    raise RateLimited()


def tsdb_lookup(name, club):
    """TheSportsDB 에서 이름이 완전히 같고 종목이 Soccer 이며 클럽까지 맞는 선수 사진.

    셋 중 하나라도 어긋나면 None — 동명이인 사진을 넣지 않는다.
    클럽을 모르면(한국어 팀명만 있음) 건너뛴다.
    """
    cw = club_words(club)
    if not cw:
        return None
    try:
        d = _tsdb_json(TSDB + urllib.parse.quote(name))
    except RateLimited:
        raise
    except Exception:
        return None
    want = _norm(name)
    found = []
    for p in (d or {}).get("player") or []:
        if (p.get("strSport") or "") != "Soccer":
            continue
        if _norm(p.get("strPlayer") or "") != want:
            continue
        if not club_mentioned(club, p.get("strTeam") or ""):
            continue
        thumb = (p.get("strThumb") or "").strip()
        if thumb:
            found.append(thumb)
    if len(set(found)) != 1:  # 후보가 없거나 여럿이면 고르지 않는다
        return None
    return found[0] if image_ok(found[0]) else None


# ── 캐시 ────────────────────────────────────────────────────────────
def load_cache(path=None):
    path = path or CACHE_PATH
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
    except Exception:
        d = {}
    d.setdefault("players", {})
    d["_path"] = path
    return d


def save_cache(cache, path=None):
    path = path or cache.get("_path") or CACHE_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = {k: v for k, v in cache.items() if not k.startswith("_")}
    out["updatedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    out["players"] = {k: out.get("players", {}).get(k) for k in sorted(out.get("players") or {})}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1, sort_keys=False)
    return path


def _fresh(entry):
    if not entry:
        return False
    if entry.get("photo"):
        return True
    try:
        when = datetime.fromisoformat(entry.get("checked") or "2000-01-01T00:00:00+09:00")
    except ValueError:
        return False
    return datetime.now(KST) - when < timedelta(days=RECHECK_DAYS)


# ── 공개 함수 ───────────────────────────────────────────────────────
def resolve(name, espn_photo="", club="", cache=None, refresh=False, quiet=True):
    """선수 이름 → {photo, src, conf} (못 찾으면 photo="")."""
    cache = cache if cache is not None else load_cache()
    key = (name or "").strip().lower()
    if not key:
        return {"photo": "", "src": "none", "conf": ""}
    entry = cache["players"].get(key)
    if entry and not refresh and _fresh(entry):
        return {"photo": entry.get("photo") or "", "src": entry.get("src") or "cached",
                "conf": entry.get("conf") or ""}

    photo, src, conf, title = "", "none", "", ""
    # 1) ESPN 이 실제로 살아 있으면 그대로 쓴다.
    if espn_photo and image_ok(espn_photo):
        photo, src, conf = espn_photo, "espn", "espn"
    else:
        page = None
        for lang in LANGS:
            p = wiki_page(name, lang)
            if not p:
                continue
            ok, c, _why = check_article(p, club)
            if ok:
                page = p
                conf = c
                if p.get("thumb"):
                    photo, src, title = p["thumb"], "wikipedia", p["title"]
                    break
                # 문서는 맞는데 대표 사진이 없으면 Wikidata P18 을 본다.
                p18 = wikidata_p18(p.get("qid"))
                if p18:
                    photo, src, title = p18, "wikidata", p["title"]
                    break
            # 이 언어 문서가 축구 선수 문서가 아니면 다음 언어로
        if not photo:
            # 이름이 같은 문서가 없거나 사진이 없으면, 클럽까지 맞는 동명 문서를 찾아본다.
            p = wiki_search(name, club)
            if p:
                conf = "club"
                title = p["title"]
                if p.get("thumb"):
                    photo, src = p["thumb"], "wikipedia"
                else:
                    p18 = wikidata_p18(p.get("qid"))
                    if p18:
                        photo, src = p18, "wikidata"
        if page and not title:
            title = page.get("title") or ""
        if not photo and not title:
            title = ""
        if not photo:
            # 마지막으로 TheSportsDB — 이름·종목·클럽이 모두 맞는 선수만.
            try:
                ts = tsdb_lookup(name, club)
            except RateLimited:
                # 분당 한도에 걸리면 결과를 캐시에 남기지 않고 넘간다(다음 실행에서 다시 시도).
                return {"photo": "", "src": "deferred", "conf": ""}
            if ts:
                photo, src, conf, title = ts, "thesportsdb", "club", title or ""
    entry = {"name": name, "photo": photo or None, "src": src, "conf": conf,
             "title": title or None, "espnId": _espn_id(espn_photo),
             "checked": datetime.now(KST).isoformat(timespec="seconds")}
    cache["players"][key] = entry
    if not quiet:
        print("  · %-28s %s%s" % (name, src, (" " + title) if title else ""))
    return {"photo": photo, "src": src, "conf": conf}


def club_map(extra=None):
    """한글 팀명 → ESPN 영문 팀명(fetch_soccer.TEAM_KO 의 역방향).
    이미 영문으로 적힌 팀명은 그대로 쓴다."""
    out = {}
    try:
        import fetch_soccer  # 늦은 import (fetch_soccer 가 이 모듈을 쓴다)
        out.update({ko: en for en, ko in fetch_soccer.TEAM_KO.items()})
    except Exception:
        pass
    out.update(extra or {})
    return out


def club_for(team, mapping=None):
    """data.js 의 팀 표기 → 클럽 비교용 영문명(한국어면 매핑, 영문이면 그대로)."""
    mapping = mapping if mapping is not None else club_map()
    t = (team or "").strip()
    if not t:
        return ""
    if t in mapping:
        return mapping[t]
    return t if re.search(r"[A-Za-z]", t) and not re.search(r"[가-힣]", t) else ""


def _espn_id(url):
    m = re.search(r"/full/(\d+)\.png", url or "")
    return m.group(1) if m else ""


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="선수 사진 출처 조회(시험용)")
    ap.add_argument("names", nargs="*")
    ap.add_argument("--refresh", action="store_true")
    a = ap.parse_args()
    cache = load_cache()
    for n in a.names:
        r = resolve(n, cache=cache, refresh=a.refresh, quiet=False)
        print(n, "→", r)
    save_cache(cache)
    print("캐시:", CACHE_PATH)
