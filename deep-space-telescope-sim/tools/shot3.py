import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':412,'height':860})
        msgs=[]; pg.on('pageerror', lambda e: msgs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8766/index.html'); await pg.wait_for_timeout(3000)
        await pg.click('.tab[data-m=J]', force=True); await pg.wait_for_timeout(5000)
        await pg.evaluate("()=>{const t=document.getElementById('tl'); t.value=1000; t.dispatchEvent(new Event('input'));}")
        await pg.mouse.click(200,600); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='m_J.png'); print(msgs); await b.close()
asyncio.run(main())
