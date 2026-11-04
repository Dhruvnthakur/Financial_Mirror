import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        
        await page.goto('http://localhost:5173/#landing', { waitUntil: 'networkidle0' });
        console.log('Page loaded');
        await browser.close();
    } catch (e) {
        console.error("Script failed", e);
    }
})();
