const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3002/dashboard.html', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'C:/Users/Muham/Downloads/StarLightAI/SaaS-1/snap_dashboard.png' });

    await page.goto('http://localhost:3002/composer-bulk.html', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'C:/Users/Muham/Downloads/StarLightAI/SaaS-1/snap_composer.png' });

    await browser.close();
    console.log("Screenshots saved: snap_dashboard.png, snap_composer.png");
})();
