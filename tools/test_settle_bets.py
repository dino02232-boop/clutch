#!/usr/bin/env python3
"""tools/settle_bets.py 단위 테스트.

실행:  cd tools && python3 -m unittest test_settle_bets -v
       (저장소 루트에서) python3 -m unittest discover -s tools -p 'test_*.py'

2026-11-25 제보(IMG_2474) 4픽 슬립이 '베팅중'에 멈춘 문제를 다시 만들지 않기 위한 것:
- 경기 종료 뒤 data.js 의 odds 가 None 이 된 경기
- 베팅한 뒤 data.js 의 배당·기준점이 바뀐 경기
- 다폴에서 한 leg 만 적중하고 나머지가 미적중인 슬립
을 정상 정산(lost, payout 0)하는지 확인한다.
"""
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import settle_bets as sb  # noqa: E402

KST = timezone(timedelta(hours=9))
BET_AT = datetime(2026, 11, 24, 18, 42, tzinfo=KST)      # IMG_2474 슬립 생성 시각
START = "2026-11-25T02:45:00+09:00"                      # 갈라타사라이 vs 애스턴 빌라 시작


def make_game(**over):
    """갈라타사라이 vs 애스턴 빌라(1:0 종료, 배당 내려감)와 같은 모양의 경기."""
    game = {
        "id": "soccer-avl-gal-20261125",
        "sport": "soccer",
        "start": START,
        "odds": None,
        "result": {"state": "final", "awayScore": 0, "homeScore": 1},
    }
    game.update(over)
    return game


def make_pick(**over):
    pick = {"gameId": "soccer-avl-gal-20261125", "market": "moneyline",
            "pick": "home", "line": "", "odds": 185, "decimal": 2.85}
    pick.update(over)
    return pick


SLIP_PICKS = [
    # 갈라타사라이 vs 애스턴 빌라 — 승무패 홈 2.85배 (적중)
    {"gameId": "gal", "market": "moneyline", "pick": "home", "line": "", "odds": 185, "decimal": 2.85},
    # 코모 vs AEK 아테네 — 핸디캡 홈 -1.5 1.65배 (1:0 → 미적중)
    {"gameId": "como", "market": "spread", "pick": "home", "line": "-1.5", "odds": -154, "decimal": 1.65},
    # 아스널 vs 도르트문트 — 언오버 오버 2.5 1.61배 (1:1 → 미적중)
    {"gameId": "ars", "market": "total", "pick": "over", "line": "2.5", "odds": -164, "decimal": 1.61},
    # 페예노르트 vs FC 포르투 — 언오버 오버 2.5 1.61배 (0:1 → 미적중)
    {"gameId": "fey", "market": "total", "pick": "over", "line": "2.5", "odds": -164, "decimal": 1.61},
]

SLIP_GAMES = {
    # 종료 뒤 data.js 에서 odds 가 내려간 경기
    "gal": make_game(id="gal", odds=None,
                     result={"state": "final", "awayScore": 0, "homeScore": 1}),
    # 배당은 남아 있지만 베팅할 때와 달라진 경기(핸디 -155 / 언오버 -150)
    "como": make_game(id="como", start="2026-11-25T05:00:00+09:00",
                      odds={"moneyline": {"away": 900, "draw": 550, "home": -380},
                            "spread": {"homeLine": "-1.5", "awayLine": "+1.5", "home": -155, "away": 110},
                            "total": {"line": "3.5", "over": -105, "under": -115}},
                      result={"state": "final", "awayScore": 0, "homeScore": 1}),
    "ars": make_game(id="ars", start="2026-11-25T05:00:00+09:00",
                     odds={"moneyline": {"away": 600, "draw": 360, "home": -215},
                           "spread": {"homeLine": "-1.5", "awayLine": "+1.5", "home": 125, "away": -175},
                           "total": {"line": "2.5", "over": -150, "under": 120}},
                     result={"state": "final", "awayScore": 1, "homeScore": 1}),
    "fey": make_game(id="fey", start="2026-11-25T05:00:00+09:00",
                     odds={"moneyline": {"away": -105, "draw": 280, "home": 275},
                           "spread": {"homeLine": "+0.5", "awayLine": "-0.5", "home": -120, "away": -120},
                           "total": {"line": "2.5", "over": -155, "under": 125}},
                     result={"state": "final", "awayScore": 1, "homeScore": 0}),
}


class OddsMissingAfterFinal(unittest.TestCase):
    """경기 종료 뒤 data.js 의 odds 가 None 인 경기(갈라타사라이 vs 애스턴 빌라)."""

    def test_home_moneyline_wins_without_odds(self):
        game = make_game(odds=None)
        self.assertEqual(sb.settle_pick(make_pick(pick="home"), game, BET_AT), "win")

    def test_away_moneyline_loses_without_odds(self):
        game = make_game(odds=None)
        self.assertEqual(sb.settle_pick(make_pick(pick="away", odds=260, decimal=3.6), game, BET_AT), "loss")

    def test_draw_moneyline_in_soccer_without_odds(self):
        game = make_game(odds=None, result={"state": "final", "awayScore": 1, "homeScore": 1})
        self.assertEqual(sb.settle_pick(make_pick(pick="draw", odds=340, decimal=4.4), game, BET_AT), "win")
        self.assertEqual(sb.settle_pick(make_pick(pick="home"), game, BET_AT), "loss")
        self.assertEqual(sb.settle_pick(make_pick(pick="away", odds=260, decimal=3.6), game, BET_AT), "loss")

    def test_two_way_moneyline_draw_is_push(self):
        game = make_game(sport="basketball", odds=None,
                         result={"state": "final", "awayScore": 101, "homeScore": 101})
        self.assertEqual(sb.settle_pick(make_pick(odds=-110, decimal=1.91), game, BET_AT), "push")

    def test_spread_and_total_without_odds(self):
        game = make_game(odds=None, result={"state": "final", "awayScore": 0, "homeScore": 1})
        self.assertEqual(sb.settle_pick(make_pick(market="spread", pick="home", line="-1.5",
                                                  odds=-154, decimal=1.65), game, BET_AT), "loss")
        self.assertEqual(sb.settle_pick(make_pick(market="spread", pick="away", line="+1.5",
                                                  odds=110, decimal=2.1), game, BET_AT), "win")
        self.assertEqual(sb.settle_pick(make_pick(market="spread", pick="home", line="-1",
                                                  odds=-110, decimal=1.91), game, BET_AT), "push")
        self.assertEqual(sb.settle_pick(make_pick(market="total", pick="under", line="2.5",
                                                  odds=-115, decimal=1.87), game, BET_AT), "win")
        self.assertEqual(sb.settle_pick(make_pick(market="total", pick="over", line="2.5",
                                                  odds=-110, decimal=1.91), game, BET_AT), "loss")
        self.assertEqual(sb.settle_pick(make_pick(market="total", pick="over", line="1",
                                                  odds=-110, decimal=1.91), game, BET_AT), "push")


class OddsMovedAfterBet(unittest.TestCase):
    """베팅한 뒤 data.js 의 배당이 바뀐 경기 — 저장한 배당으로 정산한다."""

    def test_total_result_wins_even_if_data_odds_changed(self):
        game = make_game(start="2026-11-25T05:00:00+09:00",
                         odds={"total": {"line": "2.5", "over": -150, "under": 120}},
                         result={"state": "final", "awayScore": 1, "homeScore": 2})   # 합계 3
        pick = make_pick(market="total", pick="over", line="2.5", odds=-164, decimal=1.61)
        self.assertEqual(sb.settle_pick(pick, game, BET_AT), "win")

    def test_moneyline_odds_changed_does_not_block(self):
        game = make_game(odds={"moneyline": {"away": 300, "draw": 320, "home": -120}},
                         result={"state": "final", "awayScore": 0, "homeScore": 1})
        self.assertEqual(sb.settle_pick(make_pick(odds=185, decimal=2.85), game, BET_AT), "win")

    def test_spread_line_moved_uses_bet_line(self):
        game = make_game(start="2026-11-25T05:00:00+09:00",
                         odds={"spread": {"homeLine": "-0.5", "awayLine": "+0.5", "home": -120, "away": 100}},
                         result={"state": "final", "awayScore": 0, "homeScore": 1})
        # 베팅할 때 -1.5 → 1점 차 승리는 미적중
        self.assertEqual(sb.settle_pick(make_pick(market="spread", pick="home", line="-1.5",
                                                  odds=-154, decimal=1.65), game, BET_AT), "loss")


class FourPickSlip(unittest.TestCase):
    """IMG_2474 와 같은 4픽 슬립(1적중 3미적중)은 lost · payout 0."""

    def test_slip_lost_with_zero_payout(self):
        self.assertEqual(sb.settle_bet(SLIP_PICKS, SLIP_GAMES, BET_AT, 10000), ("lost", 0))

    def test_slip_waits_while_a_leg_is_unfinished(self):
        games = {k: dict(v) for k, v in SLIP_GAMES.items()}
        games["fey"] = dict(games["fey"], result={"state": "live", "awayScore": 0, "homeScore": 0})
        # 적중한 leg 하나 + 아직 안 끝난 leg 하나 → 미적중이 없으니 결과를 기다린다
        self.assertIsNone(sb.settle_bet([SLIP_PICKS[0], SLIP_PICKS[3]], games, BET_AT, 10000))

    def test_slip_settles_lost_as_soon_as_one_leg_loses(self):
        games = {k: dict(v) for k, v in SLIP_GAMES.items()}
        games["ars"] = dict(games["ars"], result={"state": "live", "awayScore": 0, "homeScore": 0})
        games["fey"] = dict(games["fey"], result={"state": "live", "awayScore": 0, "homeScore": 0})
        self.assertEqual(sb.settle_bet(SLIP_PICKS[:2], games, BET_AT, 10000), ("lost", 0))

    def test_all_legs_won(self):
        picks = [
            make_pick(gameId="a", odds=-200, decimal=1.5),
            make_pick(gameId="b", market="total", pick="under", line="2.5", odds=-110, decimal=1.91),
        ]
        games = {
            "a": make_game(id="a", result={"state": "final", "awayScore": 0, "homeScore": 1}),
            "b": make_game(id="b", result={"state": "final", "awayScore": 0, "homeScore": 1}),
        }
        expect = int(1000 * sb.decimal(-200) * sb.decimal(-110))      # 지급은 미국식 배당의 소수 환산값
        self.assertEqual(sb.settle_bet(picks, games, BET_AT, 1000), ("won", expect))
        self.assertAlmostEqual(expect, 2863)

    def test_all_push_returns_stake(self):
        picks = [make_pick(gameId="gal", odds=-110, decimal=1.91)]
        games = {"gal": make_game(id="gal", result={"state": "final", "awayScore": 1, "homeScore": 1},
                                  sport="basketball")}
        self.assertEqual(sb.settle_bet(picks, games, BET_AT, 500), ("push", 500))

    def test_duplicate_leg_is_not_settled(self):
        picks = [make_pick(), make_pick()]
        self.assertIsNone(sb.settle_bet(picks, SLIP_GAMES, BET_AT, 1000))

    def test_broken_pick_list_is_not_settled(self):
        self.assertIsNone(sb.settle_bet(["moneyline home"], SLIP_GAMES, BET_AT, 1000))
        self.assertIsNone(sb.settle_bet([], SLIP_GAMES, BET_AT, 1000))
        self.assertIsNone(sb.settle_bet(None, SLIP_GAMES, BET_AT, 1000))


class Validation(unittest.TestCase):
    """위조·손상된 픽은 ValueError 로 건너뛴다(정산·지급하지 않는다)."""

    def assertInvalid(self, pick=None, game=None, created=BET_AT):
        with self.assertRaises(ValueError):
            sb.settle_pick(pick or make_pick(), game or make_game(), created)

    def test_market(self):
        self.assertInvalid(make_pick(market="h2h"))
        self.assertInvalid(make_pick(market=""))
        self.assertInvalid(make_pick(market=None))

    def test_side(self):
        self.assertInvalid(make_pick(market="spread", line="-1.5", pick="draw"))
        self.assertInvalid(make_pick(market="total", line="2.5", pick="home"))
        self.assertInvalid(make_pick(pick="HOME"))

    def test_line(self):
        self.assertInvalid(make_pick(market="spread", pick="home", line=""))
        self.assertInvalid(make_pick(market="spread", pick="home", line="abc"))
        self.assertInvalid(make_pick(market="total", pick="over", line=None))
        self.assertInvalid(make_pick(market="total", pick="over", line="1e9"))

    def test_odds(self):
        self.assertInvalid(make_pick(odds=0, decimal=1.0))
        self.assertInvalid(make_pick(odds=50, decimal=1.5))              # 미국식 표기가 아님
        self.assertInvalid(make_pick(odds=-50, decimal=3.0))
        self.assertInvalid(make_pick(odds=99000, decimal=991.0))         # 소수 100 초과
        self.assertInvalid(make_pick(odds=None, decimal=2.85))
        self.assertInvalid(make_pick(odds="185x", decimal=2.85))

    def test_decimal_must_match_odds(self):
        self.assertInvalid(make_pick(odds=185, decimal=10.0))            # 소수 배당 부풀리기
        self.assertInvalid(make_pick(odds=185, decimal=None))
        self.assertInvalid(make_pick(odds=185, decimal=0))

    def test_created_at(self):
        self.assertInvalid(created=datetime(2026, 11, 25, 3, 0, tzinfo=KST))   # 시작 뒤 베팅
        self.assertInvalid(created=None)

    def test_unfinished_game_is_not_judged(self):
        game = make_game(result={"state": "live", "awayScore": 0, "homeScore": 0})
        self.assertIsNone(sb.settle_pick(make_pick(), game, BET_AT))


class RealData(unittest.TestCase):
    """지금 data.js 에 남아 있는 실제 경기로 같은 판정이 나오는지(자료가 사라지면 건너뜀)."""

    @classmethod
    def setUpClass(cls):
        cls.games = sb.load_games()

    def test_reported_game(self):
        game = self.games.get("soccer-avl-gal-20261125")
        if not game or (game.get("result") or {}).get("state") != "final":
            self.skipTest("soccer-avl-gal-20261125 가 data.js 에 없음")
        pick = make_pick()
        self.assertEqual(sb.settle_pick(pick, game, BET_AT), "win")

    def test_four_leg_slip_against_live_data(self):
        ids = {"gal": "soccer-avl-gal-20261125", "como": "soccer-aek-como-20261125",
               "ars": "soccer-dor-ars-20261125", "fey": "soccer-fcp-fey-20261125"}
        missing = [k for k in ids.values() if k not in self.games]
        if missing:
            self.skipTest("data.js 에서 빠진 경기: " + ", ".join(missing))
        games = {key: self.games[gid] for key, gid in ids.items()}
        picks = [dict(p, gameId=key) for p, key in zip(SLIP_PICKS, ("gal", "como", "ars", "fey"))]
        self.assertEqual(sb.settle_bet(picks, games, BET_AT, 10000), ("lost", 0))


if __name__ == "__main__":
    unittest.main(verbosity=2)
