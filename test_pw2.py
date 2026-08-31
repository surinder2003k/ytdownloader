
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://ytdownloader-one.vercel.app/", wait_until="networkidle")
    # Try to find the theme button by role and aria-label
    btn = page.locator('button[aria-label="Toggle theme"]')
    visible = btn.is_visible()
    print("Theme button visible:", visible)
    if visible:
        btn.click()
        page.wait_for_timeout(800)
        cls = page.locator("html").get_attribute("class")
        print("HTML class after theme click:", cls)
        # Check light mode applied
        light_applied = "light" in (cls or "")
        print("Light class applied:", light_applied)
    # Screenshot
    page.screenshot(path="C:/Users/sunny/ytdownloader/test_playwright_result.png", full_page=True)
    print("Screenshot saved")
    browser.close()
