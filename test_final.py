
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://ytdownloader-one.vercel.app/", wait_until="networkidle")
    btn = page.locator('button[aria-label="Toggle theme"]')
    # Initial state (should have dark or light class, never empty)
    cls0 = page.locator("html").get_attribute("class")
    print("Initial HTML class:", cls0)
    # Click to toggle
    btn.click()
    page.wait_for_timeout(600)
    cls1 = page.locator("html").get_attribute("class")
    print("After 1st click:", cls1)
    # Click again
    btn.click()
    page.wait_for_timeout(600)
    cls2 = page.locator("html").get_attribute("class")
    print("After 2nd click:", cls2)
    # Verify class is always either dark or light (never empty)
    ok = all("dark" in (c or "") or "light" in (c or "") for c in [cls0, cls1, cls2])
    print("Always has theme class:", ok)
    page.screenshot(path="C:/Users/sunny/ytdownloader/test_theme_final.png", full_page=True)
    print("Screenshot saved")
    browser.close()
