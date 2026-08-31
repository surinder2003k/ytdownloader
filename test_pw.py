
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://ytdownloader-one.vercel.app/", wait_until="networkidle")
        # Check nav icon (▶) and theme button (☾ / DARK pill)
        nav_icon = page.locator("text=▶")
        theme_btn = page.locator('button:has-text("DARK")')
        print("Nav icon visible:", nav_icon.is_visible())
        print("Theme button visible:", theme_btn.is_visible())
        # Click theme to cycle to light
        theme_btn.click()
        page.wait_for_timeout(500)
        # Check theme class changed
        html_class = page.locator("html").get_attribute("class")
        print("HTML class after click:", html_class)
        # Screenshot
        page.screenshot(path="C:/Users/sunny/ytdownloader/test_playwright.png", full_page=True)
        print("Screenshot saved: test_playwright.png")
        browser.close()
main()
