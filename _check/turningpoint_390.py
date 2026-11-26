"""경기 후 브리핑 라벨 '경기의 승부처'가 390px 모바일 뷰에서 뜨는지 확인한다.

headless 브라우저는 site.api.espn.com 에 닿지 못하므로 셸에서 받아 둔
ESPN summary(nba-mia-phi-20261126 = 401909317)를 요청에 그대로 돌려준다.
"""
import os

from playwright.sync_api import sync_playwright

BASE = "https://dino02232-boop.github.io/clutch/"
OUT = "/workspace/work-versus-turningpoint/_check/shots"
ESPN = "/workspace/.tmp/espn_nba_401909317.json"
GID = "nba-mia-phi-20261126"
os.makedirs(OUT, exist_ok=True)
data = open(ESPN, encoding="utf-8").read()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                        is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.route("**/sports/basketball/nba/summary?event=*",
               lambda route: route.fulfill(status=200, content_type="application/json", body=data))
    page.goto(BASE + "#nba/" + GID, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    sel = 'li.mrow-item[data-id="%s"] .postgame' % GID
    try:
        page.wait_for_selector(sel, timeout=20000)
    except Exception as e:
        print("postgame not found:", e)
        page.screenshot(path=OUT + "/notfound-390.png", full_page=False)
        b.close()
        raise SystemExit(1)
    page.wait_for_timeout(2500)
    info = page.evaluate("""() => {
        const pg = document.querySelector('li.mrow-item[data-id="%s"] .postgame');
        const labels = [...pg.querySelectorAll('.pg-why b')].map(e => e.textContent.trim());
        return {
            head: (pg.querySelector('.postgame-head b')||{}).textContent || null,
            whyLabels: labels,
            whyText: (pg.querySelector('.pg-why p')||{}).textContent || null,
            hasOld: pg.innerText.includes('승부가 갈린 이유'),
            hasNew: pg.innerText.includes('경기의 승부처'),
            width: Math.round(pg.getBoundingClientRect().width)
        };
    }""" % GID)
    for k, v in info.items():
        print(k, ":", v)
    el = page.locator(sel).first
    el.scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    el.screenshot(path=OUT + "/postgame-turningpoint-390.png")
    why = page.locator(sel + " .pg-why").first
    if why.count():
        why.screenshot(path=OUT + "/why-block-390.png")
    page.screenshot(path=OUT + "/viewport-390.png")
    b.close()
print("done")
