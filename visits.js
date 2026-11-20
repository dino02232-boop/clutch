/* =============================================================
   CLUTCH — visits.js
   익명 방문 수 집계. 계정·쿠키·개인정보를 쓰지 않습니다.

   · 공개 카운터 abacus.jasoncameron.dev 에 하루 한 번씩 숫자를 올립니다.
     - day-YYYY-MM-DD : 그 날짜(한국 시간)의 방문 수
     - total          : 전체 누적 방문 수
   · 읽는 법(터미널):
       curl https://abacus.jasoncameron.dev/get/clutch-dino02232-boop/day-2026-11-20
       curl https://abacus.jasoncameron.dev/get/clutch-dino02232-boop/total
   · 집계에 실패하면 조용히 넘어갑니다. 화면 그리기와 무관하게,
     페이지 로드가 끝난 뒤에 보냅니다.
   · 같은 탭에서 새로고침해도 하루 한 번만 셉니다(sessionStorage, 기기 안에서만).
   ============================================================= */
(function () {
  "use strict";

  var NAMESPACE = "clutch-dino02232-boop";
  var ENDPOINT = "https://abacus.jasoncameron.dev/hit/" + NAMESPACE + "/";
  var ATTEMPTS = 3;          /* 카운터 서버가 느리거나 잠깐 실패하면 다시 시도 */

  /* 한국 시간(UTC+9, 서머타임 없음) 기준 YYYY-MM-DD */
  function kstDay() {
    var t = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return t.toISOString().slice(0, 10);
  }

  function send(key) {
    return fetch(ENDPOINT + key, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      keepalive: true,
      referrerPolicy: "no-referrer"
    }).then(function (res) {
      if (!res.ok) throw new Error("counter " + res.status);
      return true;
    });
  }

  /* 응답이 2xx 로 오면 끝. 실패는 조용히 삼키고 한 번씩만 더 시도합니다. */
  function ping(key, attempt) {
    attempt = attempt || 1;
    send(key).catch(function () {
      if (attempt >= ATTEMPTS) return;
      setTimeout(function () { ping(key, attempt + 1); }, attempt * 2500);
    });
  }

  /* 같은 탭 세션에서 같은 날 두 번 세지 않기 */
  function firstInSession(day) {
    try {
      var k = "clutch-visit:" + day;
      if (sessionStorage.getItem(k)) return false;
      sessionStorage.setItem(k, "1");
      return true;
    } catch (e) {
      return true; /* 저장소를 못 쓰면 그냥 셉니다 */
    }
  }

  function count() {
    if (document.prerendering) return;         /* 미리 렌더된 페이지는 세지 않음 */
    var day = kstDay();
    if (!firstInSession(day)) return;
    ping("day-" + day);
    setTimeout(function () { ping("total"); }, 800);
  }

  function schedule() {
    /* 렌더·스크립트 작업이 끝난 뒤로 미룹니다 */
    setTimeout(function () {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(count, { timeout: 4000 });
      } else {
        count();
      }
    }, 1200);
  }

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
})();
