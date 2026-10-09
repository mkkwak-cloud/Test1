import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1200,'height':800})
        msgs=[]; pg.on('console', lambda m: msgs.append(m.type+': '+m.text)); pg.on('pageerror', lambda e: msgs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8766/index.html'); await pg.wait_for_timeout(4000)
        async def end():
            await pg.evaluate("()=>{const t=document.getElementById('tl'); t.value=1000; t.dispatchEvent(new Event('input'));}")
        await end(); await pg.mouse.click(600,500); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='s_A.png')
        await pg.click('.tab[data-m=J]', force=True); await pg.wait_for_timeout(5000); await end(); await pg.mouse.click(600,500); await pg.wait_for_timeout(2000)
        await pg.screenshot(path='s_J.png')
        await pg.evaluate("()=>{const t=document.getElementById('tl'); t.value=400; t.dispatchEvent(new Event('input'));}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='s_J40.png')
        await end()
        await pg.click('text=☀🌍🌙', force=True); await pg.wait_for_timeout(4000); await pg.mouse.click(600,500); await pg.wait_for_timeout(1000)
        await pg.screenshot(path='s_L2.png')
        await pg.click('text=🔭 L2', force=True); await pg.wait_for_timeout(1500); await pg.screenshot(path='s_L2b.png')
        await pg.click('text=☀🌍🌙', force=True); await pg.wait_for_timeout(500)
        await pg.click('text=지구에서 본 심우주', force=True); await pg.wait_for_timeout(4000); await pg.mouse.click(600,500); await pg.wait_for_timeout(1000)
        await pg.screenshot(path='s_E.png')
        print('\n'.join(msgs[:30])); await b.close()
asyncio.run(main())
