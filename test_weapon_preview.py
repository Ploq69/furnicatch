import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1400, 'height': 900})
        
        errors = []
        page.on('console', lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == 'error' else None)
        page.on('pageerror', lambda err: errors.append(f"[pageerror] {err}"))
        
        await page.goto('http://localhost:8000/kaykit-anim-preview.html', wait_until='networkidle', timeout=30000)
        
        # Wait for animations to load
        await page.wait_for_selector('#anim-list .category', timeout=20000)
        
        # Check weapon bar exists
        weapon_bar = await page.query_selector('#weapon-bar')
        assert weapon_bar, "Weapon bar not found"
        print("✓ Weapon bar exists")
        
        # Check weapon category tabs
        tabs = await page.query_selector_all('.weapon-cat-tab')
        assert len(tabs) > 1, f"Expected multiple weapon tabs, got {len(tabs)}"
        print(f"✓ Weapon category tabs: {len(tabs)}")
        
        # Check weapon picker has weapons
        weapons = await page.query_selector_all('.weapon-btn')
        assert len(weapons) > 0, "No weapons in picker"
        print(f"✓ Weapons in picker: {len(weapons)}")
        
        # Click a weapon (sword)
        sword_btn = await page.query_selector('.weapon-btn[data-weapon-id="kaykit_sword_1h"]')
        if sword_btn:
            await sword_btn.click()
            await asyncio.sleep(2)
            print("✓ Clicked sword weapon")
        
        # Check weapon info panel
        info = await page.query_selector('#weapon-info')
        assert info, "Weapon info panel not found"
        print("✓ Weapon info panel exists")
        
        # Check recommended clips have star badges
        stars = await page.query_selector_all('.rec-badge')
        print(f"✓ Star badges (recommended clips): {len(stars)}")
        
        # Click a character
        barbarian = await page.query_selector('.char-btn:has-text("Barbarian")')
        if barbarian:
            await barbarian.click()
            await asyncio.sleep(2)
            print("✓ Switched to Barbarian")
        
        # Click clear weapon
        clear_btn = await page.query_selector('#btn-clear-weapon')
        if clear_btn:
            await clear_btn.click()
            await asyncio.sleep(1)
            print("✓ Cleared weapon")
        
        # Check for errors
        if errors:
            print(f"\n⚠️ Console errors ({len(errors)}):")
            for e in errors[:10]:
                print(f"  {e}")
        else:
            print("\n✓ Zero console errors")
        
        await browser.close()

asyncio.run(main())
